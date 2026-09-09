import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Satellite, Activity, Power, 
  BarChart3, AlertTriangle 
} from 'lucide-react';
import client from '../api/client';
import { useDemoStore } from '../store/demoStore';

const DeviceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const demoRole = useDemoStore((state) => state.role);
  
  const [device, setDevice] = useState<any>(null);
  const [telemetry, setTelemetry] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchDeviceData = async () => {
      try {
        setLoading(true);
        // Fetch device details
        const devRes = await client.get(`/dispositivos/${id}`);
        setDevice(devRes.data);
        
        // Fetch telemetry (last record)
        try {
            const telRes = await client.get(`/dispositivos/${id}/telemetry`);
            setTelemetry(telRes.data);
        } catch (e) {
            console.warn("No telemetry available");
        }
        
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    if (id) {
      fetchDeviceData();
    }
  }, [id]);

  const handleRemoteCommand = async (commandCode: string) => {
    try {
      setActionLoading(true);
      setActionSuccess(null);
      await client.post('/operation/execute', {
        device_id: device.device_id,
        command_code: commandCode
      });
      setActionSuccess(`Comando ${commandCode} enviado con éxito`);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err) {
      alert("Error al ejecutar el comando");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Activity className="w-8 h-8 text-st-accent animate-pulse" />
      </div>
    );
  }

  if (!device) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold text-white mb-4">Dispositivo no encontrado</h2>
        <button onClick={() => navigate(-1)} className="px-4 py-2 bg-st-surface rounded text-white hover:bg-white/10">Volver</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 bg-st-surface border border-st-border rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5 text-st-muted" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white uppercase tracking-wider flex items-center gap-3">
            <Satellite className="w-6 h-6 text-st-accent" />
            Ficha de Servicio
          </h1>
          <p className="text-st-muted text-sm font-mono mt-1">{device.device_id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-st-surface border border-st-border rounded-xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6">
               {telemetry?.estado_conexion === 'online' ? (
                  <span className="flex items-center gap-2 px-3 py-1 bg-st-online/15 border border-st-online/30 rounded text-st-online text-xs font-bold tracking-widest">
                    <span className="w-2 h-2 rounded-full bg-st-online animate-pulse" />
                    ONLINE
                  </span>
               ) : (
                  <span className="flex items-center gap-2 px-3 py-1 bg-st-offline/15 border border-st-offline/30 rounded text-st-offline text-xs font-bold tracking-widest">
                    <span className="w-2 h-2 rounded-full bg-st-offline" />
                    OFFLINE
                  </span>
               )}
            </div>

            <h2 className="text-sm font-bold text-st-muted uppercase tracking-wider mb-6">Detalles del Dispositivo</h2>
            
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-st-muted uppercase mb-1">Nombre / Alias</p>
                <p className="text-white font-semibold text-lg">{device.nombre || 'Sin nombre'}</p>
              </div>
              <div>
                <p className="text-xs text-st-muted uppercase mb-1">Modelo de Kit</p>
                <p className="text-white font-semibold">{device.kit_starlink || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-st-muted uppercase mb-1">Latitud</p>
                <p className="text-st-accent font-mono">{telemetry?.latitud_actual?.toFixed(6) || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-st-muted uppercase mb-1">Longitud</p>
                <p className="text-st-accent font-mono">{telemetry?.longitud_actual?.toFixed(6) || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Consumos */}
          <div className="bg-st-surface border border-st-border rounded-xl p-6">
            <h2 className="text-sm font-bold text-st-muted uppercase tracking-wider mb-6 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Consumo de Datos (Mes Actual)
            </h2>
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-st-bg border border-st-border rounded-lg p-4 text-center">
                <p className="text-xs text-st-muted uppercase mb-2">Total Consumido</p>
                <p className="text-3xl font-bold text-white">125 <span className="text-base text-st-muted font-normal">GB</span></p>
              </div>
              <div className="bg-st-bg border border-st-border rounded-lg p-4 text-center">
                <p className="text-xs text-st-muted uppercase mb-2">Límite del Plan</p>
                <p className="text-3xl font-bold text-white">1000 <span className="text-base text-st-muted font-normal">GB</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions Sidebar */}
        <div className="space-y-6">
          <div className="bg-st-surface border border-st-border rounded-xl p-6">
             <h2 className="text-sm font-bold text-st-muted uppercase tracking-wider mb-6 flex items-center gap-2">
              <Power className="w-4 h-4" />
              Acciones de Control
            </h2>

            {actionSuccess && (
              <div className="mb-4 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded">
                {actionSuccess}
              </div>
            )}

            <div className="space-y-3">
              <button 
                onClick={() => handleRemoteCommand('REBOOT')}
                disabled={actionLoading}
                className="w-full px-4 py-3 bg-[#D97706]/10 hover:bg-[#D97706]/20 border border-[#D97706]/30 text-[#D97706] text-sm font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <Power className="w-4 h-4" />
                Reiniciar Router / Antena
              </button>

              {demoRole === 'RESELLER' && (
                <>
                  <button 
                    onClick={() => handleRemoteCommand('STOW')}
                    disabled={actionLoading}
                    className="w-full px-4 py-3 bg-st-bg hover:bg-white/5 border border-st-border text-st-muted hover:text-white text-sm font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4 rotate-90" />
                    Stow (Guardar)
                  </button>
                  <button 
                    onClick={() => handleRemoteCommand('UNSTOW')}
                    disabled={actionLoading}
                    className="w-full px-4 py-3 bg-st-bg hover:bg-white/5 border border-st-border text-st-muted hover:text-white text-sm font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4 -rotate-90" />
                    Unstow (Desplegar)
                  </button>
                </>
              )}
            </div>
            
            <div className="mt-6 p-3 bg-white/5 rounded border border-st-border">
                <p className="text-[10px] text-st-muted uppercase tracking-wider leading-relaxed">
                  <AlertTriangle className="w-3 h-3 inline-block mr-1 text-[#D97706]" />
                  Los comandos de reinicio tardan aprox. 2-3 minutos en reflejarse. El comando STOW es exclusivo para Resellers.
                </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeviceDetail;
