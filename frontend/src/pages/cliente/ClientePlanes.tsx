import React, { useState, useEffect, useMemo } from 'react';
import { 
  Layers, 
  Search, 
  Activity, 
  Radio, 
  Cpu, 
  Database, 
  DollarSign, 
  RefreshCw,
  BarChart2,
  Info
} from 'lucide-react';
import client from '../../api/client';
import { useTableSort } from '../../hooks/useTableSort';
import { SortableHeader } from '../../components/ui/SortableHeader';
import Pagination from '../../components/Pagination';

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



type MetricChart = 'equipos' | 'servicios' | 'capacidad' | 'monto';

export const ClientePlanes: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kpis, setKpis] = useState<PlanesKPIs | null>(null);
  const [planes, setPlanes] = useState<PlanResumenItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [chartMetric, setChartMetric] = useState<MetricChart>('equipos');

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

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
    (p.id_producto && p.id_producto.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Sort
  const { sortedData: sortedPlanes, sortColumn, sortDirection, handleSort } = useTableSort(filteredPlanes, {
    initialSortColumn: 'plan_contratado',
    initialSortDirection: 'asc'
  });

  const paginatedPlanes = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedPlanes.slice(start, start + pageSize);
  }, [sortedPlanes, currentPage, pageSize]);

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
    <div className="space-y-4 sm:space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-client-bg-surface border border-client-border p-4 sm:p-6 rounded-2xl shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-client-text-primary font-sans uppercase">MIS PLANES</h1>
          <p className="text-xs text-client-text-secondary mt-0.5">
            Resumen consolidado de los planes contratados por tu organización.
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="self-start sm:self-auto flex items-center gap-2 px-3.5 py-2 bg-client-bg-subtle border border-client-border hover:bg-white/5 text-xs font-semibold text-client-text-primary rounded-xl transition-all active:scale-[0.98] cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* Loading State */}
      {loading && !kpis && (
        <div className="flex h-64 items-center justify-center bg-client-bg-surface border border-client-border rounded-2xl shadow-sm">
          <Activity className="w-8 h-8 animate-spin text-client-primary" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex flex-col items-center justify-center p-6 sm:p-8 bg-client-bg-surface border border-client-danger rounded-2xl text-center space-y-4 shadow-sm">
          <div className="p-3 bg-client-danger-soft border border-client-danger rounded-full text-red-500">
            <Activity className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-client-text-primary">No se pudo cargar la información de planes</h3>
            <p className="text-xs sm:text-sm text-client-text-secondary mt-1 max-w-md">{error}</p>
          </div>
          <button 
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 bg-st-accent text-st-bg font-semibold text-xs sm:text-sm rounded-xl hover:bg-st-accent/90 transition-all active:scale-[0.98] cursor-pointer"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
            {/* KPI 1 */}
            <div className="bg-client-bg-surface border border-client-border rounded-xl p-3.5 sm:p-4 flex flex-col justify-between hover:border-client-border/80 transition-all shadow-sm">
              <div className="flex items-center justify-between text-client-text-secondary mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Planes Distintos</span>
                <Layers className="w-4 h-4 text-client-success shrink-0" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-client-text-primary font-mono">{kpis.planes_distintos}</div>
              <div className="text-xs text-client-text-secondary mt-1">Planes contratados</div>
            </div>

            {/* KPI 2 */}
            <div className="bg-client-bg-surface border border-client-border rounded-xl p-3.5 sm:p-4 flex flex-col justify-between hover:border-client-border/80 transition-all shadow-sm">
              <div className="flex items-center justify-between text-client-text-secondary mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Equipos con Plan</span>
                <Cpu className="w-4 h-4 text-client-info shrink-0" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-client-text-primary font-mono">{kpis.equipos_con_plan}</div>
              <div className="text-xs text-client-text-secondary mt-1">Terminales asociadas</div>
            </div>

            {/* KPI 3 */}
            <div className="bg-client-bg-surface border border-client-border rounded-xl p-3.5 sm:p-4 flex flex-col justify-between hover:border-client-border/80 transition-all shadow-sm">
              <div className="flex items-center justify-between text-client-text-secondary mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Servicios con Plan</span>
                <Radio className="w-4 h-4 text-[#00A8E8] shrink-0" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-client-text-primary font-mono">{kpis.servicios_con_plan}</div>
              <div className="text-xs text-client-text-secondary mt-1">Líneas de servicio activas</div>
            </div>

            {/* KPI 4 */}
            <div className="bg-client-bg-surface border border-client-border rounded-xl p-3.5 sm:p-4 flex flex-col justify-between hover:border-client-border/80 transition-all shadow-sm">
              <div className="flex items-center justify-between text-client-text-secondary mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Capacidad Total</span>
                <Database className="w-4 h-4 text-purple-400 shrink-0" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-client-text-primary font-mono">{formatCapacity(kpis.capacidad_total_gb)}</div>
              <div className="text-xs text-client-text-secondary mt-1">Datos contratados</div>
            </div>

            {/* KPI 5 */}
            <div className="bg-client-bg-surface border border-client-border rounded-xl p-3.5 sm:p-4 flex flex-col justify-between hover:border-client-border/80 transition-all shadow-sm col-span-1 sm:col-span-2 md:col-span-1 xl:col-span-1">
              <div className="flex items-center justify-between text-client-text-secondary mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Monto Mensual</span>
                <DollarSign className="w-4 h-4 text-client-warning shrink-0" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-client-text-primary font-mono">{formatCurrency(kpis.monto_mensual_contratado, kpis.moneda)}</div>
              <div className="flex items-center gap-1.5 mt-1 text-client-text-secondary">
                <span className="text-xs">Valor mensual referencial</span>
                <div className="group relative flex items-center">
                  <Info className="w-3.5 h-3.5 text-client-text-secondary cursor-help" />
                  <div className="absolute bottom-full right-0 md:left-1/2 md:-translate-x-1/2 mb-2 w-64 p-2.5 bg-client-bg-subtle border border-client-border rounded-lg text-xs text-client-text-primary shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 text-left font-normal leading-relaxed">
                    Los valores monetarios mostrados son referenciales y se basan en el precio del producto Starlink disponible para la cuenta. El valor comercial final puede depender del tarifario del reseller.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Distribution Chart Section */}
          {planes.length > 0 && (
            <div className="bg-client-bg-surface border border-client-border rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-client-border">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 sm:w-5 sm:h-5 text-client-primary" />
                  <h3 className="text-xs sm:text-sm font-bold text-client-text-primary uppercase tracking-wider">
                    Distribución por Plan
                  </h3>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="text-xs text-client-text-secondary whitespace-nowrap">Visualizar por:</span>
                  <select
                    value={chartMetric}
                    onChange={(e) => setChartMetric(e.target.value as MetricChart)}
                    className="bg-client-bg-subtle border border-client-border rounded-lg px-2.5 py-1 text-xs text-client-text-primary font-medium outline-none focus:border-st-accent cursor-pointer"
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
                        <span className="font-semibold text-client-text-primary truncate max-w-[200px] sm:max-w-none">{p.plan_contratado}</span>
                        <span className="text-client-text-secondary font-medium shrink-0 ml-2">{getMetricLabel(p, chartMetric)}</span>
                      </div>
                      <div className="h-3 bg-client-bg-subtle rounded-full overflow-hidden border border-client-border/50">
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
          <div className="bg-client-bg-surface border border-client-border rounded-2xl flex flex-col shadow-sm overflow-hidden">
            {/* Toolbar / Search */}
            <div className="p-3.5 sm:p-4 border-b border-client-border flex flex-col sm:flex-row gap-3 sm:gap-4 justify-between items-center">
              <div className="relative flex-1 w-full sm:max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-client-text-secondary" />
                <input
                  type="text"
                  placeholder="Filtrar por nombre o código de plan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-client-bg-subtle border border-client-border rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-client-text-primary focus:border-st-accent outline-none transition-colors"
                />
              </div>
              <div className="text-xs text-client-text-secondary font-mono self-end sm:self-auto">
                Mostrando <span className="font-bold text-client-text-primary">{sortedPlanes.length}</span> de <span className="font-bold text-client-text-primary">{planes.length}</span> planes distintos
              </div>
            </div>

            {/* Mobile Cards View (Visible on Mobile Screens) */}
            <div className="block md:hidden divide-y divide-client-border bg-client-bg-surface">
              {paginatedPlanes.map((item) => (
                <div key={item.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-client-bg-subtle rounded-lg border border-client-border shrink-0">
                        <Layers className="w-4 h-4 text-client-success" />
                      </div>
                      <div>
                        <span className="font-bold text-client-text-primary text-xs sm:text-sm block">{item.plan_contratado}</span>
                        {item.id_producto && <span className="text-[10px] sm:text-xs font-mono text-client-text-secondary">{item.id_producto}</span>}
                      </div>
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-client-success-soft text-client-success border border-client-success">
                      {item.estado}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-client-border/40">
                    <div>
                      <span className="text-client-text-secondary text-[11px] block font-medium">Equipos / Servicios:</span>
                      <span className="font-semibold text-client-text-primary">{item.cantidad_equipos} eq. / {item.cantidad_servicios} serv.</span>
                    </div>
                    <div>
                      <span className="text-client-text-secondary text-[11px] block font-medium">Capacidad Total:</span>
                      <span className="font-bold text-purple-600">{item.capacidad_total_gb > 0 ? formatCapacity(item.capacidad_total_gb) : 'Ilimitado'}</span>
                    </div>
                    <div>
                      <span className="text-client-text-secondary text-[11px] block font-medium">Monto Total:</span>
                      <span className="font-bold text-client-warning">{formatCurrency(item.monto_total_contratado, item.moneda)}</span>
                    </div>
                    <div>
                      <span className="text-client-text-secondary text-[11px] block font-medium">Utilización:</span>
                      <span className="font-bold text-client-text-primary">{item.capacidad_total_gb > 0 ? `${item.utilizacion_pct}%` : 'N/A'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Main Consolidated Table (Desktop View) */}
            <div className="hidden md:block overflow-x-auto w-full">
              <table className="w-full text-left border-collapse min-w-[880px]">
                <thead className="bg-client-bg-subtle sticky top-0 z-10">
                  <tr>
                    <SortableHeader 
                      label="Plan" 
                      column="plan_contratado" 
                      currentSortColumn={sortColumn as string} 
                      currentSortDirection={sortDirection} 
                      onSort={handleSort as any} 
                      className="!px-3.5 !py-3 sm:!px-4 sm:!py-3.5 !text-xs !text-client-text-secondary !border-b !border-client-border !bg-transparent hover:!text-client-text-primary"
                    />
                    <SortableHeader 
                      label="Equipos" 
                      column="cantidad_equipos" 
                      currentSortColumn={sortColumn as string} 
                      currentSortDirection={sortDirection} 
                      onSort={handleSort as any} 
                      align="center"
                      className="!px-3.5 !py-3 sm:!px-4 sm:!py-3.5 !text-xs !text-client-text-secondary !border-b !border-client-border !bg-transparent hover:!text-client-text-primary"
                    />
                    <SortableHeader 
                      label="Servicios" 
                      column="cantidad_servicios" 
                      currentSortColumn={sortColumn as string} 
                      currentSortDirection={sortDirection} 
                      onSort={handleSort as any} 
                      align="center"
                      className="!px-3.5 !py-3 sm:!px-4 sm:!py-3.5 !text-xs !text-client-text-secondary !border-b !border-client-border !bg-transparent hover:!text-client-text-primary"
                    />
                    <SortableHeader 
                      label="Datos por servicio" 
                      column="usage_limit_gb_unit" 
                      currentSortColumn={sortColumn as string} 
                      currentSortDirection={sortDirection} 
                      onSort={handleSort as any} 
                      className="!px-3.5 !py-3 sm:!px-4 sm:!py-3.5 !text-xs !text-client-text-secondary !border-b !border-client-border !bg-transparent hover:!text-client-text-primary"
                    />
                    <SortableHeader 
                      label="Capacidad total" 
                      column="capacidad_total_gb" 
                      currentSortColumn={sortColumn as string} 
                      currentSortDirection={sortDirection} 
                      onSort={handleSort as any} 
                      className="!px-3.5 !py-3 sm:!px-4 sm:!py-3.5 !text-xs !text-client-text-secondary !border-b !border-client-border !bg-transparent hover:!text-client-text-primary"
                    />
                    <SortableHeader 
                      label="Valor del plan" 
                      column="valor_plan" 
                      currentSortColumn={sortColumn as string} 
                      currentSortDirection={sortDirection} 
                      onSort={handleSort as any} 
                      className="!px-3.5 !py-3 sm:!px-4 sm:!py-3.5 !text-xs !text-client-text-secondary !border-b !border-client-border !bg-transparent hover:!text-client-text-primary"
                    />
                    <SortableHeader 
                      label="Monto total" 
                      column="monto_total_contratado" 
                      currentSortColumn={sortColumn as string} 
                      currentSortDirection={sortDirection} 
                      onSort={handleSort as any} 
                      className="!px-3.5 !py-3 sm:!px-4 sm:!py-3.5 !text-xs !text-client-text-secondary !border-b !border-client-border !bg-transparent hover:!text-client-text-primary"
                    />
                    <SortableHeader 
                      label="Consumo" 
                      column="consumo_ciclo_gb" 
                      currentSortColumn={sortColumn as string} 
                      currentSortDirection={sortDirection} 
                      onSort={handleSort as any} 
                      className="!px-3.5 !py-3 sm:!px-4 sm:!py-3.5 !text-xs !text-client-text-secondary !border-b !border-client-border !bg-transparent hover:!text-client-text-primary"
                    />
                    <SortableHeader 
                      label="Utilización" 
                      column="utilizacion_pct" 
                      currentSortColumn={sortColumn as string} 
                      currentSortDirection={sortDirection} 
                      onSort={handleSort as any} 
                      className="!px-3.5 !py-3 sm:!px-4 sm:!py-3.5 !text-xs !text-client-text-secondary !border-b !border-client-border !bg-transparent hover:!text-client-text-primary"
                    />
                    <SortableHeader 
                      label="Estado" 
                      column="estado" 
                      currentSortColumn={sortColumn as string} 
                      currentSortDirection={sortDirection} 
                      onSort={handleSort as any} 
                      align="center"
                      className="!px-3.5 !py-3 sm:!px-4 sm:!py-3.5 !text-xs !text-client-text-secondary !border-b !border-client-border !bg-transparent hover:!text-client-text-primary"
                    />
                  </tr>
                </thead>
                <tbody className="divide-y divide-client-border/50 text-xs">
                  {paginatedPlanes.map((item) => (
                    <tr key={item.id} className="hover:bg-white/5 transition-colors">
                      {/* Plan */}
                      <td className="p-3.5 sm:p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-client-bg-subtle rounded-lg border border-client-border shrink-0">
                            <Layers className="w-4 h-4 text-client-success" />
                          </div>
                          <div>
                            <span className="font-semibold text-client-text-primary text-xs sm:text-sm">{item.plan_contratado}</span>
                            {item.id_producto && (
                              <div className="text-[10px] sm:text-xs font-mono text-client-text-secondary">{item.id_producto}</div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Equipos */}
                      <td className="p-3.5 sm:p-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500/10 text-client-info border border-cyan-500/20">
                          {item.cantidad_equipos}
                        </span>
                      </td>

                      {/* Servicios */}
                      <td className="p-3.5 sm:p-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {item.cantidad_servicios}
                        </span>
                      </td>

                      {/* Datos por servicio */}
                      <td className="p-3.5 sm:p-4 text-xs sm:text-sm text-client-text-primary font-medium">
                        {item.usage_limit_gb_unit > 0 ? `${formatCapacity(item.usage_limit_gb_unit)} / servicio` : 'Ilimitado'}
                      </td>

                      {/* Capacidad total */}
                      <td className="p-3.5 sm:p-4 text-xs sm:text-sm text-purple-600 font-bold">
                        {item.capacidad_total_gb > 0 ? formatCapacity(item.capacidad_total_gb) : 'Ilimitado'}
                      </td>

                      {/* Valor del plan */}
                      <td className="p-3.5 sm:p-4 text-xs sm:text-sm text-client-text-primary font-medium whitespace-nowrap">
                        {formatCurrency(item.valor_plan, item.moneda)} <span className="text-[10px] sm:text-xs text-client-text-secondary font-normal">/ servicio</span>
                      </td>

                      {/* Monto total contratado */}
                      <td className="p-3.5 sm:p-4 text-xs sm:text-sm text-client-warning font-bold whitespace-nowrap">
                        {formatCurrency(item.monto_total_contratado, item.moneda)}
                      </td>

                      {/* Consumo del ciclo */}
                      <td className="p-3.5 sm:p-4 text-xs sm:text-sm text-client-text-secondary font-medium whitespace-nowrap">
                        {formatCapacity(item.consumo_ciclo_gb)}
                      </td>

                      {/* Utilización */}
                      <td className="p-3.5 sm:p-4">
                        {item.capacidad_total_gb > 0 ? (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-client-bg-subtle rounded-full overflow-hidden w-16 sm:w-20 border border-client-border/40">
                              <div 
                                className={`h-full transition-all ${
                                  item.utilizacion_pct > 90 ? 'bg-red-500' :
                                  item.utilizacion_pct > 75 ? 'bg-amber-500' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${Math.min(item.utilizacion_pct, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-client-text-primary min-w-[36px]">
                              {item.utilizacion_pct}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs font-medium text-client-text-secondary">
                            No aplica
                          </span>
                        )}
                      </td>

                      {/* Estado */}
                      <td className="p-3.5 sm:p-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-semibold bg-client-success-soft text-client-success border border-client-success">
                          {item.estado}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {sortedPlanes.length === 0 && (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-client-text-secondary">
                        No se encontraron planes contratados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <Pagination
              currentPage={currentPage}
              totalItems={sortedPlanes.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        </>
      )}
    </div>
  );
};
