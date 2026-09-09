import re

with open("backend/app/new_models.py", "r") as f:
    lines = f.readlines()

new_lines = []
skip = False
for line in lines:
    # Stop skipping when we hit a new class that doesn't match
    if skip and line.startswith("class "):
        skip = False
        
    if line.startswith("class ") and re.search(r'2026\d\d\(Base\):', line):
        skip = True
    
    if not skip:
        # replace Base declaration
        if line.startswith("Base = declarative_base()"):
            new_lines.append("from app.core.database import Base\n")
        elif line.startswith("from sqlalchemy.orm import declarative_base"):
            continue
        elif "declarative_base" in line:
            new_lines.append(line)
        else:
            new_lines.append(line)

with open("backend/app/models.py", "w") as f:
    f.writelines(new_lines)
