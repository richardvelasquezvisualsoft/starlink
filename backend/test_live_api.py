import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'app'))
from app.core.database import SessionLocal
from app.models import Usuario
from app.core.security import create_access_token
import datetime
import requests

db = SessionLocal()
user = db.query(Usuario).first()
access_token = create_access_token(subject=str(user.id), expires_delta=datetime.timedelta(minutes=60))

headers = {
    "Authorization": f"Bearer {access_token}",
    "X-Demo-Role": "RESELLER"
}

r = requests.get("http://localhost:8050/api/v1/reseller/dashboard/summary", headers=headers)
print("SUMMARY STATUS:", r.status_code)
print(r.text)

r = requests.get("http://localhost:8050/api/v1/reseller/dashboard/portfolio-trend", headers=headers)
print("PORTFOLIO STATUS:", r.status_code)
print(r.text)

