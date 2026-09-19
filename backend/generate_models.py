import psycopg2

conn = psycopg2.connect("dbname=starlink_db user=star_user password=v1su@ls0ft host=192.168.100.5 port=5432")
cur = conn.cursor()

tables = ['roles_portal', 'menu_modulos', 'menu_items', 'rol_menu', 'rol_menu_item']

for table in tables:
    print(f"class {table.replace('_', ' ').title().replace(' ', '')}(Base):")
    print(f"    __tablename__ = '{table}'")
    cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = %s", (table,))
    for row in cur.fetchall():
        col, typ = row
        typ_str = "String" if typ == "character varying" else "Integer" if typ == "integer" else "Boolean" if typ == "boolean" else "String"
        print(f"    {col}: Mapped[{'int' if typ == 'integer' else 'str' if typ == 'character varying' else 'bool'}] = mapped_column({typ_str}{', primary_key=True' if col == 'id' else ''})")
    print("")

