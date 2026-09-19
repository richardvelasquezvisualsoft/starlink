import re

with open('backend/app/models_telemetry.py', 'r') as f:
    content = f.read()

# Remove TelemetriaTerminalResumenHora
content = re.sub(r'class TelemetriaTerminalResumenHora\(Base\):.*?fecha_calculo = Column\(DateTime\)', '', content, flags=re.DOTALL)

# Remove TelemetriaRouterResumenHora
content = re.sub(r'class TelemetriaRouterResumenHora\(Base\):.*?fecha_calculo = Column\(DateTime\)', '', content, flags=re.DOTALL)

# Clean up empty lines
content = re.sub(r'\n\n+', '\n\n', content)

with open('backend/app/models_telemetry.py', 'w') as f:
    f.write(content.strip() + '\n')
