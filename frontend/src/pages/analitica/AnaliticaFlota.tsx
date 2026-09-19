import React, { useState, useEffect, useMemo } from 'react';
import AnaliticaLayout from './AnaliticaLayout';
import client from '../../api/client';
import { Satellite, TrendingUp, TrendingDown, RefreshCw, ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react';

interface MatrixItem {
  tenant_id: number;
  cliente: string;
  codigo: string;
  mes_anterior: number;
  mes_actual: number;
  delta: number;
  variacion_pct: number;
  lineas_activas: number;
  lineas_suspendidas: number;
}

interface FlotaData {
  matrix: MatrixItem[];
  rankings: {
    mayor_crecimiento: MatrixItem[];
    mayor_reduccion: MatrixItem[];
  };
}

const AnaliticaFlota: React.FC = () => {
  const [data, setData] = useState<FlotaData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<string>('mes_actual');
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
        const res = await client.get('/reseller/analytics/flota');
        setData(res.data);
      } catch (err) {
        console.error('Error fetching flota analytics:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const sortedMatrix = useMemo(() => {
    if (!data?.matrix) return [];
    const list = [...data.matrix];
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
  }, [data?.matrix, sortBy, sortDirection]);

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
          <p className="text-xs font-semibold">Cargando evolución de flota por cliente...</p>
        </div>
      ) : !data ? (
        <div className="py-12 text-center text-st-muted bg-st-surface border border-st-border rounded-2xl">
          Sin información de flota disponible.
        </div>
      ) : (
        <div className="space-y-6">
          {/* RANKINGS CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* MAYOR CRECIMIENTO */}
            <div className="bg-st-surface border border-st-border rounded-xl p-5 space-y-4">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-st-online" />
                Mayor Crecimiento Neto
              </h2>
              <div className="space-y-2 pt-1">
                {data.rankings.mayor_crecimiento.slice(0, 3).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 bg-st-bg/60 rounded-lg border border-st-border text-xs">
                    <div>
                      <span className="font-bold text-white">{item.cliente}</span>
                      <span className="text-[10px] text-st-muted ml-2 font-mono">{item.codigo}</span>
                    </div>
                    <div className="flex items-center gap-3 font-mono">
                      <span className="text-st-muted">{item.mes_anterior} &rarr; <strong className="text-white">{item.mes_actual}</strong></span>
                      <span className="text-st-online font-bold">+{item.delta}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* MAYOR REDUCCION */}
            <div className="bg-st-surface border border-st-border rounded-xl p-5 space-y-4">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-st-offline" />
                Mayor Descenso / Desconexión
              </h2>
              <div className="space-y-2 pt-1">
                {data.rankings.mayor_reduccion.slice(0, 3).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 bg-st-bg/60 rounded-lg border border-st-border text-xs">
                    <div>
                      <span className="font-bold text-white">{item.cliente}</span>
                      <span className="text-[10px] text-st-muted ml-2 font-mono">{item.codigo}</span>
                    </div>
                    <div className="flex items-center gap-3 font-mono">
                      <span className="text-st-muted">{item.mes_anterior} &rarr; <strong className="text-white">{item.mes_actual}</strong></span>
                      <span className="text-st-offline font-bold">{item.delta}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* MATRIZ DE EVOLUCION */}
          <div className="bg-st-surface border border-st-border rounded-xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-st-border bg-st-bg/40">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Satellite className="w-4 h-4 text-st-accent" />
                Matriz Evolutiva de Flota (Starlinks por Cliente)
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-st-bg/80 text-st-muted uppercase tracking-wider font-semibold border-b border-st-border">
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
                      className="py-3 px-4 text-center cursor-pointer select-none hover:text-white transition-colors group"
                      onClick={() => handleSort('mes_anterior')}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>Mes Anterior</span>
                        {renderSortIcon('mes_anterior')}
                      </div>
                    </th>
                    <th
                      className="py-3 px-4 text-center cursor-pointer select-none hover:text-white transition-colors group"
                      onClick={() => handleSort('mes_actual')}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>Mes Actual</span>
                        {renderSortIcon('mes_actual')}
                      </div>
                    </th>
                    <th
                      className="py-3 px-4 text-center cursor-pointer select-none hover:text-white transition-colors group"
                      onClick={() => handleSort('lineas_activas')}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>Líneas Activas</span>
                        {renderSortIcon('lineas_activas')}
                      </div>
                    </th>
                    <th
                      className="py-3 px-4 text-center cursor-pointer select-none hover:text-white transition-colors group"
                      onClick={() => handleSort('lineas_suspendidas')}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>Líneas Suspendidas</span>
                        {renderSortIcon('lineas_suspendidas')}
                      </div>
                    </th>
                    <th
                      className="py-3 px-4 text-center cursor-pointer select-none hover:text-white transition-colors group"
                      onClick={() => handleSort('delta')}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>Delta Neto</span>
                        {renderSortIcon('delta')}
                      </div>
                    </th>
                    <th
                      className="py-3 px-4 text-right cursor-pointer select-none hover:text-white transition-colors group"
                      onClick={() => handleSort('variacion_pct')}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <span>Variación %</span>
                        {renderSortIcon('variacion_pct')}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-st-border/50">
                  {sortedMatrix.map(item => (
                    <tr key={item.tenant_id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="py-3 px-4 font-bold text-white">
                        <div>{item.cliente}</div>
                        <div className="text-[10px] font-mono text-st-muted">{item.codigo}</div>
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-st-muted">{item.mes_anterior}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-white">{item.mes_actual}</td>
                      <td className="py-3 px-4 text-center font-mono text-st-online font-semibold">{item.lineas_activas}</td>
                      <td className="py-3 px-4 text-center font-mono text-st-warning">{item.lineas_suspendidas}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold">
                        <span className={item.delta > 0 ? 'text-st-online' : item.delta < 0 ? 'text-st-offline' : 'text-st-muted'}>
                          {item.delta > 0 ? `+${item.delta}` : item.delta}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        <span className={item.variacion_pct > 0 ? 'text-st-online' : item.variacion_pct < 0 ? 'text-st-offline' : 'text-st-muted'}>
                          {item.variacion_pct > 0 ? `+${item.variacion_pct}%` : `${item.variacion_pct}%`}
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

export default AnaliticaFlota;
