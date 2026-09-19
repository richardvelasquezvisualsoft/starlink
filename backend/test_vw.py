import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'app'))
from app.core.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()
query = text("SELECT * FROM vw_dispositivo_estructura_actual LIMIT 1")
try:
    rows = db.execute(query).mappings().all()
    print("KEYS:", rows[0].keys() if rows else "EMPTY")
except Exception as e:
    print("ERROR:", e)
