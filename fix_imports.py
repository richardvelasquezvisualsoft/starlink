import os
import re

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
    "CatalogoAlertas": "CatalogoAlerta",
    "AlertasLog": "AlertaLog",
    "ComandosRemotosLog": "ComandoRemotoLog",
    "CatalogoOperacionesRemotas": "CatalogoOperacionRemota"
}

for root, dirs, files in os.walk('backend/app'):
    for file in files:
        if file.endswith('.py'):
            filepath = os.path.join(root, file)
            if 'models.py' in filepath:
                continue
            with open(filepath, 'r') as f:
                content = f.read()
                
            original_content = content
            for plural, singular in words_to_singular.items():
                content = re.sub(r'\b' + plural + r'\b', singular, content)
                
            if content != original_content:
                with open(filepath, 'w') as f:
                    f.write(content)
                print(f"Fixed {filepath}")
