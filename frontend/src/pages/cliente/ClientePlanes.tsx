import React, { useState, useEffect } from 'react';
import { 
  Layers, 
  Search, 
  Activity, 
  Radio, 
  Cpu, 
  Database, 
  DollarSign, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  RefreshCw,
  BarChart2
} from 'lucide-react';
import client from '../../api/client';

interface PlanResumenItem {
  id: string;
  plan_contratado: string;
  id_producto?: string | null;
  tipo_suscripcion?: string | null;
  cantidad_servicios: number;
  cantidad_equipos: number;
  usage_limit_gb_unit: number;
  capacidad_total_gb: number;
  valor_plan: number;
  monto_total_contratado: number;
  consumo_ciclo_gb: number;
  utilizacion_pct: number;
  moneda: string;
  estado: string;
}

interface PlanesKPIs {
  planes_distintos: number;
  equipos_con_plan: number;
  servicios_con_plan: number;
  monto_mensual_contratado: number;
  capacidad_total_gb: number;
  moneda: string;
}

interface ResponseData {
  kpis: PlanesKPIs;
  planes: PlanResumenItem[];
}

type SortField = 
  | 'plan_contratado' 
  | 'cantidad_equipos' 
  | 'cantidad_servicios' 
  | 'capacidad_total_gb' 
  | 'valor_plan' 
  | 'monto_total_contratado' 
  | 'consumo_ciclo_gb' 
  | 'utilizacion_pct';

type MetricChart = 'equipos' | 'servicios' | 'capacidad' | 'monto';

