from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_
from typing import List, Optional
from app.core.database import get_db
from app.api.endpoints.auth import get_current_user
from app.models import Usuario, Cuenta, Dispositivo, LineaServicio, CatalogoAlerta, AlertaLog, EstadoServicioLog, GeolocalizacionLog
from app.schemas import (
    CuentaCreate, CuentaUpdate, CuentaResponse,
    DispositivoCreate, DispositivoUpdate, DispositivoResponse,
    LineaServicioCreate, LineaServicioUpdate, LineaServicioResponse,
    CatalogoAlertaCreate, CatalogoAlertaUpdate, CatalogoAlertaResponse,
    AlertaLogResponse, UserResponse
)
from app.core.security import get_password_hash
import datetime

router = APIRouter()

# --- CUENTAS CRUD ---
@router.get("/cuentas", response_model=List[CuentaResponse])
def get_cuentas(q: Optional[str] = None, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    query = db.query(Cuenta)
    if q:
        query = query.filter(or_(Cuenta.nombre.ilike(f"%{q}%"), Cuenta.numero_cuenta.ilike(f"%{q}%")))
    return query.order_by(Cuenta.nombre).all()

@router.post("/cuentas", response_model=CuentaResponse)
def create_cuenta(data: CuentaCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    db_item = Cuenta(
        numero_cuenta=data.numero_cuenta,
        nombre=data.nombre,
        creado_por=current_user.id
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.put("/cuentas/{id}", response_model=CuentaResponse)
def update_cuenta(id: int, data: CuentaUpdate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    db_item = db.query(Cuenta).filter(Cuenta.id == id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Cuenta no encontrada")
    for key, val in data.model_dump(exclude_unset=True).items():
        setattr(db_item, key, val)
    db_item.modificado_por = current_user.id
    db.commit()
    db.refresh(db_item)
    return db_item

@router.delete("/cuentas/{id}")
def delete_cuenta(id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    db_item = db.query(Cuenta).filter(Cuenta.id == id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Cuenta no encontrada")
    db.delete(db_item)
    db.commit()
    return {"status": "success", "message": "Cuenta eliminada correctamente"}


# --- DISPOSITIVOS CRUD ---
@router.get("/dispositivos", response_model=List[DispositivoResponse])
def get_dispositivos(q: Optional[str] = None, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    query = db.query(Dispositivo)
    if q:
        query = query.filter(or_(
            Dispositivo.nombre.ilike(f"%{q}%"), 
            Dispositivo.device_id.ilike(f"%{q}%"),
            Dispositivo.kit_starlink.ilike(f"%{q}%")
        ))
    return query.order_by(Dispositivo.device_id).all()

@router.post("/dispositivos", response_model=DispositivoResponse)
def create_dispositivo(data: DispositivoCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    db_item = Dispositivo(
        device_id=data.device_id,
        nombre=data.nombre,
        kit_starlink=data.kit_starlink,
        creado_por=current_user.id
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    
    # Auto-initialize geolocation and service state logs for the device
    now = datetime.datetime.now()
    initial_geo = GeolocalizacionLog(
        dispositivo_id=db_item.id,
        fecha_hora_lectura=now,
        latitud=-33.4489, # Default to Santiago area
        longitud=-70.6693,
        fuente="Default"
    )
    initial_state = EstadoServicioLog(
        dispositivo_id=db_item.id,
        fecha_hora_lectura=now,
        estado="online",
        motivo="Initial activation"
    )
    db.add(initial_geo)
    db.add(initial_state)
    db.commit()
    
    return db_item

@router.put("/dispositivos/{id}", response_model=DispositivoResponse)
def update_dispositivo(id: int, data: DispositivoUpdate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    db_item = db.query(Dispositivo).filter(Dispositivo.id == id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
    for key, val in data.model_dump(exclude_unset=True).items():
        setattr(db_item, key, val)
    db_item.modificado_por = current_user.id
    db.commit()
    db.refresh(db_item)
    return db_item

@router.delete("/dispositivos/{id}")
def delete_dispositivo(id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    db_item = db.query(Dispositivo).filter(Dispositivo.id == id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
    # Set references in lineas_servicio to NULL or delete them
    db.query(LineaServicio).filter(LineaServicio.dispositivo_id == id).update({LineaServicio.dispositivo_id: None})
    db.delete(db_item)
    db.commit()
    return {"status": "success", "message": "Dispositivo eliminado correctamente"}


# --- LINEAS DE SERVICIO CRUD ---
@router.get("/lineas-servicio", response_model=List[LineaServicioResponse])
def get_lineas_servicio(q: Optional[str] = None, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    query = db.query(LineaServicio)
    if q:
        query = query.filter(or_(
            LineaServicio.nombre.ilike(f"%{q}%"), 
            LineaServicio.numero_linea.ilike(f"%{q}%"),
            LineaServicio.plan_contratado.ilike(f"%{q}%")
        ))
    return query.order_by(LineaServicio.numero_linea).all()

@router.post("/lineas-servicio", response_model=LineaServicioResponse)
def create_linea_servicio(data: LineaServicioCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    db_item = LineaServicio(
        cuenta_id=data.cuenta_id,
        dispositivo_id=data.dispositivo_id,
        numero_linea=data.numero_linea,
        nombre=data.nombre,
        subscription_id=data.subscription_id,
        id_producto=data.id_producto,
        tipo_suscripcion=data.tipo_suscripcion,
        plan_contratado=data.plan_contratado,
        es_plan_movil=data.es_plan_movil,
        estado_provisionamiento=data.estado_provisionamiento,
        permitir_excedentes_opt_in=data.permitir_excedentes_opt_in,
        creado_por=current_user.id
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.put("/lineas-servicio/{id}", response_model=LineaServicioResponse)
def update_linea_servicio(id: int, data: LineaServicioUpdate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    db_item = db.query(LineaServicio).filter(LineaServicio.id == id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Línea de servicio no encontrada")
    for key, val in data.model_dump(exclude_unset=True).items():
        setattr(db_item, key, val)
    db_item.modificado_por = current_user.id
    db.commit()
    db.refresh(db_item)
    return db_item

@router.delete("/lineas-servicio/{id}")
def delete_linea_servicio(id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    db_item = db.query(LineaServicio).filter(LineaServicio.id == id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Línea de servicio no encontrada")
    db.delete(db_item)
    db.commit()
    return {"status": "success", "message": "Línea de servicio eliminada correctamente"}


# --- CATALOGO ALERTAS CRUD ---
@router.get("/catalogo-alertas", response_model=List[CatalogoAlertaResponse])
def get_catalogo_alertas(q: Optional[str] = None, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    query = db.query(CatalogoAlerta)
    if q:
        query = query.filter(or_(
            CatalogoAlerta.nombre.ilike(f"%{q}%"), 
            CatalogoAlerta.codigo_alerta.ilike(f"%{q}%")
        ))
    return query.all()

@router.post("/catalogo-alertas", response_model=CatalogoAlertaResponse)
def create_catalogo_alerta(data: CatalogoAlertaCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    db_item = CatalogoAlerta(
        codigo_alerta=data.codigo_alerta,
        nombre=data.nombre,
        descripcion=data.descripcion,
        criticidad=data.criticidad,
        creado_por=current_user.id
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item


# --- ALERTAS LOG READ & ACTIONS ---
@router.get("/alertas", response_model=List[AlertaLogResponse])
def get_alertas(activa: Optional[bool] = None, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    query = db.query(AlertaLog)
    if activa is not None:
        query = query.filter(AlertaLog.activa == activa)
    return query.order_by(desc(AlertaLog.fecha_hora_deteccion)).all()

@router.put("/alertas/{id}/resolve", response_model=AlertaLogResponse)
def resolve_alerta(id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    db_item = db.query(AlertaLog).filter(AlertaLog.id == id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Alerta no encontrada")
    db_item.activa = False
    db.commit()
    db.refresh(db_item)
    return db_item


# --- USUARIOS LIST & EDIT (for maintenance screen) ---
@router.get("/usuarios", response_model=List[UserResponse])
def get_usuarios(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return db.query(Usuario).order_by(Usuario.nombre).all()
