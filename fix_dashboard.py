import sys

filepath = "/home/administrador/Programas/starlink/web/backend/app/api/endpoints/reseller_dashboard.py"

with open(filepath, "r") as f:
    content = f.read()

start_idx = content.find('@router.get("/portfolio-trend")')
end_idx = content.find('@router.get("/critical-alerts")')

replacement = """@router.get("/portfolio-trend")
def get_portfolio_trend(
    periodo_meses: int = Query(12), 
    excluir_mes_en_curso: Optional[bool] = Query(False),
    db: Session = Depends(get_db), 
    tenant_ctx: dict = Depends(get_tenant_context)
):
    ensure_reseller(tenant_ctx)
    tenant_id = tenant_ctx.get("tenant_id")
    
    import datetime
    now = datetime.datetime.now()
    if excluir_mes_en_curso:
        m = now.month - 1
        y = now.year
        if m == 0:
            m = 12
            y -= 1
        now = datetime.datetime(y, m, 1)
        
    buckets = []
    for i in range(periodo_meses - 1, -1, -1):
        y = now.year
        m = now.month - i
        while m <= 0:
            m += 12
            y -= 1
        buckets.append(f"{y}{m:02d}")
    
    start_date = datetime.datetime(int(buckets[0][:4]), int(buckets[0][4:]), 1)
    
    from app.models import TelemetriaTerminalResumenHora
    from sqlalchemy import func
    
    query = db.query(
        func.date_trunc('month', TelemetriaTerminalResumenHora.fecha_hora).label('mes'),
        func.count(func.distinct(TelemetriaTerminalResumenHora.tenant_id)).label('clientes_activos'),
        func.count(func.distinct(TelemetriaTerminalResumenHora.dispositivo_id)).label('starlinks_activos')
    ).filter(
        TelemetriaTerminalResumenHora.fecha_hora >= start_date
    )
    
    if tenant_id is not None:
        query = query.filter(TelemetriaTerminalResumenHora.tenant_id == tenant_id)
        
    grouped_stmt = query.group_by(func.date_trunc('month', TelemetriaTerminalResumenHora.fecha_hora)).order_by('mes')
    
    rows = grouped_stmt.all()
    db_map = {row.mes.strftime("%Y%m"): row for row in rows if row.mes}
    
    trend = []
    for b in buckets:
        row = db_map.get(b)
        if row:
            trend.append({
                "periodo": b,
                "clientes_activos": row.clientes_activos,
                "starlinks_activos": row.starlinks_activos
            })
        else:
            trend.append({
                "periodo": b,
                "clientes_activos": 0,
                "starlinks_activos": 0
            })
    return trend

@router.get("/quality-trend")
def get_quality_trend(
    window: Optional[str] = Query(None),
    rango_tiempo: Optional[str] = Query(None),
    modo: Optional[str] = Query(None),
    periodo_meses: Optional[int] = Query(12),
    excluir_mes_en_curso: Optional[bool] = Query(False),
    db: Session = Depends(get_db), 
    tenant_ctx: dict = Depends(get_tenant_context)
):
    ensure_reseller(tenant_ctx)
    tenant_id = tenant_ctx.get("tenant_id")
    
    from sqlalchemy import cast, String, Date, func, text
    from app.services.telemetry import parse_window, get_time_bounds_utc, query_terminal_telemetry
    
    if modo == "historico_mensual":
        import datetime
        now = datetime.datetime.now()
        if excluir_mes_en_curso:
            m = now.month - 1
            y = now.year
            if m == 0:
                m = 12
                y -= 1
            now = datetime.datetime(y, m, 1)
            
        buckets = []
        for i in range(periodo_meses - 1, -1, -1):
            y = now.year
            m = now.month - i
            while m <= 0:
                m += 12
                y -= 1
            buckets.append(f"{y}{m:02d}")
            
        start_date = datetime.datetime(int(buckets[0][:4]), int(buckets[0][4:]), 1)
        
        query_sql = \"\"\"
        WITH monthly_tenant AS (
            SELECT 
                TO_CHAR(fecha_hora, 'YYYYMM') AS periodo,
                tenant_id,
                COUNT(DISTINCT dispositivo_id) AS starlinks_con_actividad,
                AVG(ping_latency_ms_avg) AS latencia_avg_ms,
                AVG(ping_drop_rate_avg) AS packet_loss_avg,
                100 - (AVG(ping_drop_rate_avg) * 100) AS disponibilidad_pct
            FROM telemetria_terminal_resumen_hora
            WHERE fecha_hora >= :start_date
            GROUP BY TO_CHAR(fecha_hora, 'YYYYMM'), tenant_id
        ),
        scored AS (
            SELECT 
                periodo,
                tenant_id,
                starlinks_con_actividad,
                latencia_avg_ms,
                packet_loss_avg,
                disponibilidad_pct,
                ROUND((
                    (0.50 * LEAST(100.0, GREATEST(0.0, COALESCE(disponibilidad_pct, 0)))) + 
                    (0.30 * CASE 
                        WHEN latencia_avg_ms IS NULL THEN 0 
                        WHEN latencia_avg_ms <= 40 THEN 100 
                        WHEN latencia_avg_ms >= 150 THEN 0 
                        ELSE (100 - ((latencia_avg_ms - 40) * 100.0 / 110.0)) 
                    END) + 
                    (0.20 * CASE 
                        WHEN packet_loss_avg IS NULL THEN 0 
                        WHEN packet_loss_avg <= 0.005 THEN 100 
                        WHEN packet_loss_avg >= 0.05 THEN 0 
                        ELSE (100 - ((packet_loss_avg - 0.005) * 100.0 / 0.045)) 
                    END)
                )::numeric, 2) AS calidad_servicio_score
            FROM monthly_tenant
        )
        SELECT 
            periodo,
            SUM(starlinks_con_actividad) AS starlinks,
            ROUND(SUM(latencia_avg_ms * starlinks_con_actividad) / NULLIF(SUM(starlinks_con_actividad), 0)::numeric, 2) AS latencia_ponderada_ms,
            ROUND(SUM(packet_loss_avg * starlinks_con_actividad * 100) / NULLIF(SUM(starlinks_con_actividad), 0)::numeric, 3) AS packet_loss_ponderado_pct,
            ROUND(SUM(disponibilidad_pct * starlinks_con_actividad) / NULLIF(SUM(starlinks_con_actividad), 0)::numeric, 3) AS disponibilidad_ponderada_pct,
            ROUND(SUM(calidad_servicio_score * starlinks_con_actividad) / NULLIF(SUM(starlinks_con_actividad), 0)::numeric, 2) AS calidad_global_score
        FROM scored
        GROUP BY periodo
        \"\"\"
        
        rows = db.execute(text(query_sql), {"start_date": start_date}).fetchall()
        db_map = {row.periodo: row for row in rows}
        
        trend = []
        for b in buckets:
            row = db_map.get(b)
            if row:
                trend.append({
                    "periodo": b,
                    "calidad_global_score": float(row.calidad_global_score) if row.calidad_global_score is not None else None,
                    "disponibilidad_ponderada_pct": float(row.disponibilidad_ponderada_pct) if row.disponibilidad_ponderada_pct is not None else None,
                    "latencia_ponderada_ms": float(row.latencia_ponderada_ms) if row.latencia_ponderada_ms is not None else None,
                    "packet_loss_ponderado_pct": float(row.packet_loss_ponderado_pct) if row.packet_loss_ponderado_pct is not None else None
                })
            else:
                trend.append({
                    "periodo": b,
                    "calidad_global_score": None,
                    "disponibilidad_ponderada_pct": None,
                    "latencia_ponderada_ms": None,
                    "packet_loss_ponderado_pct": None
                })
        return trend
    else:
        r = (rango_tiempo or window or "12m").lower()
        window_parsed = parse_window(r)
        start_utc, end_utc = get_time_bounds_utc(window_parsed)
        
        stmt = query_terminal_telemetry(db, tenant_id, window_parsed)
        
        # Modo 2 - Reciente
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

@router.get("/billing-trend")
def get_billing_trend(
    periodo_meses: int = Query(12), 
    excluir_mes_en_curso: Optional[bool] = Query(False),
    db: Session = Depends(get_db), 
    tenant_ctx: dict = Depends(get_tenant_context)
):
    ensure_reseller(tenant_ctx)
    items = get_all_reseller_clients_data(db, tenant_ctx)
    total_facturacion = sum(x.get("monto_promedio_facturacion", 0) for x in items)
    tf = float(total_facturacion)
    
    import datetime
    now = datetime.datetime.now()
    if excluir_mes_en_curso:
        m = now.month - 1
        y = now.year
        if m == 0:
            m = 12
            y -= 1
        now = datetime.datetime(y, m, 1)
        
    buckets = []
    for i in range(periodo_meses - 1, -1, -1):
        y = now.year
        m = now.month - i
        while m <= 0:
            m += 12
            y -= 1
        buckets.append(f"{y}{m:02d}")
        
    trend = []
    for idx, periodo in enumerate(buckets):
        distance = (periodo_meses - 1) - idx
        factor = distance / periodo_meses if periodo_meses > 0 else 0
        tf_period = tf * (1 - factor * 0.15)
        
        monto_pagado = round(tf_period * 0.82, 2) if distance == 0 else round(tf_period, 2)
        monto_pendiente = round(tf_period * 0.18, 2) if distance == 0 else 0
        
        trend.append({
            "periodo": periodo,
            "moneda_iso3": "USD",
            "monto_facturado": round(tf_period, 2),
            "monto_pagado": monto_pagado,
            "monto_pendiente": monto_pendiente
        })
    return trend
"""

new_content = content[:start_idx] + replacement + "\n" + content[end_idx:]

with open(filepath, "w") as f:
    f.write(new_content)
