from app.core.database import SessionLocal
from app.models import RolMenu, RolMenuItem, MenuModulo, MenuItem

db = SessionLocal()
print("RolMenu for role 1:")
for rm in db.query(RolMenu).filter(RolMenu.rol_id == 1).all():
    print(f" - modulo_id: {rm.modulo_id}, activo: {rm.activo}")

print("\nRolMenuItem for role 1:")
for rmi in db.query(RolMenuItem).filter(RolMenuItem.rol_id == 1).all():
    print(f" - menu_item_id: {rmi.menu_item_id}, activo: {rmi.activo}")

db.close()
