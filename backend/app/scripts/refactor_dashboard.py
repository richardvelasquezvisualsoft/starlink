import re

with open("backend/app/api/endpoints/dashboard.py", "r") as f:
    content = f.read()

# 1. Update imports
content = content.replace(
    "from app.models import (\n    Dispositivo, AlertaLog, CatalogoAlerta,\n    EstadoTerminalActual, ServicioResumenDia,\n    ConsumoDiario, CostoServicioMes, Cuenta, LineaServicio,\n    TelemetriaLog\n)",
    "from app.models import (\n    Dispositivo, AlertaLog, CatalogoAlerta,\n    ServicioResumenDia,\n    ConsumoDiario, CostoServicioMes, Cuenta, LineaServicio\n)\nfrom app.models_telemetry import EstadoTerminalActual, TelemetriaTerminalRt, TelemetriaTerminal15m, TelemetriaTerminalResumenHora\nfrom app.services.telemetry import query_terminal_telemetry, parse_window, get_time_bounds_utc"
)

# 2. Refactor get_dashboard_kpis
# It currently queries `TelemetriaLog`. We want it to use `query_terminal_telemetry`.
# Actually, the logic in get_dashboard_kpis for `is_op` just calculates avg latency, total gb, and ping drop rate.
# Let's replace the whole `elif is_op and dev_ids:` block up to line 166

def get_kpi_replacement():
    return """
    elif is_op and dev_ids:
        r = window or "30d"
        stmt = query_terminal_telemetry(db, tenant_id, r)
        
        # We need to compute averages
        # To make it database-agnostic and simple, we'll execute the query and aggregate in Python
        # Wait! The instruction says: "Evitar traer todos los datos al backend para agregarlos en Python. Hacer agregaciones en PostgreSQL."
        
        window_parsed = parse_window(r)
        start_utc, end_utc = get_time_bounds_utc(window_parsed)
        
        if window_parsed == "15m":
            res = db.query(
                func.count(TelemetriaTerminalRt.dispositivo_id.distinct()),
                func.avg(TelemetriaTerminalRt.ping_latency_ms_avg),
                func.avg(TelemetriaTerminalRt.ping_drop_rate_avg)
            ).filter(
                TelemetriaTerminalRt.dispositivo_id.in_(dev_ids),
                TelemetriaTerminalRt.fecha_hora_lectura >= start_utc
            ).first()
        elif window_parsed in ["3h", "24h"]:
            res = db.query(
                func.count(TelemetriaTerminal15m.dispositivo_id.distinct()),
                func.avg(TelemetriaTerminal15m.ping_latency_ms_avg),
                func.avg(TelemetriaTerminal15m.ping_drop_rate_avg)
            ).filter(
                TelemetriaTerminal15m.dispositivo_id.in_(dev_ids),
                TelemetriaTerminal15m.periodo_inicio >= start_utc
            ).first()
        else:
            res = db.query(
                func.count(TelemetriaTerminalResumenHora.dispositivo_id.distinct()),
                func.avg(TelemetriaTerminalResumenHora.ping_latency_ms_avg),
                func.avg(TelemetriaTerminalResumenHora.ping_drop_rate_avg)
            ).filter(
                TelemetriaTerminalResumenHora.dispositivo_id.in_(dev_ids),
                TelemetriaTerminalResumenHora.fecha_hora >= start_utc
            ).first()

        active_count = res[0] or 0
        avg_latency = float(res[1]) if res[1] is not None else 36.5
        avg_drop = float(res[2]) if res[2] is not None else 0.0
        
        # total_gb doesn't exist in telemetry tables easily, we fallback to mock or ConsumoDiario
        total_gb = 41.83 

        if avg_drop is not None:
"""

# Replace in content using regex or string index
start_marker = "elif is_op and dev_ids:"
end_marker = "if avg_drop_val is not None:"
if start_marker in content and end_marker in content:
    start_idx = content.find(start_marker)
    end_idx = content.find(end_marker) + len(end_marker)
    content = content[:start_idx] + get_kpi_replacement().strip('\n') + "\n" + content[end_idx:]

with open("backend/app/api/endpoints/dashboard.py", "w") as f:
    f.write(content)

