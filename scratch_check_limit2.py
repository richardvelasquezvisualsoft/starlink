import sys
sys.path.insert(0, '/home/administrador/Programas/starlink/web/backend')
from sqlalchemy import create_engine, text
from urllib.parse import quote_plus

pw = quote_plus("v1su@ls0ft")
engine = create_engine(f"postgresql://star_user:{pw}@192.168.100.5:5432/starlink_db")

with engine.connect() as conn:
    print(conn.execute(text("SELECT SUM(usage_limit_gb) FROM lineas_servicio ls JOIN cuentas c ON c.id = ls.cuenta_id WHERE c.tenant_id = 1")).fetchall())
