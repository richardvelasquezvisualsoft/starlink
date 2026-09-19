import re

with open('frontend/src/pages/Alerts.tsx', 'r') as f:
    content = f.read()

# Replace hardcoded text colors in the table cells
replacements = [
    ('className="text-[10px] text-st-muted"', 'className={`text-[10px] ${isClientView ? "text-gray-900" : "text-st-muted"}`}'),
    ('className="font-semibold text-white truncate max-w-[180px]"', 'className={`font-semibold truncate max-w-[180px] ${isClientView ? "text-black" : "text-white"}`}'),
    ('className="text-[10px] text-st-muted font-mono flex items-center gap-1"', 'className={`text-[10px] font-mono flex items-center gap-1 ${isClientView ? "text-gray-900" : "text-st-muted"}`}'),
    ('className="font-bold text-white"', 'className={`font-bold ${isClientView ? "text-black" : "text-white"}`}'),
    ('className="text-[10px] font-mono text-st-muted uppercase"', 'className={`text-[10px] font-mono uppercase ${isClientView ? "text-gray-900" : "text-st-muted"}`}'),
    ('className="py-3 px-4 text-st-muted font-mono text-[11px]"', 'className={`py-3 px-4 font-mono text-[11px] ${isClientView ? "text-black" : "text-st-muted"}`}')
]

for old, new in replacements:
    content = content.replace(old, new)

# And fix the text color in the drawer if necessary (lines 1279 onwards)
# "font-bold text-white font-mono" -> "font-bold font-mono ${isClientView ? 'text-black' : 'text-white'}"
content = content.replace('className="font-bold text-white font-mono"', 'className={`font-bold font-mono ${isClientView ? "text-black" : "text-white"}`}')
content = content.replace('className="text-st-muted text-[10px] block"', 'className={`text-[10px] block ${isClientView ? "text-gray-900" : "text-st-muted"}`}')
content = content.replace('className="text-[10px] text-st-muted text-right pt-1 font-mono"', 'className={`text-[10px] text-right pt-1 font-mono ${isClientView ? "text-gray-900" : "text-st-muted"}`}')
content = content.replace('className="text-white text-sm"', 'className={`text-sm ${isClientView ? "text-black" : "text-white"}`}')

with open('frontend/src/pages/Alerts.tsx', 'w') as f:
    f.write(content)

print("Done")
