from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import select, func, text, and_

from app.models import Tenant, EstadoTerminalActual, TelemetriaTerminalResumenHora, TelemetriaRouterResumenHora
from app.models_telemetry import (
    TelemetriaTerminalRt,
    TelemetriaRouterRt,
    TelemetriaTerminal15m,
    TelemetriaRouter15m
)

def parse_window(window_str: str) -> str:
    w = (window_str or "30d").lower()
    if w in ["15m", "15min"]: return "15m"
    if w in ["30m", "30min"]: return "30m"
    if w in ["1h", "1_hora", "60m", "60min"]: return "1h"
    if w in ["3h", "3_horas"]: return "3h"
    if w in ["24h", "1d", "1_dia"]: return "24h"
    if w in ["7d", "7_dias"]: return "7d"
    if w in ["30d", "1m", "30_dias"]: return "30d"
    if w in ["6m", "6_meses"]: return "6m"
    if w in ["12m", "12_meses"]: return "12m"
    return "30d"

def get_tenant_timezone(db: Session, tenant_id: int) -> str:
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    return tenant.zona_horaria if tenant and tenant.zona_horaria else "UTC"

import os

def get_time_bounds_utc(window: str, db: Session = None, tenant_id: int = None, is_router: bool = False) -> Tuple[datetime, datetime, str]:
    end = datetime.utcnow()
    demo_mode = os.environ.get("DEMO_MODE", "true").lower() == "true"
    anchor_mode = "NOW"
    
    if demo_mode and db:
        stmt = None
        if window in ["15m", "30m"]:
            if is_router:
                stmt = select(func.max(TelemetriaRouter15m.periodo_inicio))
                if tenant_id: stmt = stmt.where(TelemetriaRouter15m.tenant_id == tenant_id)
            else:
                stmt = select(func.max(TelemetriaTerminal15m.periodo_inicio))
                if tenant_id: stmt = stmt.where(TelemetriaTerminal15m.tenant_id == tenant_id)
        elif window in ["1h", "3h", "24h", "7d", "30d", "6m", "12m"]:
            if is_router:
                stmt = select(func.max(TelemetriaRouterResumenHora.fecha_hora))
                if tenant_id: stmt = stmt.where(TelemetriaRouterResumenHora.tenant_id == tenant_id)
            else:
                stmt = select(func.max(TelemetriaTerminalResumenHora.fecha_hora))
                if tenant_id: stmt = stmt.where(TelemetriaTerminalResumenHora.tenant_id == tenant_id)
                
        if stmt is not None:
            max_ts = db.execute(stmt).scalar()
            if max_ts:
                end = max_ts
                anchor_mode = "MAX_DATA"

    # 6 slots ending at 'end' (current/latest time)
    if window == "15m": start = end - timedelta(minutes=15 * 5)
    elif window == "30m": start = end - timedelta(minutes=30 * 5)
    elif window == "1h": start = end - timedelta(hours=5)
    elif window == "3h": start = end - timedelta(hours=3 * 5)
    elif window == "24h": start = end - timedelta(days=5)
    elif window == "7d": start = end - timedelta(weeks=5)
    elif window == "30d": start = end - timedelta(days=30 * 5)
    elif window == "6m": start = end - timedelta(days=30 * 5)
    elif window == "12m": start = end - timedelta(days=365)
    else: start = end - timedelta(days=30)
    return start, end, anchor_mode

