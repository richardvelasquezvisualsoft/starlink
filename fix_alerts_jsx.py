import re

with open('frontend/src/pages/Alerts.tsx', 'r') as f:
    content = f.read()

# The problematic pattern introduced by sed:
# className="some classes ${isClientView ? "hover:text-blue-600" : "hover:text-white"} other classes"
# We need to find className="... ${isClientView...} ..." and fix it.
# A simple way is to find exactly the inserted string and fix the surrounding quotes.

# Step 1: Replace the exact inserted string to use single quotes
bad_expr = '${isClientView ? "hover:text-blue-600" : "hover:text-white"}'
good_expr = "${isClientView ? 'hover:text-blue-600' : 'hover:text-white'}"
content = content.replace(bad_expr, good_expr)

# Step 2: Now find all className="... ${isClientView...} ..." and replace with backticks.
# Since we replaced the inner double quotes, we can use a simpler regex.
def replace_class(match):
    full = match.group(0)
    # The content inside className=" ... "
    inner = full[11:-1]
    if '${isClientView' in inner:
        return f'className={{`{inner}`}}'
    return full

# Match className="something"
content = re.sub(r'className="[^"]*"', replace_class, content)

with open('frontend/src/pages/Alerts.tsx', 'w') as f:
    f.write(content)

print("Done")
