import os
with open("app/api/endpoints/reseller_dashboard.py", "r") as f:
    content = f.read()

content = content.replace("def get_all_reseller_clients_data(db: Session):", "def get_all_reseller_clients_data(db: Session, tenant_ctx: dict = None):")

old_logic = """    try:
        results_rows = db.execute(text(RESELLER_CLIENTES_CTE)).fetchall()
        return [dict(r._mapping) for r in results_rows]
    except Exception as e:
        db.rollback()
        print("Error en CTE reseller dashboard, cayendo a demo fallback:", e)
        return DEMO_RESELLER_CLIENTES"""

new_logic = """    try:
        results_rows = db.execute(text(RESELLER_CLIENTES_CTE)).fetchall()
        results = [dict(r._mapping) for r in results_rows]
    except Exception as e:
        db.rollback()
        print("Error en CTE reseller dashboard, cayendo a demo fallback:", e)
        results = DEMO_RESELLER_CLIENTES
        
    if tenant_ctx:
        role = tenant_ctx.get("role") or tenant_ctx.get("rol")
        if role == "CLIENTE":
            tid = tenant_ctx.get("tenant_id")
            results = [r for r in results if str(r.get("tenant_id")) == str(tid)]
    return results"""

content = content.replace(old_logic, new_logic)

content = content.replace("items = get_all_reseller_clients_data(db)", "items = get_all_reseller_clients_data(db, tenant_ctx)")

with open("app/api/endpoints/reseller_dashboard.py", "w") as f:
    f.write(content)
print("Updated successfully")
