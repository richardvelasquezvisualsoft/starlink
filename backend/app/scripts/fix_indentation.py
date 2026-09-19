with open('backend/app/api/endpoints/dashboard.py', 'r') as f:
    lines = f.readlines()

new_lines = []
for i, line in enumerate(lines):
    # From line 127 to 176 (index 126 to 175)
    if 126 <= i <= 175:
        if line.strip() != "":
            new_lines.append("    " + line)
        else:
            new_lines.append(line)
        
        # fix avg_drop_val
        if 'avg_drop_val' in line:
            new_lines[-1] = new_lines[-1].replace('avg_drop_val', 'avg_drop')
    else:
        new_lines.append(line)

with open('backend/app/api/endpoints/dashboard.py', 'w') as f:
    f.writelines(new_lines)
