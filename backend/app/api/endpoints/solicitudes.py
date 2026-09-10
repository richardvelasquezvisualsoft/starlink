from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import os
import shutil
from html.parser import HTMLParser

from app.core.database import get_db
from app.models import (
    Usuario, SolicitudCliente, SolicitudClienteHistorial,
    SolicitudClienteComentario, SolicitudClienteDocumento,
    TipoSolicitudCliente, LineaServicio, Cuenta,
    SolicitudSlaPolitica, SolicitudClienteSlaPausa
)
from app.api.endpoints.auth import get_current_user
from app.api.deps import get_tenant_context
from app.solicitudes_schemas import (
    SolicitudClienteResponse, SolicitudClienteCreate, SolicitudClienteUpdate,
    SolicitudClienteHistorialResponse, SolicitudClienteComentarioResponse,
    SolicitudClienteComentarioCreate, SolicitudClienteDocumentoResponse,
    TipoSolicitudClienteResponse
)

router = APIRouter()

class HTMLSanitizer(HTMLParser):
    ALLOWED_TAGS = {'p', 'br', 'b', 'strong', 'i', 'em', 'u', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'span', 'div', 'blockquote'}
    ALLOWED_CLASSES = {'fs-normal', 'fs-destacado', 'fs-titulo', 'text-bold', 'text-italic'}
    
    def __init__(self):
        super().__init__()
        self.result = []

    def handle_starttag(self, tag, attrs):
        tag_l = tag.lower()
        if tag_l in self.ALLOWED_TAGS:
            clean_attrs = []
            for name, val in attrs:
                if name.lower() == 'class':
                    classes = [c for c in val.split() if c in self.ALLOWED_CLASSES]
                    if classes:
                        clean_attrs.append(f'class="{" ".join(classes)}"')
            attr_str = (' ' + ' '.join(clean_attrs)) if clean_attrs else ''
            if tag_l == 'br':
                self.result.append('<br/>')
            else:
                self.result.append(f'<{tag_l}{attr_str}>')

    def handle_endtag(self, tag):
        tag_l = tag.lower()
        if tag_l in self.ALLOWED_TAGS and tag_l != 'br':
            self.result.append(f'</{tag_l}>')

    def handle_data(self, data):
        escaped = data.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
        self.result.append(escaped)

def sanitize_html(html_content: str) -> str:
    if not html_content:
        return ""
    parser = HTMLSanitizer()
    parser.feed(html_content)
    return "".join(parser.result)


