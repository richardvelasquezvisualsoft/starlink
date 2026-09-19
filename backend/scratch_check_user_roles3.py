import os
import sys
from sqlalchemy.orm import Session
from sqlalchemy import select

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.core.database import SessionLocal
from app.models import Usuario, UsuarioRoles, RolesPortal

def check_user_roles():
    db = SessionLocal()
    users = db.execute(select(Usuario).limit(5)).scalars().all()
    for u in users:
        print(f"User {u.id} - {u.email} - activo: {u.activo}")
        user_roles = db.execute(select(UsuarioRoles).where(UsuarioRoles.usuario_id == u.id, UsuarioRoles.activo == True)).scalars().all()
        for ur in user_roles:
            role = db.execute(select(RolesPortal).where(RolesPortal.id == ur.rol_id)).scalars().first()
            print(f"  Role: {role.codigo}")
    db.close()

if __name__ == "__main__":
    check_user_roles()
