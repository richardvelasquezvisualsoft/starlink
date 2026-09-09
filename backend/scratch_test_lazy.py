from app.core.database import SessionLocal
from app.models import Usuario

db = SessionLocal()
try:
    usuarios = db.query(Usuario).all()
    print("Usuarios:", len(usuarios))
    for u in usuarios:
        print(f"User {u.id}:")
        try:
            print("  roles:", len(u.roles))
            print("  tenant_usuarios:", len(u.tenant_usuarios))
            print("  mfa:", u.mfa)
        except Exception as e:
            print("  ERROR on lazy load:", e)
except Exception as e:
    print("Top level error:", e)
finally:
    db.close()
