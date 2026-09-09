import React, { useState, useEffect } from 'react';
import AnaliticaLayout from './AnaliticaLayout';
import client from '../../api/client';
import { Activity, ArrowUpDown, RefreshCw } from 'lucide-react';

interface CalidadItem {
  tenant_id: number;
  cliente: string;
  codigo: string;
  disponibilidad_starmonitor: number;
  latencia_ms: number;
  packet_loss_pct: number;
  download_gb: number;
  upload_gb: number;
  obstruccion_pct: number;
  minutos_offline: number;
  tendencia: string;
}

interface CalidadData {
  resumen: {
    disponibilidad_promedio_global: number;
    latencia_promedio_global: number;
    packet_loss_promedio_global: number;
    total_minutos_offline: number;
  };
  tabla_calidad: CalidadItem[];
}

const AnaliticaCalidad: React.FC = () => {
  const [data, setData] = useState<CalidadData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'disponibilidad' | 'latencia' | 'loss' | 'offline'>('disponibilidad');

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const res = await client.get('/reseller/analytics/calidad');
        setData(res.data);
      } catch (err) {
        console.error('Error fetching calidad analytics:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const sortedItems = data ? [...data.tabla_calidad].sort((a, b) => {
    if (sortBy === 'disponibilidad') return a.disponibilidad_starmonitor - b.disponibilidad_starmonitor;
    if (sortBy === 'latencia') return b.latencia_ms - a.latencia_ms;
    if (sortBy === 'loss') return b.packet_loss_pct - a.packet_loss_pct;
    if (sortBy === 'offline') return b.minutos_offline - a.minutos_offline;
    return 0;
  }) : [];

  return (
    <AnaliticaLayout>
      {isLoading ? (
        <div className="py-20 text-center text-st-muted bg-st-surface border border-st-border rounded-2xl">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-st-accent" />
          <p className="text-xs font-semibold">Cargando analítica de calidad histórica...</p>
        </div>
      ) : !data ? (
        <div className="py-12 text-center text-st-muted bg-st-surface border border-st-border rounded-2xl">
          Sin información de calidad disponible.
        </div>
      ) : (
        <div className="space-y-6">
          {/* CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-st-surface border border-st-border rounded-xl p-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-st-muted">
                Disponibilidad STARMONITOR
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-black text-st-online font-mono">{data.resumen.disponibilidad_promedio_global}%</span>
                <span className="text-[10px] text-st-muted">Promedio Cartera</span>
              </div>
            </div>

            <div className="bg-st-surface border border-st-border rounded-xl p-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-st-muted">
                Latencia Promedio
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-black text-white font-mono">{data.resumen.latencia_promedio_global} <span className="text-xs font-normal">ms</span></span>
                <span className="text-[10px] text-st-accent font-semibold">Saludable</span>
              </div>
            </div>

            <div className="bg-st-surface border border-st-border rounded-xl p-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-st-muted">
                Pérdida de Paquetes
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-black text-white font-mono">{data.resumen.packet_loss_promedio_global}%</span>
                <span className="text-[10px] text-st-muted">Promedio</span>
              </div>
            </div>

            <div className="bg-st-surface border border-st-border rounded-xl p-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-st-muted">
                Tiempo Offline Total
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-black font-mono text-purple-400">{data.resumen.total_minutos_offline} <span className="text-xs font-normal">min</span></span>
                <span className="text-[10px] text-st-muted font-semibold">Acumulado</span>
              </div>
            </div>
          </div>

          {/* TABLA CALIDAD */}
          <div className="bg-st-surface border border-st-border rounded-xl overflow-hidden shadow-xl space-y-4">
            <div className="p-4 border-b border-st-border bg-st-bg/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-st-accent" />
                Matriz de Calidad Histórica por Cliente
              </h2>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-st-muted text-[11px] font-medium flex items-center gap-1">
                  <ArrowUpDown className="w-3 h-3" /> Ordenar por:
                </span>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  className="bg-st-bg border border-st-border rounded-lg px-2.5 py-1 text-white text-xs font-semibold focus:outline-none focus:border-st-accent"
                >
                  <option value="disponibilidad">Peor Disponibilidad</option>
                  <option value="latencia">Mayor Latencia</option>
                  <option value="loss">Mayor Packet Loss</option>
                  <option value="offline">Más Tiempo Offline</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-st-bg/80 text-st-muted uppercase tracking-wider font-semibold border-b border-st-border">
                    <th className="py-3 px-4">Cliente</th>
                    <th className="py-3 px-4 text-center">Disponibilidad STARMONITOR</th>
                    <th className="py-3 px-4 text-center">Latencia (ms)</th>
                    <th className="py-3 px-4 text-center">Packet Loss (%)</th>
                    <th className="py-3 px-4 text-center">Download (GB)</th>
                    <th className="py-3 px-4 text-center">Upload (GB)</th>
                    <th className="py-3 px-4 text-center">Obstrucción (%)</th>
                    <th className="py-3 px-4 text-center">Tiempo Offline</th>
                    <th className="py-3 px-4 text-right">Estado / Tendencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-st-border/50">
                  {sortedItems.map(item => (
                    <tr key={item.tenant_id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="py-3 px-4 font-bold text-white">
                        <div>{item.cliente}</div>
                        <div className="text-[10px] font-mono text-st-muted">{item.codigo}</div>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-st-online">
                        {item.disponibilidad_starmonitor}%
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-white">{item.latencia_ms} ms</td>
                      <td className="py-3 px-4 text-center font-mono text-st-muted">{item.packet_loss_pct}%</td>
                      <td className="py-3 px-4 text-center font-mono text-white">{item.download_gb} GB</td>
                      <td className="py-3 px-4 text-center font-mono text-st-muted">{item.upload_gb} GB</td>
                      <td className="py-3 px-4 text-center font-mono text-st-muted">{item.obstruccion_pct}%</td>
                      <td className="py-3 px-4 text-center font-mono font-semibold text-purple-400">
                        {item.minutos_offline} min
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded border ${
                          item.tendencia === 'EXCELENTE'
                            ? 'bg-st-online/10 text-st-online border-st-online/30'
                            : item.tendencia === 'DEGRADADO'
                            ? 'bg-st-offline/10 text-st-offline border-st-offline/30'
                            : 'bg-st-warning/10 text-st-warning border-st-warning/30'
                        }`}>
                          {item.tendencia}
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

export default AnaliticaCalidad;
