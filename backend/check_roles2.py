from app.core.database import SessionLocal
from app.models import UsuarioRoles, RolesPortal

db = SessionLocal()
roles = db.query(UsuarioRoles).filter(UsuarioRoles.usuario_id == 14).all()
for r in roles:
    print(f"Role ID: {r.rol_id}, Activo: {r.activo}")
    
db.close()
