import re

with open('frontend/src/App.tsx', 'r') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if '<Route path="/cliente' in line and 'requiredRole="RESELLER"' in line:
        line = line.replace('requiredRole="RESELLER"', 'requiredRole="CLIENTE"')
    elif '<Route path="/reseller' in line and 'requiredRole="CLIENTE"' in line:
        line = line.replace('requiredRole="CLIENTE"', 'requiredRole="RESELLER"')
    new_lines.append(line)

with open('frontend/src/App.tsx', 'w') as f:
    f.writelines(new_lines)
