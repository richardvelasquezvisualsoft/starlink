import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'app'))
from app.core.database import SessionLocal
from app.models import Usuario
from app.core.security import create_access_token
import datetime
import requests

db = SessionLocal()
# User 1 is a cliente? No, we need a client role. But we can override X-Demo-Role.
user = db.query(Usuario).first()
access_token = create_access_token(subject=str(user.id), expires_delta=datetime.timedelta(minutes=60))

headers = {
    "Authorization": f"Bearer {access_token}",
    "X-Demo-Role": "CLIENTE",
    "X-Demo-Tenant": "1"
}

r = requests.get("http://localhost:8050/api/v1/dispositivos", headers=headers)
print("DISPOSITIVOS STATUS:", r.status_code)
if r.status_code != 200:
    print(r.text)
else:
    print("Length:", len(r.json()))

r = requests.get("http://localhost:8050/api/v1/routers", headers=headers)
print("ROUTERS STATUS:", r.status_code)
if r.status_code != 200:
    print(r.text)
else:
    print("Length:", len(r.json()))

