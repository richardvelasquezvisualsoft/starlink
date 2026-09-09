from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_
from typing import List, Optional
from app.core.database import get_db
from app.api.deps import get_tenant_context
from app.models import Usuario, Cuenta, Dispositivo, LineaServicio, CatalogoAlerta, AlertaLog, EstadoTerminalActual, NivelOrganizacionConfig, UnidadOrganizacional, CentroCosto
from app.schemas import (
    CuentaCreate, CuentaUpdate, CuentaResponse,
    DispositivoCreate, DispositivoUpdate, DispositivoResponse,
    LineaServicioCreate, LineaServicioUpdate, LineaServicioResponse,
    CatalogoAlertaCreate, CatalogoAlertaUpdate, CatalogoAlertaResponse,
    AlertaLogResponse, UserResponse,
    NivelOrganizacionConfigResponse, UnidadOrganizacionalResponse, CentroCostoResponse
)
import datetime

router = APIRouter()

# --- CUENTAS CRUD ---
@router.get("/cuentas", response_model=List[CuentaResponse])
def get_cuentas(q: Optional[str] = None, db: Session = Depends(get_db), tenant_ctx: dict = Depends(get_tenant_context)):
    tenant_id = tenant_ctx.get("tenant_id")
    query = db.query(Cuenta)
    if tenant_id:
        query = query.filter(Cuenta.tenant_id == tenant_id)
    if q:
        query = query.filter(or_(Cuenta.nombre.ilike(f"%{q}%"), Cuenta.numero_cuenta.ilike(f"%{q}%")))
    return query.order_by(Cuenta.nombre).all()

