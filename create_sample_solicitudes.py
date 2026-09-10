import sys
from datetime import datetime, timedelta
from sqlalchemy import text
sys.path.append('backend')

from app.core.database import SessionLocal, engine

def seed_sample_solicitudes():
    db = SessionLocal()
    try:
        # Create tables directly with SQL if missing
        ddl = """
        CREATE TABLE IF NOT EXISTS tipos_solicitud_cliente (
            id SERIAL PRIMARY KEY,
            codigo VARCHAR NOT NULL,
            nombre VARCHAR NOT NULL,
            descripcion TEXT,
            requiere_linea_servicio BOOLEAN DEFAULT FALSE,
            requiere_dispositivo BOOLEAN DEFAULT FALSE,
            permite_fecha_requerida BOOLEAN DEFAULT TRUE,
            permite_documentos BOOLEAN DEFAULT TRUE,
            orden_visual INTEGER DEFAULT 100,
            activo BOOLEAN DEFAULT TRUE
        );

        CREATE TABLE IF NOT EXISTS solicitudes_cliente (
            id SERIAL PRIMARY KEY,
            codigo_solicitud VARCHAR NOT NULL,
            tenant_id BIGINT NOT NULL,
            tipo_solicitud_id BIGINT NOT NULL,
            linea_servicio_id INTEGER,
            dispositivo_id INTEGER,
            aprovisionamiento_id BIGINT,
            estado VARCHAR NOT NULL DEFAULT 'PENDIENTE',
            prioridad VARCHAR NOT NULL DEFAULT 'NORMAL',
            canal_origen VARCHAR NOT NULL DEFAULT 'PORTAL_CLIENTE',
            motivo VARCHAR,
            descripcion TEXT,
            datos_solicitud JSONB DEFAULT '{}',
            fecha_requerida DATE,
            solicitado_por_usuario_id INTEGER,
            asignado_a_usuario_id INTEGER,
            sla_politica_id BIGINT,
            sla_primera_atencion_minutos INTEGER,
            sla_resolucion_minutos INTEGER,
            sla_tipo_tiempo VARCHAR,
            sla_umbral_amarillo_pct NUMERIC,
            sla_pausar_requiere_informacion BOOLEAN,
            sla_dias_habiles INTEGER[],
            sla_hora_inicio_habil TIME,
            sla_hora_fin_habil TIME,
            fecha_limite_primera_atencion TIMESTAMP,
            fecha_limite_resolucion TIMESTAMP,
            fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            fecha_primera_atencion TIMESTAMP,
            fecha_atendida TIMESTAMP,
            fecha_cierre TIMESTAMP,
            cumplio_sla_primera_atencion BOOLEAN,
            cumplio_sla_resolucion BOOLEAN,
            resolucion TEXT,
            motivo_cierre TEXT,
            fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            creado_por INTEGER,
            modificado_por INTEGER
        );

        CREATE TABLE IF NOT EXISTS solicitud_cliente_historial (
            id SERIAL PRIMARY KEY,
            solicitud_id BIGINT NOT NULL,
            tipo_evento VARCHAR NOT NULL,
            estado_anterior VARCHAR,
            estado_nuevo VARCHAR,
            comentario TEXT,
            usuario_id INTEGER,
            fecha_evento TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """
        db.execute(text(ddl))
        db.commit()

        # Seed tipos_solicitud_cliente
        tipos_sql = """
        INSERT INTO tipos_solicitud_cliente (id, codigo, nombre, descripcion, requiere_linea_servicio, requiere_dispositivo, orden_visual, activo)
        VALUES 
        (1, 'SOPORTE_TECNICO', 'Soporte Técnico', 'Atención de incidencias y soporte técnico', false, false, 1, true),
        (2, 'CAMBIO_PLAN', 'Cambio de Plan / Capacidad', 'Solicitud de upgrade o downgrade de plan', false, false, 2, true),
        (3, 'GEOCERCAS', 'Configuración de Geocercas', 'Solicitud de modificación de geocercas y alertas', false, false, 3, true),
        (4, 'REEMPLAZO_EQUIPO', 'Reemplazo de Equipos', 'Solicitud de garantía o reemplazo de terminales', false, false, 4, true)
        ON CONFLICT (id) DO UPDATE SET requiere_linea_servicio = false, requiere_dispositivo = false;
        """
        db.execute(text(tipos_sql))
        db.commit()

        # Get tenant 1 user (cliente@starlink.com)
        res_user = db.execute(text("SELECT id FROM usuarios WHERE email = 'cliente@starlink.com'")).first()
        cliente_id = res_user[0] if res_user else 9
        tenant_id = 1

        now = datetime.utcnow()

        # Clean existing demo solicitudes for tenant 1
        db.execute(text("DELETE FROM solicitud_cliente_historial WHERE solicitud_id IN (SELECT id FROM solicitudes_cliente WHERE tenant_id = :t_id)"), {"t_id": tenant_id})
        db.execute(text("DELETE FROM solicitudes_cliente WHERE tenant_id = :t_id"), {"t_id": tenant_id})
        db.commit()

        sample_requests = [
            # 1. VERDE - En plazo (Resolución en 24 horas)
            {
                "codigo": "SOL-20260909-0001",
                "tipo_id": 1,
                "estado": "PENDIENTE",
                "prioridad": "NORMAL",
                "motivo": "Monitoreo preventivo de antenas Miraflores",
                "desc": "Solicitamos revisión preventiva de parámetros de señal en las antenas instaladas en el sitio corporativo Miraflores.",
                "f_sol": now - timedelta(hours=2),
                "f_lim": now + timedelta(hours=24)
            },
            # 2. VERDE - En plazo (Resolución en 48 horas)
            {
                "codigo": "SOL-20260909-0002",
                "tipo_id": 2,
                "estado": "EN_PROCESO",
                "prioridad": "BAJA",
                "motivo": "Ampliación de capacidad a 1TB Priority",
                "desc": "Requerimos incremento de cuota prioritaria para 3 terminales satelitales del sitio San Borja.",
                "f_sol": now - timedelta(hours=4),
                "f_lim": now + timedelta(hours=44)
            },
            # 3. AMARILLO - Próxima a vencer (Resolución en 2 horas)
            {
                "codigo": "SOL-20260909-0003",
                "tipo_id": 1,
                "estado": "EN_REVISION",
                "prioridad": "ALTA",
                "motivo": "Revisión de latencia elevada en nodo San Isidro",
                "desc": "Se detectó pico circunstancial de latencia de 120ms. Requerimos verificación inmediata de enlace secundario.",
                "f_sol": now - timedelta(hours=22),
                "f_lim": now + timedelta(hours=2)
            },
            # 4. AMARILLO - Próxima a vencer (Resolución en 1 hora)
            {
                "codigo": "SOL-20260909-0004",
                "tipo_id": 3,
                "estado": "REQUIERE_INFORMACION",
                "prioridad": "NORMAL",
                "motivo": "Ajuste de límites de geocerca San Miguel",
                "desc": "Solicitamos ampliar el perímetro de tolerancia a 500m para las UTs del distrito de San Miguel.",
                "f_sol": now - timedelta(hours=23),
                "f_lim": now + timedelta(hours=1)
            },
            # 5. ROJO - Vencida (Fecha límite pasada hace 5 horas)
            {
                "codigo": "SOL-20260909-0005",
                "tipo_id": 4,
                "estado": "PENDIENTE",
                "prioridad": "URGENTE",
                "motivo": "Falla de puerto ethernet en terminal San Miguel",
                "desc": "El puerto ethernet auxiliar de la UT 04 dejó de responder tras fluctuación eléctrica local.",
                "f_sol": now - timedelta(hours=29),
                "f_lim": now - timedelta(hours=5)
            }
        ]

        insert_sol = text("""
        INSERT INTO solicitudes_cliente (
            codigo_solicitud, tenant_id, tipo_solicitud_id, estado, prioridad,
            canal_origen, motivo, descripcion, fecha_solicitud, fecha_limite_resolucion,
            solicitado_por_usuario_id, creado_por
        ) VALUES (
            :codigo, :tenant_id, :tipo_id, :estado, :prioridad,
            'PORTAL_CLIENTE', :motivo, :desc, :f_sol, :f_lim,
            :user_id, :user_id
        ) RETURNING id;
        """)

        insert_hist = text("""
        INSERT INTO solicitud_cliente_historial (
            solicitud_id, tipo_evento, estado_nuevo, comentario, usuario_id
        ) VALUES (
            :sol_id, 'CREADA', :estado, :comentario, :user_id
        );
        """)

        for s in sample_requests:
            res = db.execute(insert_sol, {
                "codigo": s["codigo"],
                "tenant_id": tenant_id,
                "tipo_id": s["tipo_id"],
                "estado": s["estado"],
                "prioridad": s["prioridad"],
                "motivo": s["motivo"],
                "desc": s["desc"],
                "f_sol": s["f_sol"],
                "f_lim": s["f_lim"],
                "user_id": cliente_id
            })
            sol_id = res.fetchone()[0]

            db.execute(insert_hist, {
                "sol_id": sol_id,
                "estado": s["estado"],
                "comentario": f"Solicitud demo creada ({s['codigo']})",
                "user_id": cliente_id
            })

        db.commit()
        print("✅ 5 Solicitudes de ejemplo creadas exitosamente:")
        print("   - 2 Verdes (SLA En plazo)")
        print("   - 2 Amarillas (SLA Próximas a vencer)")
        print("   - 1 Roja (SLA Vencido)")

    except Exception as e:
        db.rollback()
        print(f"❌ Error al crear solicitudes de ejemplo: {e}")
    finally:
        db.close()

if __name__ == '__main__':
    seed_sample_solicitudes()
