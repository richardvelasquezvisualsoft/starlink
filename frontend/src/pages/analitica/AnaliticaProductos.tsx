import React, { useState, useEffect } from 'react';
import AnaliticaLayout from './AnaliticaLayout';
import client from '../../api/client';
import { Briefcase, Users, Satellite, RefreshCw } from 'lucide-react';

interface ProductoItem {
  plan_nombre: string;
  servicios: number;
  pct_cartera: number;
  clientes: number;
  consumo_promedio_gb: number;
  costo_promedio_usd: number;
  tendencia: string;
}

interface ProductosData {
  total_servicios: number;
  tabla_productos: ProductoItem[];
}

const AnaliticaProductos: React.FC = () => {
  const [data, setData] = useState<ProductosData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const res = await client.get('/reseller/analytics/productos');
        setData(res.data);
      } catch (err) {
        console.error('Error fetching productos analytics:', err);
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
          <p className="text-xs font-semibold">Cargando distribución de productos y planes...</p>
        </div>
      ) : !data ? (
        <div className="py-12 text-center text-st-muted bg-st-surface border border-st-border rounded-2xl">
          Sin información de productos disponible.
        </div>
      ) : (
        <div className="space-y-6">
          {/* DISTRIBUCION CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-st-surface border border-st-border rounded-xl p-5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-st-muted flex items-center gap-1.5">
                <Satellite className="w-4 h-4 text-st-online" /> Servicios Activos Totales
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-3xl font-black text-white font-mono">{data.total_servicios}</span>
                <span className="text-[10px] text-st-online font-semibold">Planes Contratados</span>
              </div>
            </div>

            <div className="bg-st-surface border border-st-border rounded-xl p-5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-st-muted flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-st-accent" /> Variedad de Planes Starlink
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-3xl font-black text-st-accent font-mono">{data.tabla_productos.length}</span>
                <span className="text-[10px] text-st-muted">Catálogo Activo</span>
              </div>
            </div>

            <div className="bg-st-surface border border-st-border rounded-xl p-5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-st-muted flex items-center gap-1.5">
                <Users className="w-4 h-4 text-purple-400" /> Plan Principal
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-base font-bold text-white truncate max-w-[160px]">
                  {data.tabla_productos[0]?.plan_nombre || 'Priority 1TB'}
                </span>
                <span className="text-[10px] text-purple-400 font-mono font-bold">
                  {data.tabla_productos[0]?.pct_cartera}% Cartera
                </span>
              </div>
            </div>
          </div>

          {/* TABLA DE PRODUCTOS / PLANES */}
          <div className="bg-st-surface border border-st-border rounded-xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-st-border bg-st-bg/40">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-st-accent" />
                Matriz de Productos y Planes Starlink en Cartera
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-st-bg/80 text-st-muted uppercase tracking-wider font-semibold border-b border-st-border">
                    <th className="py-3 px-4">Producto / Plan</th>
                    <th className="py-3 px-4 text-center">Servicios Activos</th>
                    <th className="py-3 px-4 text-center">% de Cartera</th>
                    <th className="py-3 px-4 text-center">Clientes que lo Usan</th>
                    <th className="py-3 px-4 text-right">Consumo Promedio</th>
                    <th className="py-3 px-4 text-right">Costo Promedio</th>
                    <th className="py-3 px-4 text-right">Tendencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-st-border/50">
                  {data.tabla_productos.map((p, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.03] transition-colors">
                      <td className="py-3 px-4 font-bold text-white">{p.plan_nombre}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-white">{p.servicios}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-st-accent">{p.pct_cartera}%</td>
                      <td className="py-3 px-4 text-center font-mono text-st-muted">{p.clientes} clientes</td>
                      <td className="py-3 px-4 text-right font-mono text-white">{p.consumo_promedio_gb} GB / mes</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-st-online">
                        ${p.costo_promedio_usd.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded bg-st-online/10 text-st-online border border-st-online/30">
                          {p.tendencia}
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

export default AnaliticaProductos;
