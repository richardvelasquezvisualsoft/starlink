from typing import Any, Optional
import datetime
import decimal

from sqlalchemy import BigInteger, Boolean, CHAR, CheckConstraint, Column, Date, DateTime, ForeignKey, ForeignKeyConstraint, Index, Integer, Numeric, PrimaryKeyConstraint, SmallInteger, String, Table, Text, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import ARRAY, INET, JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

from app.core.database import Base


class CatalogoOperacionRemota(Base):
    __tablename__ = 'catalogo_operaciones_remotas'
    __table_args__ = (
        CheckConstraint("tipo_objetivo::text = ANY (ARRAY['TERMINAL'::character varying, 'ROUTER'::character varying, 'LINEA_SERVICIO'::character varying]::text[])", name='ck_operacion_objetivo'),
        PrimaryKeyConstraint('codigo', name='catalogo_operaciones_remotas_pkey')
    )

    codigo: Mapped[str] = mapped_column(String(50), primary_key=True)
    descripcion: Mapped[str] = mapped_column(String(250), nullable=False)
    tipo_objetivo: Mapped[str] = mapped_column(String(30), nullable=False)
    requiere_confirmacion: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('true'))
    solo_reseller: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('true'))
    activa: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('true'))
    endpoint_logico: Mapped[Optional[str]] = mapped_column(String(200))
    metodo_http: Mapped[Optional[str]] = mapped_column(String(10))
    observacion: Mapped[Optional[str]] = mapped_column(Text)


class HistoricoMes(Base):
    __tablename__ = 'historicos_meses'
    __table_args__ = (
        CheckConstraint("estado::text = ANY (ARRAY['ACTIVO'::character varying, 'CERRADO'::character varying, 'ARCHIVADO'::character varying]::text[])", name='ck_historico_estado'),
        PrimaryKeyConstraint('periodo', name='historicos_meses_pkey')
    )

    periodo: Mapped[str] = mapped_column(CHAR(6), primary_key=True)
    fecha_inicio: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    fecha_fin_exclusiva: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    estado: Mapped[str] = mapped_column(String(20), nullable=False, server_default=text("'ACTIVO'::character varying"))
    fecha_creacion: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    backup_final_realizado: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('false'))
    fecha_cierre: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    archivo_backup: Mapped[Optional[str]] = mapped_column(Text)
    sha256_backup: Mapped[Optional[str]] = mapped_column(String(64))
    registros_terminal: Mapped[Optional[int]] = mapped_column(BigInteger)
    registros_router: Mapped[Optional[int]] = mapped_column(BigInteger)
    registros_ip: Mapped[Optional[int]] = mapped_column(BigInteger)
    tamano_bytes: Mapped[Optional[int]] = mapped_column(BigInteger)


class Usuario(Base):
    __tablename__ = 'usuarios'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='usuarios_pkey'),
        Index('ix_usuarios_email', 'email', unique=True),
        Index('ix_usuarios_id', 'id')
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String, nullable=False)
    email: Mapped[str] = mapped_column(String, nullable=False)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('true'))
    acceso_todos_tenants: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('false'))
    intentos_fallidos: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text('0'))
    ultimo_intento_fallido_en: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    bloqueado_hasta: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    bloqueado_manual: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('false'))
    motivo_bloqueo: Mapped[Optional[str]] = mapped_column(String(200))
    debe_cambiar_password: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('false'))
    email_recuperacion: Mapped[Optional[str]] = mapped_column(String(200))
    email_recuperacion_verificado: Mapped[bool] = mapped_column(Boolean, server_default=text('false'))
    email_recuperacion_verificado_en: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    password_cambiado_en: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    ultimo_login_en: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    ultimo_login_ip: Mapped[Optional[str]] = mapped_column(INET)
    fecha_creacion: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    fecha_modificacion: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    creado_por: Mapped[Optional[int]] = mapped_column(Integer)
    modificado_por: Mapped[Optional[int]] = mapped_column(Integer)

    roles: Mapped[list['UsuarioRoles']] = relationship('UsuarioRoles', back_populates='usuario', cascade="all, delete-orphan")
    sesiones: Mapped[list['UsuarioSesiones']] = relationship('UsuarioSesiones', back_populates='usuario', cascade="all, delete-orphan")
    historial_passwords: Mapped[list['UsuarioPasswordHistorial']] = relationship('UsuarioPasswordHistorial', back_populates='usuario', cascade="all, delete-orphan")
    mfa: Mapped[Optional['UsuarioMfa']] = relationship('UsuarioMfa', back_populates='usuario', uselist=False, cascade="all, delete-orphan")

    catalogo_alertas_creado_por: Mapped[list['CatalogoAlerta']] = relationship('CatalogoAlerta', foreign_keys='[CatalogoAlerta.creado_por]', back_populates='usuarios')
    catalogo_alertas_modificado_por: Mapped[list['CatalogoAlerta']] = relationship('CatalogoAlerta', foreign_keys='[CatalogoAlerta.modificado_por]', back_populates='usuarios_')
    dispositivos_creado_por: Mapped[list['Dispositivo']] = relationship('Dispositivo', foreign_keys='[Dispositivo.creado_por]', back_populates='usuarios')
    dispositivos_modificado_por: Mapped[list['Dispositivo']] = relationship('Dispositivo', foreign_keys='[Dispositivo.modificado_por]', back_populates='usuarios_')
    tenants_creado_por: Mapped[list['Tenant']] = relationship('Tenant', foreign_keys='[Tenant.creado_por]', back_populates='usuarios')
    tenants_modificado_por: Mapped[list['Tenant']] = relationship('Tenant', foreign_keys='[Tenant.modificado_por]', back_populates='usuarios_')
    alertas_log: Mapped[list['AlertaLog']] = relationship('AlertaLog', back_populates='usuarios')
    centros_costos_creado_por: Mapped[list['CentroCosto']] = relationship('CentroCosto', foreign_keys='[CentroCosto.creado_por]', back_populates='usuarios')
    centros_costos_modificado_por: Mapped[list['CentroCosto']] = relationship('CentroCosto', foreign_keys='[CentroCosto.modificado_por]', back_populates='usuarios_')
    colaboradores_creado_por: Mapped[list['Colaborador']] = relationship('Colaborador', foreign_keys='[Colaborador.creado_por]', back_populates='usuarios')
    colaboradores_modificado_por: Mapped[list['Colaborador']] = relationship('Colaborador', foreign_keys='[Colaborador.modificado_por]', back_populates='usuarios_')
    comprobantes_cliente_modificado_por: Mapped[list['ComprobanteCliente']] = relationship('ComprobanteCliente', foreign_keys='[ComprobanteCliente.modificado_por]', back_populates='usuarios')
    comprobantes_cliente_registrado_por: Mapped[list['ComprobanteCliente']] = relationship('ComprobanteCliente', foreign_keys='[ComprobanteCliente.registrado_por]', back_populates='usuarios_')
    cuentas_creado_por: Mapped[list['Cuenta']] = relationship('Cuenta', foreign_keys='[Cuenta.creado_por]', back_populates='usuarios')
    cuentas_modificado_por: Mapped[list['Cuenta']] = relationship('Cuenta', foreign_keys='[Cuenta.modificado_por]', back_populates='usuarios_')
    geozona_politicas_creado_por: Mapped[list['GeozonaPolitica']] = relationship('GeozonaPolitica', foreign_keys='[GeozonaPolitica.creado_por]', back_populates='usuarios')
    geozona_politicas_modificado_por: Mapped[list['GeozonaPolitica']] = relationship('GeozonaPolitica', foreign_keys='[GeozonaPolitica.modificado_por]', back_populates='usuarios_')
    geozonas_creado_por: Mapped[list['Geozona']] = relationship('Geozona', foreign_keys='[Geozona.creado_por]', back_populates='usuarios')
    geozonas_modificado_por: Mapped[list['Geozona']] = relationship('Geozona', foreign_keys='[Geozona.modificado_por]', back_populates='usuarios_')
    niveles_organizacion_config_creado_por: Mapped[list['NivelOrganizacionConfig']] = relationship('NivelOrganizacionConfig', foreign_keys='[NivelOrganizacionConfig.creado_por]', back_populates='usuarios')
    niveles_organizacion_config_modificado_por: Mapped[list['NivelOrganizacionConfig']] = relationship('NivelOrganizacionConfig', foreign_keys='[NivelOrganizacionConfig.modificado_por]', back_populates='usuarios_')
    tenant_usuarios: Mapped[list['TenantUsuario']] = relationship('TenantUsuario', back_populates='usuario')
    unidades_organizacionales_creado_por: Mapped[list['UnidadOrganizacional']] = relationship('UnidadOrganizacional', foreign_keys='[UnidadOrganizacional.creado_por]', back_populates='usuarios')
    unidades_organizacionales_modificado_por: Mapped[list['UnidadOrganizacional']] = relationship('UnidadOrganizacional', foreign_keys='[UnidadOrganizacional.modificado_por]', back_populates='usuarios_')
    colaborador_dispositivo_historial: Mapped[list['ColaboradorDispositivoHistorial']] = relationship('ColaboradorDispositivoHistorial', back_populates='usuarios')
    colaborador_unidad_historial: Mapped[list['ColaboradorUnidadHistorial']] = relationship('ColaboradorUnidadHistorial', back_populates='usuarios')
    dispositivo_geozona_historial: Mapped[list['DispositivoGeozonaHistorial']] = relationship('DispositivoGeozonaHistorial', back_populates='usuarios')
    lineas_servicio_creado_por: Mapped[list['LineaServicio']] = relationship('LineaServicio', foreign_keys='[LineaServicio.creado_por]', back_populates='usuarios')
    lineas_servicio_modificado_por: Mapped[list['LineaServicio']] = relationship('LineaServicio', foreign_keys='[LineaServicio.modificado_por]', back_populates='usuarios_')
    routers_creado_por: Mapped[list['Router']] = relationship('Router', foreign_keys='[Router.creado_por]', back_populates='usuarios')
    routers_modificado_por: Mapped[list['Router']] = relationship('Router', foreign_keys='[Router.modificado_por]', back_populates='usuarios_')
    unidad_centro_costo_historial: Mapped[list['UnidadCentroCostoHistorial']] = relationship('UnidadCentroCostoHistorial', back_populates='usuarios')
    comandos_remotos_log: Mapped[list['ComandoRemotoLog']] = relationship('ComandoRemotoLog', back_populates='usuarios')
    control_servicio_actual: Mapped[list['ControlServicioActual']] = relationship('ControlServicioActual', back_populates='usuarios')
    politicas_servicio_creado_por: Mapped[list['PoliticaServicio']] = relationship('PoliticaServicio', foreign_keys='[PoliticaServicio.creado_por]', back_populates='usuarios')
    politicas_servicio_modificado_por: Mapped[list['PoliticaServicio']] = relationship('PoliticaServicio', foreign_keys='[PoliticaServicio.modificado_por]', back_populates='usuarios_')
    control_servicio_historial: Mapped[list['ControlServicioHistorial']] = relationship('ControlServicioHistorial', back_populates='usuarios')
    geozona_eventos: Mapped[list['GeozonaEvento']] = relationship('GeozonaEvento', back_populates='usuarios')


class RolesPortal(Base):
    __tablename__ = 'roles_portal'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='roles_portal_pkey'),
        Index('roles_portal_codigo_key', 'codigo', unique=True)
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    codigo: Mapped[str] = mapped_column(String(50), nullable=False)
    descripcion: Mapped[str] = mapped_column(String(200), nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('true'))

    usuario_roles: Mapped[list['UsuarioRoles']] = relationship('UsuarioRoles', back_populates='rol')


class UsuarioRoles(Base):
    __tablename__ = 'usuario_roles'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='usuario_roles_pkey'),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    usuario_id: Mapped[int] = mapped_column(Integer, ForeignKey('usuarios.id'), nullable=False)
    rol_id: Mapped[int] = mapped_column(Integer, ForeignKey('roles_portal.id'), nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('true'))
#     fecha_asignacion: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
#     asignado_por: Mapped[Optional[int]] = mapped_column(Integer)

    usuario: Mapped['Usuario'] = relationship('Usuario', back_populates='roles')
    rol: Mapped['RolesPortal'] = relationship('RolesPortal', back_populates='usuario_roles')


class PoliticasSeguridad(Base):
    __tablename__ = 'politicas_seguridad'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='politicas_seguridad_pkey'),
        Index('uq_politica_seguridad_global_activa', text('((1))'), unique=True, postgresql_where=text("((tenant_id IS NULL) AND (activo = true))")),
        Index('uq_politica_seguridad_tenant_activa', 'tenant_id', unique=True, postgresql_where=text("((tenant_id IS NOT NULL) AND (activo = true))"))
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    tenant_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey('tenants.id'))
    longitud_minima_password: Mapped[int] = mapped_column(SmallInteger, nullable=False, server_default=text('12'))
    longitud_maxima_password: Mapped[int] = mapped_column(SmallInteger, nullable=False, server_default=text('128'))
    max_intentos_fallidos: Mapped[int] = mapped_column(SmallInteger, nullable=False, server_default=text('5'))
    minutos_bloqueo: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text('15'))
    minutos_validez_token_reset: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text('60'))
    minutos_inactividad_sesion: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text('30'))
    minutos_maximos_sesion: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text('1440'))
    historial_passwords: Mapped[int] = mapped_column(SmallInteger, nullable=False, server_default=text('5'))
    requerir_mfa_reseller: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('false'))
    requerir_mfa_cliente: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('false'))
    requerir_email_recuperacion_verificado: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('false'))
    validar_password_comprometido: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('false'))
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('true'))
    creado_por: Mapped[Optional[int]] = mapped_column(Integer)
    modificado_por: Mapped[Optional[int]] = mapped_column(Integer)
    fecha_creacion: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    fecha_modificacion: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)

    tenant: Mapped[Optional['Tenant']] = relationship('Tenant')

    @property
    def duracion_token_reset_minutos(self) -> int:
        return self.minutos_validez_token_reset

    @duracion_token_reset_minutos.setter
    def duracion_token_reset_minutos(self, val: int):
        self.minutos_validez_token_reset = val

    @property
    def timeout_inactividad_minutos(self) -> int:
        return self.minutos_inactividad_sesion

    @timeout_inactividad_minutos.setter
    def timeout_inactividad_minutos(self, val: int):
        self.minutos_inactividad_sesion = val

    @property
    def duracion_maxima_sesion_horas(self) -> int:
        return (self.minutos_maximos_sesion // 60) if self.minutos_maximos_sesion else 24

    @duracion_maxima_sesion_horas.setter
    def duracion_maxima_sesion_horas(self, val: int):
        self.minutos_maximos_sesion = val * 60 if val is not None else 1440

    @property
    def cantidad_passwords_historial(self) -> int:
        return self.historial_passwords

    @cantidad_passwords_historial.setter
    def cantidad_passwords_historial(self, val: int):
        self.historial_passwords = val

    @property
    def mfa_obligatorio_reseller(self) -> bool:
        return self.requerir_mfa_reseller

    @mfa_obligatorio_reseller.setter
    def mfa_obligatorio_reseller(self, val: bool):
        self.requerir_mfa_reseller = val

    @property
    def mfa_obligatorio_cliente(self) -> bool:
        return self.requerir_mfa_cliente

    @mfa_obligatorio_cliente.setter
    def mfa_obligatorio_cliente(self, val: bool):
        self.requerir_mfa_cliente = val


class UsuarioPasswordHistorial(Base):
    __tablename__ = 'usuario_password_historial'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='usuario_password_historial_pkey'),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    usuario_id: Mapped[int] = mapped_column(Integer, ForeignKey('usuarios.id'), nullable=False)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    fecha_creacion: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False, server_default=text('CURRENT_TIMESTAMP'))

    usuario: Mapped['Usuario'] = relationship('Usuario', back_populates='historial_passwords')

    @property
    def fecha_cambio(self) -> datetime.datetime:
        return self.fecha_creacion


class UsuarioPasswordResetToken(Base):
    __tablename__ = 'usuario_password_reset_tokens'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='usuario_password_reset_tokens_pkey'),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    usuario_id: Mapped[int] = mapped_column(Integer, ForeignKey('usuarios.id'), nullable=False)
    token_hash: Mapped[str] = mapped_column(String, nullable=False)
    fecha_creacion: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    fecha_expiracion: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False)
    fecha_uso: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    revocado: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('false'))
    ip_solicitud: Mapped[Optional[str]] = mapped_column(INET)
    user_agent: Mapped[Optional[str]] = mapped_column(Text)

    @property
    def usado(self) -> bool:
        return self.fecha_uso is not None


class UsuarioSesiones(Base):
    __tablename__ = 'usuario_sesiones'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='usuario_sesiones_pkey'),
    )

    id: Mapped[Any] = mapped_column(UUID(as_uuid=True), primary_key=True)
    usuario_id: Mapped[int] = mapped_column(Integer, ForeignKey('usuarios.id'), nullable=False)
    refresh_token_hash: Mapped[Optional[str]] = mapped_column(String)
    ip: Mapped[Optional[str]] = mapped_column(INET)
    user_agent: Mapped[Optional[str]] = mapped_column(Text)
    fecha_inicio: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    ultima_actividad: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    fecha_expiracion: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False)
    revocada: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('false'))
    fecha_revocacion: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    motivo_revocacion: Mapped[Optional[str]] = mapped_column(Text)

    usuario: Mapped['Usuario'] = relationship('Usuario', back_populates='sesiones')

    @property
    def ip_address(self):
        return str(self.ip) if self.ip else None


class UsuarioMfa(Base):
    __tablename__ = 'usuario_mfa'
    __table_args__ = (
        PrimaryKeyConstraint('usuario_id', name='usuario_mfa_pkey'),
    )

    usuario_id: Mapped[int] = mapped_column(Integer, ForeignKey('usuarios.id'), primary_key=True)
    habilitado: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('false'))
    tipo: Mapped[Optional[str]] = mapped_column(String(50))
    secret_ciphertext: Mapped[Optional[str]] = mapped_column(Text)
    recovery_codes_hash: Mapped[Optional[dict]] = mapped_column(JSONB)
    confirmado_en: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    fecha_modificacion: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)

    usuario: Mapped['Usuario'] = relationship('Usuario', back_populates='mfa')


class AuditoriaSeguridad(Base):
    __tablename__ = 'auditoria_seguridad'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='auditoria_seguridad_pkey'),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    usuario_actor_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey('usuarios.id'))
    usuario_afectado_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey('usuarios.id'))
    tenant_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey('tenants.id'))
    evento: Mapped[str] = mapped_column(String(100), nullable=False)
    detalle: Mapped[Optional[dict]] = mapped_column(JSONB)
    exitoso: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    ip: Mapped[Optional[str]] = mapped_column(INET)
    user_agent: Mapped[Optional[str]] = mapped_column(Text)
    fecha_evento: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False, server_default=text('CURRENT_TIMESTAMP'))

    @property
    def descripcion(self):
        if self.detalle and isinstance(self.detalle, dict):
            return self.detalle.get('descripcion') or self.detalle.get('motivo') or str(self.detalle)
        return None

    @property
    def ip_origen(self):
        return str(self.ip) if self.ip else None


