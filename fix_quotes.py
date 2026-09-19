import re

with open('frontend/src/pages/Alerts.tsx', 'r') as f:
    content = f.read()

def replace_quotes(match):
    inner = match.group(1)
    # If the inner string contains ${isClientView, then it should be in backticks
    if '${isClientView' in inner:
        # replace the double quotes from the sed command inside the inner string
        inner = inner.replace('"hover:text-blue-600"', "'hover:text-blue-600'")
        inner = inner.replace('"hover:text-white"', "'hover:text-white'")
        return f'className={{`{inner}`}}'
    return match.group(0)

# match className="..." or className='...'
content = re.sub(r'className="([^"]*\$\{isClientView[^"]*)"', replace_quotes, content)
content = re.sub(r"className='([^']*\$\{isClientView[^']*)'", replace_quotes, content)

with open('frontend/src/pages/Alerts.tsx', 'w') as f:
    f.write(content)

print("Done")
