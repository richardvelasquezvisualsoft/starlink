import sys
from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql://star_user:v1su%40ls0ft@192.168.100.5:5432/starlink_db"

engine = create_engine(DATABASE_URL)

try:
    with engine.connect() as conn:
        result = conn.execute(text("SELECT id, email, password_hash, activo FROM usuarios WHERE email='reseller@starlink.com';"))
        row = result.fetchone()
        if row:
            print("User found:", row)
        else:
            print("User not found!")
except Exception as e:
    print("Error:", e)
    sys.exit(1)
