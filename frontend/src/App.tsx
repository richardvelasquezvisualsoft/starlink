import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Maintenance from './pages/Maintenance';
import Alerts from './pages/Alerts';
import ConsumptionReport from './pages/ConsumptionReport';
import TelemetryReport from './pages/TelemetryReport';
import GeolocationMap from './pages/GeolocationMap';
import BillingReport from './pages/BillingReport';

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

import UsuariosAccesos from './pages/reseller/UsuariosAccesos';
import Seguridad from './pages/reseller/Seguridad';
import Perfil from './pages/reseller/Perfil';
import CambiarPassword from './pages/reseller/CambiarPassword';
import Solicitudes from './pages/reseller/Solicitudes';

import { ContratosComercialesPage } from './pages/ContratosComercialesPage';

// Protected Route Wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = localStorage.getItem('starlink_token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <Layout>{children}</Layout>;
};

// Simple visual wrapper for operational reports placeholders
const ReportView: React.FC<{ title: string; subtitle: string; description: string }> = ({ title, subtitle, description }) => {
  return (
    <div className="bg-st-surface border border-st-border rounded-xl p-8 text-center space-y-4">
      <div className="w-16 h-16 rounded-full bg-st-accent/15 border border-st-accent/30 flex items-center justify-center text-st-accent mx-auto">
        <Activity className="w-8 h-8 animate-pulse" />
      </div>
      <div className="space-y-1.5">
        <h2 className="text-xl font-bold text-white font-sans uppercase tracking-wider">{title}</h2>
        <p className="text-xs text-st-accent font-semibold">{subtitle}</p>
        <p className="text-sm text-st-muted max-w-md mx-auto">{description}</p>
      </div>
      <div className="pt-4">
        <a
          href="/dashboard"
          className="px-5 py-2.5 bg-st-primary text-black text-xs font-bold uppercase rounded-lg hover:bg-white/90 active:scale-[0.98] transition-all inline-block"
        >
          Volver a Dashboard General
        </a>
      </div>
    </div>
  );
};

