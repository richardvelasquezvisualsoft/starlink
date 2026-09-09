from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from datetime import datetime
import shutil
import os
import uuid

from app.core.database import get_db
from app.models import Usuario, AuditoriaSeguridad
from app.schemas import UsuarioAdminResponse, PerfilUpdate, PerfilPasswordUpdate
from app.core.security import verify_password, get_password_hash
from app.api.endpoints.auth import get_current_user
from app.api.endpoints.usuarios import log_audit

router = APIRouter()

@router.get("", response_model=UsuarioAdminResponse)
def get_perfil(current_user: Usuario = Depends(get_current_user)):
    return current_user

@router.put("")
def update_perfil(perfil_in: PerfilUpdate, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    if perfil_in.nombre is not None:
        current_user.nombre = perfil_in.nombre
    if perfil_in.email_recuperacion is not None:
        current_user.email_recuperacion = perfil_in.email_recuperacion
    if perfil_in.celular is not None:
        current_user.celular = perfil_in.celular
    if perfil_in.sigla_corta is not None:
        current_user.sigla_corta = perfil_in.sigla_corta
    if perfil_in.pais is not None:
        current_user.pais = perfil_in.pais
    if perfil_in.zona_horaria is not None:
        current_user.zona_horaria = perfil_in.zona_horaria
    
    current_user.modificado_por = current_user.id
    current_user.fecha_modificacion = datetime.utcnow()
    
    log_audit(db, "PROFILE_UPDATED", current_user.id, descripcion="User updated their own profile")
    db.commit()
    db.refresh(current_user)
    
    return current_user

@router.post("/foto")
async def upload_foto(file: UploadFile = File(...), db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="El archivo debe ser una imagen")
        
    ext = file.filename.split('.')[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    
    # uploads is located at /app/uploads in docker, or backend/uploads locally
    upload_dir = "uploads"
    if not os.path.exists(upload_dir):
        os.makedirs(upload_dir)
        
    file_path = os.path.join(upload_dir, filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # url accessible via StaticFiles mounted at /api/uploads
    url = f"/api/uploads/{filename}"
    current_user.foto_url = url
    current_user.modificado_por = current_user.id
    current_user.fecha_modificacion = datetime.utcnow()
    
    log_audit(db, "PROFILE_PHOTO_UPDATED", current_user.id, descripcion="User updated their profile photo")
    db.commit()
    return {"status": "ok", "foto_url": url}

@router.post("/password")
def change_password(pass_in: PerfilPasswordUpdate, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    if not verify_password(pass_in.password_actual, current_user.password_hash):
        raise HTTPException(status_code=400, detail="La contraseña actual es incorrecta")
        
    current_user.password_hash = get_password_hash(pass_in.nueva_password)
    current_user.debe_cambiar_password = False
    current_user.modificado_por = current_user.id
    current_user.fecha_modificacion = datetime.utcnow()
    
    log_audit(db, "PASSWORD_CHANGED", current_user.id, descripcion="User changed their own password")
    db.commit()
    return {"status": "ok", "message": "Contraseña actualizada exitosamente"}
