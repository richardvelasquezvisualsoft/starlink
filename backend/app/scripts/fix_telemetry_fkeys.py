import re

with open('backend/app/models_telemetry.py', 'r') as f:
    content = f.read()

# Make sure Column and ForeignKey are imported
if 'ForeignKey' not in content:
    content = content.replace('from sqlalchemy import Column, Integer', 'from sqlalchemy import Column, Integer, ForeignKey')

# Replace dispositivo_id = Column(Integer) with Column(Integer, ForeignKey('dispositivos.id'))
content = re.sub(r'dispositivo_id = Column\(Integer(?:, primary_key=True)?\)', lambda m: "dispositivo_id = Column(Integer, ForeignKey('dispositivos.id')%s)" % (", primary_key=True" if "primary_key=True" in m.group(0) else ""), content)

# Replace router_id = Column(BigInteger) with Column(BigInteger, ForeignKey('routers.id'))
content = re.sub(r'router_id = Column\(BigInteger(?:, primary_key=True)?\)', lambda m: "router_id = Column(BigInteger, ForeignKey('routers.id')%s)" % (", primary_key=True" if "primary_key=True" in m.group(0) else ""), content)

# Replace tenant_id = Column(BigInteger) with Column(BigInteger, ForeignKey('tenants.id'))
content = re.sub(r'tenant_id = Column\(BigInteger(?:, primary_key=True)?\)', lambda m: "tenant_id = Column(BigInteger, ForeignKey('tenants.id')%s)" % (", primary_key=True" if "primary_key=True" in m.group(0) else ""), content)

# Replace linea_servicio_id = Column(Integer) with Column(Integer, ForeignKey('lineas_servicio.id'))
content = re.sub(r'linea_servicio_id = Column\(Integer(?:, primary_key=True)?\)', lambda m: "linea_servicio_id = Column(Integer, ForeignKey('lineas_servicio.id')%s)" % (", primary_key=True" if "primary_key=True" in m.group(0) else ""), content)

with open('backend/app/models_telemetry.py', 'w') as f:
    f.write(content)
