import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'app'))
from app.core.database import SessionLocal
from app.api.endpoints.reseller_dashboard import (
    get_summary, get_top_clients, get_portfolio_trend, get_quality_trend,
    get_billing_trend, get_critical_alerts, get_contracts_expiring, get_provisioning_pending
)

db = SessionLocal()
tenant_ctx = {"role": "RESELLER", "tenant_id": None}

endpoints = [
    ("summary", get_summary),
    ("top", get_top_clients),
    ("portfolio", lambda db, ctx: get_portfolio_trend(12, db, ctx)),
    ("quality", lambda db, ctx: get_quality_trend(None, None, db, ctx)),
    ("billing", lambda db, ctx: get_billing_trend(12, db, ctx)),
    ("critical", get_critical_alerts),
    ("contracts", get_contracts_expiring),
    ("provisioning", get_provisioning_pending),
]

for name, func in endpoints:
    try:
        res = func(db, tenant_ctx)
        print(f"{name} -> {type(res)}")
    except Exception as e:
        print(f"{name} -> ERROR: {e}")