@router.post("/cuentas", response_model=CuentaResponse)
def create_cuenta(data: CuentaCreate, db: Session = Depends(get_db), tenant_ctx: dict = Depends(get_tenant_context)):
    tenant_id = tenant_ctx.get("tenant_id")
    db_item = Cuenta(
        tenant_id=tenant_id or 1,
        numero_cuenta=data.numero_cuenta,
        nombre=data.nombre
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.put("/cuentas/{id}", response_model=CuentaResponse)
def update_cuenta(id: int, data: CuentaUpdate, db: Session = Depends(get_db), tenant_ctx: dict = Depends(get_tenant_context)):
    tenant_id = tenant_ctx.get("tenant_id")
    query = db.query(Cuenta).filter(Cuenta.id == id)
    if tenant_id:
        query = query.filter(Cuenta.tenant_id == tenant_id)
    db_item = query.first()
    
    if not db_item:
        raise HTTPException(status_code=404, detail="Cuenta no encontrada")
    for key, val in data.model_dump(exclude_unset=True).items():
        setattr(db_item, key, val)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.delete("/cuentas/{id}")
def delete_cuenta(id: int, db: Session = Depends(get_db), tenant_ctx: dict = Depends(get_tenant_context)):
    tenant_id = tenant_ctx.get("tenant_id")
    query = db.query(Cuenta).filter(Cuenta.id == id)
    if tenant_id:
        query = query.filter(Cuenta.tenant_id == tenant_id)
    db_item = query.first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Cuenta no encontrada")
    db.delete(db_item)
    db.commit()
    return {"status": "success", "message": "Cuenta eliminada correctamente"}


# --- DISPOSITIVOS CRUD ---
@router.get("/dispositivos", response_model=List[DispositivoResponse])
def get_dispositivos(q: Optional[str] = None, db: Session = Depends(get_db), tenant_ctx: dict = Depends(get_tenant_context)):
    tenant_id = tenant_ctx.get("tenant_id")
    query = db.query(Dispositivo)
    if tenant_id:
        query = query.filter(Dispositivo.tenant_id == tenant_id)
    if q:
        query = query.filter(or_(
            Dispositivo.nombre.ilike(f"%{q}%"), 
            Dispositivo.device_id.ilike(f"%{q}%"),
            Dispositivo.kit_starlink.ilike(f"%{q}%")
        ))
    return query.order_by(Dispositivo.device_id).all()

@router.get("/dispositivos/{id}", response_model=DispositivoResponse)
def get_dispositivo(id: int, db: Session = Depends(get_db), tenant_ctx: dict = Depends(get_tenant_context)):
    tenant_id = tenant_ctx.get("tenant_id")
    query = db.query(Dispositivo).filter(Dispositivo.id == id)
    if tenant_id:
        query = query.filter(Dispositivo.tenant_id == tenant_id)
    device = query.first()
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
    return device

@router.get("/dispositivos/{id}/telemetry")
def get_dispositivo_telemetry(id: int, db: Session = Depends(get_db), tenant_ctx: dict = Depends(get_tenant_context)):
    tenant_id = tenant_ctx.get("tenant_id")
    query = db.query(Dispositivo).filter(Dispositivo.id == id)
    if tenant_id:
        query = query.filter(Dispositivo.tenant_id == tenant_id)
    device = query.first()
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
    
    from app.models import TelemetriaLog
    # Devuelve el último log de telemetría del dispositivo
    telemetry = db.query(TelemetriaLog).filter(TelemetriaLog.dispositivo_id == id).order_by(TelemetriaLog.fecha_hora_lectura.desc()).first()
    
    if not telemetry:
        return {}
    
    return {
        "timestamp": telemetry.fecha_hora_lectura,
        "ping_latency": telemetry.ping_latency_avg_ms,
        "downlink_mbps": telemetry.downlink_mbps_avg,
        "uplink_mbps": telemetry.uplink_mbps_avg,
        "signal_quality": telemetry.signal_quality_avg,
        "uptime": telemetry.uptime_segundos
    }

@router.post("/dispositivos", response_model=DispositivoResponse)
def create_dispositivo(data: DispositivoCreate, db: Session = Depends(get_db), tenant_ctx: dict = Depends(get_tenant_context)):
    tenant_id = tenant_ctx.get("tenant_id")
    db_item = Dispositivo(
        tenant_id=tenant_id or 1,
        device_id=data.device_id,
        nombre=data.nombre,
        kit_starlink=data.kit_starlink
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.put("/dispositivos/{id}", response_model=DispositivoResponse)
def update_dispositivo(id: int, data: DispositivoUpdate, db: Session = Depends(get_db), tenant_ctx: dict = Depends(get_tenant_context)):
    tenant_id = tenant_ctx.get("tenant_id")
    query = db.query(Dispositivo).filter(Dispositivo.id == id)
    if tenant_id:
        query = query.filter(Dispositivo.tenant_id == tenant_id)
    db_item = query.first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
    for key, val in data.model_dump(exclude_unset=True).items():
        setattr(db_item, key, val)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.delete("/dispositivos/{id}")
def delete_dispositivo(id: int, db: Session = Depends(get_db), tenant_ctx: dict = Depends(get_tenant_context)):
    tenant_id = tenant_ctx.get("tenant_id")
    query = db.query(Dispositivo).filter(Dispositivo.id == id)
    if tenant_id:
        query = query.filter(Dispositivo.tenant_id == tenant_id)
    db_item = query.first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
    db.delete(db_item)
    db.commit()
    return {"status": "success", "message": "Dispositivo eliminado correctamente"}

# --- LINEAS DE SERVICIO CRUD ---
@router.get("/lineas-servicio", response_model=List[LineaServicioResponse])
def get_lineas_servicio(q: Optional[str] = None, db: Session = Depends(get_db), tenant_ctx: dict = Depends(get_tenant_context)):
    tenant_id = tenant_ctx.get("tenant_id")
    query = db.query(LineaServicio)
    if tenant_id:
        query = query.filter(LineaServicio.tenant_id == tenant_id)
    if q:
        query = query.filter(or_(
            LineaServicio.nombre.ilike(f"%{q}%"), 
            LineaServicio.numero_linea.ilike(f"%{q}%")
        ))
    return query.order_by(LineaServicio.numero_linea).all()

# --- CATALOGO ALERTAS CRUD ---
@router.get("/catalogo-alertas", response_model=List[CatalogoAlertaResponse])
def get_catalogo_alertas(q: Optional[str] = None, db: Session = Depends(get_db), tenant_ctx: dict = Depends(get_tenant_context)):
    query = db.query(CatalogoAlerta)
    if q:
        query = query.filter(or_(
            CatalogoAlerta.nombre.ilike(f"%{q}%"), 
            CatalogoAlerta.codigo.ilike(f"%{q}%")
        ))
    return query.all()

# --- ALERTAS LOG READ & ACTIONS ---
@router.get("/alertas", response_model=List[AlertaLogResponse])
def get_alertas(activa: Optional[bool] = None, db: Session = Depends(get_db), tenant_ctx: dict = Depends(get_tenant_context)):
    tenant_id = tenant_ctx.get("tenant_id")
    query = db.query(AlertaLog)
    if tenant_id:
        query = query.filter(AlertaLog.tenant_id == tenant_id)
    if activa is not None:
        query = query.filter(AlertaLog.activa == activa)
    return query.order_by(desc(AlertaLog.fecha_hora_deteccion)).all()


