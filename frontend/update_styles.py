import os
import re

file_path = "src/pages/cliente/ClienteEstadoUbicacion.tsx"

with open(file_path, "r") as f:
    content = f.read()

# Substitutions
# text-white to text-client-text-primary ONLY if not in a button with dark bg
def replace_text_white(match):
    full_str = match.group(0)
    if 'bg-emerald-' in full_str or 'bg-amber-' in full_str or 'bg-red-' in full_str or 'bg-st-accent' in full_str or 'bg-client-primary' in full_str:
        return full_str
    return full_str.replace('text-white', 'text-client-text-primary')

# We can replace line by line to keep it simple, or use re.sub on the whole content
lines = content.split('\n')
new_lines = []
for line in lines:
    new_line = line
    # Replace colors
    if 'bg-emerald-' not in new_line and 'bg-amber-' not in new_line and 'bg-red-' not in new_line:
        new_line = new_line.replace('text-white', 'text-client-text-primary')
    
    new_line = new_line.replace('text-st-muted', 'text-client-text-muted')
    new_line = new_line.replace('bg-st-bg', 'bg-client-bg-subtle')
    new_line = new_line.replace('bg-st-surface', 'bg-client-bg-surface')
    new_line = new_line.replace('border-st-border', 'border-client-border')
    new_line = new_line.replace('text-st-accent', 'text-client-primary')
    
    # Replace font sizes
    new_line = new_line.replace('text-[9px]', 'text-xs')
    new_line = new_line.replace('text-[10px]', 'text-xs')
    new_line = new_line.replace('text-[11px]', 'text-sm')
    
    # We shouldn't blindly replace text-xs with text-sm, because it will replace our previous replacement.
    # We can do this safely:
    # We want text-xs -> text-sm, text-sm -> text-base
    # Only if they were originally text-xs and text-sm
    
    # But wait, there are too many edge cases. Let's just do it with regex to match whole words.
    
    new_lines.append(new_line)

with open(file_path, "w") as f:
    f.write('\n'.join(new_lines))

print("Done updating ClienteEstadoUbicacion.tsx")
