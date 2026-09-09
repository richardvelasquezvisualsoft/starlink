import sys
from sqlalchemy import create_engine, text
from app.core.security import get_password_hash

DATABASE_URL = "postgresql://star_user:v1su%40ls0ft@192.168.100.5:5432/starlink_db"

engine = create_engine(DATABASE_URL)
pwd_hash = get_password_hash('password123')

try:
    with engine.begin() as conn:
        conn.execute(text("""
            INSERT INTO usuarios (nombre, email, password_hash, activo)
            VALUES ('Reseller Demo', 'reseller@starlink.com', :hash, true)
            ON CONFLICT (email) DO UPDATE SET password_hash = :hash
        """), {"hash": pwd_hash})
    print("User reseller@starlink.com created/updated!")
except Exception as e:
    print("Error:", e)
    sys.exit(1)
