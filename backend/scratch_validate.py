import sys
from app.core.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()
try:
    info = db.execute(text("SELECT current_database(), current_user, current_schema(), current_setting('search_path');")).fetchone()
    print(f"DATABASE: {info[0]}")
    print(f"USER: {info[1]}")
    print(f"SCHEMA: {info[2]}")
    print(f"SEARCH_PATH: {info[3]}")
    print()
    
    tables = [
        'public.tipos_solicitud_cliente',
        'public.solicitudes_sla_politicas',
        'public.solicitudes_sla_dias_no_laborables',
        'public.solicitudes_cliente',
        'public.solicitud_cliente_historial',
        'public.solicitud_cliente_documentos',
        'public.solicitud_cliente_comentarios',
        'public.solicitud_cliente_sla_pausas',
        'public.vw_solicitudes_sla_estado'
    ]
    
    for t in tables:
        res = db.execute(text(f"SELECT to_regclass('{t}');")).fetchone()
        print(f"to_regclass {t}: {res[0] if res else None}")
        
    print()
    
    count_sol = db.execute(text("SELECT COUNT(*) FROM solicitudes_cliente;")).fetchone()[0]
    print(f"COUNT solicitudes: {count_sol}")
    
    count_vw = db.execute(text("SELECT COUNT(*) FROM vw_solicitudes_sla_estado;")).fetchone()[0]
    print(f"COUNT vista_sla: {count_vw}")

except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
finally:
    db.close()
