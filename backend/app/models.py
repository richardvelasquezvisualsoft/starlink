from sqlalchemy import Column, Integer, BigInteger, String, Boolean, DateTime, Numeric, Text, ForeignKey, func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Usuario(Base):
    __tablename__ = "usuarios"
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    fecha_creacion = Column(DateTime, default=func.now())
    fecha_modificacion = Column(DateTime, default=func.now(), onupdate=func.now())
    creado_por = Column(Integer, nullable=True)
    modificado_por = Column(Integer, nullable=True)

class Cuenta(Base):
    __tablename__ = "cuentas"
    
    id = Column(Integer, primary_key=True, index=True)
    numero_cuenta = Column(String, unique=True, nullable=False)
    nombre = Column(String, nullable=False)
    fecha_creacion = Column(DateTime, default=func.now())
    fecha_modificacion = Column(DateTime, default=func.now(), onupdate=func.now())
    creado_por = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    modificado_por = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    
    lineas = relationship("LineaServicio", back_populates="cuenta")

class Dispositivo(Base):
    __tablename__ = "dispositivos"
    
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String, unique=True, nullable=False, index=True)
    nombre = Column(String, nullable=True)
    kit_starlink = Column(String, nullable=True)
    fecha_creacion = Column(DateTime, default=func.now())
    fecha_modificacion = Column(DateTime, default=func.now(), onupdate=func.now())
    creado_por = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    modificado_por = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    
    lineas = relationship("LineaServicio", back_populates="dispositivo")
    alertas = relationship("AlertaLog", back_populates="dispositivo")
    telemetrias = relationship("TelemetriaLog", back_populates="dispositivo")
    geolocalizaciones = relationship("GeolocalizacionLog", back_populates="dispositivo")
    estados = relationship("EstadoServicioLog", back_populates="dispositivo")

class LineaServicio(Base):
    __tablename__ = "lineas_servicio"
    
    id = Column(Integer, primary_key=True, index=True)
    cuenta_id = Column(Integer, ForeignKey("cuentas.id"), nullable=True)
    dispositivo_id = Column(Integer, ForeignKey("dispositivos.id"), nullable=True)
    numero_linea = Column(String, unique=True, nullable=False)
    nombre = Column(String, nullable=False)
    subscription_id = Column(String, nullable=True)
    id_producto = Column(String, nullable=True)
    tipo_suscripcion = Column(String, nullable=True)
    plan_contratado = Column(String, nullable=True)
    es_plan_movil = Column(Boolean, default=False)
    estado_provisionamiento = Column(String, nullable=True)
    permitir_excedentes_opt_in = Column(Boolean, default=False, nullable=True)
    fecha_creacion = Column(DateTime, default=func.now())
    fecha_modificacion = Column(DateTime, default=func.now(), onupdate=func.now())
    creado_por = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    modificado_por = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    
    cuenta = relationship("Cuenta", back_populates="lineas")
    dispositivo = relationship("Dispositivo", back_populates="lineas")
    saldos = relationship("SaldosHistorial", back_populates="linea")

class EstadoServicioLog(Base):
    __tablename__ = "estado_servicio_log"
    
    id = Column(BigInteger, primary_key=True, index=True)
    dispositivo_id = Column(Integer, ForeignKey("dispositivos.id"), nullable=False)
    fecha_hora_lectura = Column(DateTime, nullable=False)
    estado = Column(String, nullable=False) # e.g. "Online", "Offline"
    motivo = Column(String, nullable=True)
    fecha_registro_bd = Column(DateTime, default=func.now())
    
    dispositivo = relationship("Dispositivo", back_populates="estados")

class GeolocalizacionLog(Base):
    __tablename__ = "geolocalizacion_log"
    
    id = Column(BigInteger, primary_key=True, index=True)
    dispositivo_id = Column(Integer, ForeignKey("dispositivos.id"), nullable=False)
    fecha_hora_lectura = Column(DateTime, nullable=False)
    latitud = Column(Numeric(10, 8), nullable=False)
    longitud = Column(Numeric(11, 8), nullable=False)
    fuente = Column(String, nullable=True)
    fecha_registro_bd = Column(DateTime, default=func.now())
    
    dispositivo = relationship("Dispositivo", back_populates="geolocalizaciones")