// Re-using Lucide Icon inside the placeholder component
import { Activity } from 'lucide-react';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Login Route */}
        <Route path="/login" element={<Login />} />

        {/* ========================================================
            1. RESELLER GLOBAL SCOPE
            ======================================================== */}
        <Route path="/reseller/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/reseller/clientes" element={<ProtectedRoute><ResellerClients /></ProtectedRoute>} />
        <Route path="/reseller/noc" element={<ProtectedRoute><NocGlobal /></ProtectedRoute>} />
        <Route path="/reseller/solicitudes" element={<ProtectedRoute><Solicitudes /></ProtectedRoute>} />
        <Route path="/reseller/alertas" element={<ProtectedRoute><Alerts /></ProtectedRoute>} />
        <Route path="/reseller/operaciones" element={<ProtectedRoute><Operaciones /></ProtectedRoute>} />
        <Route path="/reseller/operaciones/*" element={<ProtectedRoute><Operaciones /></ProtectedRoute>} />
        <Route path="/reseller/aprovisionamiento" element={<ProtectedRoute><Provisioning /></ProtectedRoute>} />
        <Route path="/reseller/aprovisionamiento/*" element={<ProtectedRoute><Provisioning /></ProtectedRoute>} />
        
        {/* ANALÍTICA RESELLER */}
        <Route path="/reseller/analitica" element={<ProtectedRoute><AnaliticaCartera /></ProtectedRoute>} />
        <Route path="/reseller/analitica/cartera" element={<ProtectedRoute><AnaliticaCartera /></ProtectedRoute>} />
        <Route path="/reseller/analitica/calidad" element={<ProtectedRoute><AnaliticaCalidad /></ProtectedRoute>} />
        <Route path="/reseller/analitica/flota" element={<ProtectedRoute><AnaliticaFlota /></ProtectedRoute>} />
        <Route path="/reseller/analitica/costos" element={<ProtectedRoute><AnaliticaCostos /></ProtectedRoute>} />
        <Route path="/reseller/analitica/performance" element={<ProtectedRoute><AnaliticaPerformance /></ProtectedRoute>} />
        <Route path="/reseller/analitica/productos" element={<ProtectedRoute><AnaliticaProductos /></ProtectedRoute>} />

        {/* GESTIÓN COMERCIAL */}
        <Route path="/reseller/consumo" element={<ProtectedRoute><ConsumptionReport /></ProtectedRoute>} />
        <Route path="/reseller/facturacion" element={<ProtectedRoute><BillingReport /></ProtectedRoute>} />
        <Route path="/reseller/facturacion-starlink" element={<ProtectedRoute><BillingReport /></ProtectedRoute>} />
        <Route path="/reseller/contratos" element={<ProtectedRoute><ContratosComercialesPage /></ProtectedRoute>} />

        {/* ADMINISTRACIÓN */}
        <Route path="/reseller/usuarios" element={<ProtectedRoute><UsuariosAccesos /></ProtectedRoute>} />
        <Route path="/reseller/seguridad" element={<ProtectedRoute><Seguridad /></ProtectedRoute>} />
        <Route path="/reseller/perfil" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />
        <Route path="/reseller/perfil/password" element={<ProtectedRoute><CambiarPassword /></ProtectedRoute>} />

        {/* ========================================================
            2. RESELLER CONTEXTUAL SCOPE (CLIENTE ESPECÍFICO)
            ======================================================== */}
        <Route path="/reseller/clientes/:tenantId/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/reseller/clientes/:tenantId/servicios" element={<ProtectedRoute><Maintenance /></ProtectedRoute>} />
        <Route path="/reseller/clientes/:tenantId/equipos" element={<ProtectedRoute><Maintenance /></ProtectedRoute>} />
        <Route path="/reseller/clientes/:tenantId/telemetria" element={<ProtectedRoute><TelemetryReport /></ProtectedRoute>} />
        <Route path="/reseller/clientes/:tenantId/consumo" element={<ProtectedRoute><ConsumptionReport /></ProtectedRoute>} />
        <Route path="/reseller/clientes/:tenantId/alertas" element={<ProtectedRoute><Alerts /></ProtectedRoute>} />
        <Route path="/reseller/clientes/:tenantId/organizacion" element={<ProtectedRoute><Hierarchy /></ProtectedRoute>} />
        <Route path="/reseller/clientes/:tenantId/centros-costos" element={<ProtectedRoute><CostCenters /></ProtectedRoute>} />
        <Route path="/reseller/clientes/:tenantId/geozonas" element={<ProtectedRoute><GeolocationMap /></ProtectedRoute>} />
        <Route path="/reseller/clientes/:tenantId/comprobantes" element={<ProtectedRoute><ReportView title="Comprobantes" subtitle="Contexto Cliente" description="Comprobantes registrados por el cliente activo." /></ProtectedRoute>} />
        <Route path="/reseller/clientes/:tenantId/historicos" element={<ProtectedRoute><ReportView title="Históricos" subtitle="Contexto Cliente" description="Datos históricos del cliente." /></ProtectedRoute>} />
        <Route path="/reseller/clientes/:tenantId/contrato" element={<ProtectedRoute><ReportView title="Contrato" subtitle="Contexto Cliente" description="Contrato comercial del cliente." /></ProtectedRoute>} />

        {/* ========================================================
            3. CLIENTE AUTENTICADO SCOPE
            ======================================================== */}
        <Route path="/cliente/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/cliente/servicios" element={<ProtectedRoute><Maintenance /></ProtectedRoute>} />
        <Route path="/cliente/telemetria" element={<ProtectedRoute><TelemetryReport /></ProtectedRoute>} />
        <Route path="/cliente/consumo" element={<ProtectedRoute><ConsumptionReport /></ProtectedRoute>} />
        <Route path="/cliente/alertas" element={<ProtectedRoute><Alerts /></ProtectedRoute>} />
        <Route path="/cliente/organizacion" element={<ProtectedRoute><Hierarchy /></ProtectedRoute>} />
        <Route path="/cliente/centros-costos" element={<ProtectedRoute><CostCenters /></ProtectedRoute>} />
        <Route path="/cliente/geozonas" element={<ProtectedRoute><GeolocationMap /></ProtectedRoute>} />
        <Route path="/cliente/comprobantes" element={<ProtectedRoute><ReportView title="Mis Comprobantes" subtitle="Cliente Autenticado" description="Gestión de facturas y boletas." /></ProtectedRoute>} />
        <Route path="/cliente/historicos" element={<ProtectedRoute><ReportView title="Mis Históricos" subtitle="Cliente Autenticado" description="Búsqueda de data histórica." /></ProtectedRoute>} />
        <Route path="/cliente/contrato" element={<ProtectedRoute><ReportView title="Mi Contrato" subtitle="Cliente Autenticado" description="Detalles del acuerdo de servicio." /></ProtectedRoute>} />

        {/* Redirects */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/dashboard" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
