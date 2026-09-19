with open("app/api/endpoints/reseller_dashboard.py", "r") as f:
    content = f.read()

old_ensure = """def ensure_reseller(tenant_ctx: dict):
    role = tenant_ctx.get("role") or tenant_ctx.get("rol")
    if role != "RESELLER":
        raise HTTPException(status_code=403, detail="Reseller scope required.")"""

new_ensure = """def ensure_reseller(tenant_ctx: dict):
    role = tenant_ctx.get("role") or tenant_ctx.get("rol")
    if role not in ["RESELLER", "CLIENTE"]:
        raise HTTPException(status_code=403, detail="Reseller or Cliente scope required.")"""

content = content.replace(old_ensure, new_ensure)

with open("app/api/endpoints/reseller_dashboard.py", "w") as f:
    f.write(content)
print("Ensure updated")
