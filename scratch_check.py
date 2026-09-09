import json

with open('documentos/esquema_total_starlink.csv', 'r') as f:
    lines = f.readlines()
json_str = "".join(lines[1:]).strip()
if json_str.startswith('"') and json_str.endswith('"'):
    json_str = json_str[1:-1]
json_str = json_str.replace('""', '"')
data = json.loads(json_str)

for table in data.get('tables', []):
    if table.get('table_name') == 'aprovisionamientos_cliente':
        print(list(table.keys()))
        if 'columns' in table:
            print(list(table['columns'][0].keys()))
