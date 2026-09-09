import re

with open("backend/app/models.py", "r") as f:
    content = f.read()

words_to_singular = {
    "Usuarios": "Usuario",
    "TenantUsuarios": "TenantUsuario",
    "Tenants": "Tenant",
    "Routers": "Router",
    "LineasServicio": "LineaServicio",
    "Dispositivos": "Dispositivo",
    "Cuentas": "Cuenta",
    "ComprobantesCliente": "ComprobanteCliente",
    "StarlinkFacturasReseller": "StarlinkFacturaReseller",
    "Geozonas": "Geozona",
    "DireccionesServicio": "DireccionServicio",
    "CentrosCostos": "CentroCosto",
    "UnidadesOrganizacionales": "UnidadOrganizacional",
    "Colaboradores": "Colaborador",
    "StarlinkFacturaDetalles": "StarlinkFacturaDetalle",
    "StarlinkFacturaLineas": "StarlinkFacturaLinea",
    "ComprobanteClienteLineas": "ComprobanteClienteLinea",
    "GeozonaEventos": "GeozonaEvento",
    "ConsumoCiclos": "ConsumoCiclo",
    "NivelesOrganizacionConfig": "NivelOrganizacionConfig",
    "GeozonaH3Celdas": "GeozonaH3Celda",
    "GeozonaPoliticas": "GeozonaPolitica",
    "PoliticasServicio": "PoliticaServicio",
    "HistoricosMeses": "HistoricoMes",
}

for plural, singular in words_to_singular.items():
    content = re.sub(r'\b' + plural + r'\b', singular, content)

with open("backend/app/models.py", "w") as f:
    f.write(content)
