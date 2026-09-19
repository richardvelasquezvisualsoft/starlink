import csv
import json
import sys

target_tables = {
    'telemetria_terminal_rt', 'telemetria_router_rt',
    'estado_terminal_actual', 'estado_router_actual',
    'telemetria_terminal_15m', 'telemetria_router_15m',
    'telemetria_terminal_resumen_hora', 'telemetria_router_resumen_hora',
    'telemetria_retencion_plan', 'telemetria_retencion_tenant',
    'vw_telemetria_retencion_tenant', 'vw_telemetria_operacion_estado',
    'vw_telemetria_pipeline_estado'
}

csv.field_size_limit(sys.maxsize)

try:
    with open('documentos/esquema_total_starlink.csv', 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        next(reader) # skip header
        for row in reader:
            if not row: continue
            json_str = row[0]
            data = json.loads(json_str)
            
            print("--- TABLES ---")
            for t in data.get('tables', []):
                t_name = t.get('table_name')
                if t_name in target_tables:
                    cols = t.get('columns', [])
                    print(f"Table: {t_name}")
                    for c in cols:
                        print(f"  - {c.get('column_name')} ({c.get('data_type')})")
            
            print("\n--- VIEWS ---")
            for v in data.get('views', []):
                v_name = v.get('view_name')
                if v_name in target_tables:
                    # Views might have definition or columns
                    print(f"View: {v_name}")
                    
except Exception as e:
    print(f"Error: {e}")
