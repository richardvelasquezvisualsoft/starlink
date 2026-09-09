import subprocess
import json

def run_sql(sql):
    cmd = ['docker', 'compose', 'exec', '-T', 'db', 'psql', '-U', 'star_user', '-d', 'starlink_db', '-A', '-t', '-c', sql]
    res = subprocess.run(cmd, capture_output=True, text=True)
    return res.stdout.strip()

tables_raw = run_sql("SELECT table_name FROM information_schema.tables WHERE table_schema='public';")
tables = [t.strip() for t in tables_raw.splitlines() if t.strip()]

print(f"Found {len(tables)} tables/views in database:")
for t in sorted(tables):
    cnt = run_sql(f"SELECT COUNT(*) FROM {t};")
    print(f"  {t}: {cnt} rows")
