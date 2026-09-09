import React, { useState, useEffect } from 'react';
import AnaliticaLayout from './AnaliticaLayout';
import client from '../../api/client';
import { Database, CheckCircle2, XCircle, Clock, RefreshCw } from 'lucide-react';

interface WorkflowItem {
  id: number;
  codigo: string;
  cliente: string;
  accion: string;
  fecha_inicio: string;
  fecha_fin: string;
  duracion_minutos: number;
  estado: string;
  paso_error?: string;
  mensaje_error?: string;
}

interface PerformanceData {
  resumen: {
    iniciados: number;
    completados: number;
    con_error: number;
    tasa_exito_pct: number;
    tiempo_promedio_minutos: number;
  };
  tabla_workflows: WorkflowItem[];
}

const AnaliticaPerformance: React.FC = () => {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const res = await client.get('/reseller/analytics/performance');
        setData(res.data);
      } catch (err) {
        console.error('Error fetching performance analytics:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <AnaliticaLayout>
      {isLoading ? (
        <div className="py-20 text-center text-st-muted bg-st-surface border border-st-border rounded-2xl">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-st-accent" />
          <p className="text-xs font-semibold">Cargando performance de aprovisionamiento...</p>
        </div>
      ) : !data ? (
        <div className="py-12 text-center text-st-muted bg-st-surface border border-st-border rounded-2xl">
          Sin información de performance disponible.
        </div>
      ) : (
        <div className="space-y-6">
          {/* CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-st-surface border border-st-border rounded-xl p-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-st-muted flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-st-accent" /> Workflows Iniciados
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-black text-white font-mono">{data.resumen.iniciados}</span>
                <span className="text-[10px] text-st-muted">Totales</span>
              </div>
            </div>

            <div className="bg-st-surface border border-st-border rounded-xl p-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-st-muted flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-st-online" /> Tasa de Éxito
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-black text-st-online font-mono">{data.resumen.tasa_exito_pct}%</span>
                <span className="text-[10px] text-st-online font-semibold">{data.resumen.completados} completados</span>
              </div>
            </div>

            <div className="bg-st-surface border border-st-border rounded-xl p-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-st-muted flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5 text-st-offline" /> Con Error
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-black text-st-offline font-mono">{data.resumen.con_error}</span>
                <span className="text-[10px] text-st-muted">Workflows</span>
              </div>
            </div>

            <div className="bg-st-surface border border-st-border rounded-xl p-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-st-muted flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-purple-400" /> Tiempo Promedio
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-black text-white font-mono">{data.resumen.tiempo_promedio_minutos} <span className="text-xs font-normal">min</span></span>
                <span className="text-[10px] text-purple-400 font-semibold">Por alta</span>
              </div>
            </div>
          </div>

          {/* TABLA DE WORKFLOWS DE APROVISIONAMIENTO */}
          <div className="bg-st-surface border border-st-border rounded-xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-st-border bg-st-bg/40">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Database className="w-4 h-4 text-st-accent" />
                Historial y Rendimiento de Workflows de Aprovisionamiento
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-st-bg/80 text-st-muted uppercase tracking-wider font-semibold border-b border-st-border">
                    <th className="py-3 px-4">Código</th>
                    <th className="py-3 px-4">Cliente</th>
                    <th className="py-3 px-4">Acción</th>
                    <th className="py-3 px-4 text-center">Inicio</th>
                    <th className="py-3 px-4 text-center">Fin</th>
                    <th className="py-3 px-4 text-center">Duración</th>
                    <th className="py-3 px-4 text-center">Paso con Error</th>
                    <th className="py-3 px-4 text-right">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-st-border/50">
                  {data.tabla_workflows.map(item => (
                    <tr key={item.id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="py-3 px-4 font-mono text-st-accent font-bold">{item.codigo}</td>
                      <td className="py-3 px-4 font-bold text-white">{item.cliente}</td>
                      <td className="py-3 px-4 text-white">{item.accion}</td>
                      <td className="py-3 px-4 text-center font-mono text-st-muted text-[11px]">{item.fecha_inicio}</td>
                      <td className="py-3 px-4 text-center font-mono text-st-muted text-[11px]">{item.fecha_fin}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-white">{item.duracion_minutos} min</td>
                      <td className="py-3 px-4 text-center">
                        {item.paso_error ? (
                          <span className="text-st-offline font-semibold text-[11px]">{item.paso_error}</span>
                        ) : (
                          <span className="text-st-muted text-[11px]">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded border ${
                          item.estado === 'COMPLETADO'
                            ? 'bg-st-online/10 text-st-online border-st-online/30'
                            : 'bg-st-offline/10 text-st-offline border-st-offline/30'
                        }`}>
                          {item.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </AnaliticaLayout>
  );
};

export default AnaliticaPerformance;
