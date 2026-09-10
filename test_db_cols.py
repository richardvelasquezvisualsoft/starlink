import sys, os
sys.path.append(os.path.join(os.getcwd(), 'backend'))
from sqlalchemy import create_engine, text
from app.core.config import settings
engine = create_engine(settings.DATABASE_URL.replace("192.168.100.5", "localhost"))
try:
    with engine.connect() as conn:
        print("politicas_seguridad:", conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'politicas_seguridad'")).fetchall())
except Exception as e:
    print(e)
