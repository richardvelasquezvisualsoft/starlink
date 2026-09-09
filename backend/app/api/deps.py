from fastapi import Header, HTTPException, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db

def get_tenant_context(
    x_demo_role: str = Header("CLIENTE", alias="X-Demo-Role"),
    x_demo_tenant_id: str = Header(None, alias="X-Demo-Tenant-Id"),
    db: Session = Depends(get_db)
):
    """
    Dependency to extract tenant context for demo purposes.
    In production, this would be derived entirely from the JWT token and RBAC tables (tenant_usuarios).
    """
    if x_demo_role not in ["RESELLER", "CLIENTE"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    tenant_id = None
    if x_demo_tenant_id:
        try:
            tenant_id = int(x_demo_tenant_id)
        except ValueError:
            pass # Or handle error
            
    if x_demo_role == "CLIENTE" and not tenant_id:
        # Default fallback to tenant 1 for Demo Client if not provided
        tenant_id = 1
        
    return {
        "rol": x_demo_role,
        "role": x_demo_role,
        "tenant_id": tenant_id
    }
