from app.core.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()
try:
    db.execute(text("ALTER TABLE usuarios ADD COLUMN activo BOOLEAN DEFAULT true NOT NULL;"))
    db.execute(text("ALTER TABLE usuarios ADD COLUMN acceso_todos_tenants BOOLEAN DEFAULT false NOT NULL;"))
    db.execute(text("ALTER TABLE usuarios ADD COLUMN intentos_fallidos INTEGER DEFAULT 0 NOT NULL;"))
    db.execute(text("ALTER TABLE usuarios ADD COLUMN ultimo_intento_fallido_en TIMESTAMP;"))
    db.execute(text("ALTER TABLE usuarios ADD COLUMN bloqueado_hasta TIMESTAMP;"))
    db.execute(text("ALTER TABLE usuarios ADD COLUMN bloqueado_manual BOOLEAN DEFAULT false NOT NULL;"))
    db.execute(text("ALTER TABLE usuarios ADD COLUMN motivo_bloqueo VARCHAR(200);"))
    db.execute(text("ALTER TABLE usuarios ADD COLUMN debe_cambiar_password BOOLEAN DEFAULT false NOT NULL;"))
    db.commit()
    print("Database altered successfully!")
except Exception as e:
    print("Error:", e)
    db.rollback()
