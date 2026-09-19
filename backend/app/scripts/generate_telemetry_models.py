import re

schema_path = "/home/administrador/.gemini/antigravity-ide/brain/99cd2df0-797c-43a5-a51a-38bd8b8cb13e/scratch/schema_dump.txt"

type_mapping = {
    'bigint': 'BigInteger',
    'integer': 'Integer',
    'smallint': 'Integer',
    'numeric': 'Numeric',
    'boolean': 'Boolean',
    'timestamp without time zone': 'DateTime',
    'character varying': 'String',
    'character': 'String',
    'jsonb': 'JSONB',
    'ARRAY': 'ARRAY(String)' # simplistic mapping
}

with open(schema_path, 'r') as f:
    lines = f.readlines()

current_table = None
models_code = []

models_code.append("from sqlalchemy import Column, Integer, BigInteger, String, Boolean, DateTime, Numeric, JSON, text")
models_code.append("from sqlalchemy.dialects.postgresql import JSONB, ARRAY")
models_code.append("from app.core.database import Base\n")

for line in lines:
    line = line.strip()
    if line.startswith("Table:"):
        current_table = line.split(":")[1].strip()
        class_name = ''.join(word.capitalize() for word in current_table.split('_'))
        models_code.append(f"class {class_name}(Base):")
        models_code.append(f"    __tablename__ = '{current_table}'")
    elif line.startswith("-"):
        parts = line.split(" (")
        col_name = parts[0][1:].strip()
        col_type = parts[1][:-1].strip()
        
        sa_type = type_mapping.get(col_type, 'String')
        
        # Primary keys: usually 'id', but some might not have 'id'
        if col_name == 'id':
            models_code.append(f"    {col_name} = Column({sa_type}, primary_key=True)")
        else:
            models_code.append(f"    {col_name} = Column({sa_type})")
            
    elif line == "":
        models_code.append("")

with open("backend/app/models_telemetry.py", "w") as f:
    f.write("\n".join(models_code))
