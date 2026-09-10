from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from decimal import Decimal

# Token & Auth Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    user_id: Optional[int] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserCreate(BaseModel):
    nombre: str
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    nombre: str
    email: str
    email_recuperacion: Optional[str] = None
    celular: Optional[str] = None
    sigla_corta: Optional[str] = None
    pais: Optional[str] = None
    zona_horaria: Optional[str] = None
    foto_url: Optional[str] = None
    fecha_creacion: Optional[datetime] = None
    role_codes: List[str] = []

    class Config:
        from_attributes = True

# Cuenta Schemas
class CuentaBase(BaseModel):
    numero_cuenta: str
    nombre: str

class CuentaCreate(CuentaBase):
    pass

class CuentaUpdate(BaseModel):
    numero_cuenta: Optional[str] = None
    nombre: Optional[str] = None

class CuentaResponse(CuentaBase):
    id: int
    fecha_creacion: Optional[datetime] = None

    class Config:
        from_attributes = True

# Dispositivo Schemas
class DispositivoBase(BaseModel):
    device_id: str
    nombre: Optional[str] = None
    kit_starlink: Optional[str] = None

class DispositivoCreate(DispositivoBase):
    pass

class DispositivoUpdate(BaseModel):
    device_id: Optional[str] = None
    nombre: Optional[str] = None
    kit_starlink: Optional[str] = None

class DispositivoResponse(DispositivoBase):
    id: int
    fecha_creacion: Optional[datetime] = None

    class Config:
        from_attributes = True

# LineaServicio Schemas
class LineaServicioBase(BaseModel):
    cuenta_id: Optional[int] = None
    dispositivo_id: Optional[int] = None
    numero_linea: str
    nombre: str
    subscription_id: Optional[str] = None
    id_producto: Optional[str] = None
    tipo_suscripcion: Optional[str] = None
    plan_contratado: Optional[str] = None
    es_plan_movil: Optional[bool] = False
    estado_provisionamiento: Optional[str] = None
    permitir_excedentes_opt_in: Optional[bool] = False

class LineaServicioCreate(LineaServicioBase):
    pass

class LineaServicioUpdate(BaseModel):
    cuenta_id: Optional[int] = None
    dispositivo_id: Optional[int] = None
    numero_linea: Optional[str] = None
    nombre: Optional[str] = None
    subscription_id: Optional[str] = None
    id_producto: Optional[str] = None
    tipo_suscripcion: Optional[str] = None
    plan_contratado: Optional[str] = None
    es_plan_movil: Optional[bool] = None
    estado_provisionamiento: Optional[str] = None
    permitir_excedentes_opt_in: Optional[bool] = None

class SaldosHistorialResponse(BaseModel):
    id: int
    linea_servicio_id: int
    fecha_hora_lectura: datetime
    periodo: Optional[str] = None
    moneda: Optional[str] = None
    bolsa_contratada_gb: Optional[Decimal] = None
    consumo_estandar_gb: Optional[Decimal] = None
    consumo_prioridad_gb: Optional[Decimal] = None
    recargas_compradas_gb: Optional[Decimal] = None
    recargas_consumidas_gb: Optional[Decimal] = None
    saldo_recurrente_gb: Optional[Decimal] = None
    saldo_total_disponible_gb: Optional[Decimal] = None
    total_consumido_gb: Optional[Decimal] = None
    porcentaje_uso_sobre_contratado: Optional[Decimal] = None
    consumo_excedente_opt_in_gb: Optional[Decimal] = None
    fecha_registro_bd: Optional[datetime] = None

    class Config:
        from_attributes = True

class LineaServicioResponse(LineaServicioBase):
    id: int
    dispositivo: Optional[DispositivoResponse] = None
    cuenta: Optional[CuentaResponse] = None
    saldos: List[SaldosHistorialResponse] = []
    fecha_creacion: Optional[datetime] = None

    class Config:
        from_attributes = True

