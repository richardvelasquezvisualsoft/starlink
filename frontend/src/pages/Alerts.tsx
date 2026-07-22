import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  BellRing,
  Clock,
  Check,
  RefreshCw,
  Satellite
} from 'lucide-react';
import client from '../api/client';

interface AlertaItem {
  id: number;
  dispositivo_id: number;
  dispositivo: {
    device_id: string;
    nombre: string;
  };
  catalogo_alerta_id: number;
  catalogo_alerta: {
    codigo_alerta: string;
    nombre: string;
    descripcion: string;
    criticidad: string;
  };
  fecha_hora_deteccion: string;
  activa: boolean;
}

const Alerts: React.FC = () => {
  const [activeAlerts, setActiveAlerts] = useState<AlertaItem[]>([]);
  const [resolvedAlerts, setResolvedAlerts] = useState<AlertaItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchAlerts = async () => {
    setIsLoading(true);
    try {
      const res = await client.get('/alertas');
      const active = res.data.filter((a: AlertaItem) => a.activa);
      const resolved = res.data.filter((a: AlertaItem) => !a.activa);
      setActiveAlerts(active);
      setResolvedAlerts(resolved);
    } catch (err) {}
    setIsLoading(false);
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleResolve = async (id: number) => {
    try {
      await client.put(`/alertas/${id}/resolve`);
      fetchAlerts();
    } catch (err) {}
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans flex items-center gap-2">
            <BellRing className="w-6 h-6 text-st-offline animate-pulse" />
            Alertas de Flota
          </h1>
          <p className="text-xs text-st-muted mt-0.5">Control de incidencias, fallas operativas y alarmas en tiempo real.</p>
        </div>
        
        <button
          onClick={fetchAlerts}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-2 bg-st-surface border border-st-border rounded-lg text-sm text-st-muted hover:text-white hover:border-white/20 transition-all active:scale-[0.98] cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Active Alerts Panel (List) */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-st-offline animate-ping block" />
            Alertas Activas ({activeAlerts.length})
          </h2>

          {activeAlerts.length === 0 ? (
            <div className="bg-st-surface border border-st-border rounded-xl p-8 text-center text-st-muted text-sm flex flex-col items-center justify-center space-y-3">
              <CheckCircle className="w-12 h-12 text-st-online opacity-80" />
              <div>
                <p className="font-bold text-white">¡Flota Operativa sin Incidencias!</p>
                <p className="text-xs mt-1">No se registran alarmas críticas ni advertencias en este momento.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {activeAlerts.map(alert => (
                <div
                  key={alert.id}
                  className={`bg-st-surface border rounded-xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative overflow-hidden ${alert.catalogo_alerta.criticidad === 'critical' ? 'border-st-offline/30' : 'border-st-warning/30'}`}
                >
                  {/* Critic border indicator */}
                  <div className={`absolute top-0 bottom-0 left-0 w-1 ${alert.catalogo_alerta.criticidad === 'critical' ? 'bg-st-offline' : 'bg-st-warning'}`} />

                  {/* Left: Details */}
                  <div className="pl-2 space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${alert.catalogo_alerta.criticidad === 'critical' ? 'bg-st-offline/10 text-st-offline border-st-offline/20' : 'bg-st-warning/10 text-st-warning border-st-warning/20'}`}>
                        {alert.catalogo_alerta.criticidad === 'critical' ? 'Crítico' : 'Advertencia'}
                      </span>
                      <span className="text-xs text-st-muted font-mono flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(alert.fecha_hora_deteccion).toLocaleString()}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-white">{alert.catalogo_alerta.nombre}</h3>
                      <p className="text-xs text-st-muted mt-0.5">{alert.catalogo_alerta.descripcion}</p>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-semibold pt-1">
                      <Satellite className="w-4 h-4 text-st-accent flex-shrink-0" />
                      <span className="text-white">{alert.dispositivo.nombre}</span>
                      <span className="text-st-muted font-mono text-[10px]">({alert.dispositivo.device_id})</span>
                    </div>
                  </div>

                  {/* Right: Action */}
                  <button
                    onClick={() => handleResolve(alert.id)}
                    className="flex items-center gap-1.5 px-4 py-2 border border-st-border rounded-lg text-xs font-bold text-white hover:bg-white/5 active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap self-stretch sm:self-center justify-center"
                  >
                    <Check className="w-4 h-4 text-st-online" />
                    <span>Marcar Resuelta</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Resolved Alerts Log (History) */}
        <div className="bg-st-surface border border-st-border rounded-xl p-5 flex flex-col space-y-4">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-st-online" />
              Historial de Alertas Resueltas
            </h2>
            <p className="text-[10px] text-st-muted">Registro histórico de problemas solventados.</p>
          </div>

          <div className="flex-1 max-h-[480px] overflow-y-auto space-y-3.5 pr-1">
            {resolvedAlerts.length === 0 ? (
              <p className="text-xs text-st-muted py-8 text-center">Sin alertas resueltas en el historial.</p>
            ) : (
              resolvedAlerts.map(alert => (
                <div key={alert.id} className="border border-st-border bg-st-bg/40 rounded-lg p-3 text-xs space-y-1.5">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-mono text-st-muted uppercase font-bold">{alert.catalogo_alerta.codigo_alerta}</span>
                    <span className="text-st-muted">{new Date(alert.fecha_hora_deteccion).toLocaleDateString()}</span>
                  </div>
                  <h4 className="font-bold text-white truncate">{alert.catalogo_alerta.nombre}</h4>
                  <div className="flex justify-between items-center text-[10px] text-st-muted">
                    <span className="truncate max-w-[120px]">{alert.dispositivo.nombre}</span>
                    <span className="text-st-online font-bold uppercase">Resuelta</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Alerts;
