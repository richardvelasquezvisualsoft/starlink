from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, desc, and_
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
from app.core.database import get_db
from app.api.endpoints.auth import get_current_user
from app.models import (
    Dispositivo, AlertaLog, CatalogoAlerta,
    TelemetriaLog, EstadoServicioLog, GeolocalizacionLog,
    SaldosHistorial, LineaServicio
)
from app.schemas import DashboardKPIs, TelemetryTrendPoint

router = APIRouter()

@router.get("/kpis", response_model=DashboardKPIs)
def get_dashboard_kpis(
    cuenta_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Base queries filtering by account if provided
    device_query = db.query(Dispositivo)
    if cuenta_id:
        device_query = device_query.join(LineaServicio).filter(LineaServicio.cuenta_id == cuenta_id)
        
    devices = device_query.all()
    total_terminals = len(devices)
    device_ids = [d.id for d in devices]
    
    if not device_ids:
        return DashboardKPIs(
            active_terminals=0,
            total_terminals=0,
            critical_alerts=0,
            avg_latency_ms=0.0,
            total_data_usage_gb=0.0
        )
        
    # Active terminals (Online in latest logs)
    active_count = 0
    for dev_id in device_ids:
        latest_status = db.query(EstadoServicioLog)\
            .filter(EstadoServicioLog.dispositivo_id == dev_id)\
            .order_by(desc(EstadoServicioLog.fecha_hora_lectura))\
            .first()
        if latest_status and latest_status.estado.lower() == "online":
            active_count += 1
            
    # Critical alerts count
    alert_query = db.query(AlertaLog).filter(
        and_(
            AlertaLog.dispositivo_id.in_(device_ids),
            AlertaLog.activa == True
        )
    )
    # Join with Catalogo to check if critical
    critical_alerts = alert_query.join(CatalogoAlerta).filter(CatalogoAlerta.criticidad == "critical").count()
    
    # Average Latency over last 24h
    cutoff = datetime.now() - timedelta(days=1)
    avg_latency = db.query(func.avg(TelemetriaLog.ping_latency_avg_ms))\
        .filter(
            and_(
                TelemetriaLog.dispositivo_id.in_(device_ids),
                TelemetriaLog.fecha_hora_lectura >= cutoff
            )
        ).scalar() or 0.0
        
    # Total consumption (sum of latest total_consumido_gb for each line)
    line_query = db.query(LineaServicio).filter(LineaServicio.dispositivo_id.in_(device_ids))
    line_ids = [l.id for l in line_query.all()]
    
    total_gb = 0.0
    if line_ids:
        for l_id in line_ids:
            latest_usage = db.query(SaldosHistorial)\
                .filter(SaldosHistorial.linea_servicio_id == l_id)\
                .order_by(desc(SaldosHistorial.fecha_hora_lectura))\
                .first()
            if latest_usage and latest_usage.total_consumido_gb:
                total_gb += float(latest_usage.total_consumido_gb)
                
    return DashboardKPIs(
        active_terminals=active_count,
        total_terminals=total_terminals,
        critical_alerts=critical_alerts,
        avg_latency_ms=round(float(avg_latency), 2),
        total_data_usage_gb=round(total_gb, 2)
    )

@router.get("/chart", response_model=List[TelemetryTrendPoint])
def get_telemetry_trend(
    cuenta_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Filter devices by account
    device_query = db.query(Dispositivo.id)
    if cuenta_id:
        device_query = device_query.join(LineaServicio).filter(LineaServicio.cuenta_id == cuenta_id)
    dev_ids = [r[0] for r in device_query.all()]
    
    if not dev_ids:
        return []
        
    # Group telemetry by day for the last 30 days
    cutoff = datetime.now() - timedelta(days=30)
    
    # Query averages grouped by day
    # Convert date to string format YYYY-MM-DD
    results = db.query(
        func.date_trunc('day', TelemetriaLog.fecha_hora_lectura).label('day'),
        func.avg(TelemetriaLog.downlink_mbps_avg).label('downlink'),
        func.avg(TelemetriaLog.uplink_mbps_avg).label('uplink'),
        func.avg(TelemetriaLog.ping_latency_avg_ms).label('latency'),
        func.sum(TelemetriaLog.estimado_descargado_gb + TelemetriaLog.estimado_cargado_gb).label('traffic')
    ).filter(
        and_(
            TelemetriaLog.dispositivo_id.in_(dev_ids),
            TelemetriaLog.fecha_hora_lectura >= cutoff
        )
    ).group_by('day').order_by('day').all()
    
    trend = []
    for r in results:
        trend.append(TelemetryTrendPoint(
            timestamp=r.day.strftime("%Y-%m-%d"),
            downlink_mbps=round(float(r.downlink or 0.0), 1),
            uplink_mbps=round(float(r.uplink or 0.0), 1),
            latency_ms=round(float(r.latency or 0.0), 1),
            data_usage_gb=round(float(r.traffic or 0.0), 2)
        ))
    return trend

@router.get("/geolocations")
def get_terminals_geolocations(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    devices = db.query(Dispositivo).all()
    res = []
    for d in devices:
        # Get latest geolocation
        latest_geo = db.query(GeolocalizacionLog)\
            .filter(GeolocalizacionLog.dispositivo_id == d.id)\
            .order_by(desc(GeolocalizacionLog.fecha_hora_lectura))\
            .first()
            
        # Get latest service state
        latest_state = db.query(EstadoServicioLog)\
            .filter(EstadoServicioLog.dispositivo_id == d.id)\
            .order_by(desc(EstadoServicioLog.fecha_hora_lectura))\
            .first()
            
        if latest_geo:
            res.append({
                "dispositivo_id": d.id,
                "device_id": d.device_id,
                "nombre": d.nombre,
                "latitud": float(latest_geo.latitud),
                "longitud": float(latest_geo.longitud),
                "estado": latest_state.estado if latest_state else "Unknown"
            })
    return res
