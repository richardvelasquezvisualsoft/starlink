import os
from sqlalchemy import create_engine, text

db_url = os.getenv("DATABASE_URL", "postgresql://star_user:star_password@localhost:5432/starlink_db")
engine = create_engine(db_url)

with engine.connect() as conn:
    tables = ['costo_servicio_mes', 'consumo_diario', 'starlink_facturas_reseller', 'aprovisionamientos_cliente', 'alertas_log', 'servicio_resumen_dia']
    for t in tables:
        cols = conn.execute(text(f"SELECT column_name, data_type FROM information_schema.columns WHERE table_name='{t}' ORDER BY ordinal_position")).fetchall()
        print(f"=== {t} ===")
        for c in cols:
            print(f"  {c[0]} ({c[1]})")
        print()
