import secrets
import string
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from sqlalchemy import func
from jose import jwt, JWTError
from app.core.database import get_db
from app.core.security import verify_password, create_access_token, get_password_hash
from app.core.config import settings
from app.models import Usuario, RolesPortal, UsuarioRoles, UsuarioPasswordResetToken, UsuarioPasswordHistorial, PoliticasSeguridad, AuditoriaSeguridad
from app.schemas import (
    UserLogin,
    UserCreate,
    UserResponse,
    Token,
    ForgotPasswordRequest,
    VerifyResetTokenRequest,
    ResetPasswordWithTokenRequest
)

router = APIRouter()

# Note: Using custom token URL path
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> Usuario:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = db.query(Usuario).filter(Usuario.id == int(user_id)).first()
    if user is None:
        raise credentials_exception
    return user

@router.post("/login", response_model=Token)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(Usuario).filter(Usuario.email == login_data.email).first()
    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password"
        )
    access_token = create_access_token(subject=user.id)
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/register", response_model=UserResponse)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    # Check if email is already taken
    existing_user = db.query(Usuario).filter(Usuario.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    db_user = Usuario(
        nombre=user_data.nombre,
        email=user_data.email,
        password_hash=get_password_hash(user_data.password)
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.get("/me", response_model=UserResponse)
def read_users_me(current_user: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    user_roles = []
    try:
        # Direct query in active DB session
        roles_query = (
            db.query(RolesPortal.codigo)
            .join(UsuarioRoles, UsuarioRoles.rol_id == RolesPortal.id)
            .filter(UsuarioRoles.usuario_id == current_user.id, UsuarioRoles.activo == True)
            .all()
        )
        raw_roles = [str(r[0]).strip().upper() for r in roles_query if r and r[0]]

        # Business Rule based on DB schema (v_usuario_tenants_efectivos):
        # A user with explicit 'RESELLER' or ('ADMIN' with global access) is RESELLER.
        # A user with 'CLIENTE' or ('ADMIN' without global access) is CLIENTE.
        if "RESELLER" in raw_roles or (any(r in ["ADMIN", "SUPERADMIN", "ADMINISTRADOR"] for r in raw_roles) and current_user.acceso_todos_tenants):
            user_roles = ["RESELLER"]
        else:
            user_roles = ["CLIENTE"]

    except Exception as e:
        print(f"[AUTH ERROR] Failed to query user roles: {e}", flush=True)
        user_roles = ["RESELLER"] if current_user.acceso_todos_tenants else ["CLIENTE"]

    print(f"[AUTH /me] user_id={current_user.id} email={current_user.email} acceso_todos_tenants={current_user.acceso_todos_tenants} resolved_roles={user_roles}", flush=True)
    
    return {
        "id": current_user.id,
        "nombre": current_user.nombre,
        "email": current_user.email,
        "email_recuperacion": getattr(current_user, "email_recuperacion", None),
        "celular": getattr(current_user, "celular", None),
        "sigla_corta": getattr(current_user, "sigla_corta", None),
        "pais": getattr(current_user, "pais", None),
        "zona_horaria": getattr(current_user, "zona_horaria", None),
        "foto_url": getattr(current_user, "foto_url", None),
        "fecha_creacion": getattr(current_user, "fecha_creacion", None),
        "debe_cambiar_password": getattr(current_user, "debe_cambiar_password", False),
        "role_codes": user_roles
    }

@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    email_clean = req.email.strip().lower()
    user = db.query(Usuario).filter(func.lower(Usuario.email) == email_clean).first()

    # Also search by email_recuperacion if not found
    if not user:
        user = db.query(Usuario).filter(func.lower(Usuario.email_recuperacion) == email_clean).first()

    if not user:
        # Generic response to prevent email enumeration
        return {
            "status": "ok",
            "message": "Si el correo ingresado se encuentra registrado, se ha generado el enlace de recuperación.",
            "token": None
        }

    if user.bloqueado_manual:
        raise HTTPException(
            status_code=400,
            detail=f"La cuenta está bloqueada administrativamente ({user.motivo_bloqueo or 'Bloqueo por seguridad'}). Contacta al administrador."
        )

    # Invalidate previous unused tokens for this user
    prev_tokens = db.query(UsuarioPasswordResetToken).filter(
        UsuarioPasswordResetToken.usuario_id == user.id,
        UsuarioPasswordResetToken.fecha_uso.is_(None),
        UsuarioPasswordResetToken.revocado == False
    ).all()
    for pt in prev_tokens:
        pt.revocado = True

    # Check policy for token validity duration
    policy = db.query(PoliticasSeguridad).filter(PoliticasSeguridad.activo == True).first()
    duracion_minutos = policy.minutos_validez_token_reset if policy else 60

    token_str = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(32))
    now = datetime.utcnow()
    token_entry = UsuarioPasswordResetToken(
        usuario_id=user.id,
        token_hash=token_str,
        fecha_expiracion=now + timedelta(minutes=duracion_minutos),
        revocado=False
    )
    db.add(token_entry)

    # Log security audit
    audit = AuditoriaSeguridad(
        evento="PASSWORD_RESET_REQUESTED",
        usuario_afectado_id=user.id,
        detalle={"email": user.email, "duracion_minutos": duracion_minutos}
    )
    db.add(audit)
    db.commit()

    # Mask email for safe UI display
    email_parts = user.email.split('@')
    name_part = email_parts[0]
    domain_part = email_parts[1] if len(email_parts) > 1 else ''
    masked_name = name_part[0] + '*' * max(len(name_part) - 2, 1) + name_part[-1] if len(name_part) > 2 else name_part[0] + '*'
    masked_email = f"{masked_name}@{domain_part}"

    return {
        "status": "ok",
        "message": f"Se ha generado el proceso de recuperación para {masked_email}.",
        "email_enmascarado": masked_email,
        "token": token_str,
        "minutos_expiracion": duracion_minutos
    }

@router.post("/verify-reset-token")
def verify_reset_token(req: VerifyResetTokenRequest, db: Session = Depends(get_db)):
    token_str = req.token.strip()
    token_entry = db.query(UsuarioPasswordResetToken).filter(
        UsuarioPasswordResetToken.token_hash == token_str
    ).first()

    if not token_entry or token_entry.revocado or token_entry.fecha_uso is not None:
        raise HTTPException(status_code=400, detail="El enlace o token de recuperación no es válido o ya ha sido utilizado.")

    if token_entry.fecha_expiracion < datetime.utcnow():
        raise HTTPException(status_code=400, detail="El token de recuperación ha expirado. Por favor solicita uno nuevo.")

    user = db.query(Usuario).filter(Usuario.id == token_entry.usuario_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario asociado no encontrado.")

    policy = db.query(PoliticasSeguridad).filter(PoliticasSeguridad.activo == True).first()
    min_len = policy.longitud_minima_password if policy else 12

    email_parts = user.email.split('@')
    name_part = email_parts[0]
    domain_part = email_parts[1] if len(email_parts) > 1 else ''
    masked_name = name_part[0] + '*' * max(len(name_part) - 2, 1) + name_part[-1] if len(name_part) > 2 else name_part[0] + '*'
    masked_email = f"{masked_name}@{domain_part}"

    return {
        "valid": True,
        "email_enmascarado": masked_email,
        "nombre": user.nombre,
        "longitud_minima": min_len
    }

@router.post("/reset-password")
def reset_password_with_token(req: ResetPasswordWithTokenRequest, db: Session = Depends(get_db)):
    token_str = req.token.strip()
    nueva_password = req.nueva_password.strip()

    token_entry = db.query(UsuarioPasswordResetToken).filter(
        UsuarioPasswordResetToken.token_hash == token_str
    ).first()

    if not token_entry or token_entry.revocado or token_entry.fecha_uso is not None:
        raise HTTPException(status_code=400, detail="El enlace o token de recuperación es inválido o ya ha sido utilizado.")

    if token_entry.fecha_expiracion < datetime.utcnow():
        raise HTTPException(status_code=400, detail="El token de recuperación ha expirado. Por favor solicita uno nuevo.")

    user = db.query(Usuario).filter(Usuario.id == token_entry.usuario_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

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
    historial_count = policy.historial_passwords if policy else 5

    if len(nueva_password) < min_len:
        raise HTTPException(status_code=400, detail=f"La contraseña debe tener al menos {min_len} caracteres según la política de seguridad.")

    if len(nueva_password) > max_len:
        raise HTTPException(status_code=400, detail=f"La contraseña no puede superar los {max_len} caracteres.")

    # Check password history
    if historial_count > 0:
        recent_passwords = (
            db.query(UsuarioPasswordHistorial)
            .filter(UsuarioPasswordHistorial.usuario_id == user.id)
            .order_by(UsuarioPasswordHistorial.fecha_creacion.desc())
            .limit(historial_count)
            .all()
        )
        for p_hist in recent_passwords:
            if verify_password(nueva_password, p_hist.password_hash):
                raise HTTPException(
                    status_code=400,
                    detail=f"Por políticas de seguridad corporativa, no puedes reutilizar tus últimas {historial_count} contraseñas."
                )

    now = datetime.utcnow()
    new_hash = get_password_hash(nueva_password)

    # Save to history
    hist_entry = UsuarioPasswordHistorial(
        usuario_id=user.id,
        password_hash=new_hash,
        fecha_creacion=now
    )
    db.add(hist_entry)

    # Update user record
    user.password_hash = new_hash
    user.password_cambiado_en = now
    user.debe_cambiar_password = False
    user.intentos_fallidos = 0
    user.bloqueado_hasta = None
    user.bloqueado_manual = False
    user.motivo_bloqueo = None
    user.fecha_modificacion = now

    # Mark token as used
    token_entry.fecha_uso = now

    # Log security audit
    audit = AuditoriaSeguridad(
        evento="PASSWORD_RESET_COMPLETED",
        usuario_afectado_id=user.id,
        detalle={"email": user.email, "metodo": "token_recuperacion"}
    )
    db.add(audit)
    db.commit()

    return {
        "status": "ok",
        "message": "Tu contraseña ha sido restablecida exitosamente. Ya puedes iniciar sesión con tu nueva contraseña."
    }
