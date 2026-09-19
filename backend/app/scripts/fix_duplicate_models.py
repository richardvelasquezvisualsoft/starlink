import re

with open('backend/app/models_telemetry.py', 'r') as f:
    content = f.read()

# Remove EstadoRouterActual
content = re.sub(r'class EstadoRouterActual\(Base\):.*?raw_json = Column\(JSONB\)', '', content, flags=re.DOTALL)

# Remove EstadoTerminalActual
content = re.sub(r'class EstadoTerminalActual\(Base\):.*?raw_json = Column\(JSONB\)', '', content, flags=re.DOTALL)

# Clean up empty lines
content = re.sub(r'\n\n+', '\n\n', content)

with open('backend/app/models_telemetry.py', 'w') as f:
    f.write(content.strip() + '\n')
