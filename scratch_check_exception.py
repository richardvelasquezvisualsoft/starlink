import sys
sys.path.insert(0, '/home/administrador/Programas/starlink/web/backend')
from sqlalchemy import create_engine, text
from urllib.parse import quote_plus
from calendar import monthrange
import traceback

pw = quote_plus("v1su@ls0ft")
engine = create_engine(f"postgresql://star_user:{pw}@192.168.100.5:5432/starlink_db")

try:
    with engine.connect() as conn:
        year = 2026
        month = 9
        tenant_id = 1
        last_day = monthrange(year, month)[1]
        period_start = f"{year}-{month:02d}-01"
        period_end = f"{year}-{month:02d}-{last_day}"
        
        cont_data = conn.execute(
            text("""
                SELECT monto_mensual_referencial, moneda
                FROM contratos_cliente
                WHERE tenant_id = :tid 
                  AND estado = 'ACTIVO'
                  AND fecha_inicio <= :pe 
                  AND (fecha_fin >= :ps OR fecha_fin IS NULL)
                LIMIT 1
            """),
            {"tid": tenant_id, "ps": period_start, "pe": period_end}
        ).fetchone()
        print(cont_data)
except Exception as e:
    traceback.print_exc()