@router.get("/tipos", response_model=List[TipoSolicitudClienteResponse])
def get_tipos_solicitud(db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    return db.query(TipoSolicitudCliente).filter(TipoSolicitudCliente.activo == True).order_by(TipoSolicitudCliente.orden_visual).all()


@router.get("/planes-elegibles", response_model=List[str])
def get_planes_elegibles(
    db: Session = Depends(get_db),
    tenant_ctx: dict = Depends(get_tenant_context)
):
    tenant_id = tenant_ctx.get("tenant_id")
    query = db.query(LineaServicio.plan_contratado).join(Cuenta, Cuenta.id == LineaServicio.cuenta_id)
    if tenant_id:
        query = query.filter(Cuenta.tenant_id == tenant_id)
    results = query.distinct().all()
    planes = [r[0] for r in results if r[0]]
    if not planes:
        planes = ["Priority 500GB", "Priority 1TB", "Priority 2TB", "Priority 5TB", "Mobile Priority 50GB", "Mobile Priority 1TB", "Standard"]
    return sorted(list(set(planes)))


@router.get("", response_model=List[SolicitudClienteResponse])
@router.get("/", response_model=List[SolicitudClienteResponse])
def get_solicitudes(
    estado: Optional[str] = None,
    prioridad: Optional[str] = None,
    db: Session = Depends(get_db),
    tenant_ctx: dict = Depends(get_tenant_context)
):
    query = db.query(SolicitudCliente)
    
    tenant_id = tenant_ctx.get("tenant_id")
    if tenant_id:
        query = query.filter(SolicitudCliente.tenant_id == tenant_id)
        
    if estado:
        query = query.filter(SolicitudCliente.estado == estado)
    if prioridad:
        query = query.filter(SolicitudCliente.prioridad == prioridad)
        
    query = query.order_by(SolicitudCliente.fecha_solicitud.desc())
    solicitudes = query.all()
    
    for s in solicitudes:
        s.tipo_solicitud_nombre = s.tipo_solicitud.nombre if s.tipo_solicitud else None
        s.solicitado_por_nombre = s.solicitado_por.nombre if s.solicitado_por else None
        s.asignado_a_nombre = s.asignado_a.nombre if s.asignado_a else None
        s.linea_servicio_nombre = s.linea_servicio.numero_linea if s.linea_servicio else None
        if s.vista_sla and len(s.vista_sla) > 0:
            s.sla_semaforo = s.vista_sla[0].sla_semaforo
            s.sla_minutos_restantes = s.vista_sla[0].sla_minutos_restantes
            s.sla_minutos_consumidos = s.vista_sla[0].sla_minutos_consumidos
            s.sla_porcentaje_consumido = s.vista_sla[0].sla_porcentaje_consumido
            s.tiene_pausa_abierta = s.vista_sla[0].tiene_pausa_abierta
        elif s.fecha_limite_resolucion:
            now = datetime.utcnow()
            diff_seconds = (s.fecha_limite_resolucion - now).total_seconds()
            s.sla_minutos_restantes = int(diff_seconds / 60.0)
            if diff_seconds < 0:
                s.sla_semaforo = 'ROJO'
            elif diff_seconds <= 14400:
                s.sla_semaforo = 'AMARILLO'
            else:
                s.sla_semaforo = 'VERDE'
        else:
            s.sla_semaforo = 'SIN_SLA'
        
    return solicitudes


@router.post("", response_model=SolicitudClienteResponse)
@router.post("/", response_model=SolicitudClienteResponse)
def create_solicitud(
    solicitud_in: SolicitudClienteCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    tenant_ctx: dict = Depends(get_tenant_context)
):
    tenant_id = tenant_ctx.get("tenant_id") or 1
    
    # Check tenant ownership of service line if provided
    if solicitud_in.linea_servicio_id:
        linea = db.query(LineaServicio).join(Cuenta, Cuenta.id == LineaServicio.cuenta_id).filter(
            LineaServicio.id == solicitud_in.linea_servicio_id,
            Cuenta.tenant_id == tenant_id
        ).first()
        if not linea:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="La línea de servicio especificada no pertenece al tenant autenticado"
            )

    # Validate type
    tipo = db.query(TipoSolicitudCliente).filter(
        TipoSolicitudCliente.id == solicitud_in.tipo_solicitud_id,
        TipoSolicitudCliente.activo == True
    ).first()
    if not tipo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tipo de solicitud {solicitud_in.tipo_solicitud_id} no válido o inactivo"
        )
        
    if tipo.requiere_linea_servicio and not solicitud_in.linea_servicio_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El tipo de solicitud '{tipo.nombre}' requiere seleccionar una línea de servicio"
        )
        
    import random
    code = f"SOL-{datetime.utcnow().strftime('%Y%m%d')}-{random.randint(1000, 9999)}"
    
    # Sanitize HTML description
    desc_sanitized = sanitize_html(solicitud_in.descripcion or "")
    
    # Check SLA Policy
    sla_pol = db.query(SolicitudSlaPolitica).filter(
        SolicitudSlaPolitica.tipo_solicitud_id == tipo.id,
        SolicitudSlaPolitica.prioridad == (solicitud_in.prioridad or "NORMAL"),
        SolicitudSlaPolitica.activo == True
    ).first()
    
    now = datetime.utcnow()
    limite_atencion = None
    limite_resolucion = None
    sla_pol_id = None
    min_atencion = None
    min_resolucion = None
    
    if sla_pol:
        sla_pol_id = sla_pol.id
        min_atencion = sla_pol.minutos_primera_atencion
        min_resolucion = sla_pol.minutos_resolucion
        limite_atencion = now + timedelta(minutes=sla_pol.minutos_primera_atencion)
        limite_resolucion = now + timedelta(minutes=sla_pol.minutos_resolucion)
    
    nueva_solicitud = SolicitudCliente(
        codigo_solicitud=code,
        tenant_id=tenant_id,
        tipo_solicitud_id=solicitud_in.tipo_solicitud_id,
        linea_servicio_id=solicitud_in.linea_servicio_id,
        dispositivo_id=solicitud_in.dispositivo_id,
        prioridad=solicitud_in.prioridad or "NORMAL",
        motivo=solicitud_in.motivo,
        descripcion=desc_sanitized,
        datos_solicitud=solicitud_in.datos_solicitud or {},
        fecha_requerida=solicitud_in.fecha_requerida,
        solicitado_por_usuario_id=current_user.id,
        estado="PENDIENTE",
        canal_origen="PORTAL_CLIENTE",
        creado_por=current_user.id,
        sla_politica_id=sla_pol_id,
        sla_primera_atencion_minutos=min_atencion,
        sla_resolucion_minutos=min_resolucion,
        fecha_limite_primera_atencion=limite_atencion,
        fecha_limite_resolucion=limite_resolucion
    )
    db.add(nueva_solicitud)
    db.commit()
    db.refresh(nueva_solicitud)
    
    historial = SolicitudClienteHistorial(
        solicitud_id=nueva_solicitud.id,
        tipo_evento="CREADA",
        estado_nuevo="PENDIENTE",
        comentario=f"Solicitud {code} creada desde el portal de cliente",
        usuario_id=current_user.id
    )
    db.add(historial)
    db.commit()
    
    nueva_solicitud.tipo_solicitud_nombre = tipo.nombre
    nueva_solicitud.solicitado_por_nombre = current_user.nombre
    if nueva_solicitud.linea_servicio:
        nueva_solicitud.linea_servicio_nombre = nueva_solicitud.linea_servicio.numero_linea
    nueva_solicitud.sla_semaforo = 'VERDE' if limite_resolucion else 'SIN_SLA'
    return nueva_solicitud


