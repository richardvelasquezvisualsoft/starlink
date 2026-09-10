import sys
import os
import urllib.parse
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from sqlalchemy import create_engine, text
from app.core.config import settings

engine = create_engine(settings.DATABASE_URL.replace("192.168.100.5", "localhost"))
try:
    with engine.connect() as conn:
        res = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'usuario_roles'")).fetchall()
        print("usuario_roles columns:", [r[0] for r in res])
        res2 = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'tenant_usuarios'")).fetchall()
        print("tenant_usuarios columns:", [r[0] for r in res2])
        res3 = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'usuario_mfa'")).fetchall()
        print("usuario_mfa columns:", [r[0] for r in res3])
except Exception as e:
    print("Error:", e)
