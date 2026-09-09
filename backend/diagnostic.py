import os
import json
from app.core.config import settings
from app.core.database import engine, SessionLocal
from sqlalchemy import text

def run_diagnostics():
    db = SessionLocal()
    try:
        print('=== RUNTIME BACKEND ===')
        print('Host:', settings.DB_HOST)
        print('Puerto:', settings.DB_PORT)
        print('Database:', settings.DB_NAME)
        print('Usuario:', settings.DB_USER)
        
        schema = db.execute(text('SELECT current_schema();')).fetchone()[0]
        search_path = db.execute(text("SELECT current_setting('search_path');")).fetchone()[0]
        print('Schema:', schema)
        print('Search path:', search_path)
        print('Origen de DATABASE_URL/config:', 'Env Variables (docker-compose)' if os.getenv('DB_HOST') else 'Default config.py')
        print('Docker/local: Docker (starlink_backend container)')
        
        print('\n=== VISIBILIDAD ===')
        tables = [
            'public.tipos_solicitud_cliente',
            'public.solicitudes_sla_politicas',
            'public.solicitudes_cliente',
            'public.solicitud_cliente_historial',
            'public.solicitud_cliente_documentos',
            'public.solicitud_cliente_comentarios',
            'public.solicitud_cliente_sla_pausas',
            'public.vw_solicitudes_sla_estado'
        ]
        
        for t in tables:
            tbl_name = t.split('.')[1]
            try:
                res = db.execute(text(f"SELECT to_regclass('{t}');")).fetchone()
                print(f'{tbl_name}: {res[0] is not None}')
            except Exception:
                db.rollback()
                print(f'{tbl_name}: False (Error)')
    finally:
        db.close()

if __name__ == '__main__':
    run_diagnostics()
