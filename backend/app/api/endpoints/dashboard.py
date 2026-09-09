from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, desc, and_, text
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
from app.core.database import get_db
from app.api.deps import get_tenant_context
from app.models import (
    Dispositivo, AlertaLog, CatalogoAlerta,
    EstadoTerminalActual, ServicioResumenDia,
    ConsumoDiario, CostoServicioMes, Cuenta, LineaServicio
)
from pydantic import BaseModel

router = APIRouter()

class DashboardKPIs(BaseModel):
    active_terminals: int
    total_terminals: int
    critical_alerts: int
    avg_latency_ms: float
    total_data_usage_gb: float

class TelemetryTrendPoint(BaseModel):
    timestamp: str
    downlink_mbps: float
    uplink_mbps: float
    latency_ms: float
    data_usage_gb: float

@router.get("/kpis", response_model=DashboardKPIs)
def get_dashboard_kpis(
    cuenta_id: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    tenant_ctx: dict = Depends(get_tenant_context)
):
    tenant_id = tenant_ctx.get("tenant_id")
    
    device_query = db.query(Dispositivo)
    if tenant_id:
        device_query = device_query.join(LineaServicio, LineaServicio.dispositivo_id == Dispositivo.id)\
            .join(Cuenta, Cuenta.id == LineaServicio.cuenta_id)\
            .filter(Cuenta.tenant_id == tenant_id)
        
    devices = device_query.all()
    total_terminals = len(devices)
    dev_ids = [d.id for d in devices] if devices else []
    
    if not dev_ids:
        return DashboardKPIs(active_terminals=0, total_terminals=0, critical_alerts=0, avg_latency_ms=0.0, total_data_usage_gb=0.0)
        
    # Active terminals
    active_count = db.query(EstadoTerminalActual).filter(
        EstadoTerminalActual.dispositivo_id.in_(dev_ids),
        func.lower(EstadoTerminalActual.estado_operativo) == 'operativo'
    ).count()
            
    # Critical alerts count
    alert_query = db.query(AlertaLog).join(CatalogoAlerta).filter(
        AlertaLog.dispositivo_id.in_(dev_ids),
        AlertaLog.activa == True,
        CatalogoAlerta.criticidad == "CRITICAL"
    )
    critical_alerts = alert_query.count()
    
    # Average Latency over filtered period
    if year and month:
        period_str = f"{year}{month:02d}"
        latency_val = db.query(func.avg(CostoServicioMes.latencia_avg_ms)).filter(
            CostoServicioMes.dispositivo_id.in_(dev_ids),
            CostoServicioMes.periodo == period_str
        ).scalar()
        if not latency_val:
            latency_val = db.query(func.avg(ServicioResumenDia.latencia_avg_ms)).filter(
                ServicioResumenDia.linea_servicio_id.in_(dev_ids)
            ).scalar()
        avg_latency = float(latency_val or 45.0)

        # Total consumption
        total_gb_val = db.query(func.sum(CostoServicioMes.consumo_total_gb)).filter(
            CostoServicioMes.dispositivo_id.in_(dev_ids),
            CostoServicioMes.periodo == period_str
        ).scalar()

        if not total_gb_val:
            from sqlalchemy import text
            start_d = f"{year}-{month:02d}-01"
            end_d = f"{year+1}-01-01" if month == 12 else f"{year}-{month+1:02d}-01"
            total_gb_val = db.execute(text("""
                SELECT COALESCE(SUM(priority_gb + standard_gb), 0) FROM consumo_diario WHERE fecha_utc >= :s AND fecha_utc < :e
            """), {"s": start_d, "e": end_d}).scalar()

        total_gb = float(total_gb_val or 0.0)
    else:
        avg_latency = float(db.query(func.avg(CostoServicioMes.latencia_avg_ms)).filter(CostoServicioMes.dispositivo_id.in_(dev_ids)).scalar() or 45.0)
        total_gb = float(db.query(func.sum(CostoServicioMes.consumo_total_gb)).filter(CostoServicioMes.dispositivo_id.in_(dev_ids)).scalar() or 0.0)
                
    return DashboardKPIs(
        active_terminals=active_count,
        total_terminals=total_terminals,
        critical_alerts=critical_alerts,
        avg_latency_ms=round(avg_latency, 2),
        total_data_usage_gb=round(total_gb, 2)
    )

