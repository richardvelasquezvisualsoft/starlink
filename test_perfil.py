import sys
import os
import urllib.parse
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.models import Usuario
from app.schemas import UsuarioAdminResponse

engine = create_engine(settings.DATABASE_URL.replace("192.168.100.5", "localhost"))
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

try:
    user = db.query(Usuario).filter(Usuario.email == "reseller@starlink.com").first()
    print("User found:", user)
    if user:
        # Pydantic validation test
        response = UsuarioAdminResponse.model_validate(user)
        print("Response:", response.model_dump())
except Exception as e:
    import traceback
    traceback.print_exc()
