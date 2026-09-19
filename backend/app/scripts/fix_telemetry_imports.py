import re

with open('backend/app/services/telemetry.py', 'r') as f:
    content = f.read()

# Replace EstadoTerminalActualRt with EstadoTerminalActual
content = content.replace("EstadoTerminalActualRt", "EstadoTerminalActual")

with open('backend/app/services/telemetry.py', 'w') as f:
    f.write(content)
