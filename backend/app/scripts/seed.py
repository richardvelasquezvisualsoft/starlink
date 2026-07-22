import os
import random
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models import (
    Usuario, Cuenta, Dispositivo, LineaServicio,
    EstadoServicioLog, GeolocalizacionLog, SaldosHistorial,
    TelemetriaLog, CatalogoAlerta, AlertaLog
)

def run_seed():
    db = SessionLocal()
    try:
        # Check if we already have users
        user_count = db.query(Usuario).count()
        if user_count > 0:
            print("Database already seeded. Skipping...")
            return

        print("Seeding database...")
        
        # 1. Create Default Admin User
        admin = Usuario(
            nombre="Administrador1",
            email="admin@starlink.com",
            password_hash=get_password_hash("admin123")
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)
        print(f"Created admin user: {admin.email}")
        
        # 2. Create Alert Catalog
        alert_defs = [
            ("thermal_shutdown", "Apagado por Temperatura", "El terminal se ha apagado para proteger el hardware por sobrecalentamiento.", "critical"),
            ("obstructed", "Obstrucción de Antena", "La antena detecta obstáculos fijos que bloquean la visibilidad de los satélites.", "warning"),
            ("low_voltage", "Bajo Voltaje de Entrada", "El inyector PoE o fuente de alimentación tiene un voltaje inestable.", "critical"),
            ("no_signal", "Pérdida de Señal Satelital", "La antena está encendida pero no logra sincronizar conexión con ningún satélite.", "critical"),
            ("degraded_speed", "Velocidad de Red Degradada", "Las tasas de transferencia están por debajo del 10% del umbral contratado.", "warning")
        ]
        
        catalog_items = []
        for code, name, desc, crit in alert_defs:
            cat = CatalogoAlerta(
                codigo_alerta=code,
                nombre=name,
                descripcion=desc,
                criticidad=crit,
                creado_por=admin.id
            )
            db.add(cat)
            catalog_items.append(cat)
        db.commit()
        print("Created alert catalog.")

        # 3. Create Accounts
        accounts_data = [
            ("AC-89027-H", "Hospedaje Velasquez - Corporativo"),
            ("AC-44129-M", "Proyecto Minero El Teniente"),
            ("AC-22340-P", "Pesquera Huafan S.A."),
            ("AC-11802-L", "Logística Transandina Ltda")
        ]
        
        accounts = []
        for num, name in accounts_data:
            acc = Cuenta(
                numero_cuenta=num,
                nombre=name,
                creado_por=admin.id
            )
            db.add(acc)
            accounts.append(acc)
        db.commit()
        print("Created accounts.")

        # 4. Create Devices
        devices_data = [
            ("ut000001", "Terminal Recepción Central", "Kit Standard Rectangular"),
            ("ut000002", "Terminal Mina Tajo Abierto", "Kit Flat High Performance"),
            ("ut000003", "Terminal Barco Pesquero Huafan III", "Kit Flat High Performance Maritime"),
            ("ut000004", "Terminal Almacén Logístico", "Kit Standard Rectangular"),
            ("ut000005", "Terminal Unidad Móvil de Ruta", "Kit Mobile Standard"),
            ("ut000006", "Terminal Campamento Cordillera", "Kit Flat High Performance")
        ]
        
        devices = []
        for dev_id, name, kit in devices_data:
            dev = Dispositivo(
                device_id=dev_id,
                nombre=name,
                kit_starlink=kit,
                creado_por=admin.id
            )
            db.add(dev)
            devices.append(dev)
        db.commit()
        print("Created devices.")

        # 5. Create Service Lines
        lines_data = [
            # Account, Device, Line Num, Line Name, Sub ID, Prod ID, Sub Type, Plan, Mobile, Status, OptIn
            (accounts[0], devices[0], "L-550921-A", "Línea Central Velasquez", "sub_8f23j", "prod_standard", "Standard", "Starlink Standard", False, "active", True),
            (accounts[1], devices[1], "L-882310-M", "Línea Minera Principal", "sub_9u21z", "prod_priority_1tb", "Priority", "Priority 1TB", False, "active", True),
            (accounts[2], devices[2], "L-334201-P", "Línea Pesca Austral", "sub_1x73d", "prod_mob_priority_50gb", "Mobile Priority", "Mobile Priority 50GB", True, "active", False),
            (accounts[3], devices[3], "L-110948-L", "Línea Distribución Stgo", "sub_4k38a", "prod_standard", "Standard", "Starlink Standard", False, "active", True),
            (accounts[3], devices[4], "L-110949-L", "Línea Camión Escolta 1", "sub_4k38b", "prod_mob_priority_250gb", "Mobile Priority", "Mobile Priority 250GB", True, "active", False),
            (accounts[1], devices[5], "L-882311-M", "Línea Refugio Cordillera", "sub_9u22a", "prod_priority_2tb", "Priority", "Priority 2TB", False, "active", False)
        ]
        
        lines = []
        for acc, dev, line_num, name, sub_id, prod_id, sub_type, plan, is_mobile, prov_status, opt_in in lines_data:
            line = LineaServicio(
                cuenta_id=acc.id,
                dispositivo_id=dev.id,
                numero_linea=line_num,
                nombre=name,
                subscription_id=sub_id,
                id_producto=prod_id,
                tipo_suscripcion=sub_type,
                plan_contratado=plan,
                es_plan_movil=is_mobile,
                estado_provisionamiento=prov_status,
                permitir_excedentes_opt_in=opt_in,
                creado_por=admin.id
            )
            db.add(line)
            lines.append(line)
        db.commit()
        print("Created service lines.")

        # 6. Generate 30 days of historical telemetry & status
        now_dt = datetime.now()
        base_latitudes = [-33.4489, -22.9087, -42.8125, -33.0472, -38.7396, -26.8242]
        base_longitudes = [-70.6693, -68.1997, -74.1500, -71.6127, -72.5901, -70.4329]
        
        print("Generating historical telemetry logs (this might take a moment)...")
        for i, dev in enumerate(devices):
            line = next((l for l in lines if l.dispositivo_id == dev.id), None)
            if not line:
                continue
                
            lat_base = base_latitudes[i % len(base_latitudes)]
            lng_base = base_longitudes[i % len(base_longitudes)]
            
            accumulated_usage = 0.0
            
            for day in range(30, -1, -1):
                log_time = now_dt - timedelta(days=day)
                
                # Check status: 97% online, 3% offline
                is_online = random.random() > 0.03
                status = "online" if is_online else "offline"
                motivo = None if is_online else "Search_Beam_Loss"
                
                # Add status log
                status_log = EstadoServicioLog(
                    dispositivo_id=dev.id,
                    fecha_hora_lectura=log_time,
                    estado=status,
                    motivo=motivo
                )
                db.add(status_log)
                
                # Coordinates (add slight variation for mobile)
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
                    # Telemetry values
                    ping = random.uniform(25.0, 75.0)
                    drop_rate = random.uniform(0.0, 0.02)
                    downlink = random.uniform(80.0, 220.0)
                    uplink = random.uniform(12.0, 38.0)
                    signal = random.uniform(0.92, 1.00)
                    obstruction = random.uniform(0.0, 0.015)
                    uptime = 86400
                    muestras = 144
                    
                    # Daily consumption in GB
                    usage_today = random.uniform(5.0, 35.0)
                    accumulated_usage += usage_today
                    
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
                    
                    # Add data usage balances history
                    limit_val = 1000.0 if "1TB" in line.plan_contratado else (2000.0 if "2TB" in line.plan_contratado else 500.0)
                    excess_val = max(0.0, accumulated_usage - limit_val) if line.permitir_excedentes_opt_in else 0.0
                    saldo = SaldosHistorial(
                        linea_servicio_id=line.id,
                        fecha_hora_lectura=log_time,
                        periodo=log_time.strftime("%Y-%m"),
                        moneda="USD",
                        bolsa_contratada_gb=limit_val,
                        consumo_estandar_gb=accumulated_usage * 0.8,
                        consumo_prioridad_gb=accumulated_usage * 0.2,
                        recargas_compradas_gb=0.0,
                        recargas_consumidas_gb=0.0,
                        saldo_recurrente_gb=500.0,
                        saldo_total_disponible_gb=max(0.0, 500.0 - accumulated_usage),
                        total_consumido_gb=accumulated_usage,
                        porcentaje_uso_sobre_contratado=(accumulated_usage / limit_val) * 100,
                        consumo_excedente_opt_in_gb=excess_val
                    )
                    db.add(saldo)
            
            # 7. Add active/resolved alerts for some devices
            if i == 1: # Miner terminal has active alert
                obstr_alert = AlertaLog(
                    dispositivo_id=dev.id,
                    catalogo_alerta_id=catalog_items[1].id, # obstructed
                    fecha_hora_deteccion=now_dt - timedelta(hours=6),
                    activa=True
                )
                db.add(obstr_alert)
            elif i == 2: # Marine terminal had a thermal shutdown that was resolved
                temp_alert = AlertaLog(
                    dispositivo_id=dev.id,
                    catalogo_alerta_id=catalog_items[0].id, # thermal_shutdown
                    fecha_hora_deteccion=now_dt - timedelta(days=2),
                    activa=False
                )
                db.add(temp_alert)
            elif i == 4: # Mobile terminal has active low voltage alert
                voltage_alert = AlertaLog(
                    dispositivo_id=dev.id,
                    catalogo_alerta_id=catalog_items[2].id, # low_voltage
                    fecha_hora_deteccion=now_dt - timedelta(minutes=45),
                    activa=True
                )
                db.add(voltage_alert)
                
        db.commit()
        print("Historical telemetry generation and alerts seeding complete!")
        
    except Exception as e:
        print("Error seeding database:", e)
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    run_seed()
