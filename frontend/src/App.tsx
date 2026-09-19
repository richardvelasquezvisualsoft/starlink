import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { TenantThemeProvider } from './context/TenantThemeContext';
import { ResellerThemeProvider } from './context/ResellerThemeContext';
import Layout from './components/Layout';

import AccessDenied from './components/AccessDenied';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import DashboardClienteGlobal from './pages/DashboardClienteGlobal';
import Maintenance from './pages/Maintenance';
import Alerts from './pages/Alerts';
import ConsumptionReport from './pages/ConsumptionReport';
import TelemetryReport from './pages/TelemetryReport';
import GeolocationMap from './pages/GeolocationMap';
import BillingReport from './pages/BillingReport';
import { ClienteDashboard } from './pages/cliente/ClienteDashboard';
import { ClienteServicios } from './pages/cliente/ClienteServicios';
import { ClienteReportes } from './pages/cliente/ClienteReportes';

import Hierarchy from './pages/Hierarchy';
import CostCenters from './pages/CostCenters';
import ResellerClients from './pages/ResellerClients';
import NocGlobal from './pages/NocGlobal';

import Operaciones from './pages/Operaciones';
import Provisioning from './pages/Provisioning';

import AnaliticaCartera from './pages/analitica/AnaliticaCartera';
import AnaliticaCalidad from './pages/analitica/AnaliticaCalidad';
import AnaliticaFlota from './pages/analitica/AnaliticaFlota';
import AnaliticaCostos from './pages/analitica/AnaliticaCostos';
import AnaliticaPerformance from './pages/analitica/AnaliticaPerformance';
import AnaliticaProductos from './pages/analitica/AnaliticaProductos';

import { ClienteEquipos } from './pages/cliente/ClienteEquipos';
import { ClientePlanes } from './pages/cliente/ClientePlanes';
import { ClienteEstadoUbicacion } from './pages/cliente/ClienteEstadoUbicacion';
import { ClienteCalidadServicio } from './pages/cliente/ClienteCalidadServicio';
import { ClienteContratadoVsFacturado } from './pages/cliente/ClienteContratadoVsFacturado';
import { ClienteMisComprobantes } from './pages/cliente/ClienteMisComprobantes';
import { ClienteControlDatos } from './pages/cliente/ClienteControlDatos';
import { ClienteAccionesRemotas } from './pages/cliente/ClienteAccionesRemotas';
import { ClienteAsignaciones } from './pages/cliente/ClienteAsignaciones';
import { ClienteConfiguracionGlobal } from './pages/cliente/ClienteConfiguracionGlobal';
import { ClienteUnidadOrganizacional } from './pages/cliente/ClienteUnidadOrganizacional';

import UsuariosAccesos from './pages/reseller/UsuariosAccesos';
import Seguridad from './pages/reseller/Seguridad';
import PermisosMenu from './pages/reseller/PermisosMenu';
import ConfiguracionSLA from './pages/reseller/ConfiguracionSLA';
import Perfil from './pages/reseller/Perfil';
import ClientePerfil from './pages/cliente/ClientePerfil';
import CambiarPassword from './pages/reseller/CambiarPassword';
import ClienteCambiarPassword from './pages/cliente/ClienteCambiarPassword';
import Solicitudes from './pages/reseller/Solicitudes';

import { ContratosComercialesPage } from './pages/ContratosComercialesPage';

// Protected Route Wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode, requiredRole?: 'CLIENTE' | 'RESELLER' }> = ({ children, requiredRole }) => {
  const token = localStorage.getItem('starlink_token');
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const userJson = localStorage.getItem('starlink_user');
  let userRoles: string[] = [];
  if (userJson) {
    try {
      const u = JSON.parse(userJson);
      userRoles = Array.isArray(u.role_codes) ? u.role_codes : [u.role_codes];
    } catch (e) {}
  }

  const hasRole = (role: string) => {
    return userRoles.some((r: string) => String(r).trim().toUpperCase() === role);
  };

  // Enforce strictly role based routing
  if (requiredRole) {
    // Allow RESELLER and CLIENTE to see all options across the platform
    if (!hasRole('RESELLER') && !hasRole('CLIENTE') && !hasRole(requiredRole)) {
       return <AccessDenied />;
    }
  }

  // Explicit layout injection based on requiredRole to completely decouple from URL parsing in Layout
  if (requiredRole === 'RESELLER') {
    return <Layout type="RESELLER">{children}</Layout>;
  } else if (requiredRole === 'CLIENTE') {
    return <Layout type="CLIENTE">{children}</Layout>;
  }

  return <Layout>{children}</Layout>;
};

