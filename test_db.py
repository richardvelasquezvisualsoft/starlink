import sys
import os
import urllib.parse
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from sqlalchemy import create_engine, text
password = urllib.parse.quote_plus('v1su@ls0ft')
engine = create_engine(f'postgresql://star_user:{password}@localhost:5432/starlink_db')
with engine.connect() as conn:
    print("Test The query:")
    query = """
            SELECT 
                ls.plan_contratado AS plan_nombre,
                COUNT(ls.id) AS servicios_count,
                COUNT(DISTINCT c.tenant_id) AS clientes_count,
                AVG(csm.consumo_total_gb) AS consumo_avg_gb,
                AVG(csm.costo_starlink) AS costo_avg
            FROM lineas_servicio ls
            JOIN cuentas c ON c.id = ls.cuenta_id
            LEFT JOIN costo_servicio_mes csm ON csm.linea_servicio_id = ls.id
            WHERE ls.estado_provisionamiento = 'active'
            GROUP BY ls.plan_contratado
            ORDER BY servicios_count DESC
    """
    try:
        res = conn.execute(text(query)).fetchall()
        for r in res:
            print(dict(r._mapping))
    except Exception as e:
        print("ERROR:", e)