t_vw_cliente_comprobante_por_linea = Table(
    'vw_cliente_comprobante_por_linea', Base.metadata,
    Column('tenant_id', BigInteger),
    Column('comprobante_id', BigInteger),
    Column('tipo_documento', String(30)),
    Column('numero_documento', String(100)),
    Column('periodo_desde', Date),
    Column('periodo_hasta', Date),
    Column('fecha_emision', Date),
    Column('moneda_iso3', CHAR(3)),
    Column('importe_total', Numeric(18, 4)),
    Column('estado_declarado', String(20)),
    Column('linea_servicio_id', Integer),
    Column('numero_linea', String),
    Column('monto_asignado', Numeric(18, 4)),
    Column('criterio_asignacion', String(30))
)


t_vw_colaboradores_estructura_actual = Table(
    'vw_colaboradores_estructura_actual', Base.metadata,
    Column('colaborador_id', BigInteger),
    Column('tenant_id', BigInteger),
    Column('codigo_colaborador', String(80)),
    Column('colaborador', Text),
    Column('cargo', String(150)),
    Column('etiqueta_nivel1', String(100)),
    Column('nivel1_id', BigInteger),
    Column('nivel1_codigo', String(80)),
    Column('nivel1_nombre', String(200)),
    Column('etiqueta_nivel2', String(100)),
    Column('nivel2_id', BigInteger),
    Column('nivel2_codigo', String(80)),
    Column('nivel2_nombre', String(200)),
    Column('etiqueta_nivel3', String(100)),
    Column('nivel3_id', BigInteger),
    Column('nivel3_codigo', String(80)),
    Column('nivel3_nombre', String(200)),
    Column('centro_costo_nivel3_id', BigInteger),
    Column('centro_costo_nivel3_codigo', String(80)),
    Column('centro_costo_nivel3_nombre', String(200)),
    Column('dispositivo_id', Integer),
    Column('device_id', String),
    Column('kit_starlink', String),
    Column('linea_servicio_id', Integer),
    Column('numero_linea', String),
    Column('servicio', String)
)


t_vw_consumo_mensual = Table(
    'vw_consumo_mensual', Base.metadata,
    Column('tenant_id', BigInteger),
    Column('linea_servicio_id', Integer),
    Column('periodo', Text),
    Column('priority_gb', Numeric),
    Column('opt_in_priority_gb', Numeric),
    Column('standard_gb', Numeric),
    Column('non_billable_gb', Numeric),
    Column('total_gb', Numeric)
)


t_vw_control_servicio = Table(
    'vw_control_servicio', Base.metadata,
    Column('linea_servicio_id', Integer),
    Column('tenant_id', BigInteger),
    Column('cuenta_id', Integer),
    Column('numero_linea', String),
    Column('nombre', String),
    Column('plan_contratado', String),
    Column('estado_servicio_actual', String(50)),
    Column('permitir_priority_extra', Boolean),
    Column('ip_publica_habilitada', Boolean),
    Column('alerta_consumo_pct_1', Numeric(6, 3)),
    Column('alerta_consumo_pct_2', Numeric(6, 3)),
    Column('limite_adicional_gb_mes', Numeric(14, 3)),
    Column('limite_gasto_adicional', Numeric(18, 4)),
    Column('moneda_limite', CHAR(3)),
    Column('accion_al_limite', String(40)),
    Column('cliente_puede_reiniciar_terminal', Boolean),
    Column('cliente_puede_reiniciar_router', Boolean),
    Column('cliente_puede_cambiar_overage', Boolean),
    Column('cliente_puede_hacer_topup', Boolean),
    Column('dispositivo_id', Integer),
    Column('estado_terminal', String(30)),
    Column('ultima_telemetria_terminal', DateTime),
    Column('router_id', BigInteger),
    Column('estado_router', String(30)),
    Column('ultima_telemetria_router', DateTime)
)


t_vw_costo_mes_base = Table(
    'vw_costo_mes_base', Base.metadata,
    Column('id', BigInteger),
    Column('tenant_id', BigInteger),
    Column('periodo', CHAR(6)),
    Column('linea_servicio_id', Integer),
    Column('dispositivo_id', Integer),
    Column('colaborador_id', BigInteger),
    Column('unidad_nivel1_id', BigInteger),
    Column('unidad_nivel2_id', BigInteger),
    Column('unidad_nivel3_id', BigInteger),
    Column('centro_costo_id', BigInteger),
    Column('consumo_priority_gb', Numeric(18, 6)),
    Column('consumo_standard_gb', Numeric(18, 6)),
    Column('consumo_non_billable_gb', Numeric(18, 6)),
    Column('consumo_total_gb', Numeric(18, 6)),
    Column('wan_rx_bytes', BigInteger),
    Column('wan_tx_bytes', BigInteger),
    Column('latencia_avg_ms', Numeric(12, 4)),
    Column('packet_loss_avg', Numeric(8, 6)),
    Column('downlink_avg_mbps', Numeric(12, 4)),
    Column('uplink_avg_mbps', Numeric(12, 4)),
    Column('signal_quality_avg', Numeric(8, 6)),
    Column('obstruccion_avg', Numeric(8, 6)),
    Column('disponibilidad_pct', Numeric(7, 4)),
    Column('costo_starlink', Numeric(18, 4)),
    Column('moneda_starlink', CHAR(3)),
    Column('importe_comprobante_cliente', Numeric(18, 4)),
    Column('moneda_cliente', CHAR(3)),
    Column('criterio_asignacion_costo', String(30)),
    Column('fecha_calculo', DateTime),
    Column('detalle_json', JSONB),
    Column('nivel1_nombre', String),
    Column('nivel2_nombre', String),
    Column('nivel3_nombre', String),
    Column('centro_costo_nombre', String),
    Column('colaborador_nombre', Text)
)


t_vw_estructura_organizacional = Table(
    'vw_estructura_organizacional', Base.metadata,
    Column('tenant_id', BigInteger),
    Column('unidad_id', BigInteger),
    Column('numero_nivel', SmallInteger),
    Column('etiqueta_nivel', String(100)),
    Column('codigo', String(80)),
    Column('nombre', String(200)),
    Column('parent_id', BigInteger),
    Column('parent_codigo', String(80)),
    Column('parent_nombre', String(200)),
    Column('centro_costo_id', BigInteger),
    Column('centro_costo_codigo', String(80)),
    Column('centro_costo_nombre', String(200)),
    Column('activo', Boolean)
)


t_vw_gasto_cliente_por_centro_costo = Table(
    'vw_gasto_cliente_por_centro_costo', Base.metadata,
    Column('tenant_id', BigInteger),
    Column('periodo', CHAR(6)),
    Column('moneda_cliente', CHAR(3)),
    Column('agrupacion', String),
    Column('monto', Numeric),
    Column('porcentaje', Numeric)
)


t_vw_gasto_cliente_por_colaborador = Table(
    'vw_gasto_cliente_por_colaborador', Base.metadata,
    Column('tenant_id', BigInteger),
    Column('periodo', CHAR(6)),
    Column('moneda_cliente', CHAR(3)),
    Column('agrupacion', Text),
    Column('monto', Numeric),
    Column('porcentaje', Numeric)
)


t_vw_gasto_cliente_por_nivel1 = Table(
    'vw_gasto_cliente_por_nivel1', Base.metadata,
    Column('tenant_id', BigInteger),
    Column('periodo', CHAR(6)),
    Column('moneda_cliente', CHAR(3)),
    Column('agrupacion', String),
    Column('monto', Numeric),
    Column('porcentaje', Numeric)
)


t_vw_gasto_cliente_por_nivel2 = Table(
    'vw_gasto_cliente_por_nivel2', Base.metadata,
    Column('tenant_id', BigInteger),
    Column('periodo', CHAR(6)),
    Column('moneda_cliente', CHAR(3)),
    Column('agrupacion', String),
    Column('monto', Numeric),
    Column('porcentaje', Numeric)
)


t_vw_gasto_cliente_por_nivel3 = Table(
    'vw_gasto_cliente_por_nivel3', Base.metadata,
    Column('tenant_id', BigInteger),
    Column('periodo', CHAR(6)),
    Column('moneda_cliente', CHAR(3)),
    Column('agrupacion', String),
    Column('monto', Numeric),
    Column('porcentaje', Numeric)
)


t_vw_geozona_eventos_reporte = Table(
    'vw_geozona_eventos_reporte', Base.metadata,
    Column('evento_id', BigInteger),
    Column('tenant_id', BigInteger),
    Column('dispositivo_id', Integer),
    Column('device_id', String),
    Column('kit_starlink', String),
    Column('geozona_id', BigInteger),
    Column('geozona_codigo', String(80)),
    Column('geozona_nombre', String(200)),
    Column('linea_servicio_id', Integer),
    Column('numero_linea', String),
    Column('colaborador_id', BigInteger),
    Column('colaborador', Text),
    Column('primera_muestra_fuera', DateTime),
    Column('salida_confirmada', DateTime),
    Column('retorno_confirmado', DateTime),
    Column('segundos_fuera', Numeric),
    Column('estado_evento', String(30)),
    Column('accion_configurada', String(50)),
    Column('accion_ejecutada', String(50)),
    Column('fecha_accion', DateTime),
    Column('requiere_aprobacion', Boolean)
)


t_vw_geozonas_estado = Table(
    'vw_geozonas_estado', Base.metadata,
    Column('tenant_id', BigInteger),
    Column('dispositivo_id', Integer),
    Column('device_id', String),
    Column('kit_starlink', String),
    Column('geozona_id', BigInteger),
    Column('geozona_codigo', String(80)),
    Column('geozona_nombre', String(200)),
    Column('estado_geozona', String(30)),
    Column('h3_cell_id_actual', String(32)),
    Column('fecha_ultima_muestra', DateTime),
    Column('fecha_primera_salida', DateTime),
    Column('muestras_fuera_consecutivas', Integer),
    Column('accion_salida', String(50)),
    Column('muestras_consecutivas_salida', Integer),
    Column('segundos_fuera_confirmacion', Integer),
    Column('colaborador_id', BigInteger),
    Column('colaborador', Text),
    Column('linea_servicio_id', Integer),
    Column('numero_linea', String),
    Column('servicio', String)
)


t_vw_historico_servicio = Table(
    'vw_historico_servicio', Base.metadata,
    Column('tenant_id', BigInteger),
    Column('periodo', CHAR(6)),
    Column('linea_servicio_id', Integer),
    Column('numero_linea', String),
    Column('servicio', String),
    Column('consumo_total_gb', Numeric(18, 6)),
    Column('consumo_priority_gb', Numeric(18, 6)),
    Column('consumo_standard_gb', Numeric(18, 6)),
    Column('wan_rx_bytes', BigInteger),
    Column('wan_tx_bytes', BigInteger),
    Column('latencia_avg_ms', Numeric(12, 4)),
    Column('packet_loss_avg', Numeric(8, 6)),
    Column('downlink_avg_mbps', Numeric(12, 4)),
    Column('uplink_avg_mbps', Numeric(12, 4)),
    Column('signal_quality_avg', Numeric(8, 6)),
    Column('obstruccion_avg', Numeric(8, 6)),
    Column('disponibilidad_pct', Numeric(7, 4)),
    Column('costo_starlink', Numeric(18, 4)),
    Column('moneda_starlink', CHAR(3)),
    Column('importe_comprobante_cliente', Numeric(18, 4)),
    Column('moneda_cliente', CHAR(3))
)


t_vw_starlink_costo_por_linea = Table(
    'vw_starlink_costo_por_linea', Base.metadata,
    Column('cuenta_id', Integer),
    Column('factura_id', BigInteger),
    Column('invoice_id_externo', String(150)),
    Column('moneda_iso3', CHAR(3)),
    Column('fecha_factura', DateTime),
    Column('periodo_servicio_desde', DateTime),
    Column('periodo_servicio_hasta', DateTime),
    Column('linea_servicio_id', Integer),
    Column('numero_linea', String),
    Column('product_description', String(500)),
    Column('monto_asignado', Numeric(18, 4)),
    Column('criterio_asignacion', String(30))
)


