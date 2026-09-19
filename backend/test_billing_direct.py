import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'app'))
from app.core.database import SessionLocal
from app.api.endpoints.billing import get_billing_details

db = SessionLocal()
tenant_ctx = {"role": "CLIENTE", "tenant_id": "1"}

try:
    d = get_billing_details(year=2026, month=8, db=db, tenant_ctx=tenant_ctx)
    print("DETAILS:", len(d))
except Exception as e:
    import traceback
    traceback.print_exc()
