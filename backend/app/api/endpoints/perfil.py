from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from datetime import datetime
import shutil
import os
import uuid

from app.core.database import get_db
from app.models import Usuario, AuditoriaSeguridad, PoliticasSeguridad, UsuarioPasswordHistorial
from app.schemas import UsuarioAdminResponse, PerfilUpdate, PerfilPasswordUpdate
from app.core.security import verify_password, get_password_hash
from app.api.endpoints.auth import get_current_user
from app.api.endpoints.usuarios import log_audit

import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

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
    logger.info(f"Starting profile photo upload for user_id={current_user.id}, filename={file.filename}")
    
    if not file.content_type or file.content_type.lower() not in settings.ALLOWED_IMAGE_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Formato no permitido ({file.content_type}). Solo se permiten imágenes JPEG, PNG y WebP."
        )
        
    ext = os.path.splitext(file.filename)[1].lower() if file.filename else ""
    if ext not in settings.ALLOWED_IMAGE_EXTENSIONS:
        # Fallback ext based on mime type
        mime_map = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
        ext = mime_map.get(file.content_type.lower(), ".jpg")
        
    contents = await file.read()
    file_size = len(contents)
    
    if file_size > settings.MAX_AVATAR_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El archivo excede el tamaño máximo permitido de 5MB ({file_size} bytes)."
        )
        
    filename = f"{uuid.uuid4()}{ext}"
    upload_dir = settings.UPLOAD_DIR
    os.makedirs(upload_dir, exist_ok=True)
    
    file_path = os.path.join(upload_dir, filename)
    with open(file_path, "wb") as buffer:
        buffer.write(contents)
        
    try:
        os.chmod(file_path, 0o644)
    except Exception as e:
        logger.warning(f"Could not set file permissions for {file_path}: {e}")
        
    old_foto_url = current_user.foto_url
    url = f"{settings.API_V1_STR}/uploads/{filename}"
    
    current_user.foto_url = url
    current_user.modificado_por = current_user.id
    current_user.fecha_modificacion = datetime.utcnow()
    
    log_audit(db, "PROFILE_PHOTO_UPDATED", current_user.id, descripcion=f"User updated profile photo to {url}")
    db.commit()
    db.refresh(current_user)
    
    logger.info(f"Profile photo updated successfully in DB for user_id={current_user.id}: {url}")
    
    # Clean up previous photo file if it exists and is different
    if old_foto_url and "/uploads/" in old_foto_url:
        old_filename = old_foto_url.split("/uploads/")[-1]
        if old_filename and old_filename != filename:
            old_file_path = os.path.join(upload_dir, old_filename)
            if os.path.exists(old_file_path):
                try:
                    os.remove(old_file_path)
                    logger.info(f"Removed previous avatar file: {old_file_path}")
                except Exception as e:
                    logger.warning(f"Could not remove previous avatar file {old_file_path}: {e}")
                    
    return {
        "status": "ok",
        "foto_url": url,
        "filename": filename,
        "mime_type": file.content_type,
        "size_bytes": file_size
    }

@router.delete("/foto")
def delete_foto(db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    logger.info(f"Deleting profile photo for user_id={current_user.id}")
    old_foto_url = current_user.foto_url
    
    current_user.foto_url = None
    current_user.modificado_por = current_user.id
    current_user.fecha_modificacion = datetime.utcnow()
    log_audit(db, "PROFILE_PHOTO_DELETED", current_user.id, descripcion="User deleted profile photo")
    db.commit()
    
    if old_foto_url and "/uploads/" in old_foto_url:
        old_filename = old_foto_url.split("/uploads/")[-1]
        if old_filename:
            old_file_path = os.path.join(settings.UPLOAD_DIR, old_filename)
            if os.path.exists(old_file_path):
                try:
                    os.remove(old_file_path)
                    logger.info(f"Removed avatar file on delete: {old_file_path}")
                except Exception as e:
                    logger.warning(f"Could not remove avatar file {old_file_path}: {e}")
                    
@router.get("/password-policy")
def get_password_policy(db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    user_tenant_id = None
    if current_user.tenant_usuarios:
        active_tu = next((tu for tu in current_user.tenant_usuarios if tu.activo), None)
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

    return {
        "longitud_minima": policy.longitud_minima_password if policy else 8,
        "longitud_maxima": policy.longitud_maxima_password if policy else 128,
        "historial_passwords": policy.historial_passwords if policy else 5
    }

@router.post("/password")
def change_password(pass_in: PerfilPasswordUpdate, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    if not verify_password(pass_in.password_actual, current_user.password_hash):
        raise HTTPException(status_code=400, detail="La contraseña actual es incorrecta")
        
    if pass_in.nueva_password == pass_in.password_actual:
        raise HTTPException(status_code=400, detail="La nueva contraseña no puede ser igual a la contraseña actual")

    # Fetch applicable security policy (tenant policy or global fallback)
    user_tenant_id = None
    if current_user.tenant_usuarios:
        active_tu = next((tu for tu in current_user.tenant_usuarios if tu.activo), None)
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

    min_len = policy.longitud_minima_password if policy else 8
    max_len = policy.longitud_maxima_password if policy else 128
    historial_count = policy.historial_passwords if policy else 5

    if len(pass_in.nueva_password) < min_len:
        raise HTTPException(status_code=400, detail=f"La nueva contraseña debe tener al menos {min_len} caracteres")

    if len(pass_in.nueva_password) > max_len:
        raise HTTPException(status_code=400, detail=f"La nueva contraseña no puede superar los {max_len} caracteres")

    # Check password history
    if historial_count > 0:
        recent_passwords = (
            db.query(UsuarioPasswordHistorial)
            .filter(UsuarioPasswordHistorial.usuario_id == current_user.id)
            .order_by(UsuarioPasswordHistorial.fecha_creacion.desc())
            .limit(historial_count)
            .all()
        )
        for p_hist in recent_passwords:
            if verify_password(pass_in.nueva_password, p_hist.password_hash):
                raise HTTPException(
                    status_code=400, 
                    detail=f"Por políticas de seguridad, no puedes reutilizar tus últimas {historial_count} contraseñas"
                )

    new_hash = get_password_hash(pass_in.nueva_password)
    now = datetime.utcnow()

    # Save to history
    hist_entry = UsuarioPasswordHistorial(
        usuario_id=current_user.id,
        password_hash=new_hash,
        fecha_creacion=now
    )
    db.add(hist_entry)

    # Update user record
    current_user.password_hash = new_hash
    current_user.password_cambiado_en = now
    current_user.debe_cambiar_password = False
    current_user.intentos_fallidos = 0
    current_user.bloqueado_hasta = None
    current_user.modificado_por = current_user.id
    current_user.fecha_modificacion = now
    
    log_audit(db, "PASSWORD_CHANGED", current_user.id, descripcion="User changed their own password")
    db.commit()
    return {"status": "ok", "message": "Contraseña actualizada exitosamente"}
