import React, { useState, useEffect } from 'react';
import AnaliticaLayout from './AnaliticaLayout';
import client from '../../api/client';
import { CreditCard, DollarSign, RefreshCw } from 'lucide-react';

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
                    <th className="py-3 px-4">Cliente</th>
                    <th className="py-3 px-4 text-center">Service Lines</th>
                    <th className="py-3 px-4 text-right">Costo Total Starlink</th>
                    <th className="py-3 px-4 text-center">% del Costo Total</th>
                    <th className="py-3 px-4 text-right">Costo Promedio / Terminal</th>
                    <th className="py-3 px-4 text-right">Costo Estimado / GB</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-st-border/50">
                  {data.tabla_costos.map(c => (
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