class CatalogoAlerta(Base):
    __tablename__ = 'catalogo_alertas'
    __table_args__ = (
        ForeignKeyConstraint(['creado_por'], ['usuarios.id'], name='catalogo_alertas_creado_por_fkey'),
        ForeignKeyConstraint(['modificado_por'], ['usuarios.id'], name='catalogo_alertas_modificado_por_fkey'),
        PrimaryKeyConstraint('id', name='catalogo_alertas_pkey'),
        UniqueConstraint('codigo_alerta', name='catalogo_alertas_codigo_alerta_key'),
        Index('ix_catalogo_alertas_id', 'id')
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    codigo_alerta: Mapped[str] = mapped_column(String, nullable=False)
    nombre: Mapped[str] = mapped_column(String, nullable=False)
    descripcion: Mapped[Optional[str]] = mapped_column(Text)
    criticidad: Mapped[Optional[str]] = mapped_column(String)
    fecha_creacion: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    fecha_modificacion: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    creado_por: Mapped[Optional[int]] = mapped_column(Integer)
    modificado_por: Mapped[Optional[int]] = mapped_column(Integer)

    usuarios: Mapped[Optional['Usuario']] = relationship('Usuario', foreign_keys=[creado_por], back_populates='catalogo_alertas_creado_por')
    usuarios_: Mapped[Optional['Usuario']] = relationship('Usuario', foreign_keys=[modificado_por], back_populates='catalogo_alertas_modificado_por')
    alertas_log: Mapped[list['AlertaLog']] = relationship('AlertaLog', back_populates='catalogo_alerta')


class Dispositivo(Base):
    __tablename__ = 'dispositivos'
    __table_args__ = (
        ForeignKeyConstraint(['creado_por'], ['usuarios.id'], name='dispositivos_creado_por_fkey'),
        ForeignKeyConstraint(['modificado_por'], ['usuarios.id'], name='dispositivos_modificado_por_fkey'),
        PrimaryKeyConstraint('id', name='dispositivos_pkey'),
        Index('ix_dispositivos_device_id', 'device_id', unique=True),
        Index('ix_dispositivos_dish_serial', 'dish_serial_number'),
        Index('ix_dispositivos_id', 'id'),
        Index('ix_dispositivos_kit_starlink', 'kit_starlink')
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    device_id: Mapped[str] = mapped_column(String, nullable=False)
    nombre: Mapped[Optional[str]] = mapped_column(String)
    kit_starlink: Mapped[Optional[str]] = mapped_column(String)
    fecha_creacion: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    fecha_modificacion: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    creado_por: Mapped[Optional[int]] = mapped_column(Integer)
    modificado_por: Mapped[Optional[int]] = mapped_column(Integer)
    dish_serial_number: Mapped[Optional[str]] = mapped_column(String(150))
    software_version_actual: Mapped[Optional[str]] = mapped_column(String(200))
    country_code_actual: Mapped[Optional[str]] = mapped_column(CHAR(2))
    h3_cell_id_actual: Mapped[Optional[str]] = mapped_column(String(32))
    in_territorial_waters_actual: Mapped[Optional[bool]] = mapped_column(Boolean)
    ultima_telemetria: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    raw_json: Mapped[Optional[dict]] = mapped_column(JSONB)
    cuenta_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey('cuentas.id'))
    kit_serial_number: Mapped[Optional[str]] = mapped_column(String(100))

    cuenta: Mapped[Optional['Cuenta']] = relationship('Cuenta')
    usuarios: Mapped[Optional['Usuario']] = relationship('Usuario', foreign_keys=[creado_por], back_populates='dispositivos_creado_por')
    usuarios_: Mapped[Optional['Usuario']] = relationship('Usuario', foreign_keys=[modificado_por], back_populates='dispositivos_modificado_por')
    alertas_log: Mapped[list['AlertaLog']] = relationship('AlertaLog', back_populates='dispositivo')
    estado_servicio_log: Mapped[list['EstadoServicioLog']] = relationship('EstadoServicioLog', back_populates='dispositivo')
    geolocalizacion_log: Mapped[list['GeolocalizacionLog']] = relationship('GeolocalizacionLog', back_populates='dispositivo')
    telemetria_log: Mapped[list['TelemetriaLog']] = relationship('TelemetriaLog', back_populates='dispositivo')
    colaborador_dispositivo_historial: Mapped[list['ColaboradorDispositivoHistorial']] = relationship('ColaboradorDispositivoHistorial', back_populates='dispositivo')
    dispositivo_geozona_historial: Mapped[list['DispositivoGeozonaHistorial']] = relationship('DispositivoGeozonaHistorial', back_populates='dispositivo')
    lineas_servicio: Mapped[list['LineaServicio']] = relationship('LineaServicio', back_populates='dispositivo')
    routers: Mapped[list['Router']] = relationship('Router', back_populates='dispositivo')
    costo_servicio_mes: Mapped[list['CostoServicioMes']] = relationship('CostoServicioMes', back_populates='dispositivo')
    linea_dispositivo_historial: Mapped[list['LineaDispositivoHistorial']] = relationship('LineaDispositivoHistorial', back_populates='dispositivo')
    telemetria_terminal_resumen_hora: Mapped[list['TelemetriaTerminalResumenHora']] = relationship('TelemetriaTerminalResumenHora', back_populates='dispositivo')
    geozona_eventos: Mapped[list['GeozonaEvento']] = relationship('GeozonaEvento', back_populates='dispositivo')
    asignaciones_historial: Mapped[list['DispositivoAsignacionHistorial']] = relationship('DispositivoAsignacionHistorial', back_populates='dispositivo')


class Tenant(Base):
    __tablename__ = 'tenants'
    __table_args__ = (
        ForeignKeyConstraint(['creado_por'], ['usuarios.id'], name='tenants_creado_por_fkey'),
        ForeignKeyConstraint(['modificado_por'], ['usuarios.id'], name='tenants_modificado_por_fkey'),
        PrimaryKeyConstraint('id', name='tenants_pkey'),
        UniqueConstraint('codigo', name='tenants_codigo_key')
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    codigo: Mapped[str] = mapped_column(String(50), nullable=False)
    razon_social: Mapped[str] = mapped_column(String(200), nullable=False)
    pais_iso2: Mapped[str] = mapped_column(CHAR(2), nullable=False, server_default=text("'PE'::bpchar"))
    zona_horaria: Mapped[str] = mapped_column(String(64), nullable=False, server_default=text("'America/Lima'::character varying"))
    metadata_: Mapped[dict] = mapped_column('metadata', JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('true'))
    fecha_creacion: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    fecha_modificacion: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    nombre_comercial: Mapped[Optional[str]] = mapped_column(String(200))
    identificacion_fiscal: Mapped[Optional[str]] = mapped_column(String(30))
    creado_por: Mapped[Optional[int]] = mapped_column(Integer)
    modificado_por: Mapped[Optional[int]] = mapped_column(Integer)

    usuarios: Mapped[Optional['Usuario']] = relationship('Usuario', foreign_keys=[creado_por], back_populates='tenants_creado_por')
    usuarios_: Mapped[Optional['Usuario']] = relationship('Usuario', foreign_keys=[modificado_por], back_populates='tenants_modificado_por')
    centros_costos: Mapped[list['CentroCosto']] = relationship('CentroCosto', back_populates='tenant')
    colaboradores: Mapped[list['Colaborador']] = relationship('Colaborador', back_populates='tenant')
    comprobantes_cliente: Mapped[list['ComprobanteCliente']] = relationship('ComprobanteCliente', back_populates='tenant')
    cuentas: Mapped[list['Cuenta']] = relationship('Cuenta', back_populates='tenant')
    geozona_politicas: Mapped[list['GeozonaPolitica']] = relationship('GeozonaPolitica', back_populates='tenant')
    geozonas: Mapped[list['Geozona']] = relationship('Geozona', back_populates='tenant')
    niveles_organizacion_config: Mapped[list['NivelOrganizacionConfig']] = relationship('NivelOrganizacionConfig', back_populates='tenant')
    sincronizaciones_api: Mapped[list['SincronizacionesApi']] = relationship('SincronizacionesApi', back_populates='tenant')
    tenant_usuarios: Mapped[list['TenantUsuario']] = relationship('TenantUsuario', back_populates='tenant')
    unidades_organizacionales: Mapped[list['UnidadOrganizacional']] = relationship('UnidadOrganizacional', back_populates='tenant')
    colaborador_dispositivo_historial: Mapped[list['ColaboradorDispositivoHistorial']] = relationship('ColaboradorDispositivoHistorial', back_populates='tenant')
    colaborador_unidad_historial: Mapped[list['ColaboradorUnidadHistorial']] = relationship('ColaboradorUnidadHistorial', back_populates='tenant')
    dispositivo_geozona_estado_actual: Mapped[list['DispositivoGeozonaEstadoActual']] = relationship('DispositivoGeozonaEstadoActual', back_populates='tenant')
    dispositivo_geozona_historial: Mapped[list['DispositivoGeozonaHistorial']] = relationship('DispositivoGeozonaHistorial', back_populates='tenant')
    unidad_centro_costo_historial: Mapped[list['UnidadCentroCostoHistorial']] = relationship('UnidadCentroCostoHistorial', back_populates='tenant')
    costo_servicio_mes: Mapped[list['CostoServicioMes']] = relationship('CostoServicioMes', back_populates='tenant')
    politicas_servicio: Mapped[list['PoliticaServicio']] = relationship('PoliticaServicio', back_populates='tenant')
    servicio_resumen_dia: Mapped[list['ServicioResumenDia']] = relationship('ServicioResumenDia', back_populates='tenant')
    telemetria_router_resumen_hora: Mapped[list['TelemetriaRouterResumenHora']] = relationship('TelemetriaRouterResumenHora', back_populates='tenant')
    telemetria_terminal_resumen_hora: Mapped[list['TelemetriaTerminalResumenHora']] = relationship('TelemetriaTerminalResumenHora', back_populates='tenant')
    control_servicio_historial: Mapped[list['ControlServicioHistorial']] = relationship('ControlServicioHistorial', back_populates='tenant')
    geozona_eventos: Mapped[list['GeozonaEvento']] = relationship('GeozonaEvento', back_populates='tenant')


class AlertaLog(Base):
    __tablename__ = 'alertas_log'
    __table_args__ = (
        ForeignKeyConstraint(['catalogo_alerta_id'], ['catalogo_alertas.id'], name='alertas_log_catalogo_alerta_id_fkey'),
        ForeignKeyConstraint(['dispositivo_id'], ['dispositivos.id'], name='alertas_log_dispositivo_id_fkey'),
        ForeignKeyConstraint(['reconocida_por'], ['usuarios.id'], name='fk_alertas_reconocida_por'),
        PrimaryKeyConstraint('id', name='alertas_log_pkey'),
        Index('ix_alertas_log_id', 'id')
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    dispositivo_id: Mapped[int] = mapped_column(Integer, nullable=False)
    catalogo_alerta_id: Mapped[int] = mapped_column(Integer, nullable=False)
    fecha_hora_deteccion: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False)
    reconocida: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('false'))
    activa: Mapped[Optional[bool]] = mapped_column(Boolean)
    fecha_registro_bd: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    ultima_vez_vista: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    fecha_hora_cierre: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    reconocida_por: Mapped[Optional[int]] = mapped_column(Integer)
    fecha_reconocimiento: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    raw_json: Mapped[Optional[dict]] = mapped_column(JSONB)

    catalogo_alerta: Mapped['CatalogoAlerta'] = relationship('CatalogoAlerta', back_populates='alertas_log')
    dispositivo: Mapped['Dispositivo'] = relationship('Dispositivo', back_populates='alertas_log')
    usuarios: Mapped[Optional['Usuario']] = relationship('Usuario', back_populates='alertas_log')


class CentroCosto(Base):
    __tablename__ = 'centros_costos'
    __table_args__ = (
        ForeignKeyConstraint(['creado_por'], ['usuarios.id'], name='centros_costos_creado_por_fkey'),
        ForeignKeyConstraint(['modificado_por'], ['usuarios.id'], name='centros_costos_modificado_por_fkey'),
        ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE', name='centros_costos_tenant_id_fkey'),
        PrimaryKeyConstraint('id', name='centros_costos_pkey'),
        UniqueConstraint('tenant_id', 'codigo', name='uq_centro_costos_codigo'),
        Index('ix_centros_costos_tenant', 'tenant_id', 'activo')
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    tenant_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    codigo: Mapped[str] = mapped_column(String(80), nullable=False)
    nombre: Mapped[str] = mapped_column(String(200), nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('true'))
    fecha_creacion: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    fecha_modificacion: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    descripcion: Mapped[Optional[str]] = mapped_column(Text)
    moneda_referencia: Mapped[Optional[str]] = mapped_column(CHAR(3))
    creado_por: Mapped[Optional[int]] = mapped_column(Integer)
    modificado_por: Mapped[Optional[int]] = mapped_column(Integer)

    usuarios: Mapped[Optional['Usuario']] = relationship('Usuario', foreign_keys=[creado_por], back_populates='centros_costos_creado_por')
    usuarios_: Mapped[Optional['Usuario']] = relationship('Usuario', foreign_keys=[modificado_por], back_populates='centros_costos_modificado_por')
    tenant: Mapped['Tenant'] = relationship('Tenant', back_populates='centros_costos')
    unidad_centro_costo_historial: Mapped[list['UnidadCentroCostoHistorial']] = relationship('UnidadCentroCostoHistorial', back_populates='centro_costo')
    costo_servicio_mes: Mapped[list['CostoServicioMes']] = relationship('CostoServicioMes', back_populates='centro_costo')


class Colaborador(Base):
    __tablename__ = 'colaboradores'
    __table_args__ = (
        CheckConstraint('fecha_cese IS NULL OR fecha_ingreso IS NULL OR fecha_cese >= fecha_ingreso', name='ck_colaborador_fechas'),
        ForeignKeyConstraint(['creado_por'], ['usuarios.id'], name='colaboradores_creado_por_fkey'),
        ForeignKeyConstraint(['modificado_por'], ['usuarios.id'], name='colaboradores_modificado_por_fkey'),
        ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE', name='colaboradores_tenant_id_fkey'),
        PrimaryKeyConstraint('id', name='colaboradores_pkey'),
        UniqueConstraint('tenant_id', 'codigo_colaborador', name='uq_colaborador_codigo'),
        Index('uq_colaborador_documento', 'tenant_id', 'numero_documento', postgresql_where='(numero_documento IS NOT NULL)', unique=True)
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    tenant_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    codigo_colaborador: Mapped[str] = mapped_column(String(80), nullable=False)
    nombres: Mapped[str] = mapped_column(String(150), nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('true'))
    fecha_creacion: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    fecha_modificacion: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    tipo_documento: Mapped[Optional[str]] = mapped_column(String(30))
    numero_documento: Mapped[Optional[str]] = mapped_column(String(50))
    apellidos: Mapped[Optional[str]] = mapped_column(String(150))
    email: Mapped[Optional[str]] = mapped_column(String(255))
    cargo: Mapped[Optional[str]] = mapped_column(String(150))
    fecha_ingreso: Mapped[Optional[datetime.date]] = mapped_column(Date)
    fecha_cese: Mapped[Optional[datetime.date]] = mapped_column(Date)
    creado_por: Mapped[Optional[int]] = mapped_column(Integer)
    modificado_por: Mapped[Optional[int]] = mapped_column(Integer)

    usuarios: Mapped[Optional['Usuario']] = relationship('Usuario', foreign_keys=[creado_por], back_populates='colaboradores_creado_por')
    usuarios_: Mapped[Optional['Usuario']] = relationship('Usuario', foreign_keys=[modificado_por], back_populates='colaboradores_modificado_por')
    tenant: Mapped['Tenant'] = relationship('Tenant', back_populates='colaboradores')
    colaborador_dispositivo_historial: Mapped[list['ColaboradorDispositivoHistorial']] = relationship('ColaboradorDispositivoHistorial', back_populates='colaborador')
    colaborador_unidad_historial: Mapped[list['ColaboradorUnidadHistorial']] = relationship('ColaboradorUnidadHistorial', back_populates='colaborador')
    geozona_eventos: Mapped[list['GeozonaEvento']] = relationship('GeozonaEvento', back_populates='colaborador')


class ComprobanteCliente(Base):
    __tablename__ = 'comprobantes_cliente'
    __table_args__ = (
        CheckConstraint("estado_declarado IS NULL OR (estado_declarado::text = ANY (ARRAY['PENDIENTE'::character varying, 'PAGADO'::character varying, 'ANULADO'::character varying]::text[]))", name='ck_comprobante_cliente_estado'),
        CheckConstraint('importe_total >= 0::numeric', name='ck_comprobante_cliente_importe'),
        CheckConstraint('periodo_hasta IS NULL OR periodo_desde IS NULL OR periodo_hasta >= periodo_desde', name='ck_comprobante_cliente_periodo'),
        ForeignKeyConstraint(['modificado_por'], ['usuarios.id'], name='comprobantes_cliente_modificado_por_fkey'),
        ForeignKeyConstraint(['registrado_por'], ['usuarios.id'], name='comprobantes_cliente_registrado_por_fkey'),
        ForeignKeyConstraint(['tenant_id'], ['tenants.id'], name='comprobantes_cliente_tenant_id_fkey'),
        PrimaryKeyConstraint('id', name='comprobantes_cliente_pkey'),
        Index('ix_comprobantes_cliente_tenant_fecha', 'tenant_id', 'fecha_emision')
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    tenant_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    tipo_documento: Mapped[str] = mapped_column(String(30), nullable=False, server_default=text("'FACTURA'::character varying"))
    fecha_emision: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    moneda_iso3: Mapped[str] = mapped_column(CHAR(3), nullable=False)
    importe_total: Mapped[decimal.Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    fecha_registro_bd: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    fecha_modificacion: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    numero_documento: Mapped[Optional[str]] = mapped_column(String(100))
    periodo_desde: Mapped[Optional[datetime.date]] = mapped_column(Date)
    periodo_hasta: Mapped[Optional[datetime.date]] = mapped_column(Date)
    fecha_vencimiento: Mapped[Optional[datetime.date]] = mapped_column(Date)
    estado_declarado: Mapped[Optional[str]] = mapped_column(String(20))
    observaciones: Mapped[Optional[str]] = mapped_column(Text)
    archivo_uri: Mapped[Optional[str]] = mapped_column(Text)
    archivo_nombre: Mapped[Optional[str]] = mapped_column(String(255))
    archivo_sha256: Mapped[Optional[str]] = mapped_column(String(64))
    registrado_por: Mapped[Optional[int]] = mapped_column(Integer)
    modificado_por: Mapped[Optional[int]] = mapped_column(Integer)

    usuarios: Mapped[Optional['Usuario']] = relationship('Usuario', foreign_keys=[modificado_por], back_populates='comprobantes_cliente_modificado_por')
    usuarios_: Mapped[Optional['Usuario']] = relationship('Usuario', foreign_keys=[registrado_por], back_populates='comprobantes_cliente_registrado_por')
    tenant: Mapped['Tenant'] = relationship('Tenant', back_populates='comprobantes_cliente')
    comprobante_cliente_lineas: Mapped[list['ComprobanteClienteLinea']] = relationship('ComprobanteClienteLinea', back_populates='comprobante')


class Cuenta(Base):
    __tablename__ = 'cuentas'
    __table_args__ = (
        ForeignKeyConstraint(['creado_por'], ['usuarios.id'], name='cuentas_creado_por_fkey'),
        ForeignKeyConstraint(['modificado_por'], ['usuarios.id'], name='cuentas_modificado_por_fkey'),
        ForeignKeyConstraint(['tenant_id'], ['tenants.id'], name='fk_cuentas_tenant'),
        PrimaryKeyConstraint('id', name='cuentas_pkey'),
        UniqueConstraint('numero_cuenta', name='cuentas_numero_cuenta_key'),
        Index('ix_cuentas_id', 'id'),
        Index('ix_cuentas_tenant', 'tenant_id')
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    numero_cuenta: Mapped[str] = mapped_column(String, nullable=False)
    nombre: Mapped[str] = mapped_column(String, nullable=False)
    fecha_creacion: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    fecha_modificacion: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    creado_por: Mapped[Optional[int]] = mapped_column(Integer)
    modificado_por: Mapped[Optional[int]] = mapped_column(Integer)
    tenant_id: Mapped[Optional[int]] = mapped_column(BigInteger)
    tipo_cuenta: Mapped[Optional[str]] = mapped_column(String(30))
    parent_numero_cuenta: Mapped[Optional[str]] = mapped_column(String(50))
    moneda_iso3: Mapped[Optional[str]] = mapped_column(CHAR(3))
    raw_json: Mapped[Optional[dict]] = mapped_column(JSONB)
    ultima_sincronizacion: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)

    usuarios: Mapped[Optional['Usuario']] = relationship('Usuario', foreign_keys=[creado_por], back_populates='cuentas_creado_por')
    usuarios_: Mapped[Optional['Usuario']] = relationship('Usuario', foreign_keys=[modificado_por], back_populates='cuentas_modificado_por')
    tenant: Mapped[Optional['Tenant']] = relationship('Tenant', back_populates='cuentas')
    ip_asignacion_actual: Mapped[list['IpAsignacionActual']] = relationship('IpAsignacionActual', back_populates='cuenta')
    lineas_servicio: Mapped[list['LineaServicio']] = relationship('LineaServicio', back_populates='cuenta')
    routers: Mapped[list['Router']] = relationship('Router', back_populates='cuenta')
    starlink_balance_historial: Mapped[list['StarlinkBalanceHistorial']] = relationship('StarlinkBalanceHistorial', back_populates='cuenta')
    starlink_facturas_reseller: Mapped[list['StarlinkFacturaReseller']] = relationship('StarlinkFacturaReseller', back_populates='cuenta')


class EstadoServicioLog(Base):
    __tablename__ = 'estado_servicio_log'
    __table_args__ = (
        ForeignKeyConstraint(['dispositivo_id'], ['dispositivos.id'], name='estado_servicio_log_dispositivo_id_fkey'),
        PrimaryKeyConstraint('id', name='estado_servicio_log_pkey'),
        Index('ix_estado_servicio_log_id', 'id')
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    dispositivo_id: Mapped[int] = mapped_column(Integer, nullable=False)
    fecha_hora_lectura: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False)
    estado: Mapped[str] = mapped_column(String, nullable=False)
    motivo: Mapped[Optional[str]] = mapped_column(String)
    fecha_registro_bd: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)

    dispositivo: Mapped['Dispositivo'] = relationship('Dispositivo', back_populates='estado_servicio_log')


class EstadoTerminalActual(Base):
    __tablename__ = 'estado_terminal_actual'
    __table_args__ = (
        CheckConstraint("estado_operativo IS NULL OR (estado_operativo::text = ANY (ARRAY['OPERATIVO'::character varying, 'INCIDENCIA'::character varying, 'DESCONECTADO'::character varying, 'DESCONOCIDO'::character varying]::text[]))", name='ck_estado_terminal'),
        ForeignKeyConstraint(['dispositivo_id'], ['dispositivos.id'], ondelete='CASCADE', name='estado_terminal_actual_dispositivo_id_fkey'),
        PrimaryKeyConstraint('dispositivo_id', name='estado_terminal_actual_pkey')
    )

    dispositivo_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tiene_alertas: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('false'))
    codigos_alerta: Mapped[list[int]] = mapped_column(ARRAY(Integer()), nullable=False, server_default=text("'{}'::integer[]"))
    fecha_actualizacion_bd: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    conectado: Mapped[Optional[bool]] = mapped_column(Boolean)
    estado_operativo: Mapped[Optional[str]] = mapped_column(String(30))
    uptime_segundos: Mapped[Optional[int]] = mapped_column(BigInteger)
    software_version: Mapped[Optional[str]] = mapped_column(String(200))
    signal_quality: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(8, 6))
    porcentaje_obstruccion: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(8, 6))
    ping_latency_ms: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(12, 4))
    ping_drop_rate: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(8, 6))
    downlink_mbps: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(12, 4))
    uplink_mbps: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(12, 4))
    h3_cell_id: Mapped[Optional[str]] = mapped_column(String(32))
    country_code: Mapped[Optional[str]] = mapped_column(CHAR(2))
    fecha_telemetria: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    raw_json: Mapped[Optional[dict]] = mapped_column(JSONB)


class GeolocalizacionLog(Base):
    __tablename__ = 'geolocalizacion_log'
    __table_args__ = (
        ForeignKeyConstraint(['dispositivo_id'], ['dispositivos.id'], name='geolocalizacion_log_dispositivo_id_fkey'),
        PrimaryKeyConstraint('id', name='geolocalizacion_log_pkey'),
        Index('ix_geolocalizacion_log_id', 'id')
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    dispositivo_id: Mapped[int] = mapped_column(Integer, nullable=False)
    fecha_hora_lectura: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False)
    latitud: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(10, 8))
    longitud: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(11, 8))
    fuente: Mapped[Optional[str]] = mapped_column(String)
    fecha_registro_bd: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    h3_cell_id: Mapped[Optional[str]] = mapped_column(String(32))
    country_code: Mapped[Optional[str]] = mapped_column(CHAR(2))
    in_territorial_waters: Mapped[Optional[bool]] = mapped_column(Boolean)
    raw_json: Mapped[Optional[dict]] = mapped_column(JSONB)

    dispositivo: Mapped['Dispositivo'] = relationship('Dispositivo', back_populates='geolocalizacion_log')


