import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'app'))
from app.core.database import SessionLocal
from app.api.endpoints.crud import get_dispositivos

db = SessionLocal()
tenant_ctx = {"role": "CLIENTE", "tenant_id": "1"}

try:
    d = get_dispositivos(db=db, tenant_ctx=tenant_ctx)
    print("DISPOSITIVOS:", len(d))
except Exception as e:
    import traceback
    traceback.print_exc()
