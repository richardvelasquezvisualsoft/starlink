import React, { useState, useEffect, useMemo } from 'react';
import AnaliticaLayout from './AnaliticaLayout';
import client from '../../api/client';
import { Briefcase, Users, Satellite, RefreshCw, ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react';

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
  const [sortBy, setSortBy] = useState<string>('servicios');
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

  const sortedProductos = useMemo(() => {
    if (!data?.tabla_productos) return [];
    const list = [...data.tabla_productos];
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
  }, [data?.tabla_productos, sortBy, sortDirection]);

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
          <p className="text-xs font-semibold">Cargando distribución de productos y planes...</p>
        </div>
      ) : !data || data.tabla_productos.length === 0 ? (
        <div className="py-12 text-center text-st-muted bg-st-surface border border-st-border rounded-2xl">
          Sin información de productos disponible en cartera activa.
        </div>
      ) : (
        <div className="space-y-6">
          {/* CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-st-surface border border-st-border rounded-xl p-5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-st-muted flex items-center gap-1.5">
                <Satellite className="w-4 h-4 text-st-accent" /> Total Servicios Activos
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-3xl font-black text-white font-mono">{data.total_servicios}</span>
                <span className="text-[10px] text-st-muted font-semibold">Líneas en operación</span>
              </div>
            </div>

            <div className="bg-st-surface border border-st-border rounded-xl p-5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-st-muted flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-st-online" /> Planes Diferentes
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-3xl font-black text-st-online font-mono">{data.tabla_productos.length}</span>
                <span className="text-[10px] text-st-muted font-semibold">En catálogo contratado</span>
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
                    <th
                      className="px-4 py-3 cursor-pointer select-none hover:text-white transition-colors group"
                      onClick={() => handleSort('plan_nombre')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Producto / Plan</span>
                        {renderSortIcon('plan_nombre')}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-right cursor-pointer select-none hover:text-white transition-colors group"
                      onClick={() => handleSort('servicios')}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <span>Servicios Activos</span>
                        {renderSortIcon('servicios')}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-right cursor-pointer select-none hover:text-white transition-colors group"
                      onClick={() => handleSort('pct_cartera')}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <span>% Cartera</span>
                        {renderSortIcon('pct_cartera')}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-right cursor-pointer select-none hover:text-white transition-colors group"
                      onClick={() => handleSort('clientes')}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <span>Clientes</span>
                        {renderSortIcon('clientes')}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-right cursor-pointer select-none hover:text-white transition-colors group"
                      onClick={() => handleSort('consumo_promedio_gb')}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <span>Consumo Promedio</span>
                        {renderSortIcon('consumo_promedio_gb')}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-right cursor-pointer select-none hover:text-white transition-colors group"
                      onClick={() => handleSort('costo_promedio_usd')}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <span>Costo Promedio</span>
                        {renderSortIcon('costo_promedio_usd')}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-right cursor-pointer select-none hover:text-white transition-colors group"
                      onClick={() => handleSort('tendencia')}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <span>Tendencia</span>
                        {renderSortIcon('tendencia')}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-st-border/50">
                  {sortedProductos.map((prod, idx) => (
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