import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AccessDenied: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-st-background text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-st-surface border border-red-500/30 rounded-2xl p-8 text-center space-y-6 shadow-2xl shadow-red-500/10">
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border border-red-500/20">
          <AlertTriangle className="w-10 h-10 text-red-500" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-white">Acceso Denegado</h1>
          <p className="text-st-muted text-sm">
            No tienes los permisos necesarios para acceder a esta vista o el rol asociado no corresponde a este entorno.
          </p>
        </div>

        <button
          onClick={() => {
            localStorage.removeItem('starlink_token');
            localStorage.removeItem('starlink_user');
            navigate('/login');
          }}
          className="w-full py-3 px-4 bg-st-surface border border-st-border hover:bg-white/5 hover:border-white/20 text-white text-sm font-semibold rounded-xl transition-all duration-200"
        >
          Cerrar sesión e intentar con otra cuenta
        </button>
      </div>
    </div>
  );
};

export default AccessDenied;
