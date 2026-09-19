import React, { useState, useEffect, useMemo } from 'react';
import AnaliticaLayout from './AnaliticaLayout';
import client from '../../api/client';
import { Users, Satellite, TrendingUp, RefreshCw, ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react';

interface CarteraData {
  resumen: {
    total_clientes: number;
    clientes_activos: number;
    total_starlinks: number;
    promedio_starlinks_por_cliente: number;
    crecimiento_neto_mes: number;
  };
  series: {
    clientes_por_mes: { periodo: string; cantidad: number }[];
    starlinks_por_mes: { periodo: string; cantidad: number }[];
    altas_vs_bajas: { periodo: string; altas: number; bajas: number }[];
  };
  top_5_concentracion: { cliente: string; starlinks: number; pct_cartera: number }[];
  tabla_clientes: {
    tenant_id: number;
    cliente: string;
    codigo: string;
    mes_anterior: number;
    mes_actual: number;
    delta: number;
    delta_pct: number;
  }[];
}

const AnaliticaCartera: React.FC = () => {
  const [data, setData] = useState<CarteraData | null>(null);
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
        const res = await client.get('/reseller/analytics/cartera');
        setData(res.data);
      } catch (err) {
        console.error('Error fetching cartera analytics:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const sortedClientes = useMemo(() => {
    if (!data?.tabla_clientes) return [];
    const list = [...data.tabla_clientes];
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
  }, [data?.tabla_clientes, sortBy, sortDirection]);

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
          <p className="text-xs font-semibold">Cargando analítica de cartera y crecimiento...</p>
        </div>
      ) : !data ? (
        <div className="py-12 text-center text-st-muted bg-st-surface border border-st-border rounded-2xl">
          Sin información de cartera disponible.
        </div>
      ) : (
        <div className="space-y-6">
          {/* KPI CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-st-surface border border-st-border rounded-xl p-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-st-muted flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-st-accent" /> Clientes Activos
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-black text-white font-mono">{data.resumen.clientes_activos}</span>
                <span className="text-[10px] text-st-muted">de {data.resumen.total_clientes} totales</span>
              </div>
            </div>

            <div className="bg-st-surface border border-st-border rounded-xl p-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-st-muted flex items-center gap-1.5">
                <Satellite className="w-3.5 h-3.5 text-st-online" /> Starlinks en Cartera
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-black text-white font-mono">{data.resumen.total_starlinks}</span>
                <span className="text-[10px] text-st-online font-semibold">Activas</span>
              </div>
            </div>

            <div className="bg-st-surface border border-st-border rounded-xl p-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-st-muted flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-purple-400" /> Promedio / Cliente
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-black text-white font-mono">{data.resumen.promedio_starlinks_por_cliente}</span>
                <span className="text-[10px] text-purple-400 font-semibold">Terminales</span>
              </div>
            </div>

            <div className="bg-st-surface border border-st-border rounded-xl p-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-st-muted flex items-center gap-1.5">
                Variación Neta Mes
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className={`text-2xl font-black font-mono ${data.resumen.crecimiento_neto_mes >= 0 ? 'text-st-online' : 'text-st-offline'}`}>
                  {data.resumen.crecimiento_neto_mes >= 0 ? `+${data.resumen.crecimiento_neto_mes}` : data.resumen.crecimiento_neto_mes}
                </span>
                <span className="text-[10px] text-st-muted">Starlinks</span>
              </div>
            </div>
          </div>

          {/* TOP 5 CONCENTRACION & TENDENCIA */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* TOP 5 CONCENTRACION */}
            <div className="bg-st-surface border border-st-border rounded-xl p-5 space-y-4">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-st-accent" />
                Concentración Top 5 Clientes
              </h2>
              <div className="space-y-3">
                {data.top_5_concentracion.map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-white">{item.cliente}</span>
                      <span className="text-st-accent font-mono">{item.starlinks} terminales ({item.pct_cartera}%)</span>
                    </div>
                    <div className="w-full bg-st-bg rounded-full h-2 overflow-hidden border border-st-border/50">
                      <div
                        className="bg-st-accent h-full rounded-full transition-all"
                        style={{ width: `${Math.min(100, item.pct_cartera * 2)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* EVOLUCION MENSUAL */}
            <div className="bg-st-surface border border-st-border rounded-xl p-5 space-y-4">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-st-online" />
                Evolución de Clientes Activos por Mes
              </h2>
              <div className="space-y-3 pt-2">
                {data.series.clientes_por_mes.map((s, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 bg-st-bg/60 rounded-lg border border-st-border text-xs">
                    <span className="font-mono text-st-muted font-semibold">Período {s.periodo}</span>
                    <span className="font-bold text-white">{s.cantidad} Clientes Activos</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* TABLA CLIENTES */}
          <div className="bg-st-surface border border-st-border rounded-xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-st-border bg-st-bg/40">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                Desglose de Cartera por Cliente
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
                      onClick={() => handleSort('delta')}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>Delta (Starlinks)</span>
                        {renderSortIcon('delta')}
                      </div>
                    </th>
                    <th
                      className="py-3 px-4 text-right cursor-pointer select-none hover:text-white transition-colors group"
                      onClick={() => handleSort('delta_pct')}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <span>Variación %</span>
                        {renderSortIcon('delta_pct')}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-st-border/50">
                  {sortedClientes.map(c => (
                    <tr key={c.tenant_id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="py-3 px-4 font-mono text-st-accent font-semibold">{c.codigo}</td>
                      <td className="py-3 px-4 font-bold text-white">{c.cliente}</td>
                      <td className="py-3 px-4 text-center font-mono text-st-muted">{c.mes_anterior}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-white">{c.mes_actual}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold">
                        <span className={c.delta > 0 ? 'text-st-online' : c.delta < 0 ? 'text-st-offline' : 'text-st-muted'}>
                          {c.delta > 0 ? `+${c.delta}` : c.delta}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        <span className={c.delta_pct > 0 ? 'text-st-online' : c.delta_pct < 0 ? 'text-st-offline' : 'text-st-muted'}>
                          {c.delta_pct > 0 ? `+${c.delta_pct}%` : `${c.delta_pct}%`}
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

export default AnaliticaCartera;
