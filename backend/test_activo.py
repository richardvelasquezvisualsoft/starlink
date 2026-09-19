import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'app'))
from app.core.database import SessionLocal
from app.api.endpoints.reseller_dashboard import RESELLER_CLIENTES_CTE
from sqlalchemy import text

db = SessionLocal()
query = text(RESELLER_CLIENTES_CTE + " SELECT * FROM _vw_clientes")
rows = db.execute(query).fetchall()
for r in rows:
    print(r._mapping['cliente'], "activo:", r._mapping['cliente_activo'])
