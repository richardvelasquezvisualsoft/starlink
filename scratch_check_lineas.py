import sys
sys.path.insert(0, '/home/administrador/Programas/starlink/web/backend')
from sqlalchemy import create_engine, text
from urllib.parse import quote_plus

pw = quote_plus("v1su@ls0ft")
engine = create_engine(f"postgresql://star_user:{pw}@192.168.100.5:5432/starlink_db")

with engine.connect() as conn:
    print(conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='lineas_servicio'")).fetchall())
    print("---")
    print(conn.execute(text("SELECT * FROM lineas_servicio LIMIT 1")).fetchall())
