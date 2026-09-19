from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from typing import List, Optional
from datetime import datetime, timedelta

from app.core.database import get_db
from app.models import Usuario, RolesPortal, UsuarioRoles, TenantUsuario, UsuarioSesiones, UsuarioPasswordHistorial, AuditoriaSeguridad, Tenant, UsuarioPasswordResetToken, PoliticasSeguridad
from app.schemas import UsuarioAdminResponse, UsuarioCreateAdmin, UsuarioUpdateAdmin, UsuarioSesionDetalleResponse, AuditoriaSeguridadResponse, AdminResetPasswordRequest
from app.core.security import get_password_hash
from app.api.endpoints.auth import get_current_user

router = APIRouter()

def get_admin_user(current_user: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    roles_query = (
        db.query(RolesPortal.codigo)
        .join(UsuarioRoles, UsuarioRoles.rol_id == RolesPortal.id)
        .filter(UsuarioRoles.usuario_id == current_user.id, UsuarioRoles.activo == True)
        .all()
    )
    user_roles = [str(r[0]).strip().upper() for r in roles_query if r and r[0]]
    is_reseller = any(r in ['RESELLER', 'ADMIN', 'SUPERADMIN', 'ADMINISTRADOR', 'NOC'] for r in user_roles)
    if not is_reseller:
        raise HTTPException(status_code=403, detail="Not authorized. Must be RESELLER or ADMIN.")
    return current_user

def log_audit(db: Session, evento: str, usuario_id: int, tenant_id: int = None, descripcion: str = None):
    audit = AuditoriaSeguridad(
        evento=evento,
        usuario_afectado_id=usuario_id,
        tenant_id=tenant_id,
        detalle={"descripcion": descripcion} if descripcion else None
    )
    db.add(audit)

@router.get("", response_model=List[UsuarioAdminResponse])
def get_usuarios(db: Session = Depends(get_db), admin: Usuario = Depends(get_admin_user)):
    query = db.query(Usuario)
    if not admin.acceso_todos_tenants:
        admin_tenant_ids = [tu.tenant_id for tu in admin.tenant_usuarios if tu.activo]
        # Restrict to users who have at least one overlapping tenant
        query = query.join(TenantUsuario).filter(TenantUsuario.tenant_id.in_(admin_tenant_ids))
    
    return query.all()

@router.post("", response_model=UsuarioAdminResponse)
def create_usuario(user_in: UsuarioCreateAdmin, db: Session = Depends(get_db), admin: Usuario = Depends(get_admin_user)):
    # Check if email exists
    if db.query(Usuario).filter(Usuario.email == user_in.email).first():
        raise HTTPException(status_code=400, detail="Email ya registrado")
    
    if not admin.acceso_todos_tenants:
        admin_tenant_ids = [tu.tenant_id for tu in admin.tenant_usuarios if tu.activo]
        for tid in user_in.tenant_ids:
            if tid not in admin_tenant_ids:
                raise HTTPException(status_code=403, detail="Cannot assign a tenant outside your portfolio.")

    # Validation rules
    is_cliente = 'CLIENTE' in user_in.roles
    is_reseller = 'RESELLER' in user_in.roles

    if is_cliente and is_reseller:
        raise HTTPException(status_code=400, detail="Cannot be both CLIENTE and RESELLER")

    if is_cliente:
        if user_in.acceso_todos_tenants:
            raise HTTPException(status_code=400, detail="CLIENTE cannot have acceso_todos_tenants=true")
        if len(user_in.tenant_ids) != 1:
            raise HTTPException(status_code=400, detail="CLIENTE must have exactly 1 tenant")

    new_user = Usuario(
        nombre=user_in.nombre,
        email=user_in.email,
        email_recuperacion=user_in.email_recuperacion,
        password_hash=get_password_hash(user_in.password),
        activo=user_in.activo,
        acceso_todos_tenants=user_in.acceso_todos_tenants,
        creado_por=admin.id
    )
    db.add(new_user)
    db.flush()

    for r_codigo in user_in.roles:
        rol = db.query(RolesPortal).filter(RolesPortal.codigo == r_codigo).first()
        if not rol:
            raise HTTPException(status_code=400, detail=f"Role {r_codigo} not found")
        db.add(UsuarioRoles(usuario_id=new_user.id, rol_id=rol.id, asignado_por=admin.id))

    for t_id in user_in.tenant_ids:
        tenant = db.query(Tenant).filter(Tenant.id == t_id).first()
        if not tenant:
            raise HTTPException(status_code=400, detail=f"Tenant {t_id} not found")
        db.add(TenantUsuario(usuario_id=new_user.id, tenant_id=tenant.id, activo=True, fecha_asignacion=datetime.utcnow()))

    # Audit
    log_audit(db, "USER_CREATED", new_user.id, descripcion=f"Created by {admin.email}")
    db.commit()
    db.refresh(new_user)
    return new_user

@router.get("/{id}", response_model=UsuarioAdminResponse)
def get_usuario(id: int, db: Session = Depends(get_db), admin: Usuario = Depends(get_admin_user)):
    user = db.query(Usuario).filter(Usuario.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not admin.acceso_todos_tenants:
        admin_tenant_ids = [tu.tenant_id for tu in admin.tenant_usuarios if tu.activo]
        user_tenant_ids = [tu.tenant_id for tu in user.tenant_usuarios if tu.activo]
        if not set(user_tenant_ids).intersection(set(admin_tenant_ids)):
             raise HTTPException(status_code=403, detail="Access denied")
    return user

@router.put("/{id}", response_model=UsuarioAdminResponse)
def update_usuario(id: int, user_in: UsuarioUpdateAdmin, db: Session = Depends(get_db), admin: Usuario = Depends(get_admin_user)):
    user = db.query(Usuario).filter(Usuario.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not admin.acceso_todos_tenants:
        admin_tenant_ids = [tu.tenant_id for tu in admin.tenant_usuarios if tu.activo]
        user_tenant_ids = [tu.tenant_id for tu in user.tenant_usuarios if tu.activo]
        if not set(user_tenant_ids).intersection(set(admin_tenant_ids)):
             raise HTTPException(status_code=403, detail="Access denied")

    if user_in.nombre is not None: user.nombre = user_in.nombre
    if user_in.email is not None: user.email = user_in.email
    if user_in.email_recuperacion is not None: user.email_recuperacion = user_in.email_recuperacion
    if user_in.activo is not None: user.activo = user_in.activo
    if user_in.acceso_todos_tenants is not None: user.acceso_todos_tenants = user_in.acceso_todos_tenants
    user.modificado_por = admin.id
    user.fecha_modificacion = datetime.utcnow()

    # Update roles and tenants if provided (simplified for now, ideally handle diffs)
    if user_in.roles is not None:
        pass # To implement full diff

    log_audit(db, "USER_UPDATED", user.id, descripcion=f"Updated by {admin.email}")
    db.commit()
    db.refresh(user)
    return user

@router.post("/{id}/bloquear")
def bloquear_usuario(id: int, motivo: str = None, db: Session = Depends(get_db), admin: Usuario = Depends(get_admin_user)):
    user = db.query(Usuario).filter(Usuario.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.bloqueado_manual = True
    user.motivo_bloqueo = motivo
    user.modificado_por = admin.id
    user.fecha_modificacion = datetime.utcnow()
    log_audit(db, "USER_LOCKED", user.id, descripcion=f"Locked by {admin.email}. Motivo: {motivo}")
    db.commit()
    return {"status": "ok"}

@router.post("/{id}/desbloquear")
def desbloquear_usuario(id: int, db: Session = Depends(get_db), admin: Usuario = Depends(get_admin_user)):
    user = db.query(Usuario).filter(Usuario.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.bloqueado_manual = False
    user.motivo_bloqueo = None
    user.intentos_fallidos = 0
    user.bloqueado_hasta = None
    user.modificado_por = admin.id
    user.fecha_modificacion = datetime.utcnow()
    log_audit(db, "USER_UNLOCKED", user.id, descripcion=f"Unlocked by {admin.email}")
    db.commit()
    return {"status": "ok"}

@router.get("/{id}/sesiones", response_model=List[UsuarioSesionDetalleResponse])
def get_usuario_sesiones(id: int, db: Session = Depends(get_db), admin: Usuario = Depends(get_admin_user)):
    user = db.query(Usuario).filter(Usuario.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if not admin.acceso_todos_tenants:
        admin_tenant_ids = {tu.tenant_id for tu in admin.tenant_usuarios if tu.activo}
        user_tenant_ids = {tu.tenant_id for tu in user.tenant_usuarios if tu.activo}
        if not admin_tenant_ids.intersection(user_tenant_ids):
             raise HTTPException(status_code=403, detail="Access denied")

    sesiones = db.query(UsuarioSesiones).filter(UsuarioSesiones.usuario_id == id).order_by(UsuarioSesiones.fecha_inicio.desc()).all()
    
    res = []
    for s in sesiones:
        res.append({
            "id": s.id,
            "ip_address": s.ip_address,
            "user_agent": s.user_agent,
            "fecha_inicio": s.fecha_inicio,
            "ultima_actividad": s.ultima_actividad,
            "fecha_expiracion": s.fecha_expiracion,
            "revocada": s.revocada,
            "usuario_email": user.email,
            "usuario_nombre": user.nombre,
            "rol_principal": user.roles[0].rol.codigo if user.roles else None,
            "cliente_principal": None
        })
    return res

@router.post("/{id}/sesiones/{sesion_id}/revocar")
def revocar_sesion(id: int, sesion_id: int, db: Session = Depends(get_db), admin: Usuario = Depends(get_admin_user)):
    user = db.query(Usuario).filter(Usuario.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if not admin.acceso_todos_tenants:
        admin_tenant_ids = {tu.tenant_id for tu in admin.tenant_usuarios if tu.activo}
        user_tenant_ids = {tu.tenant_id for tu in user.tenant_usuarios if tu.activo}
        if not admin_tenant_ids.intersection(user_tenant_ids):
             raise HTTPException(status_code=403, detail="Access denied")

    sesion = db.query(UsuarioSesiones).filter(UsuarioSesiones.id == sesion_id, UsuarioSesiones.usuario_id == id).first()
    if not sesion:
        raise HTTPException(status_code=404, detail="Session not found")

    sesion.revocada = True
    log_audit(db, "SESSION_REVOKED", user.id, descripcion=f"Session {sesion_id} revoked by {admin.email}")
    db.commit()
    return {"status": "ok"}

@router.get("/{id}/auditoria", response_model=List[AuditoriaSeguridadResponse])
def get_usuario_auditoria(id: int, db: Session = Depends(get_db), admin: Usuario = Depends(get_admin_user)):
    user = db.query(Usuario).filter(Usuario.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if not admin.acceso_todos_tenants:
        admin_tenant_ids = {tu.tenant_id for tu in admin.tenant_usuarios if tu.activo}
        user_tenant_ids = {tu.tenant_id for tu in user.tenant_usuarios if tu.activo}
        if not admin_tenant_ids.intersection(user_tenant_ids):
             raise HTTPException(status_code=403, detail="Access denied")

    logs = db.query(AuditoriaSeguridad).filter(
        (AuditoriaSeguridad.usuario_afectado_id == id) | (AuditoriaSeguridad.usuario_actor_id == id)
    ).order_by(AuditoriaSeguridad.fecha_evento.desc()).all()
    return logs

import secrets
import string

@router.post("/{id}/reset_password")
def reset_password(
    id: int, 
    payload: Optional[AdminResetPasswordRequest] = None, 
    db: Session = Depends(get_db), 
    admin: Usuario = Depends(get_admin_user)
):
    user = db.query(Usuario).filter(Usuario.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
    if not admin.acceso_todos_tenants:
        admin_tenant_ids = {tu.tenant_id for tu in admin.tenant_usuarios if tu.activo}
        user_tenant_ids = {tu.tenant_id for tu in user.tenant_usuarios if tu.activo}
        if not admin_tenant_ids.intersection(user_tenant_ids):
             raise HTTPException(status_code=403, detail="Acceso denegado")

    forzar_cambio = True if payload is None else payload.forzar_cambio
    temp_pass = payload.nueva_password.strip() if (payload and payload.nueva_password and payload.nueva_password.strip()) else None

    # Fetch applicable security policy
    user_tenant_id = None
    if user.tenant_usuarios:
        active_tu = next((tu for tu in user.tenant_usuarios if tu.activo), None)
        if active_tu:
            user_tenant_id = active_tu.tenant_id

    policy = None
    if user_tenant_id:
        policy = db.query(PoliticasSeguridad).filter(
            PoliticasSeguridad.tenant_id == user_tenant_id,
            PoliticasSeguridad.activo == True
        ).first()

    if not policy:
        policy = db.query(PoliticasSeguridad).filter(
            PoliticasSeguridad.tenant_id.is_(None),
            PoliticasSeguridad.activo == True
        ).first()

    min_len = policy.longitud_minima_password if policy else 12
    max_len = policy.longitud_maxima_password if policy else 128
    minutos_validez = policy.minutos_validez_token_reset if policy else 1440

    if temp_pass:
        if len(temp_pass) < min_len:
            raise HTTPException(
                status_code=400, 
                detail=f"La contraseña debe tener al menos {min_len} caracteres según la política de seguridad."
            )
        if len(temp_pass) > max_len:
            raise HTTPException(
                status_code=400, 
                detail=f"La contraseña temporal no puede superar los {max_len} caracteres."
            )
    else:
        # Generate random secure password meeting min_len
        rand_suffix = ''.join(secrets.choice(string.digits) for _ in range(4))
        temp_pass = f"TempStarlink#{rand_suffix}"
        if len(temp_pass) < min_len:
            extra = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(min_len - len(temp_pass)))
            temp_pass = f"{temp_pass}{extra}"

    now = datetime.utcnow()
    new_hash = get_password_hash(temp_pass)

    user.password_hash = new_hash
    user.debe_cambiar_password = forzar_cambio
    user.intentos_fallidos = 0
    user.bloqueado_hasta = None
    user.bloqueado_manual = False
    user.modificado_por = admin.id
    user.fecha_modificacion = now
    user.password_cambiado_en = now

    # Log to password history
    hist_entry = UsuarioPasswordHistorial(
        usuario_id=user.id,
        password_hash=new_hash,
        fecha_creacion=now
    )
    db.add(hist_entry)
    
    token_str = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(32))
    token = UsuarioPasswordResetToken(
        usuario_id=user.id,
        token_hash=token_str,
        fecha_expiracion=now + timedelta(minutes=minutos_validez),
        revocado=False
    )
    db.add(token)
    
    log_audit(db, "PASSWORD_RESET_FORCED", user.id, descripcion=f"Contraseña restablecida por {admin.email}. Forzar cambio: {forzar_cambio}")
    db.commit()
    
    return {
        "status": "ok", 
        "message": f"Contraseña actualizada para {user.email}",
        "password_temporal": temp_pass,
        "debe_cambiar_password": forzar_cambio
    }

@router.delete("/{id}")
def delete_usuario(id: int, db: Session = Depends(get_db), admin: Usuario = Depends(get_admin_user)):
    if admin.id == id:
        raise HTTPException(status_code=400, detail="No puedes eliminar tu propia cuenta de usuario en sesión activa.")
        
    user = db.query(Usuario).filter(Usuario.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
    if not admin.acceso_todos_tenants:
        admin_tenant_ids = {tu.tenant_id for tu in admin.tenant_usuarios if tu.activo}
        user_tenant_ids = {tu.tenant_id for tu in user.tenant_usuarios if tu.activo}
        if not admin_tenant_ids.intersection(user_tenant_ids):
             raise HTTPException(status_code=403, detail="No tienes permisos para eliminar este usuario.")

    user_email = user.email

    try:
        # 1. Discover all actual existing tables with foreign keys referencing 'usuarios'
        fk_query = text("""
            SELECT 
                c.conrelid::regclass::text AS table_name,
                a.attname AS column_name,
                a.attnotnull AS is_not_null
            FROM pg_constraint c
            JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
            WHERE c.contype = 'f' AND c.confrelid::regclass::text = 'usuarios';
        """)
        fks = db.execute(fk_query).fetchall()

        delete_tables = {
            'tenant_usuarios', 'usuario_roles', 'usuario_sesiones', 
            'usuario_password_historial', 'usuario_password_reset_tokens', 
            'usuario_mfa', 'solicitud_cliente_comentarios', 'solicitud_cliente_historial',
            'solicitud_cliente_sla_pausas'
        }

        for table_name, col_name, is_not_null in fks:
            if table_name == 'usuarios':
                db.execute(text(f'UPDATE usuarios SET {col_name} = NULL WHERE {col_name} = :uid'), {'uid': id})
            elif table_name in delete_tables:
                db.execute(text(f'DELETE FROM {table_name} WHERE {col_name} = :uid'), {'uid': id})
            elif is_not_null:
                db.execute(text(f'DELETE FROM {table_name} WHERE {col_name} = :uid'), {'uid': id})
            else:
                db.execute(text(f'UPDATE {table_name} SET {col_name} = NULL WHERE {col_name} = :uid'), {'uid': id})

        # Log audit (usuario_afectado_id is None since the user is deleted)
        audit = AuditoriaSeguridad(
            evento="USER_DELETED",
            usuario_actor_id=admin.id,
            usuario_afectado_id=None,
            detalle={
                "descripcion": f"Usuario {user_email} (ID: {id}) eliminado por {admin.email}",
                "usuario_eliminado_id": id,
                "usuario_eliminado_email": user_email
            }
        )
        db.add(audit)

        # Delete user row
        db.execute(text('DELETE FROM usuarios WHERE id = :uid'), {'uid': id})
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al eliminar usuario: {str(e)}")

    return {"status": "ok", "message": f"Usuario {user_email} eliminado exitosamente."}
