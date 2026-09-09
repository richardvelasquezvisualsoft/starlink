from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import os
import shutil

from app.core.database import get_db
from app.models import Usuario, SolicitudCliente, SolicitudClienteHistorial, SolicitudClienteComentario, SolicitudClienteDocumento, TipoSolicitudCliente
from app.api.endpoints.auth import get_current_user
from app.solicitudes_schemas import (
    SolicitudClienteResponse, SolicitudClienteCreate, SolicitudClienteUpdate,
    SolicitudClienteHistorialResponse, SolicitudClienteComentarioResponse,
    SolicitudClienteComentarioCreate, SolicitudClienteDocumentoResponse,
    TipoSolicitudClienteResponse
)

router = APIRouter()

def get_reseller_user(current_user: Usuario = Depends(get_current_user)):
    is_reseller = any(ur.rol.codigo == 'RESELLER' for ur in current_user.roles if ur.activo)
    if not is_reseller:
        raise HTTPException(status_code=403, detail="Not authorized. Must be RESELLER.")
    return current_user

@router.get("/tipos", response_model=List[TipoSolicitudClienteResponse])
def get_tipos_solicitud(db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    return db.query(TipoSolicitudCliente).filter(TipoSolicitudCliente.activo == True).order_by(TipoSolicitudCliente.orden_visual).all()

@router.get("/", response_model=List[SolicitudClienteResponse])
def get_solicitudes(
    estado: Optional[str] = None,
    prioridad: Optional[str] = None,
    db: Session = Depends(get_db),
    reseller: Usuario = Depends(get_reseller_user)
):
    query = db.query(SolicitudCliente)
    
    if not reseller.acceso_todos_tenants:
        reseller_tenant_ids = [tu.tenant_id for tu in reseller.tenant_usuarios if tu.activo]
        query = query.filter(SolicitudCliente.tenant_id.in_(reseller_tenant_ids))
        
    if estado:
        query = query.filter(SolicitudCliente.estado == estado)
    if prioridad:
        query = query.filter(SolicitudCliente.prioridad == prioridad)
        
    # Optional sorting
    query = query.order_by(SolicitudCliente.fecha_solicitud.desc())
    solicitudes = query.all()
    
    # Map additional fields for frontend
    for s in solicitudes:
        s.tipo_solicitud_nombre = s.tipo_solicitud.nombre if s.tipo_solicitud else None
        s.solicitado_por_nombre = s.solicitado_por.nombre if s.solicitado_por else None
        s.asignado_a_nombre = s.asignado_a.nombre if s.asignado_a else None
        if s.vista_sla:
            s.sla_semaforo = s.vista_sla[0].sla_semaforo if s.vista_sla else None
            s.sla_minutos_restantes = s.vista_sla[0].sla_minutos_restantes if s.vista_sla else None
            s.sla_minutos_consumidos = s.vista_sla[0].sla_minutos_consumidos if s.vista_sla else None
            s.sla_porcentaje_consumido = s.vista_sla[0].sla_porcentaje_consumido if s.vista_sla else None
            s.tiene_pausa_abierta = s.vista_sla[0].tiene_pausa_abierta if s.vista_sla else None
        # line service can be added if related
        
    return solicitudes

@router.get("/{solicitud_id}", response_model=SolicitudClienteResponse)
def get_solicitud(solicitud_id: int, db: Session = Depends(get_db), reseller: Usuario = Depends(get_reseller_user)):
    solicitud = db.query(SolicitudCliente).filter(SolicitudCliente.id == solicitud_id).first()
    if not solicitud:
        raise HTTPException(status_code=404, detail="Solicitud not found")
        
    if not reseller.acceso_todos_tenants:
        reseller_tenant_ids = [tu.tenant_id for tu in reseller.tenant_usuarios if tu.activo]
        if solicitud.tenant_id not in reseller_tenant_ids:
            raise HTTPException(status_code=403, detail="Not authorized to view this tenant's request")
            
    solicitud.tipo_solicitud_nombre = solicitud.tipo_solicitud.nombre if solicitud.tipo_solicitud else None
    solicitud.solicitado_por_nombre = solicitud.solicitado_por.nombre if solicitud.solicitado_por else None
    solicitud.asignado_a_nombre = solicitud.asignado_a.nombre if solicitud.asignado_a else None
    
    if solicitud.vista_sla:
        solicitud.sla_semaforo = solicitud.vista_sla[0].sla_semaforo if solicitud.vista_sla else None
        solicitud.sla_minutos_restantes = solicitud.vista_sla[0].sla_minutos_restantes if solicitud.vista_sla else None
        solicitud.sla_minutos_consumidos = solicitud.vista_sla[0].sla_minutos_consumidos if solicitud.vista_sla else None
        solicitud.sla_porcentaje_consumido = solicitud.vista_sla[0].sla_porcentaje_consumido if solicitud.vista_sla else None
        solicitud.tiene_pausa_abierta = solicitud.vista_sla[0].tiene_pausa_abierta if solicitud.vista_sla else None

    return solicitud

@router.put("/{solicitud_id}", response_model=SolicitudClienteResponse)
def update_solicitud(solicitud_id: int, update_data: SolicitudClienteUpdate, db: Session = Depends(get_db), reseller: Usuario = Depends(get_reseller_user)):
    solicitud = db.query(SolicitudCliente).filter(SolicitudCliente.id == solicitud_id).first()
    if not solicitud:
        raise HTTPException(status_code=404, detail="Solicitud not found")
        
    if not reseller.acceso_todos_tenants:
        reseller_tenant_ids = [tu.tenant_id for tu in reseller.tenant_usuarios if tu.activo]
        if solicitud.tenant_id not in reseller_tenant_ids:
            raise HTTPException(status_code=403, detail="Not authorized")
            
    estado_anterior = solicitud.estado
    
    if update_data.estado:
        solicitud.estado = update_data.estado
        if update_data.estado == "CERRADO" or update_data.estado == "RESUELTO":
            solicitud.fecha_cierre = datetime.utcnow()
    
    if update_data.asignado_a_usuario_id is not None and update_data.asignado_a_usuario_id != solicitud.asignado_a_usuario_id:
        usuario_anterior = solicitud.asignado_a_usuario_id
        solicitud.asignado_a_usuario_id = update_data.asignado_a_usuario_id
        historial_asignacion = SolicitudClienteHistorial(
            solicitud_id=solicitud.id,
            tipo_evento="ASIGNACION",
            estado_anterior=str(usuario_anterior) if usuario_anterior else "SIN ASIGNAR",
            estado_nuevo=str(update_data.asignado_a_usuario_id),
            usuario_id=reseller.id
        )
        db.add(historial_asignacion)
        
    if update_data.resolucion is not None:
        solicitud.resolucion = update_data.resolucion
        
    if update_data.motivo_cierre is not None:
        solicitud.motivo_cierre = update_data.motivo_cierre
        
    # Create History record and handle Pausas SLA if state changed
    if update_data.estado and update_data.estado != estado_anterior:
        historial = SolicitudClienteHistorial(
            solicitud_id=solicitud.id,
            tipo_evento="CAMBIO_ESTADO",
            estado_anterior=estado_anterior,
            estado_nuevo=update_data.estado,
            usuario_id=reseller.id
        )
        db.add(historial)
        
        # Handle first attention
        if not solicitud.fecha_primera_atencion and update_data.estado in ["EN_REVISION", "EN_PROCESO", "APROBADA", "REQUIERE_INFORMACION"]:
            solicitud.fecha_primera_atencion = datetime.utcnow()
        
        # Handle SLA Pauses
        from app.models import SolicitudClienteSlaPausa
        if update_data.estado == "REQUIERE_INFORMACION" and solicitud.sla_pausar_requiere_informacion:
            # Start Pausa
            pausa = SolicitudClienteSlaPausa(
                solicitud_id=solicitud.id,
                motivo="REQUIERE_INFORMACION_CLIENTE",
                iniciada_por_usuario_id=reseller.id
            )
            db.add(pausa)
        elif estado_anterior == "REQUIERE_INFORMACION" and update_data.estado != "REQUIERE_INFORMACION":
            # Close Pausa
            pausa_abierta = db.query(SolicitudClienteSlaPausa).filter(
                SolicitudClienteSlaPausa.solicitud_id == solicitud.id,
                SolicitudClienteSlaPausa.fecha_fin == None
            ).first()
            if pausa_abierta:
                pausa_abierta.fecha_fin = datetime.utcnow()
                pausa_abierta.finalizada_por_usuario_id = reseller.id
                # El backend real calcularia duracion_sla_minutos via trigger/cron, no bloqueamos
                
    db.commit()
    db.refresh(solicitud)
    
    solicitud.tipo_solicitud_nombre = solicitud.tipo_solicitud.nombre if solicitud.tipo_solicitud else None
    solicitud.solicitado_por_nombre = solicitud.solicitado_por.nombre if solicitud.solicitado_por else None
    solicitud.asignado_a_nombre = solicitud.asignado_a.nombre if solicitud.asignado_a else None
    
    if solicitud.vista_sla:
        solicitud.sla_semaforo = solicitud.vista_sla[0].sla_semaforo if solicitud.vista_sla else None
        solicitud.sla_minutos_restantes = solicitud.vista_sla[0].sla_minutos_restantes if solicitud.vista_sla else None
        solicitud.sla_minutos_consumidos = solicitud.vista_sla[0].sla_minutos_consumidos if solicitud.vista_sla else None
        solicitud.sla_porcentaje_consumido = solicitud.vista_sla[0].sla_porcentaje_consumido if solicitud.vista_sla else None
        solicitud.tiene_pausa_abierta = solicitud.vista_sla[0].tiene_pausa_abierta if solicitud.vista_sla else None

    return solicitud

@router.get("/{solicitud_id}/historial", response_model=List[SolicitudClienteHistorialResponse])
def get_solicitud_historial(solicitud_id: int, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    return db.query(SolicitudClienteHistorial).filter(SolicitudClienteHistorial.solicitud_id == solicitud_id).order_by(SolicitudClienteHistorial.fecha_evento.desc()).all()

@router.get("/{solicitud_id}/comentarios", response_model=List[SolicitudClienteComentarioResponse])
def get_solicitud_comentarios(solicitud_id: int, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    return db.query(SolicitudClienteComentario).filter(SolicitudClienteComentario.solicitud_id == solicitud_id).order_by(SolicitudClienteComentario.fecha_comentario.desc()).all()

@router.post("/{solicitud_id}/comentarios", response_model=SolicitudClienteComentarioResponse)
def add_solicitud_comentario(solicitud_id: int, comentario: SolicitudClienteComentarioCreate, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    nuevo_comentario = SolicitudClienteComentario(
        solicitud_id=solicitud_id,
        comentario=comentario.comentario,
        visibilidad=comentario.visibilidad,
        usuario_id=current_user.id
    )
    db.add(nuevo_comentario)
    
    historial = SolicitudClienteHistorial(
        solicitud_id=solicitud_id,
        tipo_evento="COMENTARIO_AGREGADO",
        comentario="Nuevo comentario agregado",
        usuario_id=current_user.id
    )
    db.add(historial)
    
    db.commit()
    db.refresh(nuevo_comentario)
    return nuevo_comentario

@router.get("/{solicitud_id}/documentos", response_model=List[SolicitudClienteDocumentoResponse])
def get_solicitud_documentos(solicitud_id: int, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    return db.query(SolicitudClienteDocumento).filter(SolicitudClienteDocumento.solicitud_id == solicitud_id, SolicitudClienteDocumento.activo == True).order_by(SolicitudClienteDocumento.fecha_subida.desc()).all()

@router.post("/{solicitud_id}/documentos", response_model=SolicitudClienteDocumentoResponse)
def upload_solicitud_documento(solicitud_id: int, file: UploadFile = File(...), visibilidad: str = "PUBLICO", db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    upload_dir = "uploads/solicitudes"
    os.makedirs(upload_dir, exist_ok=True)
    
    file_path = f"{upload_dir}/{solicitud_id}_{file.filename}"
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    doc = SolicitudClienteDocumento(
        solicitud_id=solicitud_id,
        archivo_nombre=file.filename,
        archivo_uri=f"/api/v1/{file_path}",
        archivo_mime_type=file.content_type,
        visibilidad=visibilidad,
        subido_por_usuario_id=current_user.id
    )
    db.add(doc)
    
    historial = SolicitudClienteHistorial(
        solicitud_id=solicitud_id,
        tipo_evento="DOCUMENTO_ADJUNTO",
        comentario=f"Documento adjunto: {file.filename}",
        usuario_id=current_user.id
    )
    db.add(historial)
    
    db.commit()
    db.refresh(doc)
    return doc

# --- SLA Configuration Endpoints ---

from app.models import SolicitudSlaPolitica, SolicitudSlaDiaNoLaborable
from app.solicitudes_schemas import (
    SolicitudSlaPoliticaResponse, SolicitudSlaPoliticaCreate,
    SolicitudSlaDiaNoLaborableResponse, SolicitudSlaDiaNoLaborableCreate
)

@router.get("/sla/politicas", response_model=List[SolicitudSlaPoliticaResponse])
def get_sla_politicas(db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    politicas = db.query(SolicitudSlaPolitica).filter(SolicitudSlaPolitica.activo == True).all()
    for p in politicas:
        p.tipo_solicitud_nombre = p.tipo_solicitud.nombre if p.tipo_solicitud else None
    return politicas

@router.post("/sla/politicas", response_model=SolicitudSlaPoliticaResponse)
def create_sla_politica(politica: SolicitudSlaPoliticaCreate, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    # Soft delete any existing active policy for the same tipo_solicitud and prioridad
    existing = db.query(SolicitudSlaPolitica).filter(
        SolicitudSlaPolitica.tipo_solicitud_id == politica.tipo_solicitud_id,
        SolicitudSlaPolitica.prioridad == politica.prioridad,
        SolicitudSlaPolitica.activo == True
    ).first()
    
    if existing:
        existing.activo = False
        existing.vigente_hasta = datetime.utcnow()
        existing.modificado_por = current_user.id
        
    nueva_politica = SolicitudSlaPolitica(
        **politica.model_dump(),
        creado_por=current_user.id
    )
    db.add(nueva_politica)
    db.commit()
    db.refresh(nueva_politica)
    
    nueva_politica.tipo_solicitud_nombre = nueva_politica.tipo_solicitud.nombre if nueva_politica.tipo_solicitud else None
    return nueva_politica

@router.get("/sla/dias-no-laborables", response_model=List[SolicitudSlaDiaNoLaborableResponse])
def get_dias_no_laborables(db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    return db.query(SolicitudSlaDiaNoLaborable).order_by(SolicitudSlaDiaNoLaborable.fecha.desc()).all()

@router.post("/sla/dias-no-laborables", response_model=SolicitudSlaDiaNoLaborableResponse)
def create_dia_no_laborable(dia: SolicitudSlaDiaNoLaborableCreate, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    nuevo_dia = SolicitudSlaDiaNoLaborable(
        **dia.model_dump(),
        creado_por=current_user.id
    )
    db.add(nuevo_dia)
    db.commit()
    db.refresh(nuevo_dia)
    return nuevo_dia

