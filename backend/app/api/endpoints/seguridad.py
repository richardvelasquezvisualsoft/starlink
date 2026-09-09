from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.core.database import get_db
from app.models import Usuario, PoliticasSeguridad, Tenant, UsuarioSesiones, AuditoriaSeguridad, UsuarioRoles, RolesPortal
from app.schemas import PoliticasSeguridadResponse, PoliticasSeguridadCreate, PoliticasSeguridadUpdate, UsuarioSesionDetalleResponse, UsuarioSeguridadEstadoResponse, AuditoriaSeguridadResponse, TenantPoliticaResponse
from app.api.endpoints.auth import get_current_user

router = APIRouter()

def get_admin_user(current_user: Usuario = Depends(get_current_user)):
    is_reseller = any(ur.rol.codigo == 'RESELLER' for ur in current_user.roles if ur.activo)
    if not is_reseller:
        raise HTTPException(status_code=403, detail="Not authorized. Must be RESELLER.")
    return current_user

@router.get("/politicas", response_model=List[PoliticasSeguridadResponse])
def get_politicas(db: Session = Depends(get_db), admin: Usuario = Depends(get_admin_user)):
    query = db.query(PoliticasSeguridad)
    if not admin.acceso_todos_tenants:
        admin_tenant_ids = [tu.tenant_id for tu in admin.tenant_usuarios if tu.activo]
        # Restrict to global policy OR tenant policies within admin portfolio
        query = query.filter((PoliticasSeguridad.tenant_id == None) | (PoliticasSeguridad.tenant_id.in_(admin_tenant_ids)))
    return query.all()

@router.post("/politicas", response_model=PoliticasSeguridadResponse)
def create_politica(politica_in: PoliticasSeguridadCreate, db: Session = Depends(get_db), admin: Usuario = Depends(get_admin_user)):
    # Validate access
    if not admin.acceso_todos_tenants:
        if politica_in.tenant_id is None:
            raise HTTPException(status_code=403, detail="Cannot create global policy without acceso_todos_tenants")
        admin_tenant_ids = [tu.tenant_id for tu in admin.tenant_usuarios if tu.activo]
        if politica_in.tenant_id not in admin_tenant_ids:
            raise HTTPException(status_code=403, detail="Cannot create policy for tenant outside portfolio")
    
    # Check if a policy already exists
    existing = db.query(PoliticasSeguridad).filter(PoliticasSeguridad.tenant_id == politica_in.tenant_id, PoliticasSeguridad.activo == True).first()
    if existing:
        raise HTTPException(status_code=400, detail="An active policy already exists for this scope")

    if politica_in.tenant_id is not None:
        tenant = db.query(Tenant).filter(Tenant.id == politica_in.tenant_id).first()
        if not tenant:
            raise HTTPException(status_code=400, detail="Tenant not found")

    new_policy = PoliticasSeguridad(
        tenant_id=politica_in.tenant_id,
        longitud_minima_password=politica_in.longitud_minima_password,
        longitud_maxima_password=politica_in.longitud_maxima_password,
        max_intentos_fallidos=politica_in.max_intentos_fallidos,
        minutos_bloqueo=politica_in.minutos_bloqueo,
        duracion_token_reset_minutos=politica_in.duracion_token_reset_minutos,
        timeout_inactividad_minutos=politica_in.timeout_inactividad_minutos,
        duracion_maxima_sesion_horas=politica_in.duracion_maxima_sesion_horas,
        cantidad_passwords_historial=politica_in.cantidad_passwords_historial,
        mfa_obligatorio_reseller=politica_in.mfa_obligatorio_reseller,
        mfa_obligatorio_cliente=politica_in.mfa_obligatorio_cliente,
        requerir_email_recuperacion_verificado=politica_in.requerir_email_recuperacion_verificado,
        validar_password_comprometido=politica_in.validar_password_comprometido,
        activo=True,
        creado_por=admin.id
    )
    db.add(new_policy)
    db.commit()
    db.refresh(new_policy)
    return new_policy