@router.get("/chart", response_model=List[TelemetryTrendPoint])
def get_telemetry_trend(
    cuenta_id: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    tenant_ctx: dict = Depends(get_tenant_context)
):
    tenant_id = tenant_ctx.get("tenant_id")
    
    if year and month:
        start_date = datetime(year, month, 1).date()
        if month == 12:
            end_date = datetime(year + 1, 1, 1).date()
        else:
            end_date = datetime(year, month + 1, 1).date()
    else:
        end_date = datetime.utcnow().date() + timedelta(days=1)
        start_date = end_date - timedelta(days=30)

    def fetch_data(s_date, e_date):
        cd_q = db.query(
            ConsumoDiario.fecha_utc.label('day'),
            func.sum(
                func.coalesce(ConsumoDiario.priority_gb, 0) +
                func.coalesce(ConsumoDiario.opt_in_priority_gb, 0) +
                func.coalesce(ConsumoDiario.standard_gb, 0)
            ).label('total_gb')
        )
        if s_date and e_date:
            cd_q = cd_q.filter(ConsumoDiario.fecha_utc >= s_date, ConsumoDiario.fecha_utc < e_date)
        if cuenta_id:
            cd_q = cd_q.join(LineaServicio, ConsumoDiario.linea_servicio_id == LineaServicio.id).filter(LineaServicio.cuenta_id == cuenta_id)
        elif tenant_id:
            cd_q = cd_q.join(LineaServicio, ConsumoDiario.linea_servicio_id == LineaServicio.id).join(Cuenta, LineaServicio.cuenta_id == Cuenta.id).filter(Cuenta.tenant_id == tenant_id)
        cd_res = {r.day: float(r.total_gb or 0.0) for r in cd_q.group_by(ConsumoDiario.fecha_utc).all()}

        srd_q = db.query(
            ServicioResumenDia.fecha.label('day'),
            func.avg(ServicioResumenDia.downlink_avg_mbps).label('downlink'),
            func.avg(ServicioResumenDia.uplink_avg_mbps).label('uplink'),
            func.avg(ServicioResumenDia.latencia_avg_ms).label('latency')
        )
        if s_date and e_date:
            srd_q = srd_q.filter(ServicioResumenDia.fecha >= s_date, ServicioResumenDia.fecha < e_date)
        if cuenta_id:
            srd_q = srd_q.join(LineaServicio, ServicioResumenDia.linea_servicio_id == LineaServicio.id).filter(LineaServicio.cuenta_id == cuenta_id)
        elif tenant_id:
            srd_q = srd_q.join(LineaServicio, ServicioResumenDia.linea_servicio_id == LineaServicio.id).join(Cuenta, LineaServicio.cuenta_id == Cuenta.id).filter(Cuenta.tenant_id == tenant_id)
        srd_res = {r.day: r for r in srd_q.group_by(ServicioResumenDia.fecha).all()}
        return cd_res, srd_res

    cd_results, srd_results = fetch_data(start_date, end_date)

    # Fallback to latest 30 days if the requested date range has no daily breakdown rows
    if not cd_results and not srd_results:
        max_date = db.query(func.max(ConsumoDiario.fecha_utc)).scalar()
        if max_date:
            fallback_end = max_date + timedelta(days=1)
            fallback_start = max_date - timedelta(days=30)
            cd_results, srd_results = fetch_data(fallback_start, fallback_end)

    all_days = sorted(set(list(cd_results.keys()) + list(srd_results.keys())))
    
    trend = []
    for d in all_days:
        srd = srd_results.get(d)
        gb = cd_results.get(d, 0.0)
        trend.append(TelemetryTrendPoint(
            timestamp=d.strftime("%Y-%m-%d"),
            downlink_mbps=round(float(srd.downlink if srd and srd.downlink is not None else 0.0), 1),
            uplink_mbps=round(float(srd.uplink if srd and srd.uplink is not None else 0.0), 1),
            latency_ms=round(float(srd.latency if srd and srd.latency is not None else 0.0), 1),
            data_usage_gb=round(gb, 2)
        ))
    return trend

@router.get("/geolocations")
def get_terminals_geolocations(
    db: Session = Depends(get_db),
    tenant_ctx: dict = Depends(get_tenant_context)
):
    tenant_id = tenant_ctx.get("tenant_id")
    query = db.query(Dispositivo)
    if tenant_id:
        query = query.filter(Dispositivo.tenant_id == tenant_id)
        
    devices = query.all()
    res = []
    
    for d in devices:
        # Mocking geolocation logic with raw h3 or simply returning dummy since H3 decoding is complex
        state = db.query(EstadoTerminalActual).filter(EstadoTerminalActual.dispositivo_id == d.id).first()
        res.append({
            "dispositivo_id": d.id,
            "device_id": d.device_id,
            "nombre": d.nombre or d.device_id,
            "latitud": -33.4489, # Mock lat/lon as we are working with H3 now
            "longitud": -70.6693,
            "estado": state.estado_operativo if state else "Unknown"
        })
    return res
