import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  TrendingUp,
  Activity,
  Satellite,
  CreditCard,
  Database,
  Briefcase
} from 'lucide-react';

interface AnaliticaLayoutProps {
  children: React.ReactNode;
}

const AnaliticaLayout: React.FC<AnaliticaLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  const tabs = [
    { id: 'cartera', name: 'Cartera y Crecimiento', path: '/reseller/analitica/cartera', icon: TrendingUp },
    { id: 'calidad', name: 'Calidad Histórica', path: '/reseller/analitica/calidad', icon: Activity },
    { id: 'flota', name: 'Evolución de Flota', path: '/reseller/analitica/flota', icon: Satellite },
    { id: 'costos', name: 'Costos por Cliente', path: '/reseller/analitica/costos', icon: CreditCard },
    { id: 'performance', name: 'Performance Aprov.', path: '/reseller/analitica/performance', icon: Database },
    { id: 'productos', name: 'Productos / Planes', path: '/reseller/analitica/productos', icon: Briefcase },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER */}
      <div className="bg-st-surface border border-st-border p-6 rounded-2xl shadow-lg relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-st-accent/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-st-accent/10 border border-st-accent/20 rounded-xl text-st-accent">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white font-sans flex items-center gap-2">
                Analítica Reseller
              </h1>
              <p className="text-xs text-st-muted mt-0.5">
                Inteligencia de negocio histórica, tendencias de flota, calidad y distribución de costos
              </p>
            </div>
          </div>
        </div>

        {/* TABS NAVIGATION */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-st-border/60 overflow-x-auto no-scrollbar">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = currentPath === tab.path || (currentPath === '/reseller/analitica' && tab.id === 'cartera');
            return (
              <button
                key={tab.id}
                onClick={() => navigate(tab.path)}
                className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                  isActive
                    ? 'bg-st-accent/10 text-st-accent border border-st-accent/30 shadow-md'
                    : 'text-st-muted hover:text-white hover:bg-st-surface border border-transparent'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* VIEW CONTENT */}
      <div>{children}</div>
    </div>
  );
};

export default AnaliticaLayout;
