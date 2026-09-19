import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'app'))
from app.core.database import SessionLocal
from app.api.endpoints.reseller_dashboard import get_all_reseller_clients_data

db = SessionLocal()
tenant_ctx = {"role": "RESELLER", "tenant_id": None}
items = get_all_reseller_clients_data(db, tenant_ctx)
print(f"RESELLER items count: {len(items)}")

total_clientes = sum(1 for x in items if x.get("cliente_activo"))
total_starlinks = sum(x.get("cantidad_dispositivos", 0) for x in items)
print(f"RESELLER Clientes Activos: {total_clientes}")
print(f"RESELLER Starlinks: {total_starlinks}")

tenant_ctx_client = {"role": "CLIENTE", "tenant_id": 1}
items_client = get_all_reseller_clients_data(db, tenant_ctx_client)
print(f"CLIENTE items count: {len(items_client)}")
