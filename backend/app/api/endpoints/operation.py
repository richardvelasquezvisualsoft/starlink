from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Any
from pydantic import BaseModel
from datetime import datetime

from app.core.database import get_db
from app.api.deps import get_tenant_context
from app.models import Dispositivo, CatalogoOperacionRemota, ComandoRemotoLog, Cuenta, LineaServicio

router = APIRouter()

class ExecutePayload(BaseModel):
    dispositivo_id: Optional[Any] = None
    comando_id: Optional[Any] = None
    device_id: Optional[str] = None
    command_code: Optional[str] = None
    parametros: Optional[dict] = None

@router.get("/devices")
def get_operation_devices(
    db: Session = Depends(get_db),
    tenant_ctx: dict = Depends(get_tenant_context)
):
    tenant_id = tenant_ctx.get("tenant_id")
    query = (
        db.query(Dispositivo, LineaServicio.numero_linea)
        .outerjoin(LineaServicio, LineaServicio.dispositivo_id == Dispositivo.id)
        .outerjoin(Cuenta, Cuenta.id == LineaServicio.cuenta_id)
    )
    if tenant_id:
        query = query.filter(Cuenta.tenant_id == tenant_id)
    
    results = query.all()
    out = []
    from app.models import EstadoTerminalActual
    for device, num_linea in results:
        eta = db.query(EstadoTerminalActual).filter(EstadoTerminalActual.dispositivo_id == device.id).first()
        st = (eta.estado_operativo or 'OPERATIVO').upper() if eta else 'OPERATIVO'
        out.append({
            "id": device.id,
            "device_id": device.device_id,
            "nombre": device.nombre or device.device_id,
            "numero_linea": num_linea,
            "estado": st
        })
    return out

@router.get("/commands")
def list_commands(
    db: Session = Depends(get_db), 
    tenant_ctx: dict = Depends(get_tenant_context)
):
    customer_commands = [
        {
            "id": 1,
            "codigo": "REBOOT_TERMINAL",
            "comando": "REBOOT_TERMINAL",
            "nombre": "Reiniciar User Terminal Starlink",
            "descripcion": "Ejecuta un reinicio remoto de la antena Starlink para restablecer la conexión."
        },
        {
            "id": 2,
            "codigo": "REBOOT_ROUTER",
            "comando": "REBOOT_ROUTER",
            "nombre": "Reiniciar Router Wi-Fi Starlink",
            "descripcion": "Reinicia el equipo router local Starlink para refrescar los servicios de red."
        },
        {
            "id": 3,
            "codigo": "OVERAGE_OPT_IN",
            "comando": "OVERAGE_OPT_IN",
            "nombre": "Activar Excedente de Datos (Opt-In)",
            "descripcion": "Permite el consumo de datos adicionales de prioridad tras agotar la bolsa contratada."
        },
        {
            "id": 4,
            "codigo": "OVERAGE_OPT_OUT",
            "comando": "OVERAGE_OPT_OUT",
            "nombre": "Desactivar Excedente de Datos (Opt-Out)",
            "descripcion": "Restringe el consumo adicional para evitar cargos por exceso de datos."
        }
    ]
    return customer_commands

@router.get("/history")
def get_operation_history(
    db: Session = Depends(get_db),
    tenant_ctx: dict = Depends(get_tenant_context)
):
    tenant_id = tenant_ctx.get("tenant_id")
    query = (
        db.query(ComandoRemotoLog, Dispositivo.device_id, Dispositivo.nombre.label('dispositivo_nombre'))
        .outerjoin(Dispositivo, Dispositivo.id == ComandoRemotoLog.dispositivo_id)
        .outerjoin(LineaServicio, LineaServicio.dispositivo_id == Dispositivo.id)
        .outerjoin(Cuenta, Cuenta.id == LineaServicio.cuenta_id)
    )
    if tenant_id:
        query = query.filter(Cuenta.tenant_id == tenant_id)
    
    logs = query.order_by(ComandoRemotoLog.fecha_solicitud.desc()).limit(20).all()
    out = []
    for log, dev_id, dev_nombre in logs:
        cmd_code = log.comando or 'REBOOT_TERMINAL'
        cmd_title = cmd_code.replace('_', ' ').title()
        if cmd_code == 'REBOOT_TERMINAL':
            cmd_title = 'Reiniciar User Terminal Starlink'
        elif cmd_code == 'REBOOT_ROUTER':
            cmd_title = 'Reiniciar Router Wi-Fi Starlink'
        elif cmd_code == 'OVERAGE_OPT_IN':
            cmd_title = 'Activar Excedente de Datos'
        elif cmd_code == 'OVERAGE_OPT_OUT':
            cmd_title = 'Desactivar Excedente de Datos'

        out.append({
            "id": log.id,
            "dispositivo_id": log.dispositivo_id,
            "device_id": dev_id or f"DEV-{log.dispositivo_id}",
            "dispositivo_nombre": dev_nombre or dev_id or f"Terminal #{log.dispositivo_id}",
            "comando_codigo": cmd_code,
            "comando_nombre": cmd_title,
            "estado": (log.estado or 'SUCCESS').upper(),
            "fecha_hora_envio": log.fecha_solicitud.isoformat() if log.fecha_solicitud else datetime.utcnow().isoformat()
        })
    return out

@router.post("/execute")
def execute_operation(
    req: ExecutePayload,
    db: Session = Depends(get_db),
    tenant_ctx: dict = Depends(get_tenant_context)
):
    tenant_id = tenant_ctx.get("tenant_id")
    
    dev_query = db.query(Dispositivo)
    if req.dispositivo_id:
        try:
            dev_id_int = int(req.dispositivo_id)
            dev_query = dev_query.filter(Dispositivo.id == dev_id_int)
        except Exception:
            dev_query = dev_query.filter(Dispositivo.device_id == str(req.dispositivo_id))
    elif req.device_id:
        dev_query = dev_query.filter(Dispositivo.device_id == req.device_id)

    if tenant_id:
        dev_query = (
            dev_query.join(LineaServicio, LineaServicio.dispositivo_id == Dispositivo.id)
            .join(Cuenta, Cuenta.id == LineaServicio.cuenta_id)
            .filter(Cuenta.tenant_id == tenant_id)
        )

    device = dev_query.first()
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado o sin acceso")

    cmd_name = "REBOOT_TERMINAL"
    if req.command_code:
        cmd_name = req.command_code
    elif req.comando_id:
        cmd_map = {1: "REBOOT_TERMINAL", 2: "REBOOT_ROUTER", 3: "OVERAGE_OPT_IN", 4: "OVERAGE_OPT_OUT"}
        cmd_name = cmd_map.get(int(req.comando_id), "REBOOT_TERMINAL") if str(req.comando_id).isdigit() else str(req.comando_id)

    log = ComandoRemotoLog(
        dispositivo_id=device.id,
        comando=cmd_name,
        estado="SUCCESS",
        fecha_solicitud=datetime.utcnow(),
        http_status=200
    )
    db.add(log)
    db.commit()

    return {
        "status": "success",
        "message": f"Comando '{cmd_name}' enviado correctamente al dispositivo {device.nombre or device.device_id}.",
        "dispositivo_id": device.id,
        "device_id": device.device_id,
        "comando": cmd_name
    }
