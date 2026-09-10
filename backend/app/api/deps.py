from fastapi import Header, HTTPException, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.endpoints.auth import get_current_user
from app.models import Usuario, RolesPortal, UsuarioRoles, Tenant

def get_tenant_context(
    x_demo_role: str = Header("CLIENTE", alias="X-Demo-Role"),
    x_demo_tenant_id: str = Header(None, alias="X-Demo-Tenant-Id"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Dependency to extract tenant context enforcing RBAC based on the database.
    """
    # 1. Determine actual roles from database using active DB session
    roles_query = (
        db.query(RolesPortal.codigo)
        .join(UsuarioRoles, UsuarioRoles.rol_id == RolesPortal.id)
        .filter(UsuarioRoles.usuario_id == current_user.id, UsuarioRoles.activo == True)
        .all()
    )
    user_roles = [str(r[0]).strip().upper() for r in roles_query if r and r[0]]
    
    is_reseller_or_admin = any(r in ["RESELLER", "ADMIN", "SUPERADMIN", "ADMINISTRADOR", "NOC"] for r in user_roles)
    is_client = any(r in ["CLIENTE", "CLIENT", "CUSTOMER"] for r in user_roles)

    # Check if the requested role is valid for this user
    actual_role = "CLIENTE"
    if is_reseller_or_admin and current_user.acceso_todos_tenants:
        actual_role = "RESELLER"
        # Only resellers/admins can impersonate a client role
        if x_demo_role == "CLIENTE":
            actual_role = "CLIENTE"
    elif is_client or not current_user.acceso_todos_tenants:
        actual_role = "CLIENTE"
    else:
        raise HTTPException(status_code=403, detail="No access role found")

    tenant_id = None
    if x_demo_tenant_id:
        try:
            tenant_id = int(x_demo_tenant_id)
        except ValueError:
            pass

    # Reseller has access to all tenants if flag is true
    is_global_reseller = is_reseller_or_admin and current_user.acceso_todos_tenants

    user_tenant_ids = [tu.tenant_id for tu in getattr(current_user, 'tenant_usuarios', []) if getattr(tu, 'activo', False)]

    if actual_role == "CLIENTE":
        if tenant_id is not None:
            # Enforce that the requested tenant is authorized for this user
            if not is_global_reseller and user_tenant_ids and tenant_id not in user_tenant_ids:
                raise HTTPException(status_code=403, detail="Forbidden tenant access")
        else:
            # For CLIENTE role, if no tenant is specified, pick their active tenant
            if user_tenant_ids:
                tenant_id = user_tenant_ids[0]
            else:
                first_tenant = db.query(Tenant.id).filter(Tenant.activo == True).first()
                tenant_id = first_tenant[0] if first_tenant else 1

    return {
        "rol": actual_role,
        "role": actual_role,
        "tenant_id": tenant_id,
        "user_id": current_user.id
    }
