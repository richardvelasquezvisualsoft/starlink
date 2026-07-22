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
    fecha_creacion: Optional[datetime] = None

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
