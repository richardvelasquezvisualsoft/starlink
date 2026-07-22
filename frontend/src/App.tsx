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

        {/* Protected Dashboard & Operations Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/operation/alerts"
          element={
            <ProtectedRoute>
              <Alerts />
            </ProtectedRoute>
          }
        />

        <Route
          path="/operation/geo"
          element={
            <ProtectedRoute>
              <GeolocationMap />
            </ProtectedRoute>
          }
        />

        {/* Maintenance Routes mapped by subpaths */}
        <Route
          path="/maintenance/accounts"
          element={
            <ProtectedRoute>
              <Maintenance />
            </ProtectedRoute>
          }
        />
        <Route
          path="/maintenance/devices"
          element={
            <ProtectedRoute>
              <Maintenance />
            </ProtectedRoute>
          }
        />
        <Route
          path="/maintenance/lines"
          element={
            <ProtectedRoute>
              <Maintenance />
            </ProtectedRoute>
          }
        />
        <Route
          path="/maintenance/users"
          element={
            <ProtectedRoute>
              <Maintenance />
            </ProtectedRoute>
          }
        />

        {/* Reports routes */}
        <Route
          path="/reports/consumption"
          element={
            <ProtectedRoute>
              <ConsumptionReport />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/reports/telemetry"
          element={
            <ProtectedRoute>
              <TelemetryReport />
            </ProtectedRoute>
          }
        />

        {/* Redirects */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
