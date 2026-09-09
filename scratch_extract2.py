import json

with open('documentos/esquema_total_starlink.csv', 'r') as f:
    lines = f.readlines()
json_str = "".join(lines[1:]).strip()
if json_str.startswith('"') and json_str.endswith('"'):
    json_str = json_str[1:-1]
json_str = json_str.replace('""', '"')
data = json.loads(json_str)

tables_to_extract = [
    "linea_estado_historial",
    "contratos_cliente",
    "contrato_lineas",
    "aprovisionamientos_cliente",
    "aprovisionamiento_pasos"
]

out = []
for table in data.get('tables', []):
    if table['table_name'] in tables_to_extract:
        # Build CREATE TABLE
        cols = []
        for c in table.get('columns', []):
            col_def = f"{c['column_name']} {c['data_type']}"
            if c.get('character_maximum_length'):
                col_def += f"({c['character_maximum_length']})"
            if c.get('is_nullable') == 'NO':
                col_def += " NOT NULL"
            if c.get('column_default'):
                col_def += f" DEFAULT {c['column_default']}"
            cols.append(col_def)
        out.append(f"CREATE TABLE IF NOT EXISTS {table['table_name']} (\n  " + ",\n  ".join(cols) + "\n);")

        for idx in table.get('indexes', []):
            out.append(idx['index_def'] + ";")
        
        # We can also add foreign keys if available, but for now this gives us the schema
        for c in table.get('constraints', []):
            if c['constraint_type'] == 'PRIMARY KEY' or c['constraint_type'] == 'FOREIGN KEY' or c['constraint_type'] == 'UNIQUE':
                if 'constraint_def' in c:
                    out.append(f"ALTER TABLE {table['table_name']} ADD CONSTRAINT {c['constraint_name']} {c['constraint_def']};")

with open('documentos/13_TABLES_RESELLER.sql', 'w') as f:
    f.write("\n\n".join(out))
print("Extracted tables.")
