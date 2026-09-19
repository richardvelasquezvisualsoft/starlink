import csv
import json
import sys

target_tables = {
    'telemetria_terminal_rt', 'telemetria_router_rt',
    'estado_terminal_actual', 'estado_router_actual',
    'telemetria_terminal_15m', 'telemetria_router_15m',
    'telemetria_terminal_resumen_hora', 'telemetria_router_resumen_hora'
}

csv.field_size_limit(sys.maxsize)

try:
    with open('documentos/esquema_total_starlink.csv', 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        next(reader)
        for row in reader:
            if not row: continue
            data = json.loads(row[0])
            with open('/home/administrador/.gemini/antigravity-ide/brain/99cd2df0-797c-43a5-a51a-38bd8b8cb13e/scratch/schema_dump.txt', 'w') as out:
                for t in data.get('tables', []):
                    t_name = t.get('table_name')
                    if t_name in target_tables:
                        cols = t.get('columns', [])
                        out.write(f"\nTable: {t_name}\n")
                        for c in cols:
                            out.write(f"  - {c.get('name')} ({c.get('type')})\n")
except Exception as e:
    print(e)
