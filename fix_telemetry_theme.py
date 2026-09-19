import re

with open('frontend/src/pages/TelemetryReport.tsx', 'r') as f:
    content = f.read()

# Add isClientView definition if not present
if 'const isClientView' not in content:
    content = content.replace(
        'export const TelemetryReport: React.FC = () => {\n  const location = useLocation();',
        'export const TelemetryReport: React.FC = () => {\n  const location = useLocation();\n  const isClientView = window.location.pathname.startsWith(\'/cliente\');'
    )

def replace_class(match):
    full_str = match.group(0)
    inner = match.group(1)
    
    # Simple replacements
    inner = inner.replace('text-white', "${isClientView ? 'text-client-text-primary' : 'text-white'}")
    inner = inner.replace('bg-st-surface', "${isClientView ? 'bg-client-bg-surface' : 'bg-st-surface'}")
    inner = inner.replace('text-st-muted', "${isClientView ? 'text-client-text-secondary' : 'text-st-muted'}")
    inner = inner.replace('border-st-border', "${isClientView ? 'border-client-border' : 'border-st-border'}")
    
    return f'className={{`{inner}`}}'

# We need to find className="..." and replace with className={`...`}
# Only for those containing the classes we want to replace
import re
content = re.sub(r'className="([^"]*(?:text-white|bg-st-surface|text-st-muted|border-st-border)[^"]*)"', replace_class, content)

with open('frontend/src/pages/TelemetryReport.tsx', 'w') as f:
    f.write(content)

print("Done")
