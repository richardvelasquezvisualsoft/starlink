import os
import sys
from sqlalchemy.orm import Session
from sqlalchemy import select

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.core.database import SessionLocal
from app.models import MenuModulo, MenuItem, RolesPortal, RolMenu

MENUS_DATA = [
    {
        "codigo": "operacion_global",
        "titulo": "OPERACIÓN GLOBAL",
        "icono": "Radio",
        "orden": 1,
        "items": [
            {"codigo": "g-clientes", "nombre": "Clientes", "path": "/reseller/clientes", "icono": "Users", "orden": 1},
            {"codigo": "g-noc", "nombre": "NOC Global", "path": "/reseller/noc", "icono": "Activity", "orden": 2},
            {"codigo": "g-solicitudes", "nombre": "Solicitudes de Clientes", "path": "/reseller/solicitudes", "icono": "Briefcase", "orden": 3},
            {"codigo": "g-alertas", "nombre": "Alertas Globales", "path": "/reseller/alertas", "icono": "AlertTriangle", "orden": 4},
            {"codigo": "g-operaciones", "nombre": "Operaciones", "path": "/reseller/operaciones", "icono": "Settings", "orden": 5},
            {"codigo": "g-aprovisionamiento", "nombre": "Aprovisionamiento", "path": "/reseller/aprovisionamiento", "icono": "Database", "orden": 6},
        ]
    },
    {
        "codigo": "analitica_reseller",
        "titulo": "ANALÍTICA RESELLER",
        "icono": "BarChart3",
        "orden": 2,
        "items": [
            {"codigo": "a-cartera", "nombre": "Cartera y Crecimiento", "path": "/reseller/analitica/cartera", "icono": "Users", "orden": 1},
            {"codigo": "a-calidad", "nombre": "Calidad Histórica", "path": "/reseller/analitica/calidad", "icono": "Activity", "orden": 2},
            {"codigo": "a-flota", "nombre": "Evolución de Flota", "path": "/reseller/analitica/flota", "icono": "Satellite", "orden": 3},
            {"codigo": "a-costos", "nombre": "Costos por Cliente", "path": "/reseller/analitica/costos", "icono": "CreditCard", "orden": 4},
            {"codigo": "a-performance", "nombre": "Performance de Aprovisionamiento", "path": "/reseller/analitica/performance", "icono": "Database", "orden": 5},
            {"codigo": "a-productos", "nombre": "Productos / Planes", "path": "/reseller/analitica/productos", "icono": "Briefcase", "orden": 6},
        ]
    },
    {
        "codigo": "gestion_comercial",
        "titulo": "GESTIÓN COMERCIAL",
        "icono": "Briefcase",
        "orden": 3,
        "items": [
            {"codigo": "g-consumo", "nombre": "Consumo Global", "path": "/reseller/consumo", "icono": "BarChart3", "orden": 1},
            {"codigo": "g-facturacion", "nombre": "Facturación Starlink", "path": "/reseller/facturacion", "icono": "CreditCard", "orden": 2},
            {"codigo": "g-contratos", "nombre": "Contratos Comerciales", "path": "/reseller/contratos", "icono": "Briefcase", "orden": 3},
        ]
    },
    {
        "codigo": "administracion",
        "titulo": "ADMINISTRACIÓN",
        "icono": "Settings",
        "orden": 4,
        "items": [
            {"codigo": "g-usuarios", "nombre": "Usuarios y Accesos", "path": "/reseller/usuarios", "icono": "Users", "orden": 1},
            {"codigo": "g-seguridad", "nombre": "Seguridad", "path": "/reseller/seguridad", "icono": "Database", "orden": 2},
        ]
    },
    {
        "codigo": "mi_operacion",
        "titulo": "MI OPERACIÓN",
        "icono": "Satellite",
        "orden": 5,
        "items": [
            {"codigo": "c-servicios", "nombre": "Mis Servicios", "path": "/cliente/servicios", "icono": "Radio", "orden": 1},
            {"codigo": "c-equipos", "nombre": "Mis Equipos", "path": "/cliente/servicios/equipos", "icono": "Database", "orden": 2},
            {"codigo": "c-planes", "nombre": "Mis Planes", "path": "/cliente/servicios/planes", "icono": "Briefcase", "orden": 3},
            {"codigo": "c-alertas", "nombre": "Alertas", "path": "/cliente/calidad/alertas", "icono": "AlertTriangle", "orden": 4},
            {"codigo": "c-estado", "nombre": "Estado y Ubicación", "path": "/cliente/calidad/estado-ubicacion", "icono": "MapPin", "orden": 5},
        ]
    },
    {
        "codigo": "analitica",
        "titulo": "ANALÍTICA",
        "icono": "Activity",
        "orden": 6,
        "items": [
            {"codigo": "c-calidad", "nombre": "Calidad de Servicio", "path": "/cliente/calidad/calidad-servicio", "icono": "Activity", "orden": 1},
            {"codigo": "c-telemetria", "nombre": "Telemetría", "path": "/cliente/calidad/telemetria", "icono": "BarChart3", "orden": 2},
            {"codigo": "c-reportes", "nombre": "Reportes", "path": "/cliente/facturacion/reportes", "icono": "BarChart3", "orden": 3},
        ]
    },
    {
        "codigo": "facturacion",
        "titulo": "FACTURACIÓN",
        "icono": "CreditCard",
        "orden": 7,
        "items": [
            {"codigo": "c-comparativo", "nombre": "Contratado vs Facturado", "path": "/cliente/facturacion/comparativo", "icono": "Briefcase", "orden": 1},
            {"codigo": "c-comprobantes", "nombre": "Mis Comprobantes", "path": "/cliente/facturacion/comprobantes", "icono": "FileText", "orden": 2},
        ]
    },
    {
        "codigo": "operaciones",
        "titulo": "OPERACIONES",
        "icono": "Settings",
        "orden": 8,
        "items": [
            {"codigo": "c-control-datos", "nombre": "Control de Datos", "path": "/cliente/operaciones/control-datos", "icono": "Database", "orden": 1},
            {"codigo": "c-remotas", "nombre": "Acciones Remotas", "path": "/cliente/operaciones/remotas", "icono": "Activity", "orden": 2},
            {"codigo": "c-geozonas", "nombre": "Geozonas", "path": "/cliente/operaciones/geozonas", "icono": "MapPin", "orden": 3},
        ]
    },
    {
        "codigo": "solicitudes",
        "titulo": "SOLICITUDES",
        "icono": "Users",
        "orden": 9,
        "items": [
            {"codigo": "c-mis-solicitudes", "nombre": "Mis Solicitudes", "path": "/cliente/solicitudes", "icono": "Briefcase", "orden": 1},
        ]
    },
    {
        "codigo": "mantenimiento",
        "titulo": "MANTENIMIENTO",
        "icono": "Settings",
        "orden": 10,
        "items": [
            {"codigo": "c-org-n1", "nombre": "Gerencias", "path": "/cliente/mantenimiento/organizacion/nivel/1", "icono": "Users", "orden": 1},
            {"codigo": "c-org-n2", "nombre": "Áreas", "path": "/cliente/mantenimiento/organizacion/nivel/2", "icono": "Users", "orden": 2},
            {"codigo": "c-org-n3", "nombre": "Sedes", "path": "/cliente/mantenimiento/organizacion/nivel/3", "icono": "Users", "orden": 3},
            {"codigo": "c-centros-costos", "nombre": "Centros de Costos", "path": "/cliente/mantenimiento/centros-costos", "icono": "Database", "orden": 5},
            {"codigo": "c-asignaciones", "nombre": "Asignaciones", "path": "/cliente/mantenimiento/asignaciones", "icono": "Users", "orden": 6},
        ]
    },
    {
        "codigo": "configuracion",
        "titulo": "CONFIGURACIÓN",
        "icono": "Settings",
        "orden": 11,
        "items": [
            {"codigo": "g-config-sla", "nombre": "Configuración SLA", "path": "/reseller/configuracion/sla", "icono": "Settings", "orden": 1},
            {"codigo": "c-configuracion-global", "nombre": "Global", "path": "/cliente/configuracion/global", "icono": "Settings", "orden": 2},
        ]
    }
]

