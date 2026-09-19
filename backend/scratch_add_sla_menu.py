from app.core.database import SessionLocal
from app.models import MenuModulo, MenuItem, RolesPortal, RolMenu
from sqlalchemy import select

db = SessionLocal()
modulo = db.execute(select(MenuModulo).where(MenuModulo.codigo == "configuracion")).scalars().first()
if modulo:
    existing = db.execute(select(MenuItem).where(MenuItem.codigo == "g-config-sla")).scalars().first()
    if not existing:
        item = MenuItem(
            modulo_id=modulo.id,
            codigo="g-config-sla",
            nombre="Configuración SLA",
            path="/reseller/configuracion/sla",
            icono="Settings",
            orden=1
        )
        db.add(item)
        
        # update the order of c-configuracion-global
        global_item = db.execute(select(MenuItem).where(MenuItem.codigo == "c-configuracion-global")).scalars().first()
        if global_item:
            global_item.orden = 2

        # also ensure that the reseller role has access to the "configuracion" module
        rol_reseller = db.execute(select(RolesPortal).where(RolesPortal.codigo == "RESELLER")).scalars().first()
        if rol_reseller:
            rol_menu = db.execute(select(RolMenu).where(RolMenu.rol_id == rol_reseller.id, RolMenu.modulo_id == modulo.id)).scalars().first()
            if not rol_menu:
                db.add(RolMenu(rol_id=rol_reseller.id, modulo_id=modulo.id))

        db.commit()
        print("Menu item Configuración SLA added.")
    else:
        print("Menu item already exists.")
else:
    print("Modulo configuracion not found.")
db.close()
