import re

with open("backend/app/api/endpoints/reseller_dashboard.py", "r") as f:
    content = f.read()

def get_quality_trend_replacement():
    return """
@router.get("/quality-trend")
def get_quality_trend(
    window: Optional[str] = Query(None),
    rango_tiempo: Optional[str] = Query(None),
    db: Session = Depends(get_db), 
    tenant_ctx: dict = Depends(get_tenant_context)
):
    ensure_reseller(tenant_ctx)
    tenant_id = tenant_ctx.get("tenant_id")
    r = (rango_tiempo or window or "12m").lower()
    window_parsed = parse_window(r)
    start_utc, end_utc = get_time_bounds_utc(window_parsed)

    from sqlalchemy import cast, String, Date
    from app.services.telemetry import parse_window, get_time_bounds_utc, query_terminal_telemetry
    
    stmt = query_terminal_telemetry(db, tenant_id, window_parsed)
    
    if window_parsed in ["6m", "12m"]:
        # Modo 1 - Histórico mensual (agrupado por mes)
        from app.models_telemetry import TelemetriaTerminalResumenHora
        # We need to group by month. Since fecha_hora is timestamp, we truncate to month
        grouped_stmt = db.query(
            func.date_trunc('month', TelemetriaTerminalResumenHora.fecha_hora).label('mes'),
            func.avg(TelemetriaTerminalResumenHora.downlink_mbps_avg).label('dl'),
            func.avg(TelemetriaTerminalResumenHora.uplink_mbps_avg).label('ul'),
            func.avg(TelemetriaTerminalResumenHora.ping_latency_ms_avg).label('lat'),
            func.avg(TelemetriaTerminalResumenHora.ping_drop_rate_avg).label('drop'),
            func.avg(TelemetriaTerminalResumenHora.signal_quality_avg).label('sig')
        ).filter(
            TelemetriaTerminalResumenHora.tenant_id == tenant_id,
            TelemetriaTerminalResumenHora.fecha_hora >= start_utc
        ).group_by(func.date_trunc('month', TelemetriaTerminalResumenHora.fecha_hora)).order_by('mes')
        
        rows = grouped_stmt.all()
        trend = []
        for row in rows:
            if not row.mes: continue
            mes_str = row.mes.strftime("%Y%m")
            trend.append({
                "periodo": mes_str,
                "disponibilidad_ponderada_pct": float(100 - (row.drop or 0)),
                "latencia_ponderada_ms": float(row.lat) if row.lat else 0,
                "packet_loss_ponderado_pct": float(row.drop) if row.drop else 0,
                "calidad_global_score": float(row.sig) if row.sig else 0
            })
        return trend
    else:
        # Modo 2 - Reciente
        # We execute the query directly and return points similar to get_telemetry_trend
        rows = db.execute(stmt).scalars().all()
        trend = []
        for row in rows:
            timestamp = getattr(row, 'fecha_hora_lectura', getattr(row, 'periodo_inicio', getattr(row, 'fecha_hora', None)))
            dl = getattr(row, 'downlink_mbps', getattr(row, 'downlink_mbps_avg', 0))
            ul = getattr(row, 'uplink_mbps', getattr(row, 'uplink_mbps_avg', 0))
            lat = getattr(row, 'ping_latency_ms_avg', getattr(row, 'ping_latency_ms_avg', 0))
            drop = getattr(row, 'ping_drop_rate_avg', getattr(row, 'ping_drop_rate_avg', 0))
            sig = getattr(row, 'signal_quality', getattr(row, 'signal_quality_avg', 0))
            
            trend.append({
                "timestamp": timestamp.isoformat() if timestamp else "",
                "disponibilidad_ponderada_pct": 100 - float(drop) if drop is not None else None,
                "latencia_ponderada_ms": float(lat) if lat is not None else None,
                "packet_loss_ponderado_pct": float(drop) if drop is not None else None,
                "calidad_global_score": float(sig) if sig is not None else None
            })
        return trend
"""

start_marker = '@router.get("/quality-trend")'
end_marker = '@router.get("/billing-trend")'
if start_marker in content and end_marker in content:
    start_idx = content.find(start_marker)
    end_idx = content.find(end_marker)
    # inject imports at top if missing
    if "from app.services.telemetry import query_terminal_telemetry" not in content:
        content = "from app.services.telemetry import query_terminal_telemetry, parse_window, get_time_bounds_utc\n" + content
    
    content = content[:start_idx] + get_quality_trend_replacement().strip('\n') + "\n\n" + content[end_idx:]
    with open("backend/app/api/endpoints/reseller_dashboard.py", "w") as f:
        f.write(content)
        
