import sys

with open('/home/administrador/Programas/starlink/web/backend/app/api/endpoints/operation.py', 'r') as f:
    lines = f.readlines()

new_lines = []
in_devices = False
for line in lines:
    if "from app.models import Dispositivo, CatalogoOperacionRemota, ComandoRemotoLog, Cuenta, LineaServicio, t_vw_dispositivo_estructura_actual" in line:
        new_lines.append("from app.models import Dispositivo, CatalogoOperacionRemota, ComandoRemotoLog, Cuenta, LineaServicio, t_vw_dispositivo_estructura_actual, DispositivoGeozonaEstadoActual, Geozona\n")
        continue

    if "def get_operation_devices(" in line:
        in_devices = True
    
    if in_devices and "db.query(" in line and "Dispositivo," in line:
        # replace query definition
        new_lines.append("        db.query(\n")
        new_lines.append("            Dispositivo, \n")
        new_lines.append("            LineaServicio.numero_linea,\n")
        new_lines.append("            t_vw_dispositivo_estructura_actual.c.unidad_nivel1_nombre,\n")
        new_lines.append("            t_vw_dispositivo_estructura_actual.c.unidad_nivel2_nombre,\n")
        new_lines.append("            t_vw_dispositivo_estructura_actual.c.unidad_nivel3_nombre,\n")
        new_lines.append("            t_vw_dispositivo_estructura_actual.c.centro_costo_nombre,\n")
        new_lines.append("            Geozona\n")
        new_lines.append("        )\n")
        new_lines.append("        .outerjoin(LineaServicio, LineaServicio.dispositivo_id == Dispositivo.id)\n")
        new_lines.append("        .outerjoin(Cuenta, Cuenta.id == LineaServicio.cuenta_id)\n")
        new_lines.append("        .outerjoin(t_vw_dispositivo_estructura_actual, t_vw_dispositivo_estructura_actual.c.dispositivo_id == Dispositivo.id)\n")
        new_lines.append("        .outerjoin(DispositivoGeozonaEstadoActual, DispositivoGeozonaEstadoActual.dispositivo_id == Dispositivo.id)\n")
        new_lines.append("        .outerjoin(Geozona, Geozona.id == DispositivoGeozonaEstadoActual.geozona_id)\n")
        # skip lines until query.filter
        in_devices = "skip_query"
        continue

    if in_devices == "skip_query":
        if "if tenant_id:" in line:
            in_devices = "out"
            new_lines.append(line)
        continue
    
    if in_devices == "out" and "for row in results:" in line:
        new_lines.append(line)
        in_devices = "loop"
        continue
        
    if in_devices == "loop" and "cc = row[5]" in line:
        new_lines.append(line)
        new_lines.append("        geozona = row[6]\n")
        continue
        
    if in_devices == "loop" and "out.append({" in line:
        new_lines.append(line)
        in_devices = "append"
        continue
        
    if in_devices == "append" and "})" in line:
        new_lines.append("            \"geocerca\": {\n")
        new_lines.append("                \"id\": geozona.id,\n")
        new_lines.append("                \"nombre\": geozona.nombre,\n")
        new_lines.append("                \"tipo_geozona\": geozona.tipo_geozona,\n")
        new_lines.append("                \"tolerancia_borde_metros\": float(geozona.tolerancia_borde_metros) if geozona.tolerancia_borde_metros else 0,\n")
        new_lines.append("                \"centro_latitud\": float(geozona.centro_latitud) if geozona.centro_latitud else None,\n")
        new_lines.append("                \"centro_longitud\": float(geozona.centro_longitud) if geozona.centro_longitud else None,\n")
        new_lines.append("                \"radio_metros\": float(geozona.radio_metros) if geozona.radio_metros else None,\n")
        new_lines.append("                \"geometria_geojson\": geozona.geometria_geojson,\n")
        new_lines.append("                \"pais\": geozona.pais,\n")
        new_lines.append("                \"departamento\": geozona.departamento,\n")
        new_lines.append("                \"provincia\": geozona.provincia,\n")
        new_lines.append("                \"direccion\": geozona.direccion\n")
        new_lines.append("            } if geozona else None\n")
        new_lines.append("        })\n")
        in_devices = False
        continue

    new_lines.append(line)

with open('/home/administrador/Programas/starlink/web/backend/app/api/endpoints/operation.py', 'w') as f:
    f.writelines(new_lines)
