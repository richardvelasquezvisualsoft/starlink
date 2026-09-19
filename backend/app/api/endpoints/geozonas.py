from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_tenant_context
from app.models import Geozona, Dispositivo, DispositivoGeozonaEstadoActual, Cuenta, LineaServicio
from app.schemas import GeozonaCreate, GeozonaAsignar
from pydantic import BaseModel
from typing import Optional, Any
import uuid

router = APIRouter()

class GeozonaDispositivoPayload(BaseModel):
    nombre: str
    tipo_geozona: str
    tolerancia_borde_metros: float
    pais: Optional[str] = None
    departamento: Optional[str] = None
    provincia: Optional[str] = None
    direccion: Optional[str] = None
    centro_latitud: Optional[float] = None
    centro_longitud: Optional[float] = None
    radio_metros: Optional[float] = None
    geometria_geojson: Optional[Any] = None

@router.get("/")
def get_geozonas(db: Session = Depends(get_db), tenant_ctx: dict = Depends(get_tenant_context)):
    query = db.query(Geozona)
    if tenant_ctx.get("tenant_id"):
        query = query.filter(Geozona.tenant_id == tenant_ctx.get("tenant_id"))
    return query.all()

@router.get("/status")
def get_geozona_status(db: Session = Depends(get_db), tenant_ctx: dict = Depends(get_tenant_context)):
    query = db.query(DispositivoGeozonaEstadoActual, Dispositivo.device_id, Geozona.nombre)\
        .join(Dispositivo, DispositivoGeozonaEstadoActual.dispositivo_id == Dispositivo.id)\
        .join(Geozona, DispositivoGeozonaEstadoActual.geozona_id == Geozona.id)
        
    if tenant_ctx.get("tenant_id"):
        query = query.filter(Dispositivo.tenant_id == tenant_ctx.get("tenant_id"))
        
    results = query.all()
    return [
        {
            "device_id": r.device_id,
            "geozona_nombre": r.nombre,
            "estado": r.DispositivoGeozonaEstadoActual.estado_geozona,
            "distancia_borde": r.DispositivoGeozonaEstadoActual.distancia_al_borde_m,
            "fecha": r.DispositivoGeozonaEstadoActual.fecha_actualizacion
        }
        for r in results
    ]

@router.post("/")
def create_geozona(geozona: GeozonaCreate, db: Session = Depends(get_db), tenant_ctx: dict = Depends(get_tenant_context)):
    tenant_id = tenant_ctx.get("tenant_id") or 1
    
    new_geo = Geozona(
        tenant_id=tenant_id,
        codigo=str(uuid.uuid4())[:8],
        nombre=geozona.nombre,
        tipo_geozona=geozona.tipo_geozona,
        centro_latitud=geozona.centro_latitud,
        centro_longitud=geozona.centro_longitud,
        radio_metros=geozona.radio_metros,
        geometria_geojson=geozona.geometria_geojson,
        tolerancia_borde_metros=geozona.tolerancia_borde_metros
    )
    db.add(new_geo)
    db.commit()
    db.refresh(new_geo)
    return new_geo

@router.post("/asignar/{dispositivo_id}")
def asignar_geozona(dispositivo_id: int, asignar: GeozonaAsignar, db: Session = Depends(get_db), tenant_ctx: dict = Depends(get_tenant_context)):
    tenant_id = tenant_ctx.get("tenant_id") or 1
    
    estado = db.query(DispositivoGeozonaEstadoActual).filter(
        DispositivoGeozonaEstadoActual.dispositivo_id == dispositivo_id
    ).first()
    
    if estado:
        estado.geozona_id = asignar.geozona_id
    else:
        estado = DispositivoGeozonaEstadoActual(
            dispositivo_id=dispositivo_id,
            tenant_id=tenant_id,
            geozona_id=asignar.geozona_id,
            estado="DESCONOCIDO"
        )
        db.add(estado)
        
    db.commit()
    return {"message": "Asignado correctamente"}

def _get_device_with_auth(dispositivo_id: int, db: Session, tenant_id: int):
    dev_query = db.query(Dispositivo).filter(Dispositivo.id == dispositivo_id)
    if tenant_id:
        dev_query = (
            dev_query.join(LineaServicio, LineaServicio.dispositivo_id == Dispositivo.id)
            .join(Cuenta, Cuenta.id == LineaServicio.cuenta_id)
            .filter(Cuenta.tenant_id == tenant_id)
        )
    device = dev_query.first()
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado o sin acceso")
    return device

