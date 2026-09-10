import sys
import os
import urllib.parse
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from sqlalchemy import create_engine, text
password = urllib.parse.quote_plus('v1su@ls0ft')
engine = create_engine(f'postgresql://star_user:{password}@localhost:5432/starlink_db')
with engine.connect() as conn:
    print("Testing FINAL query:")
    query = """
            WITH csm_agg AS (
                SELECT linea_servicio_id,
                       AVG(consumo_total_gb) as avg_consumo,
                       AVG(costo_starlink) as avg_costo
                FROM costo_servicio_mes
                GROUP BY linea_servicio_id
            )
            SELECT 
                COALESCE(ls.plan_contratado, 'Sin Plan') AS plan_nombre,
                COUNT(DISTINCT ls.id) AS servicios_count,
                COUNT(DISTINCT c.tenant_id) AS clientes_count,
                AVG(csm.avg_consumo) AS consumo_avg_gb,
                AVG(csm.avg_costo) AS costo_avg
            FROM lineas_servicio ls
            JOIN cuentas c ON c.id = ls.cuenta_id
            LEFT JOIN csm_agg csm ON csm.linea_servicio_id = ls.id
            WHERE ls.estado_provisionamiento = 'active'
            GROUP BY COALESCE(ls.plan_contratado, 'Sin Plan')
            ORDER BY servicios_count DESC
    """
    res = conn.execute(text(query)).fetchall()
    for r in res:
        print(dict(r._mapping))
