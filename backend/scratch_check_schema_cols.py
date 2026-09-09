from app.core.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    cnt_tt = conn.execute(text("SELECT count(*) FROM telemetria_terminal_202609")).fetchone()
    print("telemetria_terminal_202609 count:", cnt_tt)

    sample_tt = conn.execute(text("SELECT id, dispositivo_id, fecha_registro_bd FROM telemetria_terminal_202609 LIMIT 5")).fetchall()
    print("sample_tt:", sample_tt)

    sample_eta = conn.execute(text("SELECT id, dispositivo_id, conectado, fecha_telemetria FROM estado_terminal_actual LIMIT 5")).fetchall()
    print("sample_eta:", sample_eta)
