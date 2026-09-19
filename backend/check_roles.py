from app.core.database import SessionLocal
from app.models import Usuario, UsuarioRoles

db = SessionLocal()
admin = db.query(Usuario).filter(Usuario.email == 'admin@admin.com').first()
if not admin:
    print("Admin not found")
else:
    roles = db.query(UsuarioRoles).filter(UsuarioRoles.usuario_id == admin.id).all()
    print(f"Admin id: {admin.id}")
    print(f"Roles:")
    for r in roles:
        print(f" - rol_id: {r.rol_id}, activo: {r.activo}")
db.close()
