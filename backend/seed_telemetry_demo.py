import os
import sys
from datetime import datetime, timedelta
import random

# Ensure app is in path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.core.database import SessionLocal
from app.models import TelemetriaLog, LineaServicio

def seed_demo_data():
    db = SessionLocal()
    try:
        print("Iniciando actualización de datos de demostración...")
        # Get active dispositivos (say, the first 5 or all that exist)
        lineas = db.query(LineaServicio).limit(10).all()
        dispositivos = [l.dispositivo_id for l in lineas if l.dispositivo_id]
        
        if not dispositivos:
            print("No se encontraron dispositivos (LineaServicio) en la base de datos.")
            return

        from sqlalchemy import func
        from sqlalchemy.exc import IntegrityError
        now = datetime.now()
        total_inserted = 0

        for d_id in dispositivos:
            max_ts_d = db.query(func.max(TelemetriaLog.fecha_hora_lectura)).filter(TelemetriaLog.dispositivo_id == d_id).scalar()
            if max_ts_d:
                start_time = max_ts_d + timedelta(minutes=15)
            else:
                start_time = now - timedelta(days=35)
                
            if now - start_time < timedelta(minutes=15):
                continue

            print(f"Generando datos para dispositivo {d_id} desde {start_time.strftime('%Y-%m-%d %H:%M')} hasta {now.strftime('%Y-%m-%d %H:%M')}")
            
            curr = start_time
            while curr <= now:
                wave = random.uniform(-1.5, 1.5) * 0.15
                log = TelemetriaLog(
                    dispositivo_id=d_id,
                    fecha_hora_lectura=curr,
                    periodo_segundos=900,
                    ping_latency_avg_ms=round(max(15.0, 36.5 - wave * 6.0 + random.uniform(-2, 2)), 1),
                    downlink_mbps_avg=round(max(10.0, 180.0 + wave * 25.0 + random.uniform(-15, 15)), 1),
                    uplink_mbps_avg=round(max(2.0, 22.0 + wave * 4.0 + random.uniform(-3, 3)), 1),
                    estimado_descargado_gb=round(max(0.1, 1.2 + wave * 0.3), 3),
                    estimado_cargado_gb=round(max(0.01, 0.2 + wave * 0.05), 3)
                )
                db.add(log)
                try:
                    db.commit()
                    total_inserted += 1
                except IntegrityError:
                    db.rollback()
                except Exception as e:
                    db.rollback()
                
                curr += timedelta(minutes=15)

        print(f"¡Datos de demostración actualizados correctamente! Se insertaron {total_inserted} registros en total.")
        
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_demo_data()