export const ClientePlanes: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kpis, setKpis] = useState<PlanesKPIs | null>(null);
  const [planes, setPlanes] = useState<PlanResumenItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Sorting state
  const [sortField, setSortField] = useState<SortField>('plan_contratado');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Chart selector state
  const [chartMetric, setChartMetric] = useState<MetricChart>('equipos');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await client.get<ResponseData>('/planes/resumen');
      if (res.data) {
        setKpis(res.data.kpis);
        setPlanes(res.data.planes || []);
      }
    } catch (err: any) {
      console.error('Error fetching planes resumen:', err);
      setError(err.response?.data?.detail || 'No se pudo cargar la información consolidada de los planes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const formatCapacity = (gb: number) => {
    if (!gb || gb <= 0) return '0 GB';
    if (gb >= 1000) {
      const tb = gb / 1000;
      return `${tb % 1 === 0 ? tb : tb.toFixed(2)} TB`;
    }
    return `${gb} GB`;
  };

  const formatCurrency = (amount: number, currency: string = 'PEN') => {
    const symbol = currency === 'USD' ? '$' : 'S/';
    return `${symbol} ${amount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Filter
  const filteredPlanes = planes.filter(p => 
    p.plan_contratado.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.tipo_suscripcion && p.tipo_suscripcion.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (p.id_producto && p.id_producto.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Sort
  const sortedPlanes = [...filteredPlanes].sort((a, b) => {
    let aVal: any = a[sortField];
    let bVal: any = b[sortField];

    if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = (bVal || '').toLowerCase();
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Helper for Sort Indicator Icon
  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-st-muted/50 ml-1 inline" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-st-accent ml-1 inline" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-st-accent ml-1 inline" />
    );
  };

  // Max value for chart scaling
  const getMetricValue = (p: PlanResumenItem, metric: MetricChart) => {
    switch (metric) {
      case 'equipos': return p.cantidad_equipos;
      case 'servicios': return p.cantidad_servicios;
      case 'capacidad': return p.capacidad_total_gb;
      case 'monto': return p.monto_total_contratado;
      default: return p.cantidad_equipos;
    }
  };

  const getMetricLabel = (p: PlanResumenItem, metric: MetricChart) => {
    switch (metric) {
      case 'equipos': return `${p.cantidad_equipos} equipos`;
      case 'servicios': return `${p.cantidad_servicios} servicios`;
      case 'capacidad': return formatCapacity(p.capacidad_total_gb);
      case 'monto': return formatCurrency(p.monto_total_contratado, p.moneda);
      default: return `${p.cantidad_equipos}`;
    }
  };

  const maxChartVal = Math.max(...planes.map(p => getMetricValue(p, chartMetric)), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans uppercase">MIS PLANES</h1>
          <p className="text-xs text-st-muted mt-0.5">
            Resumen consolidado de los planes contratados por tu organización.
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="self-start md:self-auto flex items-center gap-2 px-3 py-1.5 bg-st-surface border border-st-border hover:bg-white/5 text-xs text-white rounded-lg transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* Loading State */}
      {loading && !kpis && (
        <div className="flex h-64 items-center justify-center bg-st-surface border border-st-border rounded-xl">
          <Activity className="w-8 h-8 animate-spin text-st-accent" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex flex-col items-center justify-center p-8 bg-st-surface border border-red-500/20 rounded-xl text-center space-y-4">
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-full text-red-500">
            <Activity className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">No se pudo cargar la información de planes</h3>
            <p className="text-sm text-st-muted mt-1 max-w-md">{error}</p>
          </div>
          <button 
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 bg-st-accent text-st-bg font-medium text-sm rounded-lg hover:bg-st-accent/90 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reintentar</span>
          </button>
        </div>
      )}

      {/* Content when loaded */}
      {!loading && kpis && (
        <>
          {/* Top KPIs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-st-surface border border-st-border rounded-xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-st-muted mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Planes Distintos</span>
                <Layers className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-white">{kpis.planes_distintos}</div>
              <div className="text-[11px] text-st-muted mt-1">Planes contratados</div>
            </div>

            <div className="bg-st-surface border border-st-border rounded-xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-st-muted mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Equipos con Plan</span>
                <Cpu className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-bold text-white">{kpis.equipos_con_plan}</div>
              <div className="text-[11px] text-st-muted mt-1">Terminales asociadas</div>
            </div>

            <div className="bg-st-surface border border-st-border rounded-xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-st-muted mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Servicios con Plan</span>
                <Radio className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-2xl font-bold text-white">{kpis.servicios_con_plan}</div>
              <div className="text-[11px] text-st-muted mt-1">Líneas de servicio activas</div>
            </div>

            <div className="bg-st-surface border border-st-border rounded-xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-st-muted mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Capacidad Total</span>
                <Database className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-2xl font-bold text-white">{formatCapacity(kpis.capacidad_total_gb)}</div>
              <div className="text-[11px] text-st-muted mt-1">Datos contratados</div>
            </div>

            <div className="bg-st-surface border border-st-border rounded-xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-st-muted mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Monto Mensual</span>
                <DollarSign className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-white">{formatCurrency(kpis.monto_mensual_contratado, kpis.moneda)}</div>
              <div className="text-[11px] text-st-muted mt-1">Importe total contratado</div>
            </div>
          </div>

          {/* Distribution Chart Section */}
          {planes.length > 0 && (
            <div className="bg-st-surface border border-st-border rounded-xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-st-border">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-st-accent" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Distribución por Plan
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-st-muted">Visualizar por:</span>
                  <select
                    value={chartMetric}
                    onChange={(e) => setChartMetric(e.target.value as MetricChart)}
                    className="bg-st-bg border border-st-border rounded-lg px-3 py-1 text-xs text-white outline-none focus:border-st-accent cursor-pointer"
                  >
                    <option value="equipos">Equipos</option>
                    <option value="servicios">Servicios</option>
                    <option value="capacidad">Capacidad Contratada</option>
                    <option value="monto">Monto Contratado</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3 pt-1">
                {planes.map((p) => {
                  const val = getMetricValue(p, chartMetric);
                  const pct = Math.round((val / maxChartVal) * 100);
                  return (
                    <div key={p.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-white">{p.plan_contratado}</span>
                        <span className="text-st-muted font-medium">{getMetricLabel(p, chartMetric)}</span>
                      </div>
                      <div className="h-3 bg-st-bg rounded-full overflow-hidden border border-st-border/50">
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(pct, 5)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Table Container */}
          <div className="bg-st-surface border border-st-border rounded-xl flex flex-col">
            {/* Toolbar / Search */}
            <div className="p-4 border-b border-st-border flex flex-col sm:flex-row gap-4 justify-between items-center">
              <div className="relative flex-1 max-w-md w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-st-muted" />
                <input
                  type="text"
                  placeholder="Filtrar por nombre de plan o tipo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-st-bg border border-st-border rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:border-st-accent outline-none transition-colors"
                />
              </div>
              <div className="text-xs text-st-muted">
                Mostrando <span className="font-semibold text-white">{sortedPlanes.length}</span> de <span className="font-semibold text-white">{planes.length}</span> planes distintos
              </div>
            </div>

            {/* Main Consolidated Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-max">
                <thead className="bg-st-bg sticky top-0 z-10">
                  <tr>
                    <th 
                      onClick={() => handleSort('plan_contratado')}
                      className="p-4 text-xs font-bold text-st-muted uppercase tracking-wider border-b border-st-border cursor-pointer select-none hover:text-white transition-colors"
                    >
                      Plan {renderSortIcon('plan_contratado')}
                    </th>
                    <th className="p-4 text-xs font-bold text-st-muted uppercase tracking-wider border-b border-st-border">
                      Tipo
                    </th>
                    <th 
                      onClick={() => handleSort('cantidad_equipos')}
                      className="p-4 text-xs font-bold text-st-muted uppercase tracking-wider border-b border-st-border text-center cursor-pointer select-none hover:text-white transition-colors"
                    >
                      Equipos {renderSortIcon('cantidad_equipos')}
                    </th>
                    <th 
                      onClick={() => handleSort('cantidad_servicios')}
                      className="p-4 text-xs font-bold text-st-muted uppercase tracking-wider border-b border-st-border text-center cursor-pointer select-none hover:text-white transition-colors"
                    >
                      Servicios {renderSortIcon('cantidad_servicios')}
                    </th>
                    <th className="p-4 text-xs font-bold text-st-muted uppercase tracking-wider border-b border-st-border">
                      Datos por servicio
                    </th>
                    <th 
                      onClick={() => handleSort('capacidad_total_gb')}
                      className="p-4 text-xs font-bold text-st-muted uppercase tracking-wider border-b border-st-border cursor-pointer select-none hover:text-white transition-colors"
                    >
                      Capacidad total {renderSortIcon('capacidad_total_gb')}
                    </th>
                    <th 
                      onClick={() => handleSort('valor_plan')}
                      className="p-4 text-xs font-bold text-st-muted uppercase tracking-wider border-b border-st-border cursor-pointer select-none hover:text-white transition-colors"
                    >
                      Valor del plan {renderSortIcon('valor_plan')}
                    </th>
                    <th 
                      onClick={() => handleSort('monto_total_contratado')}
                      className="p-4 text-xs font-bold text-st-muted uppercase tracking-wider border-b border-st-border cursor-pointer select-none hover:text-white transition-colors"
                    >
                      Monto total {renderSortIcon('monto_total_contratado')}
                    </th>
                    <th 
                      onClick={() => handleSort('consumo_ciclo_gb')}
                      className="p-4 text-xs font-bold text-st-muted uppercase tracking-wider border-b border-st-border cursor-pointer select-none hover:text-white transition-colors"
                    >
                      Consumo {renderSortIcon('consumo_ciclo_gb')}
                    </th>
                    <th 
                      onClick={() => handleSort('utilizacion_pct')}
                      className="p-4 text-xs font-bold text-st-muted uppercase tracking-wider border-b border-st-border cursor-pointer select-none hover:text-white transition-colors"
                    >
                      Utilización {renderSortIcon('utilizacion_pct')}
                    </th>
                    <th className="p-4 text-xs font-bold text-st-muted uppercase tracking-wider border-b border-st-border text-center">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedPlanes.map((item) => (
                    <tr key={item.id} className="border-b border-st-border/50 hover:bg-white/5 transition-colors">
                      {/* Plan */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-st-bg rounded-lg border border-st-border">
                            <Layers className="w-4 h-4 text-emerald-400" />
                          </div>
                          <div>
                            <span className="font-semibold text-white text-sm">{item.plan_contratado}</span>
                            {item.id_producto && (
                              <div className="text-[11px] text-st-muted">{item.id_producto}</div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Tipo */}
                      <td className="p-4 text-sm text-st-muted font-medium">
                        {item.tipo_suscripcion || '--'}
                      </td>

                      {/* Equipos */}
                      <td className="p-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                          {item.cantidad_equipos}
                        </span>
                      </td>

                      {/* Servicios */}
                      <td className="p-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {item.cantidad_servicios}
                        </span>
                      </td>

                      {/* Datos por servicio */}
                      <td className="p-4 text-sm text-white font-medium">
                        {formatCapacity(item.usage_limit_gb_unit)} / servicio
                      </td>

                      {/* Capacidad total */}
                      <td className="p-4 text-sm text-purple-300 font-bold">
                        {formatCapacity(item.capacidad_total_gb)}
                      </td>

                      {/* Valor del plan */}
                      <td className="p-4 text-sm text-white font-medium">
                        {formatCurrency(item.valor_plan, item.moneda)} <span className="text-[11px] text-st-muted font-normal">/ servicio</span>
                      </td>

                      {/* Monto total contratado */}
                      <td className="p-4 text-sm text-amber-400 font-bold">
                        {formatCurrency(item.monto_total_contratado, item.moneda)}
                      </td>

                      {/* Consumo del ciclo */}
                      <td className="p-4 text-sm text-st-muted font-medium">
                        {formatCapacity(item.consumo_ciclo_gb)}
                      </td>

                      {/* Utilización */}
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-st-bg rounded-full overflow-hidden w-20 border border-st-border/40">
                            <div 
                              className={`h-full transition-all ${
                                item.utilizacion_pct > 90 ? 'bg-red-500' :
                                item.utilizacion_pct > 75 ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(item.utilizacion_pct, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-white min-w-[40px]">
                            {item.utilizacion_pct}%
                          </span>
                        </div>
                      </td>

                      {/* Estado */}
                      <td className="p-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {item.estado}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {sortedPlanes.length === 0 && (
                    <tr>
                      <td colSpan={11} className="p-8 text-center text-st-muted">
                        No se encontraron planes contratados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