# Planes Resumen Schemas
class PlanResumenItem(BaseModel):
    id: str
    plan_contratado: str
    id_producto: Optional[str] = None
    tipo_suscripcion: Optional[str] = None
    cantidad_servicios: int
    cantidad_equipos: int
    usage_limit_gb_unit: Optional[float] = 0.0
    capacidad_total_gb: Optional[float] = 0.0
    valor_plan: Optional[float] = 0.0
    monto_total_contratado: Optional[float] = 0.0
    consumo_ciclo_gb: Optional[float] = 0.0
    utilizacion_pct: Optional[float] = 0.0
    moneda: Optional[str] = "PEN"
    estado: Optional[str] = "Activo"

class PlanesKPIs(BaseModel):
    planes_distintos: int
    equipos_con_plan: int
    servicios_con_plan: int
    monto_mensual_contratado: float
    capacidad_total_gb: float
    moneda: Optional[str] = "PEN"

class PlanesResumenResponse(BaseModel):
    kpis: PlanesKPIs
    planes: List[PlanResumenItem]

# CatalogoAlerta Schemas
class CatalogoAlertaBase(BaseModel):
    codigo_alerta: str
    nombre: str
    descripcion: Optional[str] = None
    criticidad: Optional[str] = "info" # critical, warning, info

class CatalogoAlertaCreate(CatalogoAlertaBase):
    pass

class CatalogoAlertaUpdate(BaseModel):
    codigo_alerta: Optional[str] = None
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    criticidad: Optional[str] = None

class CatalogoAlertaResponse(CatalogoAlertaBase):
    id: int
    fecha_creacion: Optional[datetime] = None

    class Config:
        from_attributes = True

# AlertaLog Schemas
class AlertaLogResponse(BaseModel):
    id: int
    dispositivo_id: int
    dispositivo: Optional[DispositivoResponse] = None
    catalogo_alerta_id: int
    catalogo_alerta: Optional[CatalogoAlertaResponse] = None
    fecha_hora_deteccion: datetime
    activa: bool
    fecha_registro_bd: Optional[datetime] = None

    class Config:
        from_attributes = True

# Dashboard KPI Schema
class DashboardKPIs(BaseModel):
    active_terminals: int
    total_terminals: int
    critical_alerts: int
    avg_latency_ms: float
    total_data_usage_gb: float

# Telemetry Trend Schema
class TelemetryTrendPoint(BaseModel):
    timestamp: str
    downlink_mbps: float
    uplink_mbps: float
    latency_ms: float
    data_usage_gb: float

# Organización Schemas
class NivelOrganizacionConfigBase(BaseModel):
    numero_nivel: int
    nombre_nivel: str
    nombre_nivel_plural: Optional[str] = None
    activo: bool = True

class NivelOrganizacionConfigUpdate(BaseModel):
    nombre_nivel: Optional[str] = None
    nombre_nivel_plural: Optional[str] = None
    activo: Optional[bool] = None

class NivelOrganizacionConfigResponse(NivelOrganizacionConfigBase):
    tenant_id: int
    fecha_creacion: Optional[datetime] = None

    class Config:
        from_attributes = True

class UnidadOrganizacionalBase(BaseModel):
    numero_nivel: int
    codigo: str
    nombre: str
    descripcion: Optional[str] = None
    activo: bool = True
    parent_id: Optional[int] = None

class UnidadOrganizacionalCreate(UnidadOrganizacionalBase):
    pass

class UnidadOrganizacionalUpdate(BaseModel):
    codigo: Optional[str] = None
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    parent_id: Optional[int] = None
    activo: Optional[bool] = None

class UnidadOrganizacionalResponse(UnidadOrganizacionalBase):
    id: int
    tenant_id: int
    parent_nombre: Optional[str] = None
    fecha_creacion: Optional[datetime] = None

    class Config:
        from_attributes = True

class CentroCostoBase(BaseModel):
    codigo: str
    nombre: str
    descripcion: Optional[str] = None
    moneda_referencia: Optional[str] = None
    activo: bool = True

class CentroCostoCreate(CentroCostoBase):
    pass

class CentroCostoUpdate(BaseModel):
    codigo: Optional[str] = None
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    moneda_referencia: Optional[str] = None
    activo: Optional[bool] = None

