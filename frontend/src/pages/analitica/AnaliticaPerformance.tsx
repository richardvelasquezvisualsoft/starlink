import React, { useState, useEffect, useMemo } from 'react';
import AnaliticaLayout from './AnaliticaLayout';
import client from '../../api/client';
import { Database, RefreshCw, ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react';

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
  const [sortBy, setSortBy] = useState<string>('fecha_inicio');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('asc');
    }
  };

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

  const sortedWorkflows = useMemo(() => {
    if (!data?.tabla_workflows) return [];
    const list = [...data.tabla_workflows];
    list.sort((a: any, b: any) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      if (aVal === undefined || aVal === null) aVal = '';
      if (bVal === undefined || bVal === null) bVal = '';

      if (typeof aVal === 'string') {
        const comp = aVal.localeCompare(String(bVal));
        return sortDirection === 'asc' ? comp : -comp;
      }
      return sortDirection === 'asc' ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);
    });
    return list;
  }, [data?.tabla_workflows, sortBy, sortDirection]);

  const renderSortIcon = (field: string) => {
    if (sortBy === field) {
      return sortDirection === 'asc' ? (
        <ChevronUp className="w-3.5 h-3.5 text-st-accent flex-shrink-0" />
      ) : (
        <ChevronDown className="w-3.5 h-3.5 text-st-accent flex-shrink-0" />
      );
    }
    return <ArrowUpDown className="w-2.5 h-2.5 text-st-muted/40 group-hover:text-st-muted flex-shrink-0 transition-colors" />;
  };

  return (
    <AnaliticaLayout>
      {isLoading ? (
        <div className="py-20 text-center text-st-muted bg-st-surface border border-st-border rounded-2xl">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-st-accent" />
          <p className="text-xs font-semibold">Cargando métricas de rendimiento y SLAs...</p>
        </div>
      ) : !data ? (
        <div className="py-12 text-center text-st-muted bg-st-surface border border-st-border rounded-2xl">
          Sin información de rendimiento disponible.
        </div>
      ) : (
        <div className="space-y-6">
          {/* CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-st-surface border border-st-border rounded-xl p-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-st-muted">
                Workflows Iniciados
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-black text-white font-mono">{data.resumen.iniciados}</span>
                <span className="text-[10px] text-st-muted">Total</span>
              </div>
            </div>

            <div className="bg-st-surface border border-st-border rounded-xl p-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-st-muted">
                Tasa de Éxito
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-black text-st-online font-mono">{data.resumen.tasa_exito_pct}%</span>
                <span className="text-[10px] text-st-online font-semibold">Saludable</span>
              </div>
            </div>

            <div className="bg-st-surface border border-st-border rounded-xl p-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-st-muted">
                Errores Detectados
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-black text-st-offline font-mono">{data.resumen.con_error}</span>
                <span className="text-[10px] text-st-offline font-semibold">Fallidos</span>
              </div>
            </div>

            <div className="bg-st-surface border border-st-border rounded-xl p-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-st-muted">
                Tiempo Promedio Alta
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-black font-mono text-purple-400">{data.resumen.tiempo_promedio_minutos} <span className="text-xs font-normal">min</span></span>
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
                    <th
                      className="py-3 px-4 cursor-pointer select-none hover:text-white transition-colors group"
                      onClick={() => handleSort('codigo')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Código</span>
                        {renderSortIcon('codigo')}
                      </div>
                    </th>
                    <th
                      className="py-3 px-4 cursor-pointer select-none hover:text-white transition-colors group"
                      onClick={() => handleSort('cliente')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Cliente</span>
                        {renderSortIcon('cliente')}
                      </div>
                    </th>
                    <th
                      className="py-3 px-4 cursor-pointer select-none hover:text-white transition-colors group"
                      onClick={() => handleSort('accion')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Acción</span>
                        {renderSortIcon('accion')}
                      </div>
                    </th>
                    <th
                      className="py-3 px-4 text-center cursor-pointer select-none hover:text-white transition-colors group"
                      onClick={() => handleSort('fecha_inicio')}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>Inicio</span>
                        {renderSortIcon('fecha_inicio')}
                      </div>
                    </th>
                    <th
                      className="py-3 px-4 text-center cursor-pointer select-none hover:text-white transition-colors group"
                      onClick={() => handleSort('fecha_fin')}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>Fin</span>
                        {renderSortIcon('fecha_fin')}
                      </div>
                    </th>
                    <th
                      className="py-3 px-4 text-center cursor-pointer select-none hover:text-white transition-colors group"
                      onClick={() => handleSort('duracion_minutos')}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>Duración</span>
                        {renderSortIcon('duracion_minutos')}
                      </div>
                    </th>
                    <th
                      className="py-3 px-4 text-center cursor-pointer select-none hover:text-white transition-colors group"
                      onClick={() => handleSort('paso_error')}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>Paso con Error</span>
                        {renderSortIcon('paso_error')}
                      </div>
                    </th>
                    <th
                      className="py-3 px-4 text-right cursor-pointer select-none hover:text-white transition-colors group"
                      onClick={() => handleSort('estado')}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <span>Estado</span>
                        {renderSortIcon('estado')}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-st-border/50">
                  {sortedWorkflows.map(item => (
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
