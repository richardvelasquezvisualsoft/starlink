import os
import sys
from sqlalchemy.orm import Session
from sqlalchemy import select

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.core.database import SessionLocal
from app.models import MenuModulo, RolesPortal, RolMenu

def check_menus():
    db = SessionLocal()
    roles = db.execute(select(RolesPortal).where(RolesPortal.codigo.in_(["RESELLER", "CLIENTE"]))).scalars().all()
    modulos = db.execute(select(MenuModulo)).scalars().all()
    
    print(f"Total modules: {len(modulos)}")
    
    for rol in roles:
        menus = db.execute(select(RolMenu).where(RolMenu.rol_id == rol.id)).scalars().all()
        print(f"Role {rol.codigo} has {len(menus)} menus assigned.")

    db.close()

if __name__ == "__main__":
    check_menus()
