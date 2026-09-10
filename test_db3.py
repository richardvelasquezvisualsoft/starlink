import sys
import os
import urllib.parse
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from sqlalchemy import create_engine, text
password = urllib.parse.quote_plus('v1su@ls0ft')
engine = create_engine(f'postgresql://star_user:{password}@localhost:5432/starlink_db')
with engine.connect() as conn:
    res = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'cuentas'")).fetchall()
    print("cuentas columns:", [r[0] for r in res])
