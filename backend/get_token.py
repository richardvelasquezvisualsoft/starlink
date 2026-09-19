import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'app'))
from app.core.database import SessionLocal
from app.models import Usuario
from app.api.endpoints.auth import create_access_token
import datetime

db = SessionLocal()
user = db.query(Usuario).first()
access_token = create_access_token(data={"sub": str(user.id)}, expires_delta=datetime.timedelta(minutes=60))
print(f"export TOKEN={access_token}")