def seed_menus():
    db: Session = SessionLocal()
    try:
        existing = db.execute(select(MenuModulo)).scalars().first()
        if existing:
            print("Menus already exist in database. Skipping seed.")
            return

        print("Seeding Menu Modulos and Items...")
        modulos_db = []
        for mod_data in MENUS_DATA:
            modulo = MenuModulo(
                codigo=mod_data["codigo"],
                titulo=mod_data["titulo"],
                icono=mod_data["icono"],
                orden=mod_data["orden"]
            )
            db.add(modulo)
            db.flush()

            for item_data in mod_data["items"]:
                item = MenuItem(
                    modulo_id=modulo.id,
                    codigo=item_data["codigo"],
                    nombre=item_data["nombre"],
                    path=item_data["path"],
                    icono=item_data["icono"],
                    orden=item_data["orden"]
                )
                db.add(item)
            
            modulos_db.append(modulo)

        roles = db.execute(select(RolesPortal).where(RolesPortal.codigo.in_(["RESELLER", "CLIENTE"]))).scalars().all()
        for rol in roles:
            for modulo in modulos_db:
                rol_menu = RolMenu(rol_id=rol.id, modulo_id=modulo.id)
                db.add(rol_menu)

        db.commit()
        print("Menu seeding completed successfully!")

    except Exception as e:
        db.rollback()
        print(f"Error seeding menus: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_menus()