class CentroCostoResponse(CentroCostoBase):
    id: int
    tenant_id: int
    fecha_creacion: Optional[datetime] = None

    class Config:
        from_attributes = True

# Usuarios y Seguridad Schemas
class RolPortalResponse(BaseModel):
    id: int
    codigo: str
    descripcion: str

    class Config:
        from_attributes = True

class UsuarioRolesResponse(BaseModel):
    rol: RolPortalResponse

    class Config:
        from_attributes = True

class TenantUsuarioResponse(BaseModel):
    tenant_id: int

    class Config:
        from_attributes = True

class UsuarioMfaResponse(BaseModel):
    habilitado: bool
    tipo: Optional[str] = None
    fecha_confirmacion: Optional[datetime] = None

    class Config:
        from_attributes = True

class UsuarioSesionResponse(BaseModel):
    id: int
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    fecha_inicio: datetime
    ultima_actividad: datetime
    fecha_expiracion: datetime
    revocada: bool

    class Config:
        from_attributes = True

class UsuarioBase(BaseModel):
    nombre: str
    email: str
    email_recuperacion: Optional[str] = None
    activo: bool = True
    acceso_todos_tenants: bool = False

class UsuarioCreateAdmin(UsuarioBase):
    password: str
    roles: List[str] # List of role codigos
    tenant_ids: List[int] = [] # Only for restricted reseller or client

class UsuarioUpdateAdmin(BaseModel):
    nombre: Optional[str] = None
    email: Optional[EmailStr] = None
    email_recuperacion: Optional[str] = None
    activo: Optional[bool] = None
    acceso_todos_tenants: Optional[bool] = None
    roles: Optional[List[str]] = None
    tenant_ids: Optional[List[int]] = None

class UsuarioAdminResponse(UsuarioBase):
    id: int
    intentos_fallidos: int
    bloqueado_hasta: Optional[datetime] = None
    celular: Optional[str] = None
    sigla_corta: Optional[str] = None
    pais: Optional[str] = None
    zona_horaria: Optional[str] = None
    foto_url: Optional[str] = None
    bloqueado_manual: bool = False
    motivo_bloqueo: Optional[str] = None
    debe_cambiar_password: bool = False
    fecha_creacion: Optional[datetime] = None
    ultimo_intento_fallido_en: Optional[datetime] = None

    roles: List[UsuarioRolesResponse] = []
    tenant_usuarios: List[TenantUsuarioResponse] = []
    mfa: Optional[UsuarioMfaResponse] = None

    class Config:
        from_attributes = True

class PoliticasSeguridadBase(BaseModel):
    longitud_minima_password: int
    longitud_maxima_password: int
    max_intentos_fallidos: int
    minutos_bloqueo: int
    duracion_token_reset_minutos: int
    timeout_inactividad_minutos: int
    duracion_maxima_sesion_horas: int
    cantidad_passwords_historial: int
    mfa_obligatorio_reseller: bool
    mfa_obligatorio_cliente: bool
    requerir_email_recuperacion_verificado: bool
    validar_password_comprometido: bool

class PoliticasSeguridadResponse(PoliticasSeguridadBase):
    id: int
    tenant_id: Optional[int] = None
    activo: bool

    class Config:
        from_attributes = True

class PoliticasSeguridadCreate(PoliticasSeguridadBase):
    tenant_id: Optional[int] = None

class PoliticasSeguridadUpdate(BaseModel):
    longitud_minima_password: Optional[int] = None
    longitud_maxima_password: Optional[int] = None
    max_intentos_fallidos: Optional[int] = None
    minutos_bloqueo: Optional[int] = None
    duracion_token_reset_minutos: Optional[int] = None
    timeout_inactividad_minutos: Optional[int] = None
    duracion_maxima_sesion_horas: Optional[int] = None
    cantidad_passwords_historial: Optional[int] = None
    mfa_obligatorio_reseller: Optional[bool] = None
    mfa_obligatorio_cliente: Optional[bool] = None
    requerir_email_recuperacion_verificado: Optional[bool] = None
    validar_password_comprometido: Optional[bool] = None
    activo: Optional[bool] = None

