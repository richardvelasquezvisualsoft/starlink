from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.config import settings
from app.core.database import engine, Base
from app.api.endpoints import auth, dashboard, crud
from app.scripts.seed import run_seed

# Initialize Database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs"
)

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

# Include Routers
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(dashboard.router, prefix=f"{settings.API_V1_STR}/dashboard", tags=["dashboard"])
app.include_router(crud.router, prefix=settings.API_V1_STR, tags=["crud"])

@app.on_event("startup")
def startup_event():
    # Automatically seed the database on startup if it's empty
    run_seed()

@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "Starlink Fleet API is running smoothly"}
