import sys
from app.core.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()
try:
    cols = db.execute(text("SELECT ur.*, r.codigo FROM usuario_roles ur JOIN roles_portal r ON ur.rol_id = r.id WHERE ur.usuario_id = 14;")).fetchall()
    print("Roles for user 14:")
    for c in cols:
        print(c)
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
finally:
    db.close()
