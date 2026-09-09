from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_tenant_context
from app.models import Geozona, Dispositivo, DispositivoGeozonaEstadoActual

router = APIRouter()

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