class AuditoriaSeguridadResponse(BaseModel):
    id: int
    evento: str
    descripcion: Optional[str] = None
    ip_origen: Optional[str] = None
    user_agent: Optional[str] = None
    fecha_evento: datetime

    class Config:
        from_attributes = True

class UsuarioSesionDetalleResponse(UsuarioSesionResponse):
    usuario_email: str
    usuario_nombre: str
    rol_principal: Optional[str] = None
    cliente_principal: Optional[str] = None

class UsuarioSeguridadEstadoResponse(BaseModel):
    id: int
    nombre: str
    email: str
    roles: List[str]
    alcance: str
    mfa_habilitado: bool
    intentos_fallidos: int
    bloqueado: bool
    sesiones_activas: int
    ultima_ip: Optional[str] = None
    ultimo_login: Optional[datetime] = None

    class Config:
        from_attributes = True

class UsuarioSesionDetalleResponse(UsuarioSesionResponse):
    usuario_email: str
    usuario_nombre: str
    rol_principal: Optional[str] = None
    cliente_principal: Optional[str] = None

class UsuarioSeguridadEstadoResponse(BaseModel):
    id: int
    nombre: str
    email: str
    roles: List[str]
    alcance: str
    mfa_habilitado: bool
    intentos_fallidos: int
    bloqueado: bool
    sesiones_activas: int
    ultima_ip: Optional[str] = None
    ultimo_login: Optional[datetime] = None

    class Config:
        from_attributes = True

class TenantPoliticaResponse(BaseModel):
    tenant_id: int
    razon_social: str
    politica: Optional[PoliticasSeguridadResponse] = None

    class Config:
        from_attributes = True

class PerfilUpdate(BaseModel):
    nombre: Optional[str] = None
    email_recuperacion: Optional[str] = None
    # Pendientes Reales (No existen en BD aún)
    celular: Optional[str] = None
    sigla_corta: Optional[str] = None
    pais: Optional[str] = None
    zona_horaria: Optional[str] = None
    foto_url: Optional[str] = None

class PerfilPasswordUpdate(BaseModel):
    password_actual: str
    nueva_password: str

# Dispositivos Estado y Ubicación Schemas
class DispositivoEstadoUbicacionItem(BaseModel):
    id: int
    device_id: str
    nombre: str
    numero_linea: Optional[str] = None
    plan_contratado: Optional[str] = None
    estado_operativo: str
    conectado: bool
    latencia_ms: float
    ping_drop_rate: float
    alertas_activas: int
    geozona_estado: str
    latitud: float
    longitud: float
    distrito: str
    es_ubicacion_demo: bool
    ultima_actualizacion: Optional[str] = None

class EstadoUbicacionKPIs(BaseModel):
    equipos_totales: int
    equipos_online: int
    equipos_con_alerta: int
    equipos_fuera_geozona: int
    latencia_promedio_ms: float
    packet_loss_promedio_pct: float

class DispositivosEstadoUbicacionResponse(BaseModel):
    kpis: EstadoUbicacionKPIs
    ubicacion_demo_global: bool
    dispositivos: List[DispositivoEstadoUbicacionItem]


# Tenant Configuration & Branding Schemas
class TenantConfiguracionGlobalUpdate(BaseModel):
    nombre_corto: Optional[str] = Field(None, max_length=50)
    color_primario: Optional[str] = Field(None, max_length=10)
    color_secundario: Optional[str] = Field(None, max_length=10)
    prefijo_codigo: Optional[str] = Field(None, max_length=20)
    moneda_principal: Optional[str] = Field(None, max_length=10)

class TenantConfiguracionGlobalResponse(BaseModel):
    tenant_id: int
    razon_social: Optional[str] = None
    nombre_comercial: Optional[str] = None
    nombre_corto: Optional[str] = None
    color_primario: str = "#00382B"
    color_secundario: str = "#D99B26"
    logo_url: Optional[str] = None
    logo_nombre: Optional[str] = None
    logo_sha256: Optional[str] = None
    logo_mime_type: Optional[str] = None
    logo_tamano_bytes: Optional[int] = None
    fecha_modificacion: Optional[datetime] = None

    class Config:
        from_attributes = True