class GeozonaPolitica(Base):
    __tablename__ = 'geozona_politicas'
    __table_args__ = (
        CheckConstraint("accion_salida::text <> 'DESACTIVAR_LINEA_INMEDIATO'::text OR permitir_accion_destructiva = true", name='ck_geozona_destructiva'),
        CheckConstraint("accion_salida::text = ANY (ARRAY['SOLO_ALERTAR'::character varying, 'ALERTAR_Y_OPT_OUT_PRIORITY'::character varying, 'REQUIERE_APROBACION_DESACTIVAR'::character varying, 'DESACTIVAR_LINEA_INMEDIATO'::character varying]::text[])", name='ck_geozona_accion'),
        CheckConstraint('muestras_consecutivas_salida >= 1 AND muestras_consecutivas_retorno >= 1 AND segundos_fuera_confirmacion >= 0', name='ck_geozona_muestras'),
        ForeignKeyConstraint(['creado_por'], ['usuarios.id'], name='geozona_politicas_creado_por_fkey'),
        ForeignKeyConstraint(['modificado_por'], ['usuarios.id'], name='geozona_politicas_modificado_por_fkey'),
        ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE', name='geozona_politicas_tenant_id_fkey'),
        PrimaryKeyConstraint('id', name='geozona_politicas_pkey'),
        UniqueConstraint('tenant_id', 'nombre', name='uq_geozona_politica_nombre'),
        Index('ix_geozona_politicas_tenant', 'tenant_id', 'activa')
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    tenant_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    muestras_consecutivas_salida: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text('4'))
    segundos_fuera_confirmacion: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text('60'))
    muestras_consecutivas_retorno: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text('2'))
    accion_salida: Mapped[str] = mapped_column(String(50), nullable=False, server_default=text("'SOLO_ALERTAR'::character varying"))
    permitir_accion_destructiva: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('false'))
    desactivar_end_now: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('true'))
    notificar_cliente: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('true'))
    notificar_reseller: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('true'))
    activa: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('true'))
    configuracion_json: Mapped[dict] = mapped_column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    fecha_creacion: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    fecha_modificacion: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    creado_por: Mapped[Optional[int]] = mapped_column(Integer)
    modificado_por: Mapped[Optional[int]] = mapped_column(Integer)

    usuarios: Mapped[Optional['Usuario']] = relationship('Usuario', foreign_keys=[creado_por], back_populates='geozona_politicas_creado_por')
    usuarios_: Mapped[Optional['Usuario']] = relationship('Usuario', foreign_keys=[modificado_por], back_populates='geozona_politicas_modificado_por')
    tenant: Mapped['Tenant'] = relationship('Tenant', back_populates='geozona_politicas')
    dispositivo_geozona_historial: Mapped[list['DispositivoGeozonaHistorial']] = relationship('DispositivoGeozonaHistorial', back_populates='politica')
    geozona_eventos: Mapped[list['GeozonaEvento']] = relationship('GeozonaEvento', back_populates='politica')


class Geozona(Base):
    __tablename__ = 'geozonas'
    __table_args__ = (
        CheckConstraint("centro_latitud IS NULL OR centro_latitud >= '-90'::integer::numeric AND centro_latitud <= 90::numeric", name='ck_geozona_lat'),
        CheckConstraint("centro_longitud IS NULL OR centro_longitud >= '-180'::integer::numeric AND centro_longitud <= 180::numeric", name='ck_geozona_lon'),
        CheckConstraint('radio_metros IS NULL OR radio_metros > 0::numeric', name='ck_geozona_radio'),
        CheckConstraint("tipo_geozona::text = 'H3_CELDAS'::text OR tipo_geozona::text = 'CIRCULO'::text AND centro_latitud IS NOT NULL AND centro_longitud IS NOT NULL AND radio_metros IS NOT NULL OR tipo_geozona::text = 'POLIGONO'::text AND geometria_geojson IS NOT NULL", name='ck_geozona_forma'),
        CheckConstraint("tipo_geozona::text = ANY (ARRAY['H3_CELDAS'::character varying, 'CIRCULO'::character varying, 'POLIGONO'::character varying]::text[])", name='ck_geozona_tipo'),
        ForeignKeyConstraint(['creado_por'], ['usuarios.id'], name='geozonas_creado_por_fkey'),
        ForeignKeyConstraint(['modificado_por'], ['usuarios.id'], name='geozonas_modificado_por_fkey'),
        ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE', name='geozonas_tenant_id_fkey'),
        PrimaryKeyConstraint('id', name='geozonas_pkey'),
        UniqueConstraint('tenant_id', 'codigo', name='uq_geozona_codigo'),
        Index('ix_geozonas_tenant', 'tenant_id', 'activa')
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    tenant_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    codigo: Mapped[str] = mapped_column(String(80), nullable=False)
    nombre: Mapped[str] = mapped_column(String(200), nullable=False)
    tipo_geozona: Mapped[str] = mapped_column(String(20), nullable=False)
    tolerancia_borde_metros: Mapped[decimal.Decimal] = mapped_column(Numeric(14, 2), nullable=False, server_default=text('0'))
    activa: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('true'))
    fecha_creacion: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    fecha_modificacion: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    descripcion: Mapped[Optional[str]] = mapped_column(Text)
    centro_latitud: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(10, 7))
    centro_longitud: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(11, 7))
    radio_metros: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(14, 2))
    geometria_geojson: Mapped[Optional[dict]] = mapped_column(JSONB)
    pais: Mapped[Optional[str]] = mapped_column(String(100))
    departamento: Mapped[Optional[str]] = mapped_column(String(100))
    provincia: Mapped[Optional[str]] = mapped_column(String(100))
    direccion: Mapped[Optional[str]] = mapped_column(Text)
    creado_por: Mapped[Optional[int]] = mapped_column(Integer)
    modificado_por: Mapped[Optional[int]] = mapped_column(Integer)

    usuarios: Mapped[Optional['Usuario']] = relationship('Usuario', foreign_keys=[creado_por], back_populates='geozonas_creado_por')
    usuarios_: Mapped[Optional['Usuario']] = relationship('Usuario', foreign_keys=[modificado_por], back_populates='geozonas_modificado_por')
    tenant: Mapped['Tenant'] = relationship('Tenant', back_populates='geozonas')
    dispositivo_geozona_estado_actual: Mapped[list['DispositivoGeozonaEstadoActual']] = relationship('DispositivoGeozonaEstadoActual', back_populates='geozona')
    dispositivo_geozona_historial: Mapped[list['DispositivoGeozonaHistorial']] = relationship('DispositivoGeozonaHistorial', back_populates='geozona')
    geozona_h3_celdas: Mapped[list['GeozonaH3Celda']] = relationship('GeozonaH3Celda', back_populates='geozona')
    geozona_eventos: Mapped[list['GeozonaEvento']] = relationship('GeozonaEvento', back_populates='geozona')


class NivelOrganizacionConfig(Base):
    __tablename__ = 'niveles_organizacion_config'
    __table_args__ = (
        CheckConstraint('numero_nivel >= 1 AND numero_nivel <= 3', name='ck_niveles_org_numero'),
        ForeignKeyConstraint(['creado_por'], ['usuarios.id'], name='niveles_organizacion_config_creado_por_fkey'),
        ForeignKeyConstraint(['modificado_por'], ['usuarios.id'], name='niveles_organizacion_config_modificado_por_fkey'),
        ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE', name='niveles_organizacion_config_tenant_id_fkey'),
        PrimaryKeyConstraint('tenant_id', 'numero_nivel', name='niveles_organizacion_config_pkey')
    )

    tenant_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    numero_nivel: Mapped[int] = mapped_column(SmallInteger, primary_key=True)
    nombre_nivel: Mapped[str] = mapped_column(String(100), nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('true'))
    fecha_creacion: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    fecha_modificacion: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    nombre_nivel_plural: Mapped[Optional[str]] = mapped_column(String(120))
    creado_por: Mapped[Optional[int]] = mapped_column(Integer)
    modificado_por: Mapped[Optional[int]] = mapped_column(Integer)

    usuarios: Mapped[Optional['Usuario']] = relationship('Usuario', foreign_keys=[creado_por], back_populates='niveles_organizacion_config_creado_por')
    usuarios_: Mapped[Optional['Usuario']] = relationship('Usuario', foreign_keys=[modificado_por], back_populates='niveles_organizacion_config_modificado_por')
    tenant: Mapped['Tenant'] = relationship('Tenant', back_populates='niveles_organizacion_config')


class SincronizacionesApi(Base):
    __tablename__ = 'sincronizaciones_api'
    __table_args__ = (
        ForeignKeyConstraint(['tenant_id'], ['tenants.id'], name='sincronizaciones_api_tenant_id_fkey'),
        PrimaryKeyConstraint('id', name='sincronizaciones_api_pkey'),
        Index('ix_sincronizaciones_fecha', 'fecha_inicio')
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    proceso: Mapped[str] = mapped_column(String(80), nullable=False)
    fecha_inicio: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False)
    estado: Mapped[str] = mapped_column(String(30), nullable=False)
    registros_leidos: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text('0'))
    registros_insertados: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text('0'))
    registros_actualizados: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text('0'))
    tenant_id: Mapped[Optional[int]] = mapped_column(BigInteger)
    endpoint_logico: Mapped[Optional[str]] = mapped_column(String(120))
    fecha_fin: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    http_status: Mapped[Optional[int]] = mapped_column(Integer)
    mensaje: Mapped[Optional[str]] = mapped_column(Text)
    detalle_json: Mapped[Optional[dict]] = mapped_column(JSONB)

    tenant: Mapped[Optional['Tenant']] = relationship('Tenant', back_populates='sincronizaciones_api')


class TelemetriaLog(Base):
    __tablename__ = 'telemetria_log'
    __table_args__ = (
        ForeignKeyConstraint(['dispositivo_id'], ['dispositivos.id'], name='telemetria_log_dispositivo_id_fkey'),
        PrimaryKeyConstraint('id', name='telemetria_log_pkey'),
        Index('ix_telemetria_log_id', 'id')
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    dispositivo_id: Mapped[int] = mapped_column(Integer, nullable=False)
    fecha_hora_lectura: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False)
    periodo_segundos: Mapped[Optional[int]] = mapped_column(Integer)
    ping_latency_avg_ms: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(8, 2))
    ping_drop_rate_avg: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(5, 4))
    downlink_mbps_avg: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(8, 2))
    uplink_mbps_avg: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(8, 2))
    signal_quality_avg: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(5, 2))
    porcentaje_obstruccion: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(5, 2))
    uptime_segundos: Mapped[Optional[int]] = mapped_column(BigInteger)
    estimado_descargado_gb: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(10, 3))
    estimado_cargado_gb: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(10, 3))
    muestras_totales: Mapped[Optional[int]] = mapped_column(Integer)
    fecha_registro_bd: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)

    dispositivo: Mapped['Dispositivo'] = relationship('Dispositivo', back_populates='telemetria_log')


class TenantUsuario(Base):
    __tablename__ = 'tenant_usuarios'
    __table_args__ = (
        ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE', name='tenant_usuarios_tenant_id_fkey'),
        ForeignKeyConstraint(['usuario_id'], ['usuarios.id'], ondelete='CASCADE', name='tenant_usuarios_usuario_id_fkey'),
        PrimaryKeyConstraint('tenant_id', 'usuario_id', name='tenant_usuarios_pkey'),
        Index('ix_tenant_usuarios_usuario', 'usuario_id')
    )

    tenant_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    usuario_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    rol: Mapped[str] = mapped_column(String(50), nullable=False, server_default=text("'CLIENTE'::character varying"))
    es_principal: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('false'))
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('true'))
    fecha_creacion: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False, server_default=text('CURRENT_TIMESTAMP'))

    tenant: Mapped['Tenant'] = relationship('Tenant', back_populates='tenant_usuarios')
    usuario: Mapped['Usuario'] = relationship('Usuario', back_populates='tenant_usuarios')


class UnidadOrganizacional(Base):
    __tablename__ = 'unidades_organizacionales'
    __table_args__ = (
        CheckConstraint('numero_nivel >= 1 AND numero_nivel <= 3', name='ck_unidad_org_nivel'),
        ForeignKeyConstraint(['creado_por'], ['usuarios.id'], name='unidades_organizacionales_creado_por_fkey'),
        ForeignKeyConstraint(['modificado_por'], ['usuarios.id'], name='unidades_organizacionales_modificado_por_fkey'),
        ForeignKeyConstraint(['parent_id'], ['unidades_organizacionales.id'], name='unidades_organizacionales_parent_id_fkey'),
        ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE', name='unidades_organizacionales_tenant_id_fkey'),
        PrimaryKeyConstraint('id', name='unidades_organizacionales_pkey'),
        UniqueConstraint('tenant_id', 'numero_nivel', 'codigo', name='uq_unidad_org_codigo'),
        Index('ix_unidades_org_parent', 'parent_id'),
        Index('ix_unidades_org_tenant_nivel', 'tenant_id', 'numero_nivel', 'activo')
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    tenant_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    numero_nivel: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    codigo: Mapped[str] = mapped_column(String(80), nullable=False)
    nombre: Mapped[str] = mapped_column(String(200), nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('true'))
    fecha_creacion: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    fecha_modificacion: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    parent_id: Mapped[Optional[int]] = mapped_column(BigInteger)
    descripcion: Mapped[Optional[str]] = mapped_column(Text)
    creado_por: Mapped[Optional[int]] = mapped_column(Integer)
    modificado_por: Mapped[Optional[int]] = mapped_column(Integer)

    usuarios: Mapped[Optional['Usuario']] = relationship('Usuario', foreign_keys=[creado_por], back_populates='unidades_organizacionales_creado_por')
    usuarios_: Mapped[Optional['Usuario']] = relationship('Usuario', foreign_keys=[modificado_por], back_populates='unidades_organizacionales_modificado_por')
    parent: Mapped[Optional['UnidadOrganizacional']] = relationship('UnidadOrganizacional', remote_side=[id], back_populates='parent_reverse')
    parent_reverse: Mapped[list['UnidadOrganizacional']] = relationship('UnidadOrganizacional', remote_side=[parent_id], back_populates='parent')
    tenant: Mapped['Tenant'] = relationship('Tenant', back_populates='unidades_organizacionales')
    colaborador_unidad_historial: Mapped[list['ColaboradorUnidadHistorial']] = relationship('ColaboradorUnidadHistorial', back_populates='unidad_nivel3')
    unidad_centro_costo_historial: Mapped[list['UnidadCentroCostoHistorial']] = relationship('UnidadCentroCostoHistorial', back_populates='unidad')
    costo_servicio_mes_unidad_nivel1: Mapped[list['CostoServicioMes']] = relationship('CostoServicioMes', foreign_keys='[CostoServicioMes.unidad_nivel1_id]', back_populates='unidad_nivel1')
    costo_servicio_mes_unidad_nivel2: Mapped[list['CostoServicioMes']] = relationship('CostoServicioMes', foreign_keys='[CostoServicioMes.unidad_nivel2_id]', back_populates='unidad_nivel2')
    costo_servicio_mes_unidad_nivel3: Mapped[list['CostoServicioMes']] = relationship('CostoServicioMes', foreign_keys='[CostoServicioMes.unidad_nivel3_id]', back_populates='unidad_nivel3')


class ColaboradorDispositivoHistorial(Base):
    __tablename__ = 'colaborador_dispositivo_historial'
    __table_args__ = (
        CheckConstraint('vigente_hasta IS NULL OR vigente_hasta > vigente_desde', name='ck_colaborador_dispositivo_fechas'),
        ForeignKeyConstraint(['colaborador_id'], ['colaboradores.id'], name='colaborador_dispositivo_historial_colaborador_id_fkey'),
        ForeignKeyConstraint(['dispositivo_id'], ['dispositivos.id'], name='colaborador_dispositivo_historial_dispositivo_id_fkey'),
        ForeignKeyConstraint(['registrado_por'], ['usuarios.id'], name='colaborador_dispositivo_historial_registrado_por_fkey'),
        ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE', name='colaborador_dispositivo_historial_tenant_id_fkey'),
        PrimaryKeyConstraint('id', name='colaborador_dispositivo_historial_pkey'),
        Index('ix_colaborador_dispositivo_tenant', 'tenant_id', 'dispositivo_id', 'vigente_desde'),
        Index('uq_colaborador_equipo_vigente', 'colaborador_id', postgresql_where='(vigente_hasta IS NULL)', unique=True),
        Index('uq_equipo_colaborador_vigente', 'dispositivo_id', postgresql_where='(vigente_hasta IS NULL)', unique=True)
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    tenant_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    colaborador_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    dispositivo_id: Mapped[int] = mapped_column(Integer, nullable=False)
    vigente_desde: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    fecha_registro_bd: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    vigente_hasta: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    motivo: Mapped[Optional[str]] = mapped_column(String(250))
    registrado_por: Mapped[Optional[int]] = mapped_column(Integer)

    colaborador: Mapped['Colaborador'] = relationship('Colaborador', back_populates='colaborador_dispositivo_historial')
    dispositivo: Mapped['Dispositivo'] = relationship('Dispositivo', back_populates='colaborador_dispositivo_historial')
    usuarios: Mapped[Optional['Usuario']] = relationship('Usuario', back_populates='colaborador_dispositivo_historial')
    tenant: Mapped['Tenant'] = relationship('Tenant', back_populates='colaborador_dispositivo_historial')


class ColaboradorUnidadHistorial(Base):
    __tablename__ = 'colaborador_unidad_historial'
    __table_args__ = (
        CheckConstraint('vigente_hasta IS NULL OR vigente_hasta >= vigente_desde', name='ck_colaborador_unidad_fechas'),
        ForeignKeyConstraint(['colaborador_id'], ['colaboradores.id'], name='colaborador_unidad_historial_colaborador_id_fkey'),
        ForeignKeyConstraint(['registrado_por'], ['usuarios.id'], name='colaborador_unidad_historial_registrado_por_fkey'),
        ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE', name='colaborador_unidad_historial_tenant_id_fkey'),
        ForeignKeyConstraint(['unidad_nivel3_id'], ['unidades_organizacionales.id'], name='colaborador_unidad_historial_unidad_nivel3_id_fkey'),
        PrimaryKeyConstraint('id', name='colaborador_unidad_historial_pkey'),
        Index('ix_colaborador_unidad_tenant_fecha', 'tenant_id', 'unidad_nivel3_id', 'vigente_desde'),
        Index('uq_colaborador_unidad_vigente', 'colaborador_id', postgresql_where='(vigente_hasta IS NULL)', unique=True)
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    tenant_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    colaborador_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    unidad_nivel3_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    vigente_desde: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    fecha_registro_bd: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    vigente_hasta: Mapped[Optional[datetime.date]] = mapped_column(Date)
    registrado_por: Mapped[Optional[int]] = mapped_column(Integer)

    colaborador: Mapped['Colaborador'] = relationship('Colaborador', back_populates='colaborador_unidad_historial')
    usuarios: Mapped[Optional['Usuario']] = relationship('Usuario', back_populates='colaborador_unidad_historial')
    tenant: Mapped['Tenant'] = relationship('Tenant', back_populates='colaborador_unidad_historial')
    unidad_nivel3: Mapped['UnidadOrganizacional'] = relationship('UnidadOrganizacional', back_populates='colaborador_unidad_historial')


class DispositivoGeozonaEstadoActual(Base):
    __tablename__ = 'dispositivo_geozona_estado_actual'
    __table_args__ = (
        CheckConstraint("estado::text = ANY (ARRAY['DESCONOCIDO'::character varying, 'DENTRO'::character varying, 'FUERA_PENDIENTE'::character varying, 'FUERA_CONFIRMADO'::character varying, 'RETORNO_PENDIENTE'::character varying]::text[])", name='ck_geozona_estado_actual'),
        ForeignKeyConstraint(['dispositivo_id'], ['dispositivos.id'], ondelete='CASCADE', name='dispositivo_geozona_estado_actual_dispositivo_id_fkey'),
        ForeignKeyConstraint(['geozona_id'], ['geozonas.id'], name='dispositivo_geozona_estado_actual_geozona_id_fkey'),
        ForeignKeyConstraint(['tenant_id'], ['tenants.id'], name='dispositivo_geozona_estado_actual_tenant_id_fkey'),
        PrimaryKeyConstraint('dispositivo_id', name='dispositivo_geozona_estado_actual_pkey'),
        Index('ix_geozona_estado_tenant_estado', 'tenant_id', 'estado', 'fecha_ultima_muestra')
    )

    dispositivo_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    geozona_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    estado: Mapped[str] = mapped_column(String(30), nullable=False, server_default=text("'DESCONOCIDO'::character varying"))
    muestras_fuera_consecutivas: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text('0'))
    muestras_dentro_consecutivas: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text('0'))
    fecha_actualizacion_bd: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    h3_cell_id_actual: Mapped[Optional[str]] = mapped_column(String(32))
    fecha_ultima_muestra: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    fecha_primera_salida: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    fecha_primera_entrada: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    fecha_ultima_confirmacion: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)

    geozona: Mapped['Geozona'] = relationship('Geozona', back_populates='dispositivo_geozona_estado_actual')
    tenant: Mapped['Tenant'] = relationship('Tenant', back_populates='dispositivo_geozona_estado_actual')


