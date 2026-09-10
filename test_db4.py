import sys
import os
import urllib.parse
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from sqlalchemy import create_engine, text
from app.core.config import settings

print("DB URL:", settings.DATABASE_URL)
engine = create_engine(settings.DATABASE_URL.replace("192.168.100.5", "localhost"))
try:
    with engine.connect() as conn:
        res = conn.execute(text("SELECT id, email, nombre FROM usuarios LIMIT 1")).fetchall()
        print("Test Query Result:", res)
except Exception as e:
    print("Error:", e)
