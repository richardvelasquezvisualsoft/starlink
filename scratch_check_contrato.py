import sys
sys.path.insert(0, '/home/administrador/Programas/starlink/web/backend')
from sqlalchemy import create_engine, text
from urllib.parse import quote_plus

pw = quote_plus("v1su@ls0ft")
engine = create_engine(f"postgresql://star_user:{pw}@192.168.100.5:5432/starlink_db")

with engine.connect() as conn:
    print(conn.execute(text("SELECT monto_mensual_referencial, estado, fecha_inicio, fecha_fin FROM contratos_cliente WHERE tenant_id=1")).fetchall())
