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

views_to_extract = [
    "vw_reseller_cliente_kpi_mes",
    "vw_reseller_portafolio_mes",
    "vw_reseller_portafolio_variacion",
    "vw_reseller_estado_servicios_actual",
    "vw_reseller_alertas_graves_actual",
    "vw_reseller_facturacion_mes",
    "vw_reseller_facturacion_variacion",
    "vw_reseller_top_clientes_ultimo_periodo",
    "vw_reseller_contratos_por_vencer",
    "vw_reseller_aprovisionamientos_pendientes"
]

out_sql = []
out_sql.append("BEGIN;\n")

# Tables
for table in data.get('tables', []):
    tname = table['table_name']
    if tname in tables_to_extract:
        cols = []
        for c in table.get('columns', []):
            cname = c['name']
            ctype = c['type']
            if ctype == 'USER-DEFINED':
                ctype = c.get('udt_name', ctype)
            
            cd = f"{cname} {ctype}"
            
            if c.get('length'):
                cd += f"({c['length']})"
            
            default_val = c.get('default')
            if default_val and 'nextval' in default_val:
                if 'integer' in ctype.lower() or 'int4' in ctype.lower():
                    cd = f"{cname} SERIAL"
                elif 'bigint' in ctype.lower() or 'int8' in ctype.lower():
                    cd = f"{cname} BIGSERIAL"
            else:
                if not c.get('nullable', True):
                    cd += " NOT NULL"
                if default_val:
                    if '::' in default_val:
                        default_val = default_val.split('::')[0]
                    if default_val.startswith("''") and default_val.endswith("''"):
                        default_val = "'" + default_val[2:-2] + "'"
                    cd += f" DEFAULT {default_val}"
            cols.append(cd)
        
        # We handle constraints using the specific constraints array which has foreign keys and unique
        pks = [c for c in table.get('other_constraints', []) if 'PRIMARY KEY' in c.get('definition', '')]
        if not pks:
            pks = [c for c in table.get('indexes', []) if c.get('primary_key')]
            if pks:
                pk_name = pks[0]['name']
                # Try to guess pk col from index name or just use id
                pass
        
        # To make it simple, we'll just define the columns and then execute the definition from other_constraints/foreign_keys
        out_sql.append(f"CREATE TABLE IF NOT EXISTS {tname} (\n  " + ",\n  ".join(cols) + "\n);")
        
        for c in table.get('other_constraints', []):
            if 'constraint_name' in c and 'definition' in c:
                out_sql.append(f"ALTER TABLE {tname} ADD CONSTRAINT {c['constraint_name']} {c['definition']};")
        
        for fk in table.get('foreign_keys', []):
            if 'name' in fk and 'definition' in fk:
                out_sql.append(f"ALTER TABLE {tname} ADD CONSTRAINT {fk['name']} {fk['definition']};")

# Views
for view in data.get('views', []):
    vname = view['view_name']
    if vname in views_to_extract:
        out_sql.append(f"CREATE OR REPLACE VIEW {vname} AS\n{view['definition']};")

out_sql.append("COMMIT;\n")

with open('documentos/13_VISTAS_RESELLER.sql', 'w') as f:
    f.write("\n\n".join(out_sql))

print(f"Generated SQL for {len(tables_to_extract)} tables and {len(views_to_extract)} views.")