class SaldosHistorial(Base):
    __tablename__ = "saldos_historial"
    
    id = Column(BigInteger, primary_key=True, index=True)
    linea_servicio_id = Column(Integer, ForeignKey("lineas_servicio.id"), nullable=False)
    fecha_hora_lectura = Column(DateTime, nullable=False)
    periodo = Column(String, nullable=True)
    moneda = Column(String, nullable=True)
    bolsa_contratada_gb = Column(Numeric(10, 2), nullable=True)
    consumo_estandar_gb = Column(Numeric(10, 2), nullable=True)
    consumo_prioridad_gb = Column(Numeric(10, 2), nullable=True)
    recargas_compradas_gb = Column(Numeric(10, 2), nullable=True)
    recargas_consumidas_gb = Column(Numeric(10, 2), nullable=True)
    saldo_recurrente_gb = Column(Numeric(10, 2), nullable=True)
    saldo_total_disponible_gb = Column(Numeric(10, 2), nullable=True)
    total_consumido_gb = Column(Numeric(10, 2), nullable=True)
    porcentaje_uso_sobre_contratado = Column(Numeric(5, 2), nullable=True)
    consumo_excedente_opt_in_gb = Column(Numeric(10, 2), default=0.00, nullable=True)
    fecha_registro_bd = Column(DateTime, default=func.now())
    
    linea = relationship("LineaServicio", back_populates="saldos")

class TelemetriaLog(Base):
    __tablename__ = "telemetria_log"
    
    id = Column(BigInteger, primary_key=True, index=True)
    dispositivo_id = Column(Integer, ForeignKey("dispositivos.id"), nullable=False)
    fecha_hora_lectura = Column(DateTime, nullable=False)
    periodo_segundos = Column(Integer, nullable=True)
    ping_latency_avg_ms = Column(Numeric(8, 2), nullable=True)
    ping_drop_rate_avg = Column(Numeric(5, 4), nullable=True)
    downlink_mbps_avg = Column(Numeric(8, 2), nullable=True)
    uplink_mbps_avg = Column(Numeric(8, 2), nullable=True)
    signal_quality_avg = Column(Numeric(5, 2), nullable=True)
    porcentaje_obstruccion = Column(Numeric(5, 2), nullable=True)
    uptime_segundos = Column(BigInteger, nullable=True)
    estimado_descargado_gb = Column(Numeric(10, 3), nullable=True)
    estimado_cargado_gb = Column(Numeric(10, 3), nullable=True)
    muestras_totales = Column(Integer, nullable=True)
    fecha_registro_bd = Column(DateTime, default=func.now())
    
    dispositivo = relationship("Dispositivo", back_populates="telemetrias")

class CatalogoAlerta(Base):
    __tablename__ = "catalogo_alertas"
    
    id = Column(Integer, primary_key=True, index=True)
    codigo_alerta = Column(String, unique=True, nullable=False)
    nombre = Column(String, nullable=False)
    descripcion = Column(Text, nullable=True)
    criticidad = Column(String, nullable=True) # e.g. "critical", "warning", "info"
    fecha_creacion = Column(DateTime, default=func.now())
    fecha_modificacion = Column(DateTime, default=func.now(), onupdate=func.now())
    creado_por = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    modificado_por = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    
    alertas_log = relationship("AlertaLog", back_populates="catalogo_alerta")

class AlertaLog(Base):
    __tablename__ = "alertas_log"
    
    id = Column(BigInteger, primary_key=True, index=True)
    dispositivo_id = Column(Integer, ForeignKey("dispositivos.id"), nullable=False)
    catalogo_alerta_id = Column(Integer, ForeignKey("catalogo_alertas.id"), nullable=False)
    fecha_hora_deteccion = Column(DateTime, nullable=False)
    activa = Column(Boolean, default=True)
    fecha_registro_bd = Column(DateTime, default=func.now())
    
    dispositivo = relationship("Dispositivo", back_populates="alertas")
    catalogo_alerta = relationship("CatalogoAlerta", back_populates="alertas_log")
