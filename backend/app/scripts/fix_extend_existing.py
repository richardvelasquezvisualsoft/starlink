import re

with open('backend/app/models_telemetry.py', 'r') as f:
    content = f.read()

# Add __table_args__ = {'extend_existing': True} to every class
new_content = ""
for line in content.split('\n'):
    new_content += line + '\n'
    if line.strip().startswith('__tablename__ = '):
        new_content += "    __table_args__ = {'extend_existing': True}\n"

with open('backend/app/models_telemetry.py', 'w') as f:
    f.write(new_content)
