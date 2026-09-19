from fastapi import FastAPI, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.config import settings
from app.core.database import engine, Base
from app.api.endpoints import auth, dashboard, crud, operation, billing, geozonas, reseller_dashboard, usuarios, seguridad, perfil, menus, asignaciones, solicitudes
from app.scripts.seed import run_seed

# Initialize Database tables
import app.models
# Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs"
)

from fastapi.staticfiles import StaticFiles
import os

# Ensure upload storage directory exists using absolute path
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

# Serve uploaded files under /api so it gets proxied correctly
app.mount(f"{settings.API_V1_STR}/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Custom Middleware to add Security Headers
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Content-Security-Policy"] = "default-src 'self'; frame-ancestors 'none';"
        return response

app.add_middleware(SecurityHeadersMiddleware)

# CORS configuration
origins = [
    "http://localhost:3050",
    "http://127.0.0.1:3050",
    "http://localhost:3000", # Fallback for local testing
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Include Router
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(dashboard.router, prefix=f"{settings.API_V1_STR}/dashboard", tags=["dashboard"])
app.include_router(crud.router, prefix=settings.API_V1_STR, tags=["crud"])
app.include_router(operation.router, prefix=f"{settings.API_V1_STR}/operation", tags=["operation"])
app.include_router(billing.router, prefix=f"{settings.API_V1_STR}/billing", tags=["billing"])
app.include_router(geozonas.router, prefix=f"{settings.API_V1_STR}/geozonas", tags=["geozonas"])
app.include_router(reseller_dashboard.router, prefix=f"{settings.API_V1_STR}/reseller/dashboard", tags=["reseller_dashboard"])
app.include_router(reseller_dashboard.router, prefix=f"{settings.API_V1_STR}/reseller", tags=["reseller"])
app.include_router(usuarios.router, prefix=f"{settings.API_V1_STR}/usuarios", tags=["usuarios"])
app.include_router(seguridad.router, prefix=f"{settings.API_V1_STR}/seguridad", tags=["seguridad"])
app.include_router(perfil.router, prefix=f"{settings.API_V1_STR}/perfil", tags=["perfil"])
app.include_router(solicitudes.router, prefix=f"{settings.API_V1_STR}/solicitudes", tags=["solicitudes"])
app.include_router(menus.router, prefix=f"{settings.API_V1_STR}/menus", tags=["menus"])
app.include_router(asignaciones.router, prefix=f"{settings.API_V1_STR}/asignaciones", tags=["asignaciones"])

@app.on_event("startup")
def startup_event():
    # Automatically seed the database on startup if it's empty
    run_seed()

@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "StarMonitor API is running smoothly"}
