import re
with open('frontend/src/pages/Alerts.tsx', 'r') as f:
    content = f.read()

# Fix occurrences inside template literals: `${isClientView ? '...' : 'dark-class'}` -> `dark-class`
content = re.sub(r'\$\{isClientView \? [\'"][^\'"]*[\'"] : [\'"]([^\'"]*)[\'"]\}', r'\1', content)

# Fix occurrences directly in className={...}: `className={isClientView ? '...' : 'dark-class'}` -> `className="dark-class"`
content = re.sub(r'className=\{isClientView \? [\'"][^\'"]*[\'"] : [\'"]([^\'"]*)[\'"]\}', r'className="\1"', content)

with open('frontend/src/pages/Alerts.tsx', 'w') as f:
    f.write(content)
print("done")
