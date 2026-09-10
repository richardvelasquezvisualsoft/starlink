import sys
import os
import urllib.parse
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from sqlalchemy import create_engine, text
password = urllib.parse.quote_plus('v1su@ls0ft')
engine = create_engine(f'postgresql://star_user:{password}@localhost:5432/starlink_db')
with engine.connect() as conn:
    query = """
            SELECT plan_contratado, COUNT(*) 
            FROM lineas_servicio 
            WHERE estado_provisionamiento = 'active' 
            GROUP BY plan_contratado 
            ORDER BY count DESC
    """
    res = conn.execute(text(query)).fetchall()
    for r in res:
        print(dict(r._mapping))
