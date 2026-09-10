from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, date, time
from decimal import Decimal

# Tipo Solicitud Cliente
class TipoSolicitudClienteBase(BaseModel):
    codigo: str
    nombre: str
    descripcion: Optional[str] = None
    requiere_linea_servicio: bool = False
    requiere_dispositivo: bool = False
    permite_fecha_requerida: bool = True
    permite_documentos: bool = True
    orden_visual: int = 100
    activo: bool = True

class TipoSolicitudClienteResponse(TipoSolicitudClienteBase):
    id: int

    class Config:
        from_attributes = True

# Solicitud Cliente
class SolicitudClienteBase(BaseModel):
    tipo_solicitud_id: int
    linea_servicio_id: Optional[int] = None
    dispositivo_id: Optional[int] = None
    aprovisionamiento_id: Optional[int] = None
    prioridad: str = "NORMAL"
    motivo: Optional[str] = None
    descripcion: Optional[str] = None
    datos_solicitud: Dict[str, Any] = {}
    fecha_requerida: Optional[date] = None

class SolicitudClienteCreate(SolicitudClienteBase):
    tenant_id: Optional[int] = None

class SolicitudClienteUpdate(BaseModel):
    estado: Optional[str] = None
    asignado_a_usuario_id: Optional[int] = None
    resolucion: Optional[str] = None
    motivo_cierre: Optional[str] = None

class SolicitudClienteResponse(SolicitudClienteBase):
    id: int
    codigo_solicitud: str
    tenant_id: int
    estado: str
    canal_origen: str
    solicitado_por_usuario_id: Optional[int] = None
    asignado_a_usuario_id: Optional[int] = None
    fecha_solicitud: datetime
    fecha_primera_atencion: Optional[datetime] = None
    fecha_atendida: Optional[datetime] = None
    fecha_cierre: Optional[datetime] = None
    fecha_limite_primera_atencion: Optional[datetime] = None
    fecha_limite_resolucion: Optional[datetime] = None
    cumplio_sla_primera_atencion: Optional[bool] = None
    cumplio_sla_resolucion: Optional[bool] = None
    
    # Optional expanded fields
    tipo_solicitud_nombre: Optional[str] = None
    solicitado_por_nombre: Optional[str] = None
    asignado_a_nombre: Optional[str] = None
    linea_servicio_nombre: Optional[str] = None
    
    # SLA View Fields
    sla_semaforo: Optional[str] = None
    sla_minutos_restantes: Optional[int] = None
    sla_minutos_consumidos: Optional[int] = None
    sla_porcentaje_consumido: Optional[Decimal] = None
    tiene_pausa_abierta: Optional[bool] = None

    class Config:
        from_attributes = True

# Historial
class SolicitudClienteHistorialResponse(BaseModel):
    id: int
    solicitud_id: int
    tipo_evento: str
    estado_anterior: Optional[str] = None
    estado_nuevo: Optional[str] = None
    comentario: Optional[str] = None
    detalle_json: Optional[Dict[str, Any]] = None
    usuario_id: Optional[int] = None
    fecha_evento: datetime

    class Config:
        from_attributes = True

# Comentario
class SolicitudClienteComentarioCreate(BaseModel):
    comentario: str
    visibilidad: str = "PUBLICO"

class SolicitudClienteComentarioResponse(SolicitudClienteComentarioCreate):
    id: int
    solicitud_id: int
    usuario_id: Optional[int] = None
    fecha_comentario: datetime

    class Config:
        from_attributes = True

# Documento
class SolicitudClienteDocumentoResponse(BaseModel):
    id: int
    solicitud_id: int
    tipo_documento: Optional[str] = None
    descripcion: Optional[str] = None
    archivo_uri: str
    archivo_nombre: str
    archivo_mime_type: Optional[str] = None
    archivo_tamano_bytes: Optional[int] = None
    visibilidad: str
    subido_por_usuario_id: Optional[int] = None
    fecha_subida: datetime

    class Config:
        from_attributes = True

# SLA Pausa
class SolicitudClienteSlaPausaResponse(BaseModel):
    id: int
    solicitud_id: int
    motivo: str
    detalle: Optional[str] = None
    fecha_inicio: datetime
    fecha_fin: Optional[datetime] = None

    class Config:
        from_attributes = True

# SLA Politica
class SolicitudSlaPoliticaBase(BaseModel):
    tipo_solicitud_id: int
    prioridad: str
    minutos_primera_atencion: int
    minutos_resolucion: int
    tipo_tiempo: str
    umbral_amarillo_pct: Decimal
    pausar_requiere_informacion: bool
    dias_habiles: List[int]
    hora_inicio_habil: time
    hora_fin_habil: time

class SolicitudSlaPoliticaCreate(SolicitudSlaPoliticaBase):
    pass

class SolicitudSlaPoliticaResponse(SolicitudSlaPoliticaBase):
    id: int
    vigente_desde: datetime
    vigente_hasta: Optional[datetime] = None
    activo: bool
    tipo_solicitud_nombre: Optional[str] = None

    class Config:
        from_attributes = True

# Dias no laborables
class SolicitudSlaDiaNoLaborableBase(BaseModel):
    fecha: date
    descripcion: str
    activo: bool = True

class SolicitudSlaDiaNoLaborableCreate(SolicitudSlaDiaNoLaborableBase):
    pass

class SolicitudSlaDiaNoLaborableResponse(SolicitudSlaDiaNoLaborableBase):
    id: int

    class Config:
        from_attributes = True