@router.put("/politicas/{id}", response_model=PoliticasSeguridadResponse)
def update_politica(id: int, politica_in: PoliticasSeguridadUpdate, db: Session = Depends(get_db), admin: Usuario = Depends(get_admin_user)):
    policy = db.query(PoliticasSeguridad).filter(PoliticasSeguridad.id == id).first()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")

    if not admin.acceso_todos_tenants:
        if policy.tenant_id is None:
            raise HTTPException(status_code=403, detail="Cannot modify global policy without acceso_todos_tenants")
        admin_tenant_ids = [tu.tenant_id for tu in admin.tenant_usuarios if tu.activo]
        if policy.tenant_id not in admin_tenant_ids:
            raise HTTPException(status_code=403, detail="Cannot modify policy for tenant outside portfolio")

    if politica_in.longitud_minima_password is not None: policy.longitud_minima_password = politica_in.longitud_minima_password
    if politica_in.longitud_maxima_password is not None: policy.longitud_maxima_password = politica_in.longitud_maxima_password
    if politica_in.max_intentos_fallidos is not None: policy.max_intentos_fallidos = politica_in.max_intentos_fallidos
    if politica_in.minutos_bloqueo is not None: policy.minutos_bloqueo = politica_in.minutos_bloqueo
    if politica_in.duracion_token_reset_minutos is not None: policy.duracion_token_reset_minutos = politica_in.duracion_token_reset_minutos
    if politica_in.timeout_inactividad_minutos is not None: policy.timeout_inactividad_minutos = politica_in.timeout_inactividad_minutos
    if politica_in.duracion_maxima_sesion_horas is not None: policy.duracion_maxima_sesion_horas = politica_in.duracion_maxima_sesion_horas
    if politica_in.cantidad_passwords_historial is not None: policy.cantidad_passwords_historial = politica_in.cantidad_passwords_historial
    if politica_in.mfa_obligatorio_reseller is not None: policy.mfa_obligatorio_reseller = politica_in.mfa_obligatorio_reseller
    if politica_in.mfa_obligatorio_cliente is not None: policy.mfa_obligatorio_cliente = politica_in.mfa_obligatorio_cliente
    if politica_in.requerir_email_recuperacion_verificado is not None: policy.requerir_email_recuperacion_verificado = politica_in.requerir_email_recuperacion_verificado
    if politica_in.validar_password_comprometido is not None: policy.validar_password_comprometido = politica_in.validar_password_comprometido
    if politica_in.activo is not None: policy.activo = politica_in.activo
    
    policy.modificado_por = admin.id
    policy.fecha_modificacion = datetime.utcnow()

    db.commit()
    db.refresh(policy)
    return policy

@router.delete("/politicas/{id}")
def delete_politica(id: int, db: Session = Depends(get_db), admin: Usuario = Depends(get_admin_user)):
    policy = db.query(PoliticasSeguridad).filter(PoliticasSeguridad.id == id).first()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")

    if policy.tenant_id is None:
        raise HTTPException(status_code=400, detail="Cannot delete the global policy")

    if not admin.acceso_todos_tenants:
        admin_tenant_ids = [tu.tenant_id for tu in admin.tenant_usuarios if tu.activo]
        if policy.tenant_id not in admin_tenant_ids:
            raise HTTPException(status_code=403, detail="Cannot modify policy for tenant outside portfolio")

    policy.activo = False
    policy.modificado_por = admin.id
    policy.fecha_modificacion = datetime.utcnow()
    db.commit()
    return {"message": "Policy disabled successfully"}

@router.get("/politicas/tenants", response_model=List[TenantPoliticaResponse])
def get_politicas_tenants(db: Session = Depends(get_db), admin: Usuario = Depends(get_admin_user)):
    query = db.query(Tenant)
    if not admin.acceso_todos_tenants:
        admin_tenant_ids = [tu.tenant_id for tu in admin.tenant_usuarios if tu.activo]
        query = query.filter(Tenant.id.in_(admin_tenant_ids))
    
    tenants = query.all()
    # Fetch active policies for these tenants
    tenant_ids = [t.id for t in tenants]
    policies = db.query(PoliticasSeguridad).filter(
        PoliticasSeguridad.tenant_id.in_(tenant_ids),
        PoliticasSeguridad.activo == True
    ).all()
    
    policies_by_tenant = {p.tenant_id: p for p in policies}
    
    res = []
    for t in tenants:
        res.append({
            "tenant_id": t.id,
            "razon_social": t.razon_social,
            "politica": policies_by_tenant.get(t.id)
        })
    return res

