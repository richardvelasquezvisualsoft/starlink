import sys
from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql://star_user:v1su%40ls0ft@192.168.100.5:5432/starlink_db"

engine = create_engine(DATABASE_URL)

alter_statements = [
    "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS email_recuperacion VARCHAR(100);",
    "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS celular VARCHAR(50);",
    "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS sigla_corta VARCHAR(20);",
    "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS pais VARCHAR(100);",
    "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS zona_horaria VARCHAR(100);",
    "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS foto_url VARCHAR(500);"
]

try:
    with engine.begin() as conn:
        for stmt in alter_statements:
            conn.execute(text(stmt))
    print("Tables altered successfully on 192.168.100.5!")
except Exception as e:
    print("Error:", e)
    sys.exit(1)
