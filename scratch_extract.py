import json

with open('documentos/esquema_total_starlink.csv', 'r') as f:
    lines = f.readlines()

# The first line is "jsonb_pretty", the rest is a JSON string but double quoted
json_str = "".join(lines[1:])
# Remove the first and last double quote
json_str = json_str.strip()
if json_str.startswith('"') and json_str.endswith('"'):
    json_str = json_str[1:-1]
# Replace "" with "
json_str = json_str.replace('""', '"')

data = json.loads(json_str)

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

tables_to_extract = [
    "linea_estado_historial",
    "contratos_cliente",
    "contrato_lineas",
    "aprovisionamientos_cliente",
    "aprovisionamiento_pasos"
]

out_lines = []

for table in data.get('tables', []):
    if table['table_name'] in tables_to_extract:
        # We need the columns and constraints to build CREATE TABLE, but maybe definition is easier?
        # Actually the JSON doesn't have a simple CREATE TABLE string for tables usually, let's check
        pass

for view in data.get('views', []):
    if view['view_name'] in views_to_extract:
        out_lines.append(f"CREATE OR REPLACE VIEW {view['view_name']} AS\n{view['definition']};")

with open('documentos/13_VISTAS_RESELLER.sql', 'w') as f:
    f.write("\n\n".join(out_lines))

print(f"Extracted {len(out_lines)} views.")
