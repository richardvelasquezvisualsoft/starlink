from fastapi import APIRouter, Depends, Body
from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import List, Dict, Any
from pydantic import BaseModel

from app.core.database import get_db
from app.api.endpoints.auth import get_current_user
from app.api.deps import get_tenant_context
from app.models import Usuario, RolMenu, MenuModulo, RolesPortal, MenuItem, RolMenuItem

router = APIRouter()

class RolMenuUpdate(BaseModel):
    modulos: List[int]
    items: List[int]

@router.get("/me")
def get_my_menus(db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    role_ids = [ur.rol_id for ur in current_user.roles if ur.activo]
    
    if not role_ids:
        return []

    # Get active modules
    stmt = (
        select(MenuModulo)
        .join(RolMenu)
        .where(
            RolMenu.rol_id.in_(role_ids),
            RolMenu.activo == True,
            MenuModulo.activo == True
        )
        .order_by(MenuModulo.orden)
        .distinct()
    )
    modulos = db.execute(stmt).scalars().all()

    # Get active items
    active_items_stmt = (
        select(RolMenuItem.menu_item_id)
        .where(
            RolMenuItem.rol_id.in_(role_ids),
            RolMenuItem.activo == True
        )
        .distinct()
    )
    active_item_ids = set(db.execute(active_items_stmt).scalars().all())
    
    result = []
    for mod in modulos:
        items_data = []
        for item in sorted(mod.items, key=lambda x: x.orden):
            if item.activo and item.id in active_item_ids:
                items_data.append({
                    "id": item.codigo,
                    "name": item.nombre,
                    "path": item.path,
                    "icon": item.icono
                })
                
        result.append({
            "title": mod.titulo,
            "icon": mod.icono,
            "items": items_data
        })
        
    return result

@router.get("/roles")
def get_roles(db: Session = Depends(get_db), tenant_ctx: dict = Depends(get_tenant_context)):
    roles = db.execute(select(RolesPortal).where(RolesPortal.activo == True)).scalars().all()
    return [{"id": r.id, "codigo": r.codigo, "descripcion": r.descripcion} for r in roles]

@router.get("/modulos")
def get_all_modulos(db: Session = Depends(get_db), tenant_ctx: dict = Depends(get_tenant_context)):
    modulos = db.execute(select(MenuModulo).where(MenuModulo.activo == True).order_by(MenuModulo.orden)).scalars().all()
    result = []
    for mod in modulos:
        items_data = []
        for item in sorted(mod.items, key=lambda x: x.orden):
            if item.activo:
                items_data.append({
                    "id": item.id,
                    "codigo": item.codigo,
                    "nombre": item.nombre,
                    "path": item.path
                })
        result.append({
            "id": mod.id,
            "codigo": mod.codigo,
            "titulo": mod.titulo,
            "items": items_data
        })
    return result

@router.get("/roles/{rol_id}/modulos")
def get_rol_modulos(rol_id: int, db: Session = Depends(get_db), tenant_ctx: dict = Depends(get_tenant_context)):
    rol_menus = db.execute(select(RolMenu).where(RolMenu.rol_id == rol_id, RolMenu.activo == True)).scalars().all()
    rol_menu_items = db.execute(select(RolMenuItem).where(RolMenuItem.rol_id == rol_id, RolMenuItem.activo == True)).scalars().all()
    
    return {
        "modulos": [rm.modulo_id for rm in rol_menus],
        "items": [rmi.menu_item_id for rmi in rol_menu_items]
    }

@router.post("/roles/{rol_id}/modulos")
def update_rol_modulos(rol_id: int, payload: RolMenuUpdate, db: Session = Depends(get_db), tenant_ctx: dict = Depends(get_tenant_context)):
    # Modulos
    db.query(RolMenu).filter(RolMenu.rol_id == rol_id).update({"activo": False})
    for mod_id in payload.modulos:
        rm = db.execute(select(RolMenu).where(RolMenu.rol_id == rol_id, RolMenu.modulo_id == mod_id)).scalars().first()
        if rm:
            rm.activo = True
        else:
            new_rm = RolMenu(rol_id=rol_id, modulo_id=mod_id, activo=True)
            db.add(new_rm)

    # Items
    db.query(RolMenuItem).filter(RolMenuItem.rol_id == rol_id).update({"activo": False})
    for item_id in payload.items:
        rmi = db.execute(select(RolMenuItem).where(RolMenuItem.rol_id == rol_id, RolMenuItem.menu_item_id == item_id)).scalars().first()
        if rmi:
            rmi.activo = True
        else:
            new_rmi = RolMenuItem(rol_id=rol_id, menu_item_id=item_id, activo=True)
            db.add(new_rmi)
    
    db.commit()
    return {"message": "Permisos actualizados correctamente"}
