from app.core.database import SessionLocal
from app.models import Usuario

db = SessionLocal()
users = db.query(Usuario).all()
for u in users:
    print(f"User: {u.id} - {u.email} - {u.nombre}")
db.close()
