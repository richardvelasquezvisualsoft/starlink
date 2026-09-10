from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import jwt, JWTError
from app.core.database import get_db
from app.core.security import verify_password, create_access_token
from app.core.config import settings
from app.models import Usuario, RolesPortal, UsuarioRoles
from app.schemas import UserLogin, UserCreate, UserResponse, Token

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
    from app.core.security import get_password_hash
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
        "role_codes": user_roles
    }
