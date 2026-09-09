from app.core.database import SessionLocal
from app.models import Usuario

db = SessionLocal()
users = db.query(Usuario).all()
for u in users:
    print(f"ID: {u.id}, Name: {u.nombre}, Email: {u.email}, Activo: {u.activo}")
