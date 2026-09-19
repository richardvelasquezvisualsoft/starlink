import sys
sys.path.insert(0, '/home/administrador/Programas/starlink/web/backend')

from fastapi.testclient import TestClient
from app.main import app
from app.api.deps import get_tenant_context
from app.api.endpoints.auth import get_current_user
from app.models import Usuario

def override_get_current_user():
    u = Usuario()
    u.id = 1
    u.acceso_todos_tenants = True
    return u

def override_get_tenant_context():
    return {
        "rol": "CLIENTE",
        "role": "CLIENTE",
        "tenant_id": 1,
        "user_id": 1
    }

app.dependency_overrides[get_current_user] = override_get_current_user
app.dependency_overrides[get_tenant_context] = override_get_tenant_context

client = TestClient(app)
response = client.get("/api/dashboard/kpis?year=2026&month=9")
print(response.status_code)
print(response.json())
