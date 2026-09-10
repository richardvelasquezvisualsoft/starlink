import React, { useState, useEffect } from 'react';
import AnaliticaLayout from './AnaliticaLayout';
import client from '../../api/client';
import { Briefcase, Users, Satellite, RefreshCw } from 'lucide-react';

interface ProductoItem {
  plan_nombre: string;
  servicios: number;
  pct_cartera: number;
  clientes: number;
  consumo_promedio_gb: number | string;
  costo_promedio_usd: number | string;
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
      ) : !data || data.tabla_productos.length === 0 ? (
        <div className="py-12 text-center text-st-muted bg-st-surface border border-st-border rounded-2xl">
          Sin información de productos disponible en cartera activa.
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
                  {data.tabla_productos[0]?.plan_nombre || 'N/D'}
                </span>
                <span className="text-[10px] text-purple-400 font-mono font-bold">
                  {data.tabla_productos[0]?.pct_cartera || 0}% Cartera
                </span>
              </div>
            </div>
          </div>

          {/* TABLA DE PRODUCTOS / PLANES */}
          <div className="bg-st-surface border border-st-border rounded-xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-st-border bg-st-bg/40">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">Matriz de Productos y Planes</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-st-muted">
                <thead className="bg-st-bg/20 text-xs uppercase font-semibold text-st-muted/80">
                  <tr>
                    <th className="px-4 py-3">Producto / Plan</th>
                    <th className="px-4 py-3 text-right">Servicios Activos</th>
                    <th className="px-4 py-3 text-right">% Cartera</th>
                    <th className="px-4 py-3 text-right">Clientes</th>
                    <th className="px-4 py-3 text-right">Consumo Promedio</th>
                    <th className="px-4 py-3 text-right">Costo Promedio</th>
                    <th className="px-4 py-3 text-right">Tendencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-st-border/50">
                  {data.tabla_productos.map((prod, idx) => (
                    <tr key={idx} className="hover:bg-st-bg/40 transition-colors">
                      <td className="px-4 py-3 font-medium text-white">
                        {prod.plan_nombre}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-st-accent font-semibold">
                        {prod.servicios}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {prod.pct_cartera}%
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {prod.clientes}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-st-online">
                        {prod.consumo_promedio_gb !== 'N/D' ? `${prod.consumo_promedio_gb} GB` : 'N/D'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-purple-400">
                        {prod.costo_promedio_usd !== 'N/D' ? `$${prod.costo_promedio_usd}` : 'N/D'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex items-center text-xs font-mono px-2 py-1 bg-st-bg/50 rounded text-st-muted">
                          {prod.tendencia}
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