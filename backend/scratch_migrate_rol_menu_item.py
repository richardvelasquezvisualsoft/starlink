import os
import sys
from sqlalchemy.orm import Session
from sqlalchemy import text, select

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.core.database import SessionLocal, engine
from app.models import RolMenuItem, RolMenu, MenuItem

def run_migration():
    db = SessionLocal()
    try:
        # 1. Create table
        create_table_sql = """
        CREATE TABLE IF NOT EXISTS rol_menu_item (
            id SERIAL PRIMARY KEY,
            rol_id INTEGER NOT NULL REFERENCES roles_portal(id),
            menu_item_id INTEGER NOT NULL REFERENCES menu_items(id),
            activo BOOLEAN NOT NULL DEFAULT TRUE,
            CONSTRAINT uq_rol_menu_item UNIQUE (rol_id, menu_item_id)
        );
        """
        db.execute(text(create_table_sql))
        db.commit()
        print("Table rol_menu_item created.")

        # 2. Seed data based on existing rol_menu
        # For each active RolMenu, give access to all its module's items
        active_rol_menus = db.execute(select(RolMenu).where(RolMenu.activo == True)).scalars().all()
        
        for rm in active_rol_menus:
            items = db.execute(select(MenuItem).where(MenuItem.modulo_id == rm.modulo_id, MenuItem.activo == True)).scalars().all()
            for item in items:
                # Check if it exists
                existing = db.execute(select(RolMenuItem).where(RolMenuItem.rol_id == rm.rol_id, RolMenuItem.menu_item_id == item.id)).scalars().first()
                if not existing:
                    new_rmi = RolMenuItem(rol_id=rm.rol_id, menu_item_id=item.id, activo=True)
                    db.add(new_rmi)
        
        db.commit()
        print("Migration and seeding complete.")

    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