class DispositivoGeozonaHistorial(Base):
    __tablename__ = 'dispositivo_geozona_historial'
    __table_args__ = (
        CheckConstraint('vigente_hasta IS NULL OR vigente_hasta > vigente_desde', name='ck_dispositivo_geozona_fechas'),
        ForeignKeyConstraint(['dispositivo_id'], ['dispositivos.id'], name='dispositivo_geozona_historial_dispositivo_id_fkey'),
        ForeignKeyConstraint(['geozona_id'], ['geozonas.id'], name='dispositivo_geozona_historial_geozona_id_fkey'),
        ForeignKeyConstraint(['politica_id'], ['geozona_politicas.id'], name='dispositivo_geozona_historial_politica_id_fkey'),
        ForeignKeyConstraint(['registrado_por'], ['usuarios.id'], name='dispositivo_geozona_historial_registrado_por_fkey'),
        ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE', name='dispositivo_geozona_historial_tenant_id_fkey'),
        PrimaryKeyConstraint('id', name='dispositivo_geozona_historial_pkey'),
        Index('ix_dispositivo_geozona_tenant', 'tenant_id', 'geozona_id', 'dispositivo_id'),
        Index('uq_dispositivo_geozona_vigente', 'dispositivo_id', postgresql_where='(vigente_hasta IS NULL)', unique=True)
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    tenant_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    dispositivo_id: Mapped[int] = mapped_column(Integer, nullable=False)
    geozona_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    politica_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    vigente_desde: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    fecha_registro_bd: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    vigente_hasta: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    observacion: Mapped[Optional[str]] = mapped_column(Text)
    registrado_por: Mapped[Optional[int]] = mapped_column(Integer)

    dispositivo: Mapped['Dispositivo'] = relationship('Dispositivo', back_populates='dispositivo_geozona_historial')
    geozona: Mapped['Geozona'] = relationship('Geozona', back_populates='dispositivo_geozona_historial')
    politica: Mapped['GeozonaPolitica'] = relationship('GeozonaPolitica', back_populates='dispositivo_geozona_historial')
    usuarios: Mapped[Optional['Usuario']] = relationship('Usuario', back_populates='dispositivo_geozona_historial')
    tenant: Mapped['Tenant'] = relationship('Tenant', back_populates='dispositivo_geozona_historial')


class GeozonaH3Celda(Base):
    __tablename__ = 'geozona_h3_celdas'
    __table_args__ = (
        CheckConstraint("tipo_celda::text = ANY (ARRAY['INTERIOR'::character varying, 'BORDE'::character varying, 'TOLERANCIA'::character varying]::text[])", name='ck_geozona_h3_tipo'),
        ForeignKeyConstraint(['geozona_id'], ['geozonas.id'], ondelete='CASCADE', name='geozona_h3_celdas_geozona_id_fkey'),
        PrimaryKeyConstraint('geozona_id', 'h3_cell_id', name='geozona_h3_celdas_pkey'),
        Index('ix_geozona_h3_lookup', 'h3_cell_id', 'geozona_id')
    )

    geozona_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    h3_cell_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    tipo_celda: Mapped[str] = mapped_column(String(20), nullable=False, server_default=text("'INTERIOR'::character varying"))
    fecha_generacion: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False, server_default=text('CURRENT_TIMESTAMP'))

    geozona: Mapped['Geozona'] = relationship('Geozona', back_populates='geozona_h3_celdas')


class IpAsignacionActual(Base):
    __tablename__ = 'ip_asignacion_actual'
    __table_args__ = (
        ForeignKeyConstraint(['cuenta_id'], ['cuentas.id'], name='ip_asignacion_actual_cuenta_id_fkey'),
        ForeignKeyConstraint(['dispositivo_id'], ['dispositivos.id'], name='ip_asignacion_actual_dispositivo_id_fkey'),
        PrimaryKeyConstraint('dispositivo_id', name='ip_asignacion_actual_pkey')
    )

    dispositivo_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    fecha_lectura: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False)
    fecha_registro_bd: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    cuenta_id: Mapped[Optional[int]] = mapped_column(Integer)
    ipv4: Mapped[Optional[list[Any]]] = mapped_column(ARRAY(INET()))
    ipv6_ue: Mapped[Optional[list[Any]]] = mapped_column(ARRAY(INET()))
    ipv6_cpe: Mapped[Optional[list[Any]]] = mapped_column(ARRAY(INET()))
    raw_json: Mapped[Optional[dict]] = mapped_column(JSONB)

    cuenta: Mapped[Optional['Cuenta']] = relationship('Cuenta', back_populates='ip_asignacion_actual')


class LineaServicio(Base):
    __tablename__ = 'lineas_servicio'
    __table_args__ = (
        ForeignKeyConstraint(['creado_por'], ['usuarios.id'], name='lineas_servicio_creado_por_fkey'),
        ForeignKeyConstraint(['cuenta_id'], ['cuentas.id'], name='lineas_servicio_cuenta_id_fkey'),
        ForeignKeyConstraint(['dispositivo_id'], ['dispositivos.id'], name='lineas_servicio_dispositivo_id_fkey'),
        ForeignKeyConstraint(['modificado_por'], ['usuarios.id'], name='lineas_servicio_modificado_por_fkey'),
        PrimaryKeyConstraint('id', name='lineas_servicio_pkey'),
        UniqueConstraint('numero_linea', name='lineas_servicio_numero_linea_key'),
        Index('ix_lineas_servicio_id', 'id')
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    numero_linea: Mapped[str] = mapped_column(String, nullable=False)
    nombre: Mapped[str] = mapped_column(String, nullable=False)
    cuenta_id: Mapped[Optional[int]] = mapped_column(Integer)
    dispositivo_id: Mapped[Optional[int]] = mapped_column(Integer)
    subscription_id: Mapped[Optional[str]] = mapped_column(String)
    id_producto: Mapped[Optional[str]] = mapped_column(String)
    tipo_suscripcion: Mapped[Optional[str]] = mapped_column(String)
    plan_contratado: Mapped[Optional[str]] = mapped_column(String)
    es_plan_movil: Mapped[Optional[bool]] = mapped_column(Boolean)
    estado_provisionamiento: Mapped[Optional[str]] = mapped_column(String)
    permitir_excedentes_opt_in: Mapped[Optional[bool]] = mapped_column(Boolean)
    fecha_creacion: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    fecha_modificacion: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    creado_por: Mapped[Optional[int]] = mapped_column(Integer)
    modificado_por: Mapped[Optional[int]] = mapped_column(Integer)
    usage_limit_gb: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(14, 3))
    ip_publica_habilitada: Mapped[Optional[bool]] = mapped_column(Boolean)
    fecha_activacion: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    fecha_baja: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    ultima_sincronizacion: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    raw_json: Mapped[Optional[dict]] = mapped_column(JSONB)

    usuarios: Mapped[Optional['Usuario']] = relationship('Usuario', foreign_keys=[creado_por], back_populates='lineas_servicio_creado_por')
    cuenta: Mapped[Optional['Cuenta']] = relationship('Cuenta', back_populates='lineas_servicio')
    dispositivo: Mapped[Optional['Dispositivo']] = relationship('Dispositivo', back_populates='lineas_servicio')
    usuarios_: Mapped[Optional['Usuario']] = relationship('Usuario', foreign_keys=[modificado_por], back_populates='lineas_servicio_modificado_por')
    comandos_remotos_log: Mapped[list['ComandoRemotoLog']] = relationship('ComandoRemotoLog', back_populates='linea_servicio')
    comprobante_cliente_lineas: Mapped[list['ComprobanteClienteLinea']] = relationship('ComprobanteClienteLinea', back_populates='linea_servicio')
    consumo_ciclos: Mapped[list['ConsumoCiclo']] = relationship('ConsumoCiclo', back_populates='linea_servicio')
    consumo_diario: Mapped[list['ConsumoDiario']] = relationship('ConsumoDiario', back_populates='linea_servicio')
    costo_servicio_mes: Mapped[list['CostoServicioMes']] = relationship('CostoServicioMes', back_populates='linea_servicio')
    direcciones_servicio: Mapped[list['DireccionServicio']] = relationship('DireccionServicio', back_populates='linea_servicio')
    linea_dispositivo_historial: Mapped[list['LineaDispositivoHistorial']] = relationship('LineaDispositivoHistorial', back_populates='linea_servicio')
    linea_plan_historial: Mapped[list['LineaPlanHistorial']] = relationship('LineaPlanHistorial', back_populates='linea_servicio')
    politicas_servicio: Mapped[list['PoliticaServicio']] = relationship('PoliticaServicio', back_populates='linea_servicio')
    saldos_historial: Mapped[list['SaldosHistorial']] = relationship('SaldosHistorial', back_populates='linea_servicio')
    servicio_resumen_dia: Mapped[list['ServicioResumenDia']] = relationship('ServicioResumenDia', back_populates='linea_servicio')
    telemetria_router_resumen_hora: Mapped[list['TelemetriaRouterResumenHora']] = relationship('TelemetriaRouterResumenHora', back_populates='linea_servicio')
    telemetria_terminal_resumen_hora: Mapped[list['TelemetriaTerminalResumenHora']] = relationship('TelemetriaTerminalResumenHora', back_populates='linea_servicio')
    control_servicio_historial: Mapped[list['ControlServicioHistorial']] = relationship('ControlServicioHistorial', back_populates='linea_servicio')
    geozona_eventos: Mapped[list['GeozonaEvento']] = relationship('GeozonaEvento', back_populates='linea_servicio')
    starlink_factura_lineas: Mapped[list['StarlinkFacturaLinea']] = relationship('StarlinkFacturaLinea', back_populates='linea_servicio')


class Router(Base):
    __tablename__ = 'routers'
    __table_args__ = (
        ForeignKeyConstraint(['creado_por'], ['usuarios.id'], name='routers_creado_por_fkey'),
        ForeignKeyConstraint(['cuenta_id'], ['cuentas.id'], name='routers_cuenta_id_fkey'),
        ForeignKeyConstraint(['dispositivo_id'], ['dispositivos.id'], name='routers_dispositivo_id_fkey'),
        ForeignKeyConstraint(['modificado_por'], ['usuarios.id'], name='routers_modificado_por_fkey'),
        PrimaryKeyConstraint('id', name='routers_pkey'),
        UniqueConstraint('router_id', name='routers_router_id_key'),
        Index('ix_routers_cuenta', 'cuenta_id'),
        Index('ix_routers_dispositivo', 'dispositivo_id')
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    router_id: Mapped[str] = mapped_column(String(150), nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('true'))
    fecha_creacion: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    fecha_modificacion: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    cuenta_id: Mapped[Optional[int]] = mapped_column(Integer)
    dispositivo_id: Mapped[Optional[int]] = mapped_column(Integer)
    nombre: Mapped[Optional[str]] = mapped_column(String(150))
    software_version_actual: Mapped[Optional[str]] = mapped_column(String(200))
    bypass_actual: Mapped[Optional[bool]] = mapped_column(Boolean)
    ultima_telemetria: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    raw_json: Mapped[Optional[dict]] = mapped_column(JSONB)
    creado_por: Mapped[Optional[int]] = mapped_column(Integer)
    modificado_por: Mapped[Optional[int]] = mapped_column(Integer)

    usuarios: Mapped[Optional['Usuario']] = relationship('Usuario', foreign_keys=[creado_por], back_populates='routers_creado_por')
    cuenta: Mapped[Optional['Cuenta']] = relationship('Cuenta', back_populates='routers')
    dispositivo: Mapped[Optional['Dispositivo']] = relationship('Dispositivo', back_populates='routers')
    usuarios_: Mapped[Optional['Usuario']] = relationship('Usuario', foreign_keys=[modificado_por], back_populates='routers_modificado_por')
    comandos_remotos_log: Mapped[list['ComandoRemotoLog']] = relationship('ComandoRemotoLog', back_populates='router')
    telemetria_router_resumen_hora: Mapped[list['TelemetriaRouterResumenHora']] = relationship('TelemetriaRouterResumenHora', back_populates='router')


class StarlinkBalanceHistorial(Base):
    __tablename__ = 'starlink_balance_historial'
    __table_args__ = (
        ForeignKeyConstraint(['cuenta_id'], ['cuentas.id'], name='starlink_balance_historial_cuenta_id_fkey'),
        PrimaryKeyConstraint('id', name='starlink_balance_historial_pkey'),
        UniqueConstraint('cuenta_id', 'fecha_lectura', 'moneda_iso3', name='uq_starlink_balance_lectura'),
        Index('ix_starlink_balance_cuenta_fecha', 'cuenta_id', 'fecha_lectura')
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    cuenta_id: Mapped[int] = mapped_column(Integer, nullable=False)
    fecha_lectura: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False)
    moneda_iso3: Mapped[str] = mapped_column(CHAR(3), nullable=False)
    monto_pendiente: Mapped[decimal.Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    fecha_registro_bd: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    raw_json: Mapped[Optional[dict]] = mapped_column(JSONB)

    cuenta: Mapped['Cuenta'] = relationship('Cuenta', back_populates='starlink_balance_historial')


class StarlinkFacturaReseller(Base):
    __tablename__ = 'starlink_facturas_reseller'
    __table_args__ = (
        CheckConstraint('monto_total >= 0::numeric AND (monto_pagado IS NULL OR monto_pagado >= 0::numeric) AND (monto_pendiente IS NULL OR monto_pendiente >= 0::numeric)', name='ck_starlink_factura_montos'),
        ForeignKeyConstraint(['cuenta_id'], ['cuentas.id'], name='starlink_facturas_reseller_cuenta_id_fkey'),
        PrimaryKeyConstraint('id', name='starlink_facturas_reseller_pkey'),
        UniqueConstraint('cuenta_id', 'invoice_id_externo', name='uq_starlink_factura_reseller'),
        Index('ix_starlink_facturas_reseller_fecha', 'cuenta_id', 'fecha_factura')
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    cuenta_id: Mapped[int] = mapped_column(Integer, nullable=False)
    invoice_id_externo: Mapped[str] = mapped_column(String(150), nullable=False)
    moneda_iso3: Mapped[str] = mapped_column(CHAR(3), nullable=False)
    monto_total: Mapped[decimal.Decimal] = mapped_column(Numeric(18, 4), nullable=False, server_default=text('0'))
    fecha_factura: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False)
    fecha_registro_bd: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    fecha_modificacion: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    order_reference_id: Mapped[Optional[str]] = mapped_column(String(150))
    descripcion: Mapped[Optional[str]] = mapped_column(String(500))
    monto_pagado: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(18, 4))
    monto_pendiente: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(18, 4))
    fecha_vencimiento: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    estado_factura: Mapped[Optional[str]] = mapped_column(String(30))
    raw_json: Mapped[Optional[dict]] = mapped_column(JSONB)

    cuenta: Mapped['Cuenta'] = relationship('Cuenta', back_populates='starlink_facturas_reseller')
    starlink_factura_detalles: Mapped[list['StarlinkFacturaDetalle']] = relationship('StarlinkFacturaDetalle', back_populates='factura')


class UnidadCentroCostoHistorial(Base):
    __tablename__ = 'unidad_centro_costo_historial'
    __table_args__ = (
        CheckConstraint('vigente_hasta IS NULL OR vigente_hasta >= vigente_desde', name='ck_unidad_cc_fechas'),
        ForeignKeyConstraint(['centro_costo_id'], ['centros_costos.id'], name='unidad_centro_costo_historial_centro_costo_id_fkey'),
        ForeignKeyConstraint(['registrado_por'], ['usuarios.id'], name='unidad_centro_costo_historial_registrado_por_fkey'),
        ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE', name='unidad_centro_costo_historial_tenant_id_fkey'),
        ForeignKeyConstraint(['unidad_id'], ['unidades_organizacionales.id'], name='unidad_centro_costo_historial_unidad_id_fkey'),
        PrimaryKeyConstraint('id', name='unidad_centro_costo_historial_pkey'),
        Index('ix_unidad_cc_tenant_fecha', 'tenant_id', 'unidad_id', 'vigente_desde'),
        Index('uq_unidad_cc_vigente', 'unidad_id', postgresql_where='(vigente_hasta IS NULL)', unique=True)
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    tenant_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    unidad_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    centro_costo_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    vigente_desde: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    fecha_registro_bd: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    vigente_hasta: Mapped[Optional[datetime.date]] = mapped_column(Date)
    registrado_por: Mapped[Optional[int]] = mapped_column(Integer)

    centro_costo: Mapped['CentroCosto'] = relationship('CentroCosto', back_populates='unidad_centro_costo_historial')
    usuarios: Mapped[Optional['Usuario']] = relationship('Usuario', back_populates='unidad_centro_costo_historial')
    tenant: Mapped['Tenant'] = relationship('Tenant', back_populates='unidad_centro_costo_historial')
    unidad: Mapped['UnidadOrganizacional'] = relationship('UnidadOrganizacional', back_populates='unidad_centro_costo_historial')


class DispositivoAsignacionHistorial(Base):
    __tablename__ = 'dispositivo_asignacion_historial'
    __table_args__ = (
        CheckConstraint('vigente_hasta IS NULL OR vigente_hasta > vigente_desde', name='ck_disp_asig_fechas'),
        ForeignKeyConstraint(['centro_costo_id'], ['centros_costos.id'], name='fk_disp_asig_centro_costo'),
        ForeignKeyConstraint(['dispositivo_id'], ['dispositivos.id'], name='fk_disp_asig_dispositivo'),
        ForeignKeyConstraint(['registrado_por'], ['usuarios.id'], name='fk_disp_asig_registrado_por'),
        ForeignKeyConstraint(['tenant_id'], ['tenants.id'], name='fk_disp_asig_tenant'),
        ForeignKeyConstraint(['unidad_organizacional_id'], ['unidades_organizacionales.id'], name='fk_disp_asig_unidad'),
        PrimaryKeyConstraint('id', name='dispositivo_asignacion_historial_pkey')
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    tenant_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    dispositivo_id: Mapped[int] = mapped_column(Integer, nullable=False)
    unidad_organizacional_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    centro_costo_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    vigente_desde: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    vigente_hasta: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    motivo: Mapped[Optional[str]] = mapped_column(Text)
    origen: Mapped[str] = mapped_column(String(40), nullable=False, server_default=text("'PORTAL_CLIENTE'::character varying"))
    fecha_registro_bd: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    registrado_por: Mapped[Optional[int]] = mapped_column(Integer)

    dispositivo: Mapped['Dispositivo'] = relationship('Dispositivo', back_populates='asignaciones_historial')
    unidad_organizacional: Mapped['UnidadOrganizacional'] = relationship('UnidadOrganizacional')
    centro_costo: Mapped['CentroCosto'] = relationship('CentroCosto')
    tenant: Mapped['Tenant'] = relationship('Tenant')
    usuario_registro: Mapped[Optional['Usuario']] = relationship('Usuario', foreign_keys=[registrado_por])


class ComandoRemotoLog(Base):
    __tablename__ = 'comandos_remotos_log'
    __table_args__ = (
        ForeignKeyConstraint(['confirmado_por'], ['usuarios.id'], name='fk_comandos_confirmado_por'),
        ForeignKeyConstraint(['linea_servicio_id'], ['lineas_servicio.id'], name='fk_comandos_linea'),
        ForeignKeyConstraint(['router_id'], ['routers.id'], name='fk_comandos_router'),
        PrimaryKeyConstraint('id', name='comandos_remotos_log_pkey'),
        Index('ix_comandos_router_fecha', 'router_id', 'fecha_solicitud')
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    reintentos: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text('0'))
    requiere_confirmacion: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('true'))
    dispositivo_id: Mapped[Optional[int]] = mapped_column(Integer)
    comando: Mapped[Optional[str]] = mapped_column(Text)
    estado: Mapped[Optional[str]] = mapped_column(Text)
    fecha_solicitud: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    solicitado_por: Mapped[Optional[int]] = mapped_column(Integer)
    router_id: Mapped[Optional[int]] = mapped_column(BigInteger)
    linea_servicio_id: Mapped[Optional[int]] = mapped_column(Integer)
    fecha_respuesta: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    http_status: Mapped[Optional[int]] = mapped_column(Integer)
    id_correlacion: Mapped[Optional[str]] = mapped_column(String(150))
    request_json: Mapped[Optional[dict]] = mapped_column(JSONB)
    response_json: Mapped[Optional[dict]] = mapped_column(JSONB)
    mensaje_error: Mapped[Optional[str]] = mapped_column(Text)
    fecha_inicio_ejecucion: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    fecha_fin_ejecucion: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    confirmado_por: Mapped[Optional[int]] = mapped_column(Integer)
    fecha_confirmacion: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)

    usuarios: Mapped[Optional['Usuario']] = relationship('Usuario', back_populates='comandos_remotos_log')
    linea_servicio: Mapped[Optional['LineaServicio']] = relationship('LineaServicio', back_populates='comandos_remotos_log')
    router: Mapped[Optional['Router']] = relationship('Router', back_populates='comandos_remotos_log')
    control_servicio_historial: Mapped[list['ControlServicioHistorial']] = relationship('ControlServicioHistorial', back_populates='comando_remoto')
    geozona_eventos: Mapped[list['GeozonaEvento']] = relationship('GeozonaEvento', back_populates='comando_remoto')