@router.get("/{solicitud_id}", response_model=SolicitudClienteResponse)
def get_solicitud(solicitud_id: int, db: Session = Depends(get_db), tenant_ctx: dict = Depends(get_tenant_context)):
    solicitud = db.query(SolicitudCliente).filter(SolicitudCliente.id == solicitud_id).first()
    if not solicitud:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
        
    tenant_id = tenant_ctx.get("tenant_id")
    if tenant_id and solicitud.tenant_id != tenant_id:
        raise HTTPException(status_code=403, detail="No autorizado para ver solicitudes de otro tenant")
            
    solicitud.tipo_solicitud_nombre = solicitud.tipo_solicitud.nombre if solicitud.tipo_solicitud else None
    solicitud.solicitado_por_nombre = solicitud.solicitado_por.nombre if solicitud.solicitado_por else None
    solicitud.asignado_a_nombre = solicitud.asignado_a.nombre if solicitud.asignado_a else None
    solicitud.linea_servicio_nombre = solicitud.linea_servicio.numero_linea if solicitud.linea_servicio else None
    
    if solicitud.vista_sla:
        solicitud.sla_semaforo = solicitud.vista_sla[0].sla_semaforo if solicitud.vista_sla else None
        solicitud.sla_minutos_restantes = solicitud.vista_sla[0].sla_minutos_restantes if solicitud.vista_sla else None
        solicitud.sla_minutos_consumidos = solicitud.vista_sla[0].sla_minutos_consumidos if solicitud.vista_sla else None
        solicitud.sla_porcentaje_consumido = solicitud.vista_sla[0].sla_porcentaje_consumido if solicitud.vista_sla else None
        solicitud.tiene_pausa_abierta = solicitud.vista_sla[0].tiene_pausa_abierta if solicitud.vista_sla else None
    elif solicitud.fecha_limite_resolucion:
        now = datetime.utcnow()
        diff_seconds = (solicitud.fecha_limite_resolucion - now).total_seconds()
        solicitud.sla_minutos_restantes = int(diff_seconds / 60.0)
        if diff_seconds < 0:
            solicitud.sla_semaforo = 'ROJO'
        elif diff_seconds <= 14400:
            solicitud.sla_semaforo = 'AMARILLO'
        else:
            solicitud.sla_semaforo = 'VERDE'
    else:
        solicitud.sla_semaforo = 'SIN_SLA'

    return solicitud


@router.get("/{solicitud_id}/historial", response_model=List[SolicitudClienteHistorialResponse])
def get_solicitud_historial(
    solicitud_id: int,
    db: Session = Depends(get_db),
    tenant_ctx: dict = Depends(get_tenant_context)
):
    solicitud = db.query(SolicitudCliente).filter(SolicitudCliente.id == solicitud_id).first()
    if not solicitud:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    tenant_id = tenant_ctx.get("tenant_id")
    if tenant_id and solicitud.tenant_id != tenant_id:
        raise HTTPException(status_code=403, detail="No autorizado")
    return db.query(SolicitudClienteHistorial).filter(SolicitudClienteHistorial.solicitud_id == solicitud_id).order_by(SolicitudClienteHistorial.fecha_evento.desc()).all()


