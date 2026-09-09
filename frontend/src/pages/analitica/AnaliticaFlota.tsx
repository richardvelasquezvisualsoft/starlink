import React, { useState, useEffect } from 'react';
import AnaliticaLayout from './AnaliticaLayout';
import client from '../../api/client';
import { Satellite, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';

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

  return (
    <AnaliticaLayout>
      {isLoading ? (
        <div className="py-20 text-center text-st-muted bg-st-surface border border-st-border rounded-2xl">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-st-accent" />
          <p className="text-xs font-semibold">Cargando evolución de flota por cliente...</p>
        </div>
      ) : !data ? (
        <div className="py-12 text-center text-st-muted bg-st-surface border border-st-border rounded-2xl">
          Sin información de evolución de flota disponible.
        </div>
      ) : (
        <div className="space-y-6">
          {/* RANKINGS CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* MAYOR CRECIMIENTO */}
            <div className="bg-st-surface border border-st-border rounded-xl p-5 space-y-4">
              <h2 className="text-xs font-bold text-st-online uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Ranking: Mayor Crecimiento de Terminales
              </h2>
              <div className="space-y-2.5">
                {data.rankings.mayor_crecimiento.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-st-bg/60 rounded-xl border border-st-border text-xs">
                    <div>
                      <div className="font-bold text-white">{item.cliente}</div>
                      <div className="text-[10px] font-mono text-st-muted">{item.codigo}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-st-online">+{item.delta} Starlinks</div>
                      <div className="text-[10px] font-mono text-st-muted">+{item.variacion_pct}% vs mes ant.</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* MAYOR REDUCCION */}
            <div className="bg-st-surface border border-st-border rounded-xl p-5 space-y-4">
              <h2 className="text-xs font-bold text-st-offline uppercase tracking-wider flex items-center gap-2">
                <TrendingDown className="w-4 h-4" />
                Ranking: Mayor Reducción de Terminales
              </h2>
              <div className="space-y-2.5">
                {data.rankings.mayor_reduccion.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-st-bg/60 rounded-xl border border-st-border text-xs">
                    <div>
                      <div className="font-bold text-white">{item.cliente}</div>
                      <div className="text-[10px] font-mono text-st-muted">{item.codigo}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-st-offline">{item.delta} Starlinks</div>
                      <div className="text-[10px] font-mono text-st-muted">{item.variacion_pct}% vs mes ant.</div>
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
                    <th className="py-3 px-4">Cliente</th>
                    <th className="py-3 px-4 text-center">Mes Anterior</th>
                    <th className="py-3 px-4 text-center">Mes Actual</th>
                    <th className="py-3 px-4 text-center">Líneas Activas</th>
                    <th className="py-3 px-4 text-center">Líneas Suspendidas</th>
                    <th className="py-3 px-4 text-center">Delta Neto</th>
                    <th className="py-3 px-4 text-right">Variación %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-st-border/50">
                  {data.matrix.map(item => (
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
