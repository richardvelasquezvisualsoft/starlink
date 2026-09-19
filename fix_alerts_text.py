import re

with open('frontend/src/pages/Alerts.tsx', 'r') as f:
    content = f.read()

# Replace hardcoded dark gray text colors with text-white if they are on a dark background.
# Actually, since the user says "text on dark background must be white, text on white background must be black", 
# and the app seems to toggle styles based on isClientView (dark vs light).
# Let's dynamically switch them using the isClientView variable.
# Usually, dark classes like text-gray-800 are used without ternary operators.
content = re.sub(r'\btext-gray-[789]00\b', '${isClientView ? "text-gray-900" : "text-white"}', content)
content = re.sub(r'\btext-black\b', '${isClientView ? "text-black" : "text-white"}', content)

# But wait, if they are already in quotes, we need to convert them to template literals if they aren't.
# It's safer to just change the text-gray-800 to text-white for now, assuming dark mode is default or we can look for specific class string patterns.