class ComprobanteClienteLinea(Base):
    __tablename__ = 'comprobante_cliente_lineas'
    __table_args__ = (
        CheckConstraint("criterio_asignacion IS NULL OR (criterio_asignacion::text = ANY (ARRAY['DIRECTO'::character varying, 'PRORRATEO_IGUAL'::character varying, 'POR_CONSUMO'::character varying, 'MANUAL'::character varying]::text[]))", name='ck_comprobante_linea_criterio'),
        ForeignKeyConstraint(['comprobante_id'], ['comprobantes_cliente.id'], ondelete='CASCADE', name='comprobante_cliente_lineas_comprobante_id_fkey'),
        ForeignKeyConstraint(['linea_servicio_id'], ['lineas_servicio.id'], name='comprobante_cliente_lineas_linea_servicio_id_fkey'),
        PrimaryKeyConstraint('comprobante_id', 'linea_servicio_id', name='comprobante_cliente_lineas_pkey'),
        Index('ix_comprobante_cliente_lineas_linea', 'linea_servicio_id')
    )

    comprobante_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    linea_servicio_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    monto_asignado: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(18, 4))
    criterio_asignacion: Mapped[Optional[str]] = mapped_column(String(30))
    observacion: Mapped[Optional[str]] = mapped_column(Text)

    comprobante: Mapped['ComprobanteCliente'] = relationship('ComprobanteCliente', back_populates='comprobante_cliente_lineas')
    linea_servicio: Mapped['LineaServicio'] = relationship('LineaServicio', back_populates='comprobante_cliente_lineas')


class ConsumoCiclo(Base):
    __tablename__ = 'consumo_ciclos'
    __table_args__ = (
        CheckConstraint('fin_ciclo > inicio_ciclo', name='ck_consumo_ciclo_fechas'),
        ForeignKeyConstraint(['linea_servicio_id'], ['lineas_servicio.id'], name='consumo_ciclos_linea_servicio_id_fkey'),
        PrimaryKeyConstraint('id', name='consumo_ciclos_pkey'),
        UniqueConstraint('linea_servicio_id', 'inicio_ciclo', 'fin_ciclo', name='uq_consumo_ciclo')
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    linea_servicio_id: Mapped[int] = mapped_column(Integer, nullable=False)
    inicio_ciclo: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False)
    fin_ciclo: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False)
    priority_gb: Mapped[decimal.Decimal] = mapped_column(Numeric(18, 6), nullable=False, server_default=text('0'))
    opt_in_priority_gb: Mapped[decimal.Decimal] = mapped_column(Numeric(18, 6), nullable=False, server_default=text('0'))
    standard_gb: Mapped[decimal.Decimal] = mapped_column(Numeric(18, 6), nullable=False, server_default=text('0'))
    non_billable_gb: Mapped[decimal.Decimal] = mapped_column(Numeric(18, 6), nullable=False, server_default=text('0'))
    fecha_registro_bd: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    usage_limit_gb: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(14, 3))
    permitir_excedentes_opt_in: Mapped[Optional[bool]] = mapped_column(Boolean)
    id_producto: Mapped[Optional[str]] = mapped_column(String(150))
    raw_json: Mapped[Optional[dict]] = mapped_column(JSONB)

    linea_servicio: Mapped['LineaServicio'] = relationship('LineaServicio', back_populates='consumo_ciclos')


class ConsumoDiario(Base):
    __tablename__ = 'consumo_diario'
    __table_args__ = (
        CheckConstraint('priority_gb >= 0::numeric AND opt_in_priority_gb >= 0::numeric AND standard_gb >= 0::numeric AND non_billable_gb >= 0::numeric', name='ck_consumo_diario_no_negativo'),
        ForeignKeyConstraint(['linea_servicio_id'], ['lineas_servicio.id'], name='consumo_diario_linea_servicio_id_fkey'),
        PrimaryKeyConstraint('id', name='consumo_diario_pkey'),
        UniqueConstraint('linea_servicio_id', 'fecha_utc', name='uq_consumo_diario'),
        Index('ix_consumo_diario_linea_fecha', 'linea_servicio_id', 'fecha_utc')
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    linea_servicio_id: Mapped[int] = mapped_column(Integer, nullable=False)
    fecha_utc: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    priority_gb: Mapped[decimal.Decimal] = mapped_column(Numeric(14, 6), nullable=False, server_default=text('0'))
    opt_in_priority_gb: Mapped[decimal.Decimal] = mapped_column(Numeric(14, 6), nullable=False, server_default=text('0'))
    standard_gb: Mapped[decimal.Decimal] = mapped_column(Numeric(14, 6), nullable=False, server_default=text('0'))
    non_billable_gb: Mapped[decimal.Decimal] = mapped_column(Numeric(14, 6), nullable=False, server_default=text('0'))
    fecha_registro_bd: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    inicio_ciclo: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    fin_ciclo: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    raw_json: Mapped[Optional[dict]] = mapped_column(JSONB)

    linea_servicio: Mapped['LineaServicio'] = relationship('LineaServicio', back_populates='consumo_diario')


class ControlServicioActual(Base):
    __tablename__ = 'control_servicio_actual'
    __table_args__ = (
        CheckConstraint('(limite_adicional_gb_mes IS NULL OR limite_adicional_gb_mes >= 0::numeric) AND (limite_gasto_adicional IS NULL OR limite_gasto_adicional >= 0::numeric)', name='ck_control_limites_no_negativos'),
        CheckConstraint("accion_al_limite::text = ANY (ARRAY['SOLO_ALERTAR'::character varying, 'OPT_OUT_PRIORITY'::character varying, 'BLOQUEAR_TOPUP'::character varying, 'REQUIERE_APROBACION'::character varying]::text[])", name='ck_control_accion_limite'),
        CheckConstraint('alerta_consumo_pct_1 >= 0::numeric AND alerta_consumo_pct_1 <= 100::numeric', name='ck_control_consumo_pct_1'),
        CheckConstraint('alerta_consumo_pct_2 >= 0::numeric AND alerta_consumo_pct_2 <= 100::numeric', name='ck_control_consumo_pct_2'),
        ForeignKeyConstraint(['linea_servicio_id'], ['lineas_servicio.id'], ondelete='CASCADE', name='control_servicio_actual_linea_servicio_id_fkey'),
        ForeignKeyConstraint(['modificado_por'], ['usuarios.id'], name='control_servicio_actual_modificado_por_fkey'),
        PrimaryKeyConstraint('linea_servicio_id', name='control_servicio_actual_pkey'),
        Index('ix_control_servicio_estado', 'estado_servicio_actual')
    )

    linea_servicio_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    alerta_consumo_pct_1: Mapped[decimal.Decimal] = mapped_column(Numeric(6, 3), nullable=False, server_default=text('80'))
    alerta_consumo_pct_2: Mapped[decimal.Decimal] = mapped_column(Numeric(6, 3), nullable=False, server_default=text('100'))
    accion_al_limite: Mapped[str] = mapped_column(String(40), nullable=False, server_default=text("'SOLO_ALERTAR'::character varying"))
    cliente_puede_reiniciar_terminal: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('false'))
    cliente_puede_reiniciar_router: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('false'))
    cliente_puede_cambiar_overage: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('false'))
    cliente_puede_hacer_topup: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('false'))
    fecha_modificacion: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    estado_servicio_actual: Mapped[Optional[str]] = mapped_column(String(50))
    ultima_sincronizacion: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    permitir_priority_extra: Mapped[Optional[bool]] = mapped_column(Boolean)
    ip_publica_habilitada: Mapped[Optional[bool]] = mapped_column(Boolean)
    recurring_data_blocks_json: Mapped[Optional[dict]] = mapped_column(JSONB)
    ultimo_top_up_gb: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(14, 3))
    fecha_ultimo_top_up: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    limite_adicional_gb_mes: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(14, 3))
    limite_gasto_adicional: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(18, 4))
    moneda_limite: Mapped[Optional[str]] = mapped_column(CHAR(3))
    raw_json: Mapped[Optional[dict]] = mapped_column(JSONB)
    modificado_por: Mapped[Optional[int]] = mapped_column(Integer)

    usuarios: Mapped[Optional['Usuario']] = relationship('Usuario', back_populates='control_servicio_actual')


class CostoServicioMes(Base):
    __tablename__ = 'costo_servicio_mes'
    __table_args__ = (
        ForeignKeyConstraint(['centro_costo_id'], ['centros_costos.id'], name='costo_servicio_mes_centro_costo_id_fkey'),
        ForeignKeyConstraint(['dispositivo_id'], ['dispositivos.id'], name='costo_servicio_mes_dispositivo_id_fkey'),
        ForeignKeyConstraint(['linea_servicio_id'], ['lineas_servicio.id'], name='costo_servicio_mes_linea_servicio_id_fkey'),
        ForeignKeyConstraint(['tenant_id'], ['tenants.id'], name='costo_servicio_mes_tenant_id_fkey'),
        ForeignKeyConstraint(['unidad_nivel1_id'], ['unidades_organizacionales.id'], name='costo_servicio_mes_unidad_nivel1_id_fkey'),
        ForeignKeyConstraint(['unidad_nivel2_id'], ['unidades_organizacionales.id'], name='costo_servicio_mes_unidad_nivel2_id_fkey'),
        ForeignKeyConstraint(['unidad_nivel3_id'], ['unidades_organizacionales.id'], name='costo_servicio_mes_unidad_nivel3_id_fkey'),
        PrimaryKeyConstraint('id', name='costo_servicio_mes_pkey'),
        UniqueConstraint('tenant_id', 'periodo', 'linea_servicio_id', name='uq_costo_servicio_mes'),
        Index('ix_costo_servicio_mes_tenant_periodo', 'tenant_id', 'periodo', 'linea_servicio_id')
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    tenant_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    periodo: Mapped[str] = mapped_column(CHAR(6), nullable=False)
    linea_servicio_id: Mapped[int] = mapped_column(Integer, nullable=False)
    consumo_priority_gb: Mapped[decimal.Decimal] = mapped_column(Numeric(18, 6), nullable=False, server_default=text('0'))
    consumo_standard_gb: Mapped[decimal.Decimal] = mapped_column(Numeric(18, 6), nullable=False, server_default=text('0'))
    consumo_non_billable_gb: Mapped[decimal.Decimal] = mapped_column(Numeric(18, 6), nullable=False, server_default=text('0'))
    consumo_total_gb: Mapped[decimal.Decimal] = mapped_column(Numeric(18, 6), nullable=False, server_default=text('0'))
    wan_rx_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False, server_default=text('0'))
    wan_tx_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False, server_default=text('0'))
    criterio_asignacion_costo: Mapped[str] = mapped_column(String(30), nullable=False, server_default=text("'DIRECTO'::character varying"))
    fecha_calculo: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    dispositivo_id: Mapped[Optional[int]] = mapped_column(Integer)
    unidad_nivel1_id: Mapped[Optional[int]] = mapped_column(BigInteger)
    unidad_nivel2_id: Mapped[Optional[int]] = mapped_column(BigInteger)
    unidad_nivel3_id: Mapped[Optional[int]] = mapped_column(BigInteger)
    centro_costo_id: Mapped[Optional[int]] = mapped_column(BigInteger)
    latencia_avg_ms: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(12, 4))
    packet_loss_avg: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(8, 6))
    downlink_avg_mbps: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(12, 4))
    uplink_avg_mbps: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(12, 4))
    signal_quality_avg: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(8, 6))
    obstruccion_avg: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(8, 6))
    disponibilidad_pct: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(7, 4))
    costo_starlink: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(18, 4))
    moneda_starlink: Mapped[Optional[str]] = mapped_column(CHAR(3))
    importe_comprobante_cliente: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(18, 4))
    moneda_cliente: Mapped[Optional[str]] = mapped_column(CHAR(3))
    detalle_json: Mapped[Optional[dict]] = mapped_column(JSONB)

    centro_costo: Mapped[Optional['CentroCosto']] = relationship('CentroCosto', back_populates='costo_servicio_mes')
    dispositivo: Mapped[Optional['Dispositivo']] = relationship('Dispositivo', back_populates='costo_servicio_mes')
    linea_servicio: Mapped['LineaServicio'] = relationship('LineaServicio', back_populates='costo_servicio_mes')
    tenant: Mapped['Tenant'] = relationship('Tenant', back_populates='costo_servicio_mes')
    unidad_nivel1: Mapped[Optional['UnidadOrganizacional']] = relationship('UnidadOrganizacional', foreign_keys=[unidad_nivel1_id], back_populates='costo_servicio_mes_unidad_nivel1')
    unidad_nivel2: Mapped[Optional['UnidadOrganizacional']] = relationship('UnidadOrganizacional', foreign_keys=[unidad_nivel2_id], back_populates='costo_servicio_mes_unidad_nivel2')
    unidad_nivel3: Mapped[Optional['UnidadOrganizacional']] = relationship('UnidadOrganizacional', foreign_keys=[unidad_nivel3_id], back_populates='costo_servicio_mes_unidad_nivel3')


class DireccionServicio(Base):
    __tablename__ = 'direcciones_servicio'
    __table_args__ = (
        CheckConstraint("latitud IS NULL OR latitud >= '-90'::integer::numeric AND latitud <= 90::numeric", name='ck_direccion_lat'),
        CheckConstraint("longitud IS NULL OR longitud >= '-180'::integer::numeric AND longitud <= 180::numeric", name='ck_direccion_lon'),
        ForeignKeyConstraint(['linea_servicio_id'], ['lineas_servicio.id'], ondelete='CASCADE', name='direcciones_servicio_linea_servicio_id_fkey'),
        PrimaryKeyConstraint('id', name='direcciones_servicio_pkey'),
        Index('uq_direccion_servicio_vigente', 'linea_servicio_id', postgresql_where='(vigente = true)', unique=True)
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    linea_servicio_id: Mapped[int] = mapped_column(Integer, nullable=False)
    vigente: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('true'))
    fecha_creacion: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    fecha_modificacion: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    id_externo_starlink: Mapped[Optional[str]] = mapped_column(String(100))
    direccion_formateada: Mapped[Optional[str]] = mapped_column(String(500))
    localidad: Mapped[Optional[str]] = mapped_column(String(150))
    area_administrativa: Mapped[Optional[str]] = mapped_column(String(150))
    region: Mapped[Optional[str]] = mapped_column(String(150))
    codigo_postal: Mapped[Optional[str]] = mapped_column(String(30))
    pais_iso2: Mapped[Optional[str]] = mapped_column(CHAR(2))
    latitud: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(10, 7))
    longitud: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(11, 7))
    raw_json: Mapped[Optional[dict]] = mapped_column(JSONB)

    linea_servicio: Mapped['LineaServicio'] = relationship('LineaServicio', back_populates='direcciones_servicio')


class EstadoRouterActual(Base):
    __tablename__ = 'estado_router_actual'
    __table_args__ = (
        CheckConstraint("estado_operativo IS NULL OR (estado_operativo::text = ANY (ARRAY['OPERATIVO'::character varying, 'INCIDENCIA'::character varying, 'DESCONECTADO'::character varying, 'DESCONOCIDO'::character varying]::text[]))", name='ck_estado_router'),
        ForeignKeyConstraint(['router_id'], ['routers.id'], ondelete='CASCADE', name='estado_router_actual_router_id_fkey'),
        PrimaryKeyConstraint('router_id', name='estado_router_actual_pkey')
    )

    router_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    tiene_alertas: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('false'))
    codigos_alerta: Mapped[list[int]] = mapped_column(ARRAY(Integer()), nullable=False, server_default=text("'{}'::integer[]"))
    fecha_actualizacion_bd: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    conectado: Mapped[Optional[bool]] = mapped_column(Boolean)
    estado_operativo: Mapped[Optional[str]] = mapped_column(String(30))
    bypass_actual: Mapped[Optional[bool]] = mapped_column(Boolean)
    uptime_segundos: Mapped[Optional[int]] = mapped_column(BigInteger)
    software_version: Mapped[Optional[str]] = mapped_column(String(200))
    internet_latency_ms: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(12, 4))
    internet_drop_rate: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(8, 6))
    pop_latency_ms: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(12, 4))
    dish_latency_ms: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(12, 4))
    clientes_total: Mapped[Optional[int]] = mapped_column(Integer)
    clientes_2ghz: Mapped[Optional[int]] = mapped_column(Integer)
    clientes_5ghz: Mapped[Optional[int]] = mapped_column(Integer)
    clientes_ethernet: Mapped[Optional[int]] = mapped_column(Integer)
    fecha_telemetria: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    raw_json: Mapped[Optional[dict]] = mapped_column(JSONB)


