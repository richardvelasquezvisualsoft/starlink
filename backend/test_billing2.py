import sys
import os
import requests
sys.path.append(os.path.join(os.getcwd(), 'app'))
from app.core.database import SessionLocal
from app.models import Usuario
from app.core.security import create_access_token
import datetime

db = SessionLocal()
user = db.query(Usuario).first()
access_token = create_access_token(subject=str(user.id), expires_delta=datetime.timedelta(minutes=60))

headers = {
    "Authorization": f"Bearer {access_token}",
    "X-Demo-Role": "CLIENTE",
    "X-Demo-Tenant": "1"
}

url = "http://localhost:8050/api/billing/details?year=2026&month=08"
r = requests.get(url, headers=headers)
print("STATUS:", r.status_code)
if r.status_code != 200:
    print(r.text)
else:
    print("Length:", len(r.json()))
