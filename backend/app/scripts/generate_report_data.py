import os
import random
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models import (
    Dispositivo, LineaServicio,
    EstadoServicioLog, GeolocalizacionLog, SaldosHistorial,
    TelemetriaLog, CatalogoAlerta, AlertaLog
)

def run_generate_historical():
    db = SessionLocal()
    try:
        devices = db.query(Dispositivo).all()
        lines = db.query(LineaServicio).all()
        catalog_items = db.query(CatalogoAlerta).all()
        
        if not devices or not lines:
            print("No devices or lines found in database. Run seed.py first.")
            return

        print("Generating historical telemetry logs (this might take a moment)...")
        now_dt = datetime.now()
        base_latitudes = [-33.4489, -22.9087, -42.8125, -33.0472, -38.7396, -26.8242]
        base_longitudes = [-70.6693, -68.1997, -74.1500, -71.6127, -72.5901, -70.4329]
        
        DAYS_TO_GENERATE = 180

        for i, dev in enumerate(devices):
            line = next((l for l in lines if l.dispositivo_id == dev.id), None)
            if not line:
                continue
                
            lat_base = base_latitudes[i % len(base_latitudes)]
            lng_base = base_longitudes[i % len(base_longitudes)]
            
            # Reset daily accumulation logically based on month.
            accumulated_usage_by_month = {}
            
            for day in range(DAYS_TO_GENERATE, -1, -1):
                log_time = now_dt - timedelta(days=day)
                month_key = log_time.strftime("%Y-%m")
                
                if month_key not in accumulated_usage_by_month:
                    accumulated_usage_by_month[month_key] = 0.0
                
                is_online = random.random() > 0.03
                status = "online" if is_online else "offline"
                motivo = None if is_online else "Search_Beam_Loss"
                
                status_log = EstadoServicioLog(
                    dispositivo_id=dev.id,
                    fecha_hora_lectura=log_time,
                    estado=status,
                    motivo=motivo
                )
                db.add(status_log)
                
                var = random.uniform(-0.02, 0.02) if line.es_plan_movil else 0.0
                geo_log = GeolocalizacionLog(
                    dispositivo_id=dev.id,
                    fecha_hora_lectura=log_time,
                    latitud=lat_base + var,
                    longitud=lng_base + var,
                    fuente="GPS"
                )
                db.add(geo_log)
                
                if is_online:
                    ping = random.uniform(25.0, 75.0)
                    drop_rate = random.uniform(0.0, 0.02)
                    downlink = random.uniform(80.0, 220.0)
                    uplink = random.uniform(12.0, 38.0)
                    signal = random.uniform(0.92, 1.00)
                    obstruction = random.uniform(0.0, 0.015)
                    uptime = 86400
                    muestras = 144
                    
                    usage_today = random.uniform(2.0, 25.0)
                    accumulated_usage_by_month[month_key] += usage_today
                    current_accumulated = accumulated_usage_by_month[month_key]
                    
                    tel = TelemetriaLog(
                        dispositivo_id=dev.id,
                        fecha_hora_lectura=log_time,
                        periodo_segundos=86400,
                        ping_latency_avg_ms=ping,
                        ping_drop_rate_avg=drop_rate,
                        downlink_mbps_avg=downlink,
                        uplink_mbps_avg=uplink,
                        signal_quality_avg=signal,
                        porcentaje_obstruccion=obstruction,
                        uptime_segundos=uptime,
                        estimado_descargado_gb=usage_today * 0.85,
                        estimado_cargado_gb=usage_today * 0.15,
                        muestras_totales=muestras
                    )
                    db.add(tel)
                    
                    limit_val = 1000.0 if "1TB" in line.plan_contratado else (2000.0 if "2TB" in line.plan_contratado else 500.0)
                    if line.es_plan_movil: limit_val = 50.0
                    excess_val = max(0.0, current_accumulated - limit_val) if line.permitir_excedentes_opt_in else 0.0
                    
                    from sqlalchemy import func
                    # Delete any existing saldo for this specific day to avoid duplicates if re-run
                    db.query(SaldosHistorial).filter(
                        SaldosHistorial.linea_servicio_id == line.id,
                        SaldosHistorial.periodo == month_key,
                        func.date(SaldosHistorial.fecha_hora_lectura) == log_time.date()
                    ).delete()
                    
                    saldo = SaldosHistorial(
                        linea_servicio_id=line.id,
                        fecha_hora_lectura=log_time,
                        periodo=month_key,
                        moneda="USD",
                        bolsa_contratada_gb=limit_val,
                        consumo_estandar_gb=current_accumulated * 0.8,
                        consumo_prioridad_gb=current_accumulated * 0.2,
                        recargas_compradas_gb=0.0,
                        recargas_consumidas_gb=0.0,
                        saldo_recurrente_gb=limit_val,
                        saldo_total_disponible_gb=max(0.0, limit_val - current_accumulated),
                        total_consumido_gb=current_accumulated,
                        porcentaje_uso_sobre_contratado=(current_accumulated / limit_val) * 100,
                        consumo_excedente_opt_in_gb=excess_val
                    )
                    db.add(saldo)
                    
            if i == 1 and len(catalog_items) > 1:
                obstr_alert = AlertaLog(
                    dispositivo_id=dev.id,
                    catalogo_alerta_id=catalog_items[1].id,
                    fecha_hora_deteccion=now_dt - timedelta(hours=6),
                    activa=True
                )
                db.add(obstr_alert)
        
        db.commit()
        print(f"Historical telemetry generation for {DAYS_TO_GENERATE} days complete!")
        
    except Exception as e:
        print("Error generating historical data:", e)
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    run_generate_historical()