@router.post("/dispositivo/{dispositivo_id}")
def create_dispositivo_geozona(dispositivo_id: int, payload: GeozonaDispositivoPayload, db: Session = Depends(get_db), tenant_ctx: dict = Depends(get_tenant_context)):
    tenant_id = tenant_ctx.get("tenant_id")
    device = _get_device_with_auth(dispositivo_id, db, tenant_id)
    
    # Check if exists
    estado = db.query(DispositivoGeozonaEstadoActual).filter(DispositivoGeozonaEstadoActual.dispositivo_id == dispositivo_id).first()
    if estado:
        raise HTTPException(status_code=400, detail="Este dispositivo ya tiene una geocerca asignada. Modifíquela en su lugar.")
        
    resolved_tenant_id = tenant_id or 1
    
    new_geo = Geozona(
        tenant_id=resolved_tenant_id,
        codigo=str(uuid.uuid4())[:8],
        nombre=payload.nombre,
        tipo_geozona=payload.tipo_geozona,
        tolerancia_borde_metros=payload.tolerancia_borde_metros,
        pais=payload.pais,
        departamento=payload.departamento,
        provincia=payload.provincia,
        direccion=payload.direccion,
        centro_latitud=payload.centro_latitud,
        centro_longitud=payload.centro_longitud,
        radio_metros=payload.radio_metros,
        geometria_geojson=payload.geometria_geojson
    )
    db.add(new_geo)
    db.commit()
    db.refresh(new_geo)
    
    estado = DispositivoGeozonaEstadoActual(
        dispositivo_id=dispositivo_id,
        tenant_id=resolved_tenant_id,
        geozona_id=new_geo.id,
        estado="DESCONOCIDO"
    )
    db.add(estado)
    db.commit()
    return {"message": "Geocerca creada y asignada", "geozona_id": new_geo.id}

@router.put("/dispositivo/{dispositivo_id}")
def update_dispositivo_geozona(dispositivo_id: int, payload: GeozonaDispositivoPayload, db: Session = Depends(get_db), tenant_ctx: dict = Depends(get_tenant_context)):
    tenant_id = tenant_ctx.get("tenant_id")
    device = _get_device_with_auth(dispositivo_id, db, tenant_id)
    
    estado = db.query(DispositivoGeozonaEstadoActual).filter(DispositivoGeozonaEstadoActual.dispositivo_id == dispositivo_id).first()
    if not estado:
        raise HTTPException(status_code=404, detail="Este dispositivo no tiene geocerca asignada.")
        
    geo = db.query(Geozona).filter(Geozona.id == estado.geozona_id).first()
    if not geo:
        raise HTTPException(status_code=404, detail="Geocerca no encontrada.")
        
    geo.nombre = payload.nombre
    geo.tipo_geozona = payload.tipo_geozona
    geo.tolerancia_borde_metros = payload.tolerancia_borde_metros
    geo.pais = payload.pais
    geo.departamento = payload.departamento
    geo.provincia = payload.provincia
    geo.direccion = payload.direccion
    geo.centro_latitud = payload.centro_latitud
    geo.centro_longitud = payload.centro_longitud
    geo.radio_metros = payload.radio_metros
    geo.geometria_geojson = payload.geometria_geojson
    
    db.commit()
    return {"message": "Geocerca actualizada"}

@router.delete("/dispositivo/{dispositivo_id}")
def delete_dispositivo_geozona(dispositivo_id: int, db: Session = Depends(get_db), tenant_ctx: dict = Depends(get_tenant_context)):
    tenant_id = tenant_ctx.get("tenant_id")
    device = _get_device_with_auth(dispositivo_id, db, tenant_id)
    
    estado = db.query(DispositivoGeozonaEstadoActual).filter(DispositivoGeozonaEstadoActual.dispositivo_id == dispositivo_id).first()
    if not estado:
        raise HTTPException(status_code=404, detail="Este dispositivo no tiene geocerca asignada.")
        
    geozona_id = estado.geozona_id
    db.delete(estado)
    db.commit()
    
    # Also delete the geozona if it's uniquely owned, but for now we just delete the assignment or both.
    geo = db.query(Geozona).filter(Geozona.id == geozona_id).first()
    if geo:
        db.delete(geo)
        db.commit()
        
    return {"message": "Geocerca eliminada"}