@router.get("/sesiones", response_model=List[UsuarioSesionDetalleResponse])
def get_sesiones(db: Session = Depends(get_db), admin: Usuario = Depends(get_admin_user)):
    query = db.query(UsuarioSesiones)
    if not admin.acceso_todos_tenants:
        admin_tenant_ids = [tu.tenant_id for tu in admin.tenant_usuarios if tu.activo]
        # Restrict to users in admin portfolio
        query = query.join(Usuario).join(Usuario.tenant_usuarios).filter(Usuario.tenant_usuarios.property.mapper.class_.tenant_id.in_(admin_tenant_ids))
    
    sesiones = query.order_by(UsuarioSesiones.fecha_inicio.desc()).limit(100).all()
    
    res = []
    for s in sesiones:
        rol_principal = next((r.rol.descripcion for r in s.usuario.roles if r.activo), None)
        cliente_principal = next((t.tenant.razon_social for t in s.usuario.tenant_usuarios if t.activo), None)
        res.append({
            "id": s.id,
            "ip_address": s.ip_address,
            "user_agent": s.user_agent,
            "fecha_inicio": s.fecha_inicio,
            "ultima_actividad": s.ultima_actividad,
            "fecha_expiracion": s.fecha_expiracion,
            "revocada": s.revocada,
            "usuario_email": s.usuario.email,
            "usuario_nombre": s.usuario.nombre,
            "rol_principal": rol_principal,
            "cliente_principal": cliente_principal
        })
    return res

@router.post("/sesiones/{id}/revocar")
def revocar_sesion(id: int, db: Session = Depends(get_db), admin: Usuario = Depends(get_admin_user)):
    sesion = db.query(UsuarioSesiones).filter(UsuarioSesiones.id == id).first()
    if not sesion:
        raise HTTPException(status_code=404, detail="Sesion no encontrada")
    
    if not admin.acceso_todos_tenants:
        admin_tenant_ids = [tu.tenant_id for tu in admin.tenant_usuarios if tu.activo]
        user_tenant_ids = [tu.tenant_id for tu in sesion.usuario.tenant_usuarios if tu.activo]
        if not set(admin_tenant_ids).intersection(set(user_tenant_ids)):
            raise HTTPException(status_code=403, detail="No autorizado")
            
    sesion.revocada = True
    db.commit()
    return {"message": "Sesion revocada"}

@router.get("/auditoria", response_model=List[AuditoriaSeguridadResponse])
def get_auditoria(db: Session = Depends(get_db), admin: Usuario = Depends(get_admin_user)):
    query = db.query(AuditoriaSeguridad)
    if not admin.acceso_todos_tenants:
        admin_tenant_ids = [tu.tenant_id for tu in admin.tenant_usuarios if tu.activo]
        query = query.filter(AuditoriaSeguridad.tenant_id.in_(admin_tenant_ids))
    
    return query.order_by(AuditoriaSeguridad.fecha_evento.desc()).limit(100).all()

@router.get("/estado_usuarios", response_model=List[UsuarioSeguridadEstadoResponse])
def get_estado_usuarios(db: Session = Depends(get_db), admin: Usuario = Depends(get_admin_user)):
    query = db.query(Usuario)
    if not admin.acceso_todos_tenants:
        admin_tenant_ids = [tu.tenant_id for tu in admin.tenant_usuarios if tu.activo]
        query = query.join(Usuario.tenant_usuarios).filter(Usuario.tenant_usuarios.property.mapper.class_.tenant_id.in_(admin_tenant_ids))
    
    usuarios = query.all()
    res = []
    for u in usuarios:
        roles = [r.rol.descripcion for r in u.roles if r.activo]
        alcance = "Global" if u.acceso_todos_tenants else ", ".join([t.tenant.razon_social for t in u.tenant_usuarios if t.activo])
        mfa_habilitado = any(m.habilitado for m in u.mfa) if hasattr(u, 'mfa') and u.mfa else False
        sesiones_activas = len([s for s in getattr(u, 'sesiones', []) if not s.revocada and s.fecha_expiracion > datetime.utcnow()])
        ultima_sesion = sorted([s for s in getattr(u, 'sesiones', [])], key=lambda x: x.fecha_inicio, reverse=True)
        ultima_ip = ultima_sesion[0].ip_address if ultima_sesion else None
        ultimo_login = ultima_sesion[0].fecha_inicio if ultima_sesion else None
        
        res.append({
            "id": u.id,
            "nombre": u.nombre,
            "email": u.email,
            "roles": roles,
            "alcance": alcance,
            "mfa_habilitado": mfa_habilitado,
            "intentos_fallidos": u.intentos_fallidos,
            "bloqueado": u.bloqueado_hasta is not None and u.bloqueado_hasta > datetime.utcnow() or u.bloqueado_manual,
            "sesiones_activas": sesiones_activas,
            "ultima_ip": ultima_ip,
            "ultimo_login": ultimo_login
        })
    return res