class LineaDispositivoHistorial(Base):
    __tablename__ = 'linea_dispositivo_historial'
    __table_args__ = (
        CheckConstraint('vigente_hasta IS NULL OR vigente_hasta > vigente_desde', name='ck_linea_dispositivo_fechas'),
        ForeignKeyConstraint(['dispositivo_id'], ['dispositivos.id'], name='linea_dispositivo_historial_dispositivo_id_fkey'),
        ForeignKeyConstraint(['linea_servicio_id'], ['lineas_servicio.id'], name='linea_dispositivo_historial_linea_servicio_id_fkey'),
        PrimaryKeyConstraint('id', name='linea_dispositivo_historial_pkey'),
        Index('uq_linea_dispositivo_vigente', 'linea_servicio_id', postgresql_where='(vigente_hasta IS NULL)', unique=True)
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    linea_servicio_id: Mapped[int] = mapped_column(Integer, nullable=False)
    dispositivo_id: Mapped[int] = mapped_column(Integer, nullable=False)
    vigente_desde: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    origen: Mapped[str] = mapped_column(String(30), nullable=False, server_default=text("'API'::character varying"))
    vigente_hasta: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)

    dispositivo: Mapped['Dispositivo'] = relationship('Dispositivo', back_populates='linea_dispositivo_historial')
    linea_servicio: Mapped['LineaServicio'] = relationship('LineaServicio', back_populates='linea_dispositivo_historial')


class LineaPlanHistorial(Base):
    __tablename__ = 'linea_plan_historial'
    __table_args__ = (
        CheckConstraint('vigente_hasta IS NULL OR vigente_hasta > vigente_desde', name='ck_linea_plan_fechas'),
        ForeignKeyConstraint(['linea_servicio_id'], ['lineas_servicio.id'], name='linea_plan_historial_linea_servicio_id_fkey'),
        PrimaryKeyConstraint('id', name='linea_plan_historial_pkey'),
        Index('ix_linea_plan_historial', 'linea_servicio_id', 'vigente_desde')
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    linea_servicio_id: Mapped[int] = mapped_column(Integer, nullable=False)
    vigente_desde: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False)
    id_producto: Mapped[Optional[str]] = mapped_column(String(100))
    plan_contratado: Mapped[Optional[str]] = mapped_column(String(100))
    tipo_suscripcion: Mapped[Optional[str]] = mapped_column(String(100))
    es_plan_movil: Mapped[Optional[bool]] = mapped_column(Boolean)
    usage_limit_gb: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(14, 3))
    permitir_excedentes_opt_in: Mapped[Optional[bool]] = mapped_column(Boolean)
    vigente_hasta: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    raw_json: Mapped[Optional[dict]] = mapped_column(JSONB)

    linea_servicio: Mapped['LineaServicio'] = relationship('LineaServicio', back_populates='linea_plan_historial')


class PoliticaServicio(Base):
    __tablename__ = 'politicas_servicio'
    __table_args__ = (
        ForeignKeyConstraint(['creado_por'], ['usuarios.id'], name='politicas_servicio_creado_por_fkey'),
        ForeignKeyConstraint(['linea_servicio_id'], ['lineas_servicio.id'], name='politicas_servicio_linea_servicio_id_fkey'),
        ForeignKeyConstraint(['modificado_por'], ['usuarios.id'], name='politicas_servicio_modificado_por_fkey'),
        ForeignKeyConstraint(['tenant_id'], ['tenants.id'], name='politicas_servicio_tenant_id_fkey'),
        PrimaryKeyConstraint('id', name='politicas_servicio_pkey'),
        Index('ix_politicas_tenant_linea', 'tenant_id', 'linea_servicio_id', 'activa')
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    tenant_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    tipo_politica: Mapped[str] = mapped_column(String(50), nullable=False)
    configuracion_json: Mapped[dict] = mapped_column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    activa: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('true'))
    fecha_creacion: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    fecha_modificacion: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    linea_servicio_id: Mapped[Optional[int]] = mapped_column(Integer)
    umbral_numeric: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(14, 4))
    creado_por: Mapped[Optional[int]] = mapped_column(Integer)
    modificado_por: Mapped[Optional[int]] = mapped_column(Integer)

    usuarios: Mapped[Optional['Usuario']] = relationship('Usuario', foreign_keys=[creado_por], back_populates='politicas_servicio_creado_por')
    linea_servicio: Mapped[Optional['LineaServicio']] = relationship('LineaServicio', back_populates='politicas_servicio')
    usuarios_: Mapped[Optional['Usuario']] = relationship('Usuario', foreign_keys=[modificado_por], back_populates='politicas_servicio_modificado_por')
    tenant: Mapped['Tenant'] = relationship('Tenant', back_populates='politicas_servicio')


class SaldosHistorial(Base):
    __tablename__ = 'saldos_historial'
    __table_args__ = (
        ForeignKeyConstraint(['linea_servicio_id'], ['lineas_servicio.id'], name='saldos_historial_linea_servicio_id_fkey'),
        PrimaryKeyConstraint('id', name='saldos_historial_pkey'),
        Index('ix_saldos_historial_id', 'id')
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    linea_servicio_id: Mapped[int] = mapped_column(Integer, nullable=False)
    fecha_hora_lectura: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False)
    consumo_no_facturable_gb: Mapped[decimal.Decimal] = mapped_column(Numeric(14, 6), nullable=False, server_default=text('0'))
    periodo: Mapped[Optional[str]] = mapped_column(String)
    moneda: Mapped[Optional[str]] = mapped_column(String)
    bolsa_contratada_gb: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(10, 2))
    consumo_estandar_gb: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(10, 2))
    consumo_prioridad_gb: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(10, 2))
    recargas_compradas_gb: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(10, 2))
    recargas_consumidas_gb: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(10, 2))
    saldo_recurrente_gb: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(10, 2))
    saldo_total_disponible_gb: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(10, 2))
    total_consumido_gb: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(10, 2))
    porcentaje_uso_sobre_contratado: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(5, 2))
    consumo_excedente_opt_in_gb: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(10, 2))
    fecha_registro_bd: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    inicio_ciclo: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    fin_ciclo: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    id_producto: Mapped[Optional[str]] = mapped_column(String(150))
    permitir_excedentes_opt_in: Mapped[Optional[bool]] = mapped_column(Boolean)
    raw_json: Mapped[Optional[dict]] = mapped_column(JSONB)

    linea_servicio: Mapped['LineaServicio'] = relationship('LineaServicio', back_populates='saldos_historial')


class ServicioResumenDia(Base):
    __tablename__ = 'servicio_resumen_dia'
    __table_args__ = (
        ForeignKeyConstraint(['linea_servicio_id'], ['lineas_servicio.id'], name='servicio_resumen_dia_linea_servicio_id_fkey'),
        ForeignKeyConstraint(['tenant_id'], ['tenants.id'], name='servicio_resumen_dia_tenant_id_fkey'),
        PrimaryKeyConstraint('id', name='servicio_resumen_dia_pkey'),
        UniqueConstraint('linea_servicio_id', 'fecha', name='uq_servicio_resumen_dia'),
        Index('ix_servicio_resumen_tenant_fecha', 'tenant_id', 'fecha')
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    tenant_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    linea_servicio_id: Mapped[int] = mapped_column(Integer, nullable=False)
    fecha: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    minutos_con_alerta: Mapped[decimal.Decimal] = mapped_column(Numeric(12, 2), nullable=False, server_default=text('0'))
    cantidad_alertas: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text('0'))
    fecha_calculo: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    muestras_esperadas: Mapped[Optional[int]] = mapped_column(Integer)
    muestras_recibidas: Mapped[Optional[int]] = mapped_column(Integer)
    disponibilidad_pct: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(7, 4))
    latencia_avg_ms: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(12, 4))
    downlink_avg_mbps: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(12, 4))
    uplink_avg_mbps: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(12, 4))
    signal_quality_avg: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(8, 6))
    obstruccion_avg: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(8, 6))
    packet_loss_avg: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(8, 6))
    wan_rx_bytes: Mapped[Optional[int]] = mapped_column(BigInteger)
    wan_tx_bytes: Mapped[Optional[int]] = mapped_column(BigInteger)

    linea_servicio: Mapped['LineaServicio'] = relationship('LineaServicio', back_populates='servicio_resumen_dia')
    tenant: Mapped['Tenant'] = relationship('Tenant', back_populates='servicio_resumen_dia')


class StarlinkFacturaDetalle(Base):
    __tablename__ = 'starlink_factura_detalles'
    __table_args__ = (
        ForeignKeyConstraint(['factura_id'], ['starlink_facturas_reseller.id'], ondelete='CASCADE', name='starlink_factura_detalles_factura_id_fkey'),
        PrimaryKeyConstraint('id', name='starlink_factura_detalles_pkey'),
        UniqueConstraint('factura_id', 'numero_linea', name='uq_starlink_factura_detalle')
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    factura_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    numero_linea: Mapped[int] = mapped_column(Integer, nullable=False)
    impuesto: Mapped[decimal.Decimal] = mapped_column(Numeric(18, 4), nullable=False, server_default=text('0'))
    subtotal: Mapped[decimal.Decimal] = mapped_column(Numeric(18, 4), nullable=False, server_default=text('0'))
    fecha_registro_bd: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    product_reference_id: Mapped[Optional[str]] = mapped_column(String(150))
    product_description: Mapped[Optional[str]] = mapped_column(String(500))
    service_name: Mapped[Optional[str]] = mapped_column(String(250))
    cantidad: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(18, 6))
    precio_unitario: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(18, 6))
    periodo_servicio_desde: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    periodo_servicio_hasta: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    raw_json: Mapped[Optional[dict]] = mapped_column(JSONB)

    factura: Mapped['StarlinkFacturaReseller'] = relationship('StarlinkFacturaReseller', back_populates='starlink_factura_detalles')
    starlink_factura_lineas: Mapped[list['StarlinkFacturaLinea']] = relationship('StarlinkFacturaLinea', back_populates='factura_detalle')


class TelemetriaRouterResumenHora(Base):
    __tablename__ = 'telemetria_router_resumen_hora'
    __table_args__ = (
        ForeignKeyConstraint(['linea_servicio_id'], ['lineas_servicio.id'], name='telemetria_router_resumen_hora_linea_servicio_id_fkey'),
        ForeignKeyConstraint(['router_id'], ['routers.id'], name='telemetria_router_resumen_hora_router_id_fkey'),
        ForeignKeyConstraint(['tenant_id'], ['tenants.id'], name='telemetria_router_resumen_hora_tenant_id_fkey'),
        PrimaryKeyConstraint('id', name='telemetria_router_resumen_hora_pkey'),
        UniqueConstraint('router_id', 'fecha_hora', name='uq_router_resumen_hora'),
        Index('ix_router_resumen_tenant_linea_fecha', 'tenant_id', 'linea_servicio_id', 'fecha_hora')
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    tenant_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    router_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    fecha_hora: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False)
    muestras_totales: Mapped[int] = mapped_column(Integer, nullable=False)
    minutos_con_alerta: Mapped[decimal.Decimal] = mapped_column(Numeric(8, 2), nullable=False, server_default=text('0'))
    fecha_calculo: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    linea_servicio_id: Mapped[Optional[int]] = mapped_column(Integer)
    internet_latency_avg: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(12, 4))
    internet_latency_max: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(12, 4))
    internet_drop_rate_avg: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(8, 6))
    pop_latency_avg: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(12, 4))
    dish_latency_avg: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(12, 4))
    clientes_total_avg: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(12, 4))
    clientes_total_max: Mapped[Optional[int]] = mapped_column(Integer)
    wan_tx_bytes_delta: Mapped[Optional[int]] = mapped_column(BigInteger)
    wan_rx_bytes_delta: Mapped[Optional[int]] = mapped_column(BigInteger)

    linea_servicio: Mapped[Optional['LineaServicio']] = relationship('LineaServicio', back_populates='telemetria_router_resumen_hora')
    router: Mapped['Router'] = relationship('Router', back_populates='telemetria_router_resumen_hora')
    tenant: Mapped['Tenant'] = relationship('Tenant', back_populates='telemetria_router_resumen_hora')


class TelemetriaTerminalResumenHora(Base):
    __tablename__ = 'telemetria_terminal_resumen_hora'
    __table_args__ = (
        ForeignKeyConstraint(['dispositivo_id'], ['dispositivos.id'], name='telemetria_terminal_resumen_hora_dispositivo_id_fkey'),
        ForeignKeyConstraint(['linea_servicio_id'], ['lineas_servicio.id'], name='telemetria_terminal_resumen_hora_linea_servicio_id_fkey'),
        ForeignKeyConstraint(['tenant_id'], ['tenants.id'], name='telemetria_terminal_resumen_hora_tenant_id_fkey'),
        PrimaryKeyConstraint('id', name='telemetria_terminal_resumen_hora_pkey'),
        UniqueConstraint('dispositivo_id', 'fecha_hora', name='uq_ut_resumen_hora'),
        Index('ix_ut_resumen_tenant_linea_fecha', 'tenant_id', 'linea_servicio_id', 'fecha_hora')
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    tenant_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    linea_servicio_id: Mapped[int] = mapped_column(Integer, nullable=False)
    dispositivo_id: Mapped[int] = mapped_column(Integer, nullable=False)
    fecha_hora: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False)
    muestras_totales: Mapped[int] = mapped_column(Integer, nullable=False)
    minutos_con_alerta: Mapped[decimal.Decimal] = mapped_column(Numeric(8, 2), nullable=False, server_default=text('0'))
    fecha_calculo: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    downlink_mbps_avg: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(12, 4))
    downlink_mbps_max: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(12, 4))
    uplink_mbps_avg: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(12, 4))
    uplink_mbps_max: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(12, 4))
    ping_latency_ms_avg: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(12, 4))
    ping_latency_ms_max: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(12, 4))
    ping_drop_rate_avg: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(8, 6))
    signal_quality_avg: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(8, 6))
    signal_quality_min: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(8, 6))
    obstruccion_avg: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(8, 6))
    obstruccion_max: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(8, 6))
    uptime_segundos_max: Mapped[Optional[int]] = mapped_column(BigInteger)
    h3_cell_id_ultimo: Mapped[Optional[str]] = mapped_column(String(32))
    country_code_ultimo: Mapped[Optional[str]] = mapped_column(CHAR(2))

    dispositivo: Mapped['Dispositivo'] = relationship('Dispositivo', back_populates='telemetria_terminal_resumen_hora')
    linea_servicio: Mapped['LineaServicio'] = relationship('LineaServicio', back_populates='telemetria_terminal_resumen_hora')
    tenant: Mapped['Tenant'] = relationship('Tenant', back_populates='telemetria_terminal_resumen_hora')


class ControlServicioHistorial(Base):
    __tablename__ = 'control_servicio_historial'
    __table_args__ = (
        CheckConstraint("estado_cambio::text = ANY (ARRAY['SOLICITADO'::character varying, 'VALIDANDO'::character varying, 'ENVIADO'::character varying, 'APLICADO'::character varying, 'RECHAZADO'::character varying, 'ERROR'::character varying]::text[])", name='ck_control_estado_cambio'),
        CheckConstraint("tipo_cambio::text = ANY (ARRAY['OVERAGE_OPT_IN'::character varying, 'OVERAGE_OPT_OUT'::character varying, 'TOP_UP'::character varying, 'RECURRING_DATA_BLOCKS'::character varying, 'PUBLIC_IP_ON'::character varying, 'PUBLIC_IP_OFF'::character varying, 'LIMITE_INTERNO_GB'::character varying, 'LIMITE_INTERNO_GASTO'::character varying, 'UMBRALES_ALERTA'::character varying, 'PERMISOS_CLIENTE'::character varying]::text[])", name='ck_control_tipo_cambio'),
        ForeignKeyConstraint(['comando_remoto_id'], ['comandos_remotos_log.id'], name='control_servicio_historial_comando_remoto_id_fkey'),
        ForeignKeyConstraint(['linea_servicio_id'], ['lineas_servicio.id'], name='control_servicio_historial_linea_servicio_id_fkey'),
        ForeignKeyConstraint(['solicitado_por'], ['usuarios.id'], name='control_servicio_historial_solicitado_por_fkey'),
        ForeignKeyConstraint(['tenant_id'], ['tenants.id'], name='control_servicio_historial_tenant_id_fkey'),
        PrimaryKeyConstraint('id', name='control_servicio_historial_pkey'),
        Index('ix_control_historial_linea_fecha', 'tenant_id', 'linea_servicio_id', 'fecha_solicitud')
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    tenant_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    linea_servicio_id: Mapped[int] = mapped_column(Integer, nullable=False)
    tipo_cambio: Mapped[str] = mapped_column(String(50), nullable=False)
    origen: Mapped[str] = mapped_column(String(30), nullable=False, server_default=text("'PORTAL'::character varying"))
    estado_cambio: Mapped[str] = mapped_column(String(30), nullable=False, server_default=text("'SOLICITADO'::character varying"))
    fecha_solicitud: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    valor_anterior_json: Mapped[Optional[dict]] = mapped_column(JSONB)
    valor_nuevo_json: Mapped[Optional[dict]] = mapped_column(JSONB)
    comando_remoto_id: Mapped[Optional[int]] = mapped_column(BigInteger)
    solicitado_por: Mapped[Optional[int]] = mapped_column(Integer)
    fecha_aplicacion: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    fecha_confirmacion_api: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    mensaje: Mapped[Optional[str]] = mapped_column(Text)

    comando_remoto: Mapped[Optional['ComandoRemotoLog']] = relationship('ComandoRemotoLog', back_populates='control_servicio_historial')
    linea_servicio: Mapped['LineaServicio'] = relationship('LineaServicio', back_populates='control_servicio_historial')
    usuarios: Mapped[Optional['Usuario']] = relationship('Usuario', back_populates='control_servicio_historial')
    tenant: Mapped['Tenant'] = relationship('Tenant', back_populates='control_servicio_historial')


class GeozonaEvento(Base):
    __tablename__ = 'geozona_eventos'
    __table_args__ = (
        CheckConstraint("estado_evento::text = ANY (ARRAY['ABIERTO'::character varying, 'PENDIENTE_APROBACION'::character varying, 'ACCION_EJECUTADA'::character varying, 'RETORNADO'::character varying, 'CERRADO_MANUAL'::character varying]::text[])", name='ck_geozona_evento_estado'),
        ForeignKeyConstraint(['aprobado_por'], ['usuarios.id'], name='geozona_eventos_aprobado_por_fkey'),
        ForeignKeyConstraint(['colaborador_id'], ['colaboradores.id'], name='geozona_eventos_colaborador_id_fkey'),
        ForeignKeyConstraint(['comando_remoto_id'], ['comandos_remotos_log.id'], name='geozona_eventos_comando_remoto_id_fkey'),
        ForeignKeyConstraint(['dispositivo_id'], ['dispositivos.id'], name='geozona_eventos_dispositivo_id_fkey'),
        ForeignKeyConstraint(['geozona_id'], ['geozonas.id'], name='geozona_eventos_geozona_id_fkey'),
        ForeignKeyConstraint(['linea_servicio_id'], ['lineas_servicio.id'], name='geozona_eventos_linea_servicio_id_fkey'),
        ForeignKeyConstraint(['politica_id'], ['geozona_politicas.id'], name='geozona_eventos_politica_id_fkey'),
        ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE', name='geozona_eventos_tenant_id_fkey'),
        PrimaryKeyConstraint('id', name='geozona_eventos_pkey'),
        Index('ix_geozona_eventos_colaborador', 'tenant_id', 'colaborador_id', 'salida_confirmada'),
        Index('ix_geozona_eventos_tenant_fecha', 'tenant_id', 'salida_confirmada'),
        Index('uq_geozona_evento_abierto', 'dispositivo_id', 'geozona_id', postgresql_where="((estado_evento)::text = ANY ((ARRAY['ABIERTO'::character varying, 'PENDIENTE_APROBACION'::character varying, 'ACCION_EJECUTADA'::character varying])::text[]))", unique=True)
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    tenant_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    dispositivo_id: Mapped[int] = mapped_column(Integer, nullable=False)
    geozona_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    politica_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    primera_muestra_fuera: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False)
    salida_confirmada: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False)
    ultima_muestra_fuera: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False)
    estado_evento: Mapped[str] = mapped_column(String(30), nullable=False, server_default=text("'ABIERTO'::character varying"))
    accion_configurada: Mapped[str] = mapped_column(String(50), nullable=False)
    requiere_aprobacion: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('false'))
    fecha_registro_bd: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    linea_servicio_id: Mapped[Optional[int]] = mapped_column(Integer)
    colaborador_id: Mapped[Optional[int]] = mapped_column(BigInteger)
    h3_cell_id_salida: Mapped[Optional[str]] = mapped_column(String(32))
    h3_cell_id_ultimo: Mapped[Optional[str]] = mapped_column(String(32))
    retorno_detectado: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    retorno_confirmado: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    accion_ejecutada: Mapped[Optional[str]] = mapped_column(String(50))
    fecha_accion: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    comando_remoto_id: Mapped[Optional[int]] = mapped_column(BigInteger)
    aprobado_por: Mapped[Optional[int]] = mapped_column(Integer)
    fecha_aprobacion: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    observacion: Mapped[Optional[str]] = mapped_column(Text)
    detalle_json: Mapped[Optional[dict]] = mapped_column(JSONB)

    usuarios: Mapped[Optional['Usuario']] = relationship('Usuario', back_populates='geozona_eventos')
    colaborador: Mapped[Optional['Colaborador']] = relationship('Colaborador', back_populates='geozona_eventos')
    comando_remoto: Mapped[Optional['ComandoRemotoLog']] = relationship('ComandoRemotoLog', back_populates='geozona_eventos')
    dispositivo: Mapped['Dispositivo'] = relationship('Dispositivo', back_populates='geozona_eventos')
    geozona: Mapped['Geozona'] = relationship('Geozona', back_populates='geozona_eventos')
    linea_servicio: Mapped[Optional['LineaServicio']] = relationship('LineaServicio', back_populates='geozona_eventos')
    politica: Mapped['GeozonaPolitica'] = relationship('GeozonaPolitica', back_populates='geozona_eventos')
    tenant: Mapped['Tenant'] = relationship('Tenant', back_populates='geozona_eventos')


