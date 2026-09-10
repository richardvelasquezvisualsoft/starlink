import sys
import os
import urllib.parse
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from sqlalchemy import create_engine, text
from app.core.config import settings

engine = create_engine(settings.DATABASE_URL.replace("192.168.100.5", "localhost"))
try:
    with engine.connect() as conn:
        print("MFA cols details:", conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'usuario_mfa'")).fetchall())
        print("Roles cols details:", conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'usuario_roles'")).fetchall())
except Exception as e:
    print("Error:", e)
