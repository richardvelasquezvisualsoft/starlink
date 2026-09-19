import glob
import os

files = glob.glob("src/pages/cliente/*.tsx")

for file_path in files:
    with open(file_path, "r") as f:
        content = f.read()

    lines = content.split('\n')
    new_lines = []
    for line in lines:
        new_line = line
        
        # Change light colors to semantic / dark colors
        new_line = new_line.replace('text-emerald-400', 'text-client-success')
        new_line = new_line.replace('text-emerald-300', 'text-client-success')
        new_line = new_line.replace('text-amber-400', 'text-client-warning')
        new_line = new_line.replace('text-amber-300', 'text-client-warning')
        new_line = new_line.replace('text-red-400', 'text-client-danger')
        new_line = new_line.replace('text-red-300', 'text-client-danger')
        
        new_line = new_line.replace('text-cyan-300', 'text-client-info')
        new_line = new_line.replace('text-cyan-400', 'text-client-info')
        
        new_line = new_line.replace('text-purple-300', 'text-purple-700')
        new_line = new_line.replace('text-purple-400', 'text-purple-700')
        
        new_line = new_line.replace('bg-emerald-500/10', 'bg-client-success-soft')
        new_line = new_line.replace('bg-amber-500/10', 'bg-client-warning-soft')
        new_line = new_line.replace('bg-red-500/10', 'bg-client-danger-soft')
        
        new_line = new_line.replace('bg-emerald-500/20', 'bg-client-success-soft')
        new_line = new_line.replace('bg-amber-500/20', 'bg-client-warning-soft')
        new_line = new_line.replace('bg-red-500/20', 'bg-client-danger-soft')

        new_line = new_line.replace('border-emerald-500/20', 'border-client-success')
        new_line = new_line.replace('border-amber-500/20', 'border-client-warning')
        new_line = new_line.replace('border-red-500/20', 'border-client-danger')

        # To address the "texts can't be appreciated" - we will make muted text darker
        # We replace text-client-text-muted with text-client-text-secondary to make it pop more
        new_line = new_line.replace('text-client-text-muted', 'text-client-text-secondary')

        new_lines.append(new_line)

    with open(file_path, "w") as f:
        f.write('\n'.join(new_lines))

print("Contrast fixed in all files.")
