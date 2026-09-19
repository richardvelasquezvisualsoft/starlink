import React, { useState, useEffect, useMemo } from 'react';
import AnaliticaLayout from './AnaliticaLayout';
import client from '../../api/client';
import { CreditCard, DollarSign, RefreshCw, ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react';

interface CostoItem {
  tenant_id: number;
  cliente: string;
  codigo: string;
  cantidad_lineas: number;
  costo_total: number;
  pct_costo_total: number;
  costo_promedio_por_starlink: number;
  costo_por_gb: number;
  moneda: string;
}

interface CostosData {
  resumen: {
    costo_total_cartera: number;
    costo_promedio_por_terminal: number;
    moneda: string;
  };
  tabla_costos: CostoItem[];
}

const AnaliticaCostos: React.FC = () => {
  const [data, setData] = useState<CostosData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [sortBy, setSortBy] = useState<string>('costo_total');
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
        const res = await client.get('/reseller/analytics/costos');
        setData(res.data);
      } catch (err) {
        console.error('Error fetching costos analytics:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const sortedCostos = useMemo(() => {
    if (!data?.tabla_costos) return [];
    const list = [...data.tabla_costos];
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
  }, [data?.tabla_costos, sortBy, sortDirection]);

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
          <p className="text-xs font-semibold">Cargando analítica de distribución de costos...</p>
        </div>
      ) : !data ? (
        <div className="py-12 text-center text-st-muted bg-st-surface border border-st-border rounded-2xl">
          Sin información de costos disponible.
        </div>
      ) : (
        <div className="space-y-6">
          {/* CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-st-surface border border-st-border rounded-xl p-5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-st-muted flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-st-accent" /> Costo Total Starlink (Cartera)
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-3xl font-black text-white font-mono">
                  ${data.resumen.costo_total_cartera.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-xs font-normal text-st-muted">{data.resumen.moneda}</span>
                </span>
                <span className="text-[10px] text-st-accent font-semibold">Facturación Starlink Directa</span>
              </div>
            </div>

            <div className="bg-st-surface border border-st-border rounded-xl p-5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-st-muted flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-st-online" /> Costo Unitario Promedio / Terminal
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-3xl font-black text-st-online font-mono">
                  ${data.resumen.costo_promedio_por_terminal.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-xs font-normal text-st-muted">/ Starlink</span>
                </span>
                <span className="text-[10px] text-st-muted">Por mes</span>
              </div>
            </div>
          </div>

          {/* TABLA DISTRIBUCION DE COSTOS */}
          <div className="bg-st-surface border border-st-border rounded-xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-st-border bg-st-bg/40">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-st-accent" />
                Distribución de Costos Starlink por Cliente B2B
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
                      onClick={() => handleSort('cantidad_lineas')}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>Service Lines</span>
                        {renderSortIcon('cantidad_lineas')}
                      </div>
                    </th>
                    <th
                      className="py-3 px-4 text-right cursor-pointer select-none hover:text-white transition-colors group"
                      onClick={() => handleSort('costo_total')}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <span>Costo Total Starlink</span>
                        {renderSortIcon('costo_total')}
                      </div>
                    </th>
                    <th
                      className="py-3 px-4 text-center cursor-pointer select-none hover:text-white transition-colors group"
                      onClick={() => handleSort('pct_costo_total')}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>% del Costo Total</span>
                        {renderSortIcon('pct_costo_total')}
                      </div>
                    </th>
                    <th
                      className="py-3 px-4 text-right cursor-pointer select-none hover:text-white transition-colors group"
                      onClick={() => handleSort('costo_promedio_por_starlink')}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <span>Costo Promedio / Terminal</span>
                        {renderSortIcon('costo_promedio_por_starlink')}
                      </div>
                    </th>
                    <th
                      className="py-3 px-4 text-right cursor-pointer select-none hover:text-white transition-colors group"
                      onClick={() => handleSort('costo_por_gb')}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <span>Costo Estimado / GB</span>
                        {renderSortIcon('costo_por_gb')}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-st-border/50">
                  {sortedCostos.map(c => (
                    <tr key={c.tenant_id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="py-3 px-4 font-bold text-white">
                        <div>{c.cliente}</div>
                        <div className="text-[10px] font-mono text-st-muted">{c.codigo}</div>
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-white font-semibold">{c.cantidad_lineas}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-white">
                        ${c.costo_total.toLocaleString('en-US', { minimumFractionDigits: 2 })} {c.moneda}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-st-accent">
                        {c.pct_costo_total}%
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-st-online font-semibold">
                        ${c.costo_promedio_por_starlink.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-st-muted">
                        ${c.costo_por_gb.toFixed(2)} / GB
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

export default AnaliticaCostos;
