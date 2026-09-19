import glob
import os

files = glob.glob("src/pages/cliente/*.tsx")
files.remove("src/pages/cliente/ClienteEstadoUbicacion.tsx")

for file_path in files:
    with open(file_path, "r") as f:
        content = f.read()

    lines = content.split('\n')
    new_lines = []
    for line in lines:
        new_line = line
        
        if 'bg-emerald-' not in new_line and 'bg-amber-' not in new_line and 'bg-red-' not in new_line and 'bg-st-accent' not in new_line and 'bg-client-primary' not in new_line and 'bg-blue-' not in new_line:
            new_line = new_line.replace('text-white', 'text-client-text-primary')
        
        new_line = new_line.replace('text-st-muted', 'text-client-text-muted')
        new_line = new_line.replace('bg-st-bg', 'bg-client-bg-subtle')
        new_line = new_line.replace('bg-st-surface', 'bg-client-bg-surface')
        new_line = new_line.replace('border-st-border', 'border-client-border')
        new_line = new_line.replace('text-st-accent', 'text-client-primary')
        
        # Increase specific tiny font sizes
        new_line = new_line.replace('text-[10px]', 'text-xs')
        new_line = new_line.replace('text-[11px]', 'text-sm')
        
        new_lines.append(new_line)

    with open(file_path, "w") as f:
        f.write('\n'.join(new_lines))

print("Done updating all remaining files.")