@router.get("/{solicitud_id}/comentarios", response_model=List[SolicitudClienteComentarioResponse])
def get_solicitud_comentarios(
    solicitud_id: int,
    db: Session = Depends(get_db),
    tenant_ctx: dict = Depends(get_tenant_context)
):
    solicitud = db.query(SolicitudCliente).filter(SolicitudCliente.id == solicitud_id).first()
    if not solicitud:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    tenant_id = tenant_ctx.get("tenant_id")
    if tenant_id and solicitud.tenant_id != tenant_id:
        raise HTTPException(status_code=403, detail="No autorizado")
    return db.query(SolicitudClienteComentario).filter(
        SolicitudClienteComentario.solicitud_id == solicitud_id,
        SolicitudClienteComentario.visibilidad == "PUBLICO"
    ).order_by(SolicitudClienteComentario.fecha_comentario.desc()).all()


@router.post("/{solicitud_id}/comentarios", response_model=SolicitudClienteComentarioResponse)
def add_solicitud_comentario(
    solicitud_id: int,
    comentario: SolicitudClienteComentarioCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    tenant_ctx: dict = Depends(get_tenant_context)
):
    solicitud = db.query(SolicitudCliente).filter(SolicitudCliente.id == solicitud_id).first()
    if not solicitud:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    tenant_id = tenant_ctx.get("tenant_id")
    if tenant_id and solicitud.tenant_id != tenant_id:
        raise HTTPException(status_code=403, detail="No autorizado")
        
    vis = "PUBLICO"
    nuevo_comentario = SolicitudClienteComentario(
        solicitud_id=solicitud_id,
        comentario=comentario.comentario,
        visibilidad=vis,
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
def get_solicitud_documentos(
    solicitud_id: int,
    db: Session = Depends(get_db),
    tenant_ctx: dict = Depends(get_tenant_context)
):
    solicitud = db.query(SolicitudCliente).filter(SolicitudCliente.id == solicitud_id).first()
    if not solicitud:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    tenant_id = tenant_ctx.get("tenant_id")
    if tenant_id and solicitud.tenant_id != tenant_id:
        raise HTTPException(status_code=403, detail="No autorizado")
        
    return db.query(SolicitudClienteDocumento).filter(
        SolicitudClienteDocumento.solicitud_id == solicitud_id,
        SolicitudClienteDocumento.activo == True,
        SolicitudClienteDocumento.visibilidad == "PUBLICO"
    ).order_by(SolicitudClienteDocumento.fecha_subida.desc()).all()


@router.post("/{solicitud_id}/documentos", response_model=SolicitudClienteDocumentoResponse)
def upload_solicitud_documento(
    solicitud_id: int,
    file: UploadFile = File(...),
    visibilidad: str = "PUBLICO",
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    tenant_ctx: dict = Depends(get_tenant_context)
):
    solicitud = db.query(SolicitudCliente).filter(SolicitudCliente.id == solicitud_id).first()
    if not solicitud:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    tenant_id = tenant_ctx.get("tenant_id")
    if tenant_id and solicitud.tenant_id != tenant_id:
        raise HTTPException(status_code=403, detail="No autorizado para modificar solicitudes de otro tenant")
        
    if visibilidad == "INTERNO_RESELLER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Visibilidad INTERNO_RESELLER no permitida para usuarios de CLIENTE"
        )
    visibilidad_final = "PUBLICO"
    
    upload_dir = "uploads/solicitudes"
    os.makedirs(upload_dir, exist_ok=True)
    
    file_path = f"{upload_dir}/{solicitud_id}_{file.filename}"
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    file_size = os.path.getsize(file_path) if os.path.exists(file_path) else None
    
    doc = SolicitudClienteDocumento(
        solicitud_id=solicitud_id,
        archivo_nombre=file.filename,
        archivo_uri=f"/api/v1/{file_path}",
        archivo_mime_type=file.content_type,
        archivo_tamano_bytes=file_size,
        visibilidad=visibilidad_final,
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
