import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'app'))
from fastapi.testclient import TestClient
from app.main import app
from app.api.deps import get_current_user, get_tenant_context

def override_get_tenant_context():
    return {"role": "RESELLER", "tenant_id": None}

def override_get_current_user():
    class MockUser:
        id = 1
        acceso_todos_tenants = True
    return MockUser()

app.dependency_overrides[get_tenant_context] = override_get_tenant_context
app.dependency_overrides[get_current_user] = override_get_current_user

client = TestClient(app)

response = client.get("/api/reseller/dashboard/summary")
print("SUMMARY:")
print(response.json())

response = client.get("/api/reseller/dashboard/top-clients")
print("\nTOP CLIENTS:")
print(response.json())
