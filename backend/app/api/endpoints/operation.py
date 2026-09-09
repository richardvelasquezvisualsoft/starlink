from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from app.core.database import get_db
from app.api.deps import get_tenant_context
from app.models import Dispositivo, CatalogoOperacionRemota, ComandoRemotoLog
from app.core.starlink_gateway import get_starlink_gateway, StarlinkGateway

router = APIRouter()

class OperationRequest(BaseModel):
    device_id: str
    command_code: str
    params: Optional[dict] = None

@router.post("/execute")
def execute_operation(
    req: OperationRequest,
    db: Session = Depends(get_db),
    tenant_ctx: dict = Depends(get_tenant_context),
    gateway: StarlinkGateway = Depends(get_starlink_gateway)
):
    query = db.query(Dispositivo).filter(Dispositivo.device_id == req.device_id)
    if tenant_ctx.get("tenant_id"):
        query = query.filter(Dispositivo.tenant_id == tenant_ctx.get("tenant_id"))
    
    device = query.first()
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado o sin acceso")
        
    cmd = db.query(CatalogoOperacionRemota).filter(CatalogoOperacionRemota.codigo == req.command_code).first()
    if not cmd or not cmd.activa:
        raise HTTPException(status_code=400, detail="Comando inválido o inactivo")
        
    if cmd.solo_reseller and tenant_ctx.get("rol") != "RESELLER":
        raise HTTPException(status_code=403, detail="Este comando requiere rol de RESELLER")

    # Validate limits for top-up operations
    if cmd.codigo in ("top-up", "overage"):
        from app.models import ControlServicioActual
        from decimal import Decimal
        amount = Decimal(str(req.params.get("amount", 0)))
        if amount > 0:
            control_servicio = db.query(ControlServicioActual).filter(ControlServicioActual.dispositivo_id == device.id).first()
            if not control_servicio:
                raise HTTPException(status_code=400, detail="Sin configuración de control de servicio para este dispositivo")
            
            # Simple check against limite_gasto_adicional
            limite = control_servicio.limite_gasto_adicional or Decimal('0')
            if amount > limite:
                raise HTTPException(status_code=400, detail=f"El monto ({amount}) excede el límite de gasto adicional ({limite})")

    res = gateway.execute_command(req.device_id, req.command_code, req.params)
    
    from datetime import datetime
    log = ComandoRemotoLog(
        dispositivo_id=device.id,
        tenant_id=device.tenant_id,
        usuario_id=1, 
        operacion_codigo=cmd.codigo,
        parametros=req.params,
        correlacion_id=res.get("correlacion_id"),
        estado="EN_PROGRESO"
    )
    db.add(log)
    db.commit()
    
    return res

@router.get("/commands")
def list_commands(db: Session = Depends(get_db), tenant_ctx: dict = Depends(get_tenant_context)):
    query = db.query(CatalogoOperacionRemota).filter(CatalogoOperacionRemota.activa == True)
    if tenant_ctx.get("rol") != "RESELLER":
        query = query.filter(CatalogoOperacionRemota.solo_reseller == False)
    return query.all()