const App: React.FC = () => {
  return (
    <ResellerThemeProvider>
      <TenantThemeProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/restablecer-password" element={<ResetPassword />} />
            <Route path="/recuperar-password" element={<ResetPassword />} />

            {/* ========================================================
                1. RESELLER GLOBAL SCOPE
                ======================================================== */}
            <Route path="/reseller/dashboard" element={<ProtectedRoute requiredRole="RESELLER"><Dashboard /></ProtectedRoute>} />
            <Route path="/reseller/dashboard-cliente" element={<ProtectedRoute requiredRole="RESELLER"><DashboardClienteGlobal /></ProtectedRoute>} />
            <Route path="/reseller/clientes" element={<ProtectedRoute requiredRole="RESELLER"><ResellerClients /></ProtectedRoute>} />
            <Route path="/reseller/noc" element={<ProtectedRoute requiredRole="RESELLER"><NocGlobal /></ProtectedRoute>} />
            <Route path="/reseller/solicitudes" element={<ProtectedRoute requiredRole="RESELLER"><Solicitudes /></ProtectedRoute>} />
            <Route path="/reseller/alertas" element={<ProtectedRoute requiredRole="RESELLER"><Alerts /></ProtectedRoute>} />
            <Route path="/reseller/operaciones" element={<ProtectedRoute requiredRole="RESELLER"><Operaciones /></ProtectedRoute>} />
            <Route path="/reseller/operaciones/*" element={<ProtectedRoute requiredRole="RESELLER"><Operaciones /></ProtectedRoute>} />
            <Route path="/reseller/aprovisionamiento" element={<ProtectedRoute requiredRole="RESELLER"><Provisioning /></ProtectedRoute>} />
            <Route path="/reseller/aprovisionamiento/*" element={<ProtectedRoute requiredRole="RESELLER"><Provisioning /></ProtectedRoute>} />
            
            {/* ANALÍTICA RESELLER */}
            <Route path="/reseller/analitica/cartera" element={<ProtectedRoute requiredRole="RESELLER"><AnaliticaCartera /></ProtectedRoute>} />
            <Route path="/reseller/analitica/calidad" element={<ProtectedRoute requiredRole="RESELLER"><AnaliticaCalidad /></ProtectedRoute>} />
            <Route path="/reseller/analitica/flota" element={<ProtectedRoute requiredRole="RESELLER"><AnaliticaFlota /></ProtectedRoute>} />
            <Route path="/reseller/analitica/costos" element={<ProtectedRoute requiredRole="RESELLER"><AnaliticaCostos /></ProtectedRoute>} />
            <Route path="/reseller/analitica/performance" element={<ProtectedRoute requiredRole="RESELLER"><AnaliticaPerformance /></ProtectedRoute>} />
            <Route path="/reseller/analitica/productos" element={<ProtectedRoute requiredRole="RESELLER"><AnaliticaProductos /></ProtectedRoute>} />

            {/* REPORTES RESELLER */}
            <Route path="/reseller/reportes/mantenimiento" element={<ProtectedRoute requiredRole="RESELLER"><Maintenance /></ProtectedRoute>} />
            <Route path="/reseller/consumo" element={<ProtectedRoute requiredRole="RESELLER"><ConsumptionReport /></ProtectedRoute>} />
            <Route path="/reseller/reportes/telemetria" element={<ProtectedRoute requiredRole="RESELLER"><TelemetryReport /></ProtectedRoute>} />
            <Route path="/reseller/reportes/geolocalizacion" element={<ProtectedRoute requiredRole="RESELLER"><GeolocationMap /></ProtectedRoute>} />
            <Route path="/reseller/facturacion" element={<ProtectedRoute requiredRole="RESELLER"><BillingReport /></ProtectedRoute>} />

            {/* MANTENIMIENTO RESELLER */}
            <Route path="/reseller/contratos" element={<ProtectedRoute requiredRole="RESELLER"><ContratosComercialesPage /></ProtectedRoute>} />
            <Route path="/reseller/mantenimiento/organizacion" element={<ProtectedRoute requiredRole="RESELLER"><Hierarchy /></ProtectedRoute>} />
            <Route path="/reseller/mantenimiento/centros-costos" element={<ProtectedRoute requiredRole="RESELLER"><CostCenters /></ProtectedRoute>} />

            {/* CONFIGURACIÓN RESELLER */}
            <Route path="/reseller/usuarios" element={<ProtectedRoute requiredRole="RESELLER"><UsuariosAccesos /></ProtectedRoute>} />
            <Route path="/reseller/seguridad" element={<ProtectedRoute requiredRole="RESELLER"><Seguridad /></ProtectedRoute>} />
            <Route path="/reseller/configuracion/permisos" element={<ProtectedRoute requiredRole="RESELLER"><PermisosMenu /></ProtectedRoute>} />
            <Route path="/reseller/configuracion/sla" element={<ProtectedRoute requiredRole="RESELLER"><ConfiguracionSLA /></ProtectedRoute>} />

            {/* MI PERFIL Y CONTRASEÑA RESELLER */}
            <Route path="/reseller/perfil" element={<ProtectedRoute requiredRole="RESELLER"><Perfil /></ProtectedRoute>} />
            <Route path="/reseller/perfil/password" element={<ProtectedRoute requiredRole="RESELLER"><CambiarPassword /></ProtectedRoute>} />

            {/* ========================================================
                2. CLIENTE SCOPE
                ======================================================== */}
            <Route path="/cliente/dashboard" element={<ProtectedRoute requiredRole="CLIENTE"><ClienteDashboard /></ProtectedRoute>} />
            
            {/* SERVICIOS Y EQUIPOS */}
            <Route path="/cliente/servicios" element={<ProtectedRoute requiredRole="CLIENTE"><ClienteServicios /></ProtectedRoute>} />
            <Route path="/cliente/servicios/equipos" element={<ProtectedRoute requiredRole="CLIENTE"><ClienteEquipos /></ProtectedRoute>} />
            <Route path="/cliente/servicios/planes" element={<ProtectedRoute requiredRole="CLIENTE"><ClientePlanes /></ProtectedRoute>} />
            
            {/* CALIDAD Y MONITOREO */}
            <Route path="/cliente/calidad/estado-ubicacion" element={<ProtectedRoute requiredRole="CLIENTE"><ClienteEstadoUbicacion /></ProtectedRoute>} />
            <Route path="/cliente/calidad/calidad-servicio" element={<ProtectedRoute requiredRole="CLIENTE"><ClienteCalidadServicio /></ProtectedRoute>} />
            <Route path="/cliente/calidad/telemetria" element={<ProtectedRoute requiredRole="CLIENTE"><TelemetryReport /></ProtectedRoute>} />
            <Route path="/cliente/calidad/alertas" element={<ProtectedRoute requiredRole="CLIENTE"><Alerts /></ProtectedRoute>} />
            
            {/* FACTURACIÓN */}
            <Route path="/cliente/facturacion/reportes" element={<ProtectedRoute requiredRole="CLIENTE"><ClienteReportes /></ProtectedRoute>} />
            <Route path="/cliente/facturacion/comparativo" element={<ProtectedRoute requiredRole="CLIENTE"><ClienteContratadoVsFacturado /></ProtectedRoute>} />
            <Route path="/cliente/facturacion/comprobantes" element={<ProtectedRoute requiredRole="CLIENTE"><ClienteMisComprobantes /></ProtectedRoute>} />
            
            {/* OPERACIONES */}
            <Route path="/cliente/operaciones/control-datos" element={<ProtectedRoute requiredRole="CLIENTE"><ClienteControlDatos /></ProtectedRoute>} />
            <Route path="/cliente/operaciones/remotas" element={<ProtectedRoute requiredRole="CLIENTE"><ClienteAccionesRemotas /></ProtectedRoute>} />
            <Route path="/cliente/operaciones/geozonas" element={<ProtectedRoute requiredRole="CLIENTE"><GeolocationMap /></ProtectedRoute>} />
            
            {/* SOLICITUDES */}
            <Route path="/cliente/solicitudes" element={<ProtectedRoute requiredRole="CLIENTE"><Solicitudes /></ProtectedRoute>} />
            
            {/* MANTENIMIENTO */}
            <Route path="/cliente/mantenimiento/organizacion" element={<ProtectedRoute requiredRole="CLIENTE"><ClienteUnidadOrganizacional levelNumProp={1} /></ProtectedRoute>} />
            <Route path="/cliente/mantenimiento/organizacion/nivel/:levelNum" element={<ProtectedRoute requiredRole="CLIENTE"><ClienteUnidadOrganizacional /></ProtectedRoute>} />
            <Route path="/cliente/mantenimiento/centros-costos" element={<ProtectedRoute requiredRole="CLIENTE"><CostCenters /></ProtectedRoute>} />
            <Route path="/cliente/mantenimiento/asignaciones" element={<ProtectedRoute requiredRole="CLIENTE"><ClienteAsignaciones /></ProtectedRoute>} />
            
            {/* CONFIGURACIÓN */}
            <Route path="/cliente/configuracion/global" element={<ProtectedRoute requiredRole="CLIENTE"><ClienteConfiguracionGlobal /></ProtectedRoute>} />

            {/* MI PERFIL Y CONTRASEÑA */}
            <Route path="/cliente/perfil" element={<ProtectedRoute requiredRole="CLIENTE"><ClientePerfil /></ProtectedRoute>} />
            <Route path="/cliente/perfil/password" element={<ProtectedRoute requiredRole="CLIENTE"><ClienteCambiarPassword /></ProtectedRoute>} />

            {/* Redirects */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/dashboard" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </TenantThemeProvider>
    </ResellerThemeProvider>
  );
};

export default App;
