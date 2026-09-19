import re

with open('backend/app/api/endpoints/reseller_dashboard.py', 'r') as f:
    content = f.read()

# Fix get_quality_trend
def fix_quality_trend(match):
    original = match.group(0)
    # Replace the filter
    replaced = original.replace(
        ".filter(\n            TelemetriaTerminalResumenHora.tenant_id == tenant_id,\n            TelemetriaTerminalResumenHora.fecha_hora >= start_utc\n        )",
        ".filter(TelemetriaTerminalResumenHora.fecha_hora >= start_utc)"
    )
    # Add if tenant_id is not None
    replaced = replaced.replace(
        "grouped_stmt = db.query(",
        "grouped_stmt = db.query("
    )
    # Actually it's easier to just do it via regex substitution for the whole block
    return replaced

# Let's write the whole file replacement explicitly
