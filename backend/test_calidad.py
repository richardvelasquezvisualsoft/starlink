import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'app'))
from app.core.database import SessionLocal
from app.api.endpoints.dashboard import get_telemetry_trend, get_terminals_geolocations
from app.api.endpoints.crud import get_lineas_servicio

db = SessionLocal()
tenant_ctx = {"role": "CLIENTE", "tenant_id": "1"}

try:
    c = get_telemetry_trend(modo="operativo", db=db, tenant_ctx=tenant_ctx)
    print("CHART:", len(c))
except Exception as e:
    import traceback
    print("CHART ERROR:")
    traceback.print_exc()

try:
    g = get_terminals_geolocations(db=db, tenant_ctx=tenant_ctx)
    print("GEOLOCATIONS:", len(g))
except Exception as e:
    import traceback
    print("GEO ERROR:")
    traceback.print_exc()

try:
    l = get_lineas_servicio(db=db, tenant_ctx=tenant_ctx)
    print("LINEAS:", len(l))
except Exception as e:
    import traceback
    print("LINEAS ERROR:")
    traceback.print_exc()