def query_terminal_telemetry(db: Session, tenant_id: int, window_str: str, filters: dict = None, aggregate: bool = False):
    window = parse_window(window_str)
    start_utc, end_utc, _ = get_time_bounds_utc(window, db=db, tenant_id=tenant_id, is_router=False)
    
    if window == "15m":
        if aggregate:
            ts_col = TelemetriaTerminal15m.periodo_inicio.label('timestamp')
            stmt = select(
                ts_col,
                func.avg(TelemetriaTerminal15m.downlink_mbps_avg).label('dl'),
                func.avg(TelemetriaTerminal15m.uplink_mbps_avg).label('ul'),
                func.avg(TelemetriaTerminal15m.ping_latency_ms_avg).label('lat'),
                func.avg(TelemetriaTerminal15m.ping_drop_rate_avg).label('drop'),
                func.avg(TelemetriaTerminal15m.obstruccion_avg).label('obs')
            ).group_by(ts_col).order_by(ts_col)
        else:
            stmt = select(TelemetriaTerminal15m)
        if tenant_id: stmt = stmt.where(TelemetriaTerminal15m.tenant_id == tenant_id)
        if start_utc: stmt = stmt.where(TelemetriaTerminal15m.periodo_inicio >= start_utc)
        if end_utc: stmt = stmt.where(TelemetriaTerminal15m.periodo_inicio <= end_utc)
    elif window == "30m":
        if aggregate:
            ts_col = func.date_bin(text("'30 minutes'::interval"), TelemetriaTerminal15m.periodo_inicio, text("TIMESTAMP '2000-01-01 00:00:00'")).label('timestamp')
            stmt = select(
                ts_col,
                func.avg(TelemetriaTerminal15m.downlink_mbps_avg).label('dl'),
                func.avg(TelemetriaTerminal15m.uplink_mbps_avg).label('ul'),
                func.avg(TelemetriaTerminal15m.ping_latency_ms_avg).label('lat'),
                func.avg(TelemetriaTerminal15m.ping_drop_rate_avg).label('drop'),
                func.avg(TelemetriaTerminal15m.obstruccion_avg).label('obs')
            ).group_by(ts_col).order_by(ts_col)
        else:
            stmt = select(TelemetriaTerminal15m)
        if tenant_id: stmt = stmt.where(TelemetriaTerminal15m.tenant_id == tenant_id)
        if start_utc: stmt = stmt.where(TelemetriaTerminal15m.periodo_inicio >= start_utc)
        if end_utc: stmt = stmt.where(TelemetriaTerminal15m.periodo_inicio <= end_utc)
    elif window == "1h":
        if aggregate:
            ts_col = TelemetriaTerminalResumenHora.fecha_hora.label('timestamp')
            stmt = select(
                ts_col,
                func.avg(TelemetriaTerminalResumenHora.downlink_mbps_avg).label('dl'),
                func.avg(TelemetriaTerminalResumenHora.uplink_mbps_avg).label('ul'),
                func.avg(TelemetriaTerminalResumenHora.ping_latency_ms_avg).label('lat'),
                func.avg(TelemetriaTerminalResumenHora.ping_drop_rate_avg).label('drop'),
                func.avg(TelemetriaTerminalResumenHora.obstruccion_avg).label('obs')
            ).group_by(ts_col).order_by(ts_col)
        else:
            stmt = select(TelemetriaTerminalResumenHora)
        if tenant_id: stmt = stmt.where(TelemetriaTerminalResumenHora.tenant_id == tenant_id)
        if start_utc: stmt = stmt.where(TelemetriaTerminalResumenHora.fecha_hora >= start_utc)
        if end_utc: stmt = stmt.where(TelemetriaTerminalResumenHora.fecha_hora <= end_utc)
    elif window == "3h":
        if aggregate:
            ts_col = func.date_bin(text("'3 hours'::interval"), TelemetriaTerminalResumenHora.fecha_hora, text("TIMESTAMP '2000-01-01 00:00:00'")).label('timestamp')
            stmt = select(
                ts_col,
                func.avg(TelemetriaTerminalResumenHora.downlink_mbps_avg).label('dl'),
                func.avg(TelemetriaTerminalResumenHora.uplink_mbps_avg).label('ul'),
                func.avg(TelemetriaTerminalResumenHora.ping_latency_ms_avg).label('lat'),
                func.avg(TelemetriaTerminalResumenHora.ping_drop_rate_avg).label('drop'),
                func.avg(TelemetriaTerminalResumenHora.obstruccion_avg).label('obs')
            ).group_by(ts_col).order_by(ts_col)
        else:
            stmt = select(TelemetriaTerminalResumenHora)
        if tenant_id: stmt = stmt.where(TelemetriaTerminalResumenHora.tenant_id == tenant_id)
        if start_utc: stmt = stmt.where(TelemetriaTerminalResumenHora.fecha_hora >= start_utc)
        if end_utc: stmt = stmt.where(TelemetriaTerminalResumenHora.fecha_hora <= end_utc)
    elif window == "24h":
        if aggregate:
            ts_col = func.date_trunc('day', TelemetriaTerminalResumenHora.fecha_hora).label('timestamp')
            stmt = select(
                ts_col,
                func.avg(TelemetriaTerminalResumenHora.downlink_mbps_avg).label('dl'),
                func.avg(TelemetriaTerminalResumenHora.uplink_mbps_avg).label('ul'),
                func.avg(TelemetriaTerminalResumenHora.ping_latency_ms_avg).label('lat'),
                func.avg(TelemetriaTerminalResumenHora.ping_drop_rate_avg).label('drop'),
                func.avg(TelemetriaTerminalResumenHora.obstruccion_avg).label('obs')
            ).group_by(ts_col).order_by(ts_col)
        else:
            stmt = select(TelemetriaTerminalResumenHora)
        if tenant_id: stmt = stmt.where(TelemetriaTerminalResumenHora.tenant_id == tenant_id)
        if start_utc: stmt = stmt.where(TelemetriaTerminalResumenHora.fecha_hora >= start_utc)
        if end_utc: stmt = stmt.where(TelemetriaTerminalResumenHora.fecha_hora <= end_utc)
    elif window == "7d":
        if aggregate:
            ts_col = func.date_trunc('week', TelemetriaTerminalResumenHora.fecha_hora).label('timestamp')
            stmt = select(
                ts_col,
                func.avg(TelemetriaTerminalResumenHora.downlink_mbps_avg).label('dl'),
                func.avg(TelemetriaTerminalResumenHora.uplink_mbps_avg).label('ul'),
                func.avg(TelemetriaTerminalResumenHora.ping_latency_ms_avg).label('lat'),
                func.avg(TelemetriaTerminalResumenHora.ping_drop_rate_avg).label('drop'),
                func.avg(TelemetriaTerminalResumenHora.obstruccion_avg).label('obs')
            ).group_by(ts_col).order_by(ts_col)
        else:
            stmt = select(TelemetriaTerminalResumenHora)
        if tenant_id: stmt = stmt.where(TelemetriaTerminalResumenHora.tenant_id == tenant_id)
        if start_utc: stmt = stmt.where(TelemetriaTerminalResumenHora.fecha_hora >= start_utc)
        if end_utc: stmt = stmt.where(TelemetriaTerminalResumenHora.fecha_hora <= end_utc)
    else:
        if aggregate:
            ts_col = func.date_trunc('month', TelemetriaTerminalResumenHora.fecha_hora).label('timestamp')
            stmt = select(
                ts_col,
                func.avg(TelemetriaTerminalResumenHora.downlink_mbps_avg).label('dl'),
                func.avg(TelemetriaTerminalResumenHora.uplink_mbps_avg).label('ul'),
                func.avg(TelemetriaTerminalResumenHora.ping_latency_ms_avg).label('lat'),
                func.avg(TelemetriaTerminalResumenHora.ping_drop_rate_avg).label('drop'),
                func.avg(TelemetriaTerminalResumenHora.obstruccion_avg).label('obs')
            ).group_by(ts_col).order_by(ts_col)
        else:
            stmt = select(TelemetriaTerminalResumenHora)
        if tenant_id: stmt = stmt.where(TelemetriaTerminalResumenHora.tenant_id == tenant_id)
        if start_utc: stmt = stmt.where(TelemetriaTerminalResumenHora.fecha_hora >= start_utc)
        if end_utc: stmt = stmt.where(TelemetriaTerminalResumenHora.fecha_hora <= end_utc)

    if filters:
        pass
    return stmt

