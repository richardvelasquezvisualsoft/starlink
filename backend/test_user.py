import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'app'))
from app.core.database import SessionLocal
from app.models import Usuario, RolesPortal, UsuarioRoles

db = SessionLocal()
users = db.query(Usuario).all()
for u in users:
    roles_query = (
        db.query(RolesPortal.codigo)
        .join(UsuarioRoles, UsuarioRoles.rol_id == RolesPortal.id)
        .filter(UsuarioRoles.usuario_id == u.id, UsuarioRoles.activo == True)
        .all()
    )
    user_roles = [str(r[0]).strip().upper() for r in roles_query if r and r[0]]
    print(f"User {u.email} ({u.id}) - Roles: {user_roles} - tenant: {u.tenant_id}")
