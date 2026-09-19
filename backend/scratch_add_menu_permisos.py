import os
import sys
from sqlalchemy.orm import Session
from sqlalchemy import select

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.core.database import SessionLocal
from app.models import MenuModulo, MenuItem

def add_permisos_menu():
    db: Session = SessionLocal()
    try:
        modulo = db.execute(select(MenuModulo).where(MenuModulo.codigo == "administracion")).scalars().first()
        if not modulo:
            print("Modulo administracion not found")
            return
        
        existing = db.execute(select(MenuItem).where(MenuItem.codigo == "g-permisos")).scalars().first()
        if existing:
            print("Menu item g-permisos already exists")
            return

        new_item = MenuItem(
            modulo_id=modulo.id,
            codigo="g-permisos",
            nombre="Gestión de Permisos",
            path="/reseller/configuracion/permisos",
            icono="Settings",
            orden=3
        )
        db.add(new_item)
        db.commit()
        print("Inserted new menu item: Gestión de Permisos")
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    add_permisos_menu()
