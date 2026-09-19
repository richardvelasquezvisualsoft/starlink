import os
import sys
# add backend to path
sys.path.insert(0, '/home/administrador/Programas/starlink/web/backend')
from sqlalchemy import create_engine, text

# connect to DB
engine = create_engine("postgresql://star_user:v1su@ls0ft@192.168.100.5:5432/starlink_db")

with engine.connect() as conn:
    print("--- vw_solicitudes_sla_estado ---")
    res = conn.execute(text("SELECT estado, sla_semaforo, count(*) FROM vw_solicitudes_sla_estado GROUP BY estado, sla_semaforo")).fetchall()
    print(res)

    print("--- costo_servicio_mes ---")
    res = conn.execute(text("SELECT periodo, sum(consumo_total_gb), max(moneda_cliente) FROM costo_servicio_mes WHERE tenant_id=1 GROUP BY periodo")).fetchall()
    print(res)

