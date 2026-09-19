import csv
import json
import sys

csv.field_size_limit(sys.maxsize)

try:
    with open('documentos/esquema_total_starlink.csv', 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        next(reader)
        for row in reader:
            if not row: continue
            data = json.loads(row[0])
            for t in data.get('tables', []):
                if t.get('table_name') == 'telemetria_terminal_rt':
                    cols = t.get('columns', [])
                    if cols:
                        print(f"Column keys: {list(cols[0].keys())}")
                        print(f"Sample col: {cols[0]}")
                    break
            break
except Exception as e:
    print(e)