class StarlinkFacturaLinea(Base):
    __tablename__ = 'starlink_factura_lineas'
    __table_args__ = (
        CheckConstraint("criterio_asignacion IS NULL OR (criterio_asignacion::text = ANY (ARRAY['DIRECTO'::character varying, 'PRORRATEO_IGUAL'::character varying, 'POR_CONSUMO'::character varying, 'MANUAL'::character varying]::text[]))", name='ck_starlink_factura_linea_criterio'),
        ForeignKeyConstraint(['factura_detalle_id'], ['starlink_factura_detalles.id'], ondelete='CASCADE', name='starlink_factura_lineas_factura_detalle_id_fkey'),
        ForeignKeyConstraint(['linea_servicio_id'], ['lineas_servicio.id'], name='starlink_factura_lineas_linea_servicio_id_fkey'),
        PrimaryKeyConstraint('factura_detalle_id', 'linea_servicio_id', name='starlink_factura_lineas_pkey'),
        Index('ix_starlink_factura_lineas_servicio', 'linea_servicio_id')
    )

    factura_detalle_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    linea_servicio_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    numero_linea_starlink: Mapped[Optional[str]] = mapped_column(String(100))
    monto_asignado: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(18, 4))
    criterio_asignacion: Mapped[Optional[str]] = mapped_column(String(30))

    factura_detalle: Mapped['StarlinkFacturaDetalle'] = relationship('StarlinkFacturaDetalle', back_populates='starlink_factura_lineas')
    linea_servicio: Mapped['LineaServicio'] = relationship('LineaServicio', back_populates='starlink_factura_lineas')
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, JSON, Numeric, Time, Date, BigInteger
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import ARRAY, JSONB

class AprovisionamientoCliente(Base):
    __tablename__ = "aprovisionamientos_cliente"

    id = Column(BigInteger, primary_key=True, index=True)
    codigo = Column(String, unique=True, nullable=False)
    tenant_id = Column(BigInteger, ForeignKey("tenants.id"), nullable=False)
    cuenta_id = Column(Integer, ForeignKey("cuentas.id"))
    contrato_id = Column(BigInteger)
    dispositivo_id = Column(Integer, ForeignKey("dispositivos.id"))
    estado = Column(String, nullable=False, default="PENDIENTE")
    solicitado_por = Column(Integer, ForeignKey("usuarios.id"))
    fecha_inicio = Column(DateTime, server_default=func.now())
    fecha_fin = Column(DateTime)
    mensaje_error = Column(Text)

class TipoSolicitudCliente(Base):
    __tablename__ = "tipos_solicitud_cliente"

    id = Column(BigInteger, primary_key=True, index=True)
    codigo = Column(String, nullable=False)
    nombre = Column(String, nullable=False)
    descripcion = Column(Text)
    requiere_linea_servicio = Column(Boolean, nullable=False, default=False)
    requiere_dispositivo = Column(Boolean, nullable=False, default=False)
    permite_fecha_requerida = Column(Boolean, nullable=False, default=True)
    permite_documentos = Column(Boolean, nullable=False, default=True)
    orden_visual = Column(Integer, nullable=False, default=100)
    activo = Column(Boolean, nullable=False, default=True)
    fecha_creacion = Column(DateTime, server_default=func.now(), nullable=False)
    fecha_modificacion = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
    creado_por = Column(Integer)
    modificado_por = Column(Integer)

class SolicitudSlaPolitica(Base):
    __tablename__ = "solicitudes_sla_politicas"

    id = Column(BigInteger, primary_key=True, index=True)
    tipo_solicitud_id = Column(BigInteger, ForeignKey("tipos_solicitud_cliente.id"), nullable=False)
    prioridad = Column(String, nullable=False, default="NORMAL") # BAJA, NORMAL, ALTA, URGENTE
    minutos_primera_atencion = Column(Integer, nullable=False)
    minutos_resolucion = Column(Integer, nullable=False)
    tipo_tiempo = Column(String, nullable=False, default="CORRIDO") # CORRIDO, HABIL
    umbral_amarillo_pct = Column(Numeric, nullable=False, default=70)
    pausar_requiere_informacion = Column(Boolean, nullable=False, default=True)
    dias_habiles = Column(ARRAY(Integer), nullable=False, default=[1, 2, 3, 4, 5])
    hora_inicio_habil = Column(Time, nullable=False, default="09:00:00")
    hora_fin_habil = Column(Time, nullable=False, default="18:00:00")
    vigente_desde = Column(DateTime, server_default=func.now(), nullable=False)
    vigente_hasta = Column(DateTime)
    activo = Column(Boolean, nullable=False, default=True)
    fecha_creacion = Column(DateTime, server_default=func.now(), nullable=False)
    fecha_modificacion = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
    creado_por = Column(Integer)
    modificado_por = Column(Integer)

    tipo_solicitud = relationship("TipoSolicitudCliente")

class SolicitudSlaDiaNoLaborable(Base):
    __tablename__ = "solicitudes_sla_dias_no_laborables"

    id = Column(BigInteger, primary_key=True, index=True)
    fecha = Column(Date, nullable=False)
    descripcion = Column(String, nullable=False)
    activo = Column(Boolean, nullable=False, default=True)
    fecha_creacion = Column(DateTime, server_default=func.now(), nullable=False)
    fecha_modificacion = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
    creado_por = Column(Integer)
    modificado_por = Column(Integer)

class SolicitudCliente(Base):
    __tablename__ = "solicitudes_cliente"

    id = Column(BigInteger, primary_key=True, index=True)
    codigo_solicitud = Column(String, nullable=False)
    tenant_id = Column(BigInteger, ForeignKey("tenants.id"), nullable=False)
    tipo_solicitud_id = Column(BigInteger, ForeignKey("tipos_solicitud_cliente.id"), nullable=False)
    linea_servicio_id = Column(Integer, ForeignKey("lineas_servicio.id"))
    dispositivo_id = Column(Integer, ForeignKey("dispositivos.id"))
    aprovisionamiento_id = Column(BigInteger)
    estado = Column(String, nullable=False, default="PENDIENTE")
    prioridad = Column(String, nullable=False, default="NORMAL")
    canal_origen = Column(String, nullable=False, default="PORTAL_CLIENTE")
    motivo = Column(String)
    descripcion = Column(Text)
    datos_solicitud = Column(JSONB, nullable=False, server_default='{}')
    fecha_requerida = Column(Date)
    solicitado_por_usuario_id = Column(Integer, ForeignKey("usuarios.id"))
    asignado_a_usuario_id = Column(Integer, ForeignKey("usuarios.id"))
    
    sla_politica_id = Column(BigInteger, ForeignKey("solicitudes_sla_politicas.id"))
    sla_primera_atencion_minutos = Column(Integer)
    sla_resolucion_minutos = Column(Integer)
    sla_tipo_tiempo = Column(String)
    sla_umbral_amarillo_pct = Column(Numeric)
    sla_pausar_requiere_informacion = Column(Boolean)
    sla_dias_habiles = Column(ARRAY(Integer))
    sla_hora_inicio_habil = Column(Time)
    sla_hora_fin_habil = Column(Time)
    
    fecha_limite_primera_atencion = Column(DateTime)
    fecha_limite_resolucion = Column(DateTime)
    fecha_solicitud = Column(DateTime, server_default=func.now(), nullable=False)
    fecha_primera_atencion = Column(DateTime)
    fecha_atendida = Column(DateTime)
    fecha_cierre = Column(DateTime)
    
    cumplio_sla_primera_atencion = Column(Boolean)
    cumplio_sla_resolucion = Column(Boolean)
    resolucion = Column(Text)
    motivo_cierre = Column(Text)
    
    fecha_creacion = Column(DateTime, server_default=func.now(), nullable=False)
    fecha_modificacion = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
    creado_por = Column(Integer)
    modificado_por = Column(Integer)

    tipo_solicitud = relationship("TipoSolicitudCliente")
    linea_servicio = relationship("LineaServicio")
    dispositivo = relationship("Dispositivo")
    solicitado_por = relationship("Usuario", foreign_keys=[solicitado_por_usuario_id])
    asignado_a = relationship("Usuario", foreign_keys=[asignado_a_usuario_id])

class VwSolicitudSlaEstado(Base):
    __tablename__ = "vw_solicitudes_sla_estado"
    __table_args__ = {'info': dict(is_view=True)}
    id = Column(BigInteger, primary_key=True)
    codigo_solicitud = Column(String)
    tenant_id = Column(BigInteger)
    tipo_solicitud_id = Column(BigInteger)
    estado = Column(String)
    prioridad = Column(String)
    canal_origen = Column(String)
    fecha_solicitud = Column(DateTime)
    fecha_primera_atencion = Column(DateTime)
    fecha_atendida = Column(DateTime)
    fecha_cierre = Column(DateTime)
    fecha_limite_primera_atencion = Column(DateTime)
    fecha_limite_resolucion = Column(DateTime)
    sla_minutos_consumidos = Column(Integer)
    sla_minutos_restantes = Column(Integer)
    sla_porcentaje_consumido = Column(Numeric)
    sla_semaforo = Column(String)
    tiene_pausa_abierta = Column(Boolean)
    pausa_sla_minutos = Column(Integer)
    tipo_solicitud_nombre = Column(String)
    
    solicitud = relationship("SolicitudCliente", foreign_keys=[id], primaryjoin="SolicitudCliente.id == VwSolicitudSlaEstado.id", backref="vista_sla")

class SolicitudClienteHistorial(Base):
    __tablename__ = "solicitud_cliente_historial"

    id = Column(BigInteger, primary_key=True, index=True)
    solicitud_id = Column(BigInteger, ForeignKey("solicitudes_cliente.id"), nullable=False)
    tipo_evento = Column(String, nullable=False)
    estado_anterior = Column(String)
    estado_nuevo = Column(String)
    comentario = Column(Text)
    detalle_json = Column(JSONB)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"))
    fecha_evento = Column(DateTime, server_default=func.now(), nullable=False)

    solicitud = relationship("SolicitudCliente")

class SolicitudClienteDocumento(Base):
    __tablename__ = "solicitud_cliente_documentos"

    id = Column(BigInteger, primary_key=True, index=True)
    solicitud_id = Column(BigInteger, ForeignKey("solicitudes_cliente.id"), nullable=False)
    tipo_documento = Column(String)
    descripcion = Column(Text)
    archivo_uri = Column(Text, nullable=False)
    archivo_nombre = Column(String, nullable=False)
    archivo_mime_type = Column(String)
    archivo_tamano_bytes = Column(BigInteger)
    archivo_sha256 = Column(String)
    visibilidad = Column(String, nullable=False, default="PUBLICO")
    subido_por_usuario_id = Column(Integer, ForeignKey("usuarios.id"))
    fecha_subida = Column(DateTime, server_default=func.now(), nullable=False)
    activo = Column(Boolean, nullable=False, default=True)

    solicitud = relationship("SolicitudCliente")

class SolicitudClienteComentario(Base):
    __tablename__ = "solicitud_cliente_comentarios"

    id = Column(BigInteger, primary_key=True, index=True)
    solicitud_id = Column(BigInteger, ForeignKey("solicitudes_cliente.id"), nullable=False)
    comentario = Column(Text, nullable=False)
    visibilidad = Column(String, nullable=False, default="PUBLICO")
    usuario_id = Column(Integer, ForeignKey("usuarios.id"))
    fecha_comentario = Column(DateTime, server_default=func.now(), nullable=False)
    fecha_modificacion = Column(DateTime)
    activo = Column(Boolean, nullable=False, default=True)

    solicitud = relationship("SolicitudCliente")

class SolicitudClienteSlaPausa(Base):
    __tablename__ = "solicitud_cliente_sla_pausas"

    id = Column(BigInteger, primary_key=True, index=True)
    solicitud_id = Column(BigInteger, ForeignKey("solicitudes_cliente.id"), nullable=False)
    motivo = Column(String, nullable=False, default="REQUIERE_INFORMACION_CLIENTE")
    detalle = Column(Text)
    fecha_inicio = Column(DateTime, server_default=func.now(), nullable=False)
    fecha_fin = Column(DateTime)
    duracion_sla_minutos = Column(Integer)
    iniciada_por_usuario_id = Column(Integer, ForeignKey("usuarios.id"))
    finalizada_por_usuario_id = Column(Integer, ForeignKey("usuarios.id"))

    solicitud = relationship("SolicitudCliente")

t_vw_dispositivo_estructura_actual = Table(
    'vw_dispositivo_estructura_actual', Base.metadata,
    Column('dispositivo_id', Integer, primary_key=True),
    Column('unidad_nivel1_id', Integer),
    Column('unidad_nivel1_codigo', String),
    Column('unidad_nivel1_nombre', String),
    Column('unidad_nivel2_id', Integer),
    Column('unidad_nivel2_codigo', String),
    Column('unidad_nivel2_nombre', String),
    Column('unidad_nivel3_id', Integer),
    Column('unidad_nivel3_codigo', String),
    Column('unidad_nivel3_nombre', String),
    Column('centro_costo_id', Integer),
    Column('centro_costo_codigo', String),
    Column('centro_costo_nombre', String),
    Column('vigente_desde', DateTime),
    extend_existing=True
)

class TenantConfiguracionGlobal(Base):
    __tablename__ = 'tenant_configuracion_global'
    __table_args__ = (
        ForeignKeyConstraint(['tenant_id'], ['tenants.id'], name='tenant_configuracion_global_tenant_id_fkey'),
        PrimaryKeyConstraint('id', name='tenant_configuracion_global_pkey'),
        UniqueConstraint('tenant_id', name='tenant_configuracion_global_tenant_id_key')
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    tenant_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    nombre_corto: Mapped[Optional[str]] = mapped_column(String(50))
    color_primario: Mapped[Optional[str]] = mapped_column(String(10))
    color_secundario: Mapped[Optional[str]] = mapped_column(String(10))
    logo_url: Mapped[Optional[str]] = mapped_column(String(500))
    logo_nombre: Mapped[Optional[str]] = mapped_column(String(255))
    logo_sha256: Mapped[Optional[str]] = mapped_column(String(64))
    logo_mime_type: Mapped[Optional[str]] = mapped_column(String(100))
    logo_tamano_bytes: Mapped[Optional[int]] = mapped_column(BigInteger)
    metadata_: Mapped[dict] = mapped_column('metadata', JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    fecha_modificacion: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    modificado_por: Mapped[Optional[int]] = mapped_column(Integer)

class MenuModulo(Base):
    __tablename__ = 'menu_modulos'
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    codigo: Mapped[str] = mapped_column(String)
    titulo: Mapped[str] = mapped_column(String)
    icono: Mapped[str] = mapped_column(String)
    orden: Mapped[int] = mapped_column(Integer)
    activo: Mapped[bool] = mapped_column(Boolean)
    
    items: Mapped[list['MenuItem']] = relationship('MenuItem', back_populates='modulo')

class MenuItem(Base):
    __tablename__ = 'menu_items'
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    modulo_id: Mapped[int] = mapped_column(Integer, ForeignKey('menu_modulos.id'))
    codigo: Mapped[str] = mapped_column(String)
    nombre: Mapped[str] = mapped_column(String)
    path: Mapped[str] = mapped_column(String)
    icono: Mapped[str] = mapped_column(String)
    orden: Mapped[int] = mapped_column(Integer)
    activo: Mapped[bool] = mapped_column(Boolean)
    
    modulo: Mapped['MenuModulo'] = relationship('MenuModulo', back_populates='items')

class RolMenu(Base):
    __tablename__ = 'rol_menu'
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    rol_id: Mapped[int] = mapped_column(Integer, ForeignKey('roles_portal.id'))
    modulo_id: Mapped[int] = mapped_column(Integer, ForeignKey('menu_modulos.id'))
    activo: Mapped[bool] = mapped_column(Boolean)

class RolMenuItem(Base):
    __tablename__ = 'rol_menu_item'
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    rol_id: Mapped[int] = mapped_column(Integer, ForeignKey('roles_portal.id'))
    menu_item_id: Mapped[int] = mapped_column(Integer, ForeignKey('menu_items.id'))
    activo: Mapped[bool] = mapped_column(Boolean)
from app.models_telemetry import *
