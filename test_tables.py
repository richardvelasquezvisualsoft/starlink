import sys, os
sys.path.append(os.path.join(os.getcwd(), 'backend'))
from sqlalchemy import create_engine, text
from app.core.config import settings
engine = create_engine(settings.DATABASE_URL.replace("192.168.100.5", "localhost"))
try:
    with engine.connect() as conn:
        print("tables:", [row[0] for row in conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")).fetchall()])
except Exception as e:
    print(e)
