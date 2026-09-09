import sys
from app.core.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()
try:
    cols = db.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='usuario_roles';")).fetchall()
    print("Columns for usuario_roles:")
    for c in cols:
        print(f"- {c[0]} ({c[1]})")
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
finally:
    db.close()