def query_router_telemetry(db: Session, tenant_id: int, window_str: str, filters: dict = None):
    window = parse_window(window_str)
    start_utc, end_utc, _ = get_time_bounds_utc(window, db=db, tenant_id=tenant_id, is_router=True)
    
    if window in ["15m", "30m", "1h"]:
        stmt = select(TelemetriaRouterRt)
        if tenant_id: stmt = stmt.where(TelemetriaRouterRt.tenant_id == tenant_id)
        if start_utc: stmt = stmt.where(TelemetriaRouterRt.fecha_hora_lectura >= start_utc)
        if end_utc: stmt = stmt.where(TelemetriaRouterRt.fecha_hora_lectura <= end_utc)
    elif window in ["3h", "24h"]:
        stmt = select(TelemetriaRouter15m)
        if tenant_id: stmt = stmt.where(TelemetriaRouter15m.tenant_id == tenant_id)
        if start_utc: stmt = stmt.where(TelemetriaRouter15m.periodo_inicio >= start_utc)
        if end_utc: stmt = stmt.where(TelemetriaRouter15m.periodo_inicio <= end_utc)
    else:
        stmt = select(TelemetriaRouterResumenHora)
        if tenant_id: stmt = stmt.where(TelemetriaRouterResumenHora.tenant_id == tenant_id)
        if start_utc: stmt = stmt.where(TelemetriaRouterResumenHora.fecha_hora >= start_utc)
        if end_utc: stmt = stmt.where(TelemetriaRouterResumenHora.fecha_hora <= end_utc)

    if filters:
        pass
    return stmt
