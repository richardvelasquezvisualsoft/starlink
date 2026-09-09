import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  RefreshCw,
  Download,
  Plus,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Activity,
  AlertTriangle,
  ShieldAlert,
  Satellite,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MoreVertical,
  Radio,
  CreditCard,
  Building2
} from 'lucide-react';
import client from '../api/client';

interface ClientItem {
  tenant_id: number;
  tenant_codigo: string;
  cliente: string;
  razon_social: string;
  identificacion_fiscal: string;
  pais_iso2: string;
  zona_horaria: string;
  cliente_activo: boolean;
  codigo_contrato: string | null;
  contrato_nombre: string | null;
  contrato_fecha_inicio: string | null;
  contrato_fecha_vencimiento: string | null;
  plazo_meses: number | null;
  estado_contrato: string | null;
  renovacion_automatica: boolean | null;
  contrato_moneda: string | null;
  monto_mensual_referencial: number | null;
  dias_para_vencimiento: number | null;
  planes_contratados: string | null;
  cantidad_dispositivos: number;
  cantidad_lineas: number;
  lineas_activas: number;
  lineas_suspendidas: number;
  dispositivos_online: number;
  dispositivos_offline: number;
  sin_telemetria: number;
  periodo_actual: string | null;
  starlinks_periodo_actual: number;
  starlinks_periodo_anterior: number;
  delta_starlinks_vs_mes_anterior: number;
  delta_starlinks_pct: number;
  consumo_total_gb: number;
  consumo_total_mb_equivalente: number;
  latencia_avg_ms: number;
  packet_loss_pct: number;
  disponibilidad_pct: number;
  calidad_servicio_score: number;
  moneda_facturacion: string;
  monto_promedio_facturacion: number;
  ultimo_monto_facturacion: number;
  alertas_graves_pendientes: number;
  alertas_graves_sin_reconocer: number;
  semaforo_cliente: 'ROJO' | 'AMARILLO' | 'VERDE';
  motivo_semaforo: string;
}

interface SummaryKpis {
  total_clientes_activos: number;
  clientes_en_rojo: number;
  clientes_en_amarillo: number;
  clientes_en_verde: number;
  total_dispositivos: number;
  total_lineas_activas: number;
  total_alertas_graves: number;
  calidad_promedio_clientes: number;
}

const ResellerClients: React.FC = () => {
  const navigate = useNavigate();

  // State
  const [data, setData] = useState<ClientItem[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<SummaryKpis | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters & Pagination State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstadoCliente, setFilterEstadoCliente] = useState('activos');
  const [filterEstadoContrato, setFilterEstadoContrato] = useState('todos');
  const [filterSemaforo, setFilterSemaforo] = useState('todos');
  const [filterAlertas, setFilterAlertas] = useState('todos');
  const [filterVariacion, setFilterVariacion] = useState('todos');

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState('semaforo_cliente');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Action Menu Dropdown State
  const [activeMenuTenantId, setActiveMenuTenantId] = useState<number | null>(null);

  // Fetch Data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, summaryRes] = await Promise.all([
        client.get('/reseller/clientes', {
          params: {
            q: searchTerm || undefined,
            estado_cliente: filterEstadoCliente,
            estado_contrato: filterEstadoContrato !== 'todos' ? filterEstadoContrato : undefined,
            semaforo: filterSemaforo !== 'todos' ? filterSemaforo : undefined,
            alertas: filterAlertas !== 'todos' ? filterAlertas : undefined,
            variacion: filterVariacion !== 'todos' ? filterVariacion : undefined,
            page,
            pageSize,
            sortBy,
            sortDirection
          }
        }),
        client.get('/reseller/clientes/resumen')
      ]);

      setData(listRes.data.data);
      setTotal(listRes.data.total);
      setSummary(summaryRes.data);
    } catch (err) {
      console.error('Error loading reseller clients list:', err);
    } finally {
      setLoading(false);
    }
  }, [
    searchTerm, filterEstadoCliente, filterEstadoContrato,
    filterSemaforo, filterAlertas, filterVariacion,
    page, pageSize, sortBy, sortDirection
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Sort Change
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDirection('asc');
    }
    setPage(1);
  };

  // CSV Export
  const exportToCSV = () => {
    if (data.length === 0) return;

    const headers = [
      'Cliente', 'Razon Social', 'RUC', 'Codigo', 'Estado Cliente',
      'Contrato Inicio', 'Contrato Vencimiento', 'Estado Contrato', 'Dias Restantes',
      'Planes', 'Dispositivos Totales', 'Lineas Activas', 'Lineas Suspendidas',
      'Variacion Mes Anterior', 'Variacion %', 'Calidad Score', 'Latencia ms',
      'Loss %', 'Facturacion Promedio', 'Alertas Graves', 'Semaforo', 'Motivo'
    ];

    const rows = data.map(item => [
      `"${item.cliente || ''}"`,
      `"${item.razon_social || ''}"`,
      `"${item.identificacion_fiscal || ''}"`,
      `"${item.tenant_codigo || ''}"`,
      item.cliente_activo ? 'Activo' : 'Inactivo',
      item.contrato_fecha_inicio || '',
      item.contrato_fecha_vencimiento || '',
      item.estado_contrato || 'Sin contrato',
      item.dias_para_vencimiento ?? '',
      `"${item.planes_contratados || ''}"`,
      item.cantidad_dispositivos,
      item.lineas_activas,
      item.lineas_suspendidas,
      item.delta_starlinks_vs_mes_anterior,
      `${item.delta_starlinks_pct}%`,
      item.calidad_servicio_score,
      item.latencia_avg_ms,
      `${item.packet_loss_pct}%`,
      `"${item.moneda_facturacion} ${item.monto_promedio_facturacion}"`,
      item.alertas_graves_pendientes,
      item.semaforo_cliente,
      `"${item.motivo_semaforo || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `cartera_clientes_starlink_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div className="space-y-6">
      {/* 1. CABECERA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans">Clientes</h1>
          <p className="text-xs text-st-muted mt-0.5">Clientes gestionados por el reseller</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-3.5 py-2 bg-st-surface border border-st-border rounded-lg text-xs font-semibold text-white hover:bg-white/5 active:scale-[0.98] transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-st-muted ${loading ? 'animate-spin' : ''}`} />
            <span>Refrescar</span>
          </button>

          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-3.5 py-2 bg-st-surface border border-st-border rounded-lg text-xs font-semibold text-white hover:bg-white/5 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-st-accent" />
            <span>Exportar</span>
          </button>

          <button
            onClick={() => navigate('/reseller/aprovisionamiento')}
            className="flex items-center gap-2 px-4 py-2 bg-st-primary text-black text-xs font-bold uppercase rounded-lg hover:bg-white/90 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Nuevo cliente</span>
          </button>
        </div>
      </div>

      {/* 2. CARDS RESUMEN */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="bg-st-surface border border-st-border rounded-xl p-4 flex flex-col justify-between hover:border-st-accent/40 transition-colors">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-bold text-st-muted uppercase tracking-wider">Clientes Activos</span>
              <Users className="w-4 h-4 text-st-accent" />
            </div>
            <div>
              <span className="text-2xl font-bold font-mono text-white">{summary.total_clientes_activos}</span>
              <p className="text-[10px] text-st-muted mt-1 leading-tight">Cartera total activa</p>
            </div>
          </div>

          <div className="bg-st-surface border border-st-border rounded-xl p-4 flex flex-col justify-between hover:border-st-accent/40 transition-colors">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-bold text-st-muted uppercase tracking-wider">Clientes en Riesgo</span>
              <ShieldAlert className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-amber-400">
                  {summary.clientes_en_rojo + summary.clientes_en_amarillo}
                </span>
                <span className="text-xs text-st-muted font-mono">
                  ({summary.clientes_en_rojo} rojos · {summary.clientes_en_amarillo} amarillos)
                </span>
              </div>
              <p className="text-[10px] text-st-muted mt-1 leading-tight">Requieren atención preventiva</p>
            </div>
          </div>

          <div className="bg-st-surface border border-st-border rounded-xl p-4 flex flex-col justify-between hover:border-st-accent/40 transition-colors">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-bold text-st-muted uppercase tracking-wider">Dispositivos Totales</span>
              <Satellite className="w-4 h-4 text-st-accent" />
            </div>
            <div>
              <span className="text-2xl font-bold font-mono text-white">{summary.total_dispositivos}</span>
              <p className="text-[10px] text-st-muted mt-1 leading-tight">{summary.total_lineas_activas} líneas operativas</p>
            </div>
          </div>

          <div className="bg-st-surface border border-st-border rounded-xl p-4 flex flex-col justify-between hover:border-st-accent/40 transition-colors">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-bold text-st-muted uppercase tracking-wider">Alertas Graves</span>
              <AlertTriangle className={`w-4 h-4 ${summary.total_alertas_graves > 0 ? 'text-red-500' : 'text-st-muted'}`} />
            </div>
            <div>
              <span className={`text-2xl font-bold font-mono ${summary.total_alertas_graves > 0 ? 'text-red-500' : 'text-white'}`}>
                {summary.total_alertas_graves}
              </span>
              <p className="text-[10px] text-st-muted mt-1 leading-tight">Pendientes en flota global</p>
            </div>
          </div>

          <div className="bg-st-surface border border-st-border rounded-xl p-4 flex flex-col justify-between hover:border-st-accent/40 transition-colors">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-bold text-st-muted uppercase tracking-wider">Calidad Promedio</span>
              <Activity className="w-4 h-4 text-green-400" />
            </div>
            <div>
              <span className="text-2xl font-bold font-mono text-green-400">{summary.calidad_promedio_clientes}</span>
              <p className="text-[10px] text-st-muted mt-1 leading-tight">Score global de servicio</p>
            </div>
          </div>
        </div>
      )}

      {/* 3. BUSCADOR & FILTROS */}
      <div className="bg-st-surface border border-st-border rounded-xl p-4 space-y-3">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Buscador Principal */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-st-muted" />
            <input
              type="text"
              placeholder="Buscar por cliente, razón social, RUC, código o plan..."
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="w-full bg-st-bg border border-st-border rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-st-muted focus:outline-none focus:border-st-accent/50 transition-colors"
            />
          </div>

          {/* Filtros Rápida */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterEstadoCliente}
              onChange={e => { setFilterEstadoCliente(e.target.value); setPage(1); }}
              className="bg-st-bg border border-st-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
            >
              <option value="todos">Cliente: Todos</option>
              <option value="activos">Cliente: Activos</option>
              <option value="inactivos">Cliente: Inactivos</option>
            </select>

            <select
              value={filterSemaforo}
              onChange={e => { setFilterSemaforo(e.target.value); setPage(1); }}
              className="bg-st-bg border border-st-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
            >
              <option value="todos">Semáforo: Todos</option>
              <option value="ROJO">Semáforo: Rojo</option>
              <option value="AMARILLO">Semáforo: Amarillo</option>
              <option value="VERDE">Semáforo: Verde</option>
            </select>

            <select
              value={filterEstadoContrato}
              onChange={e => { setFilterEstadoContrato(e.target.value); setPage(1); }}
              className="bg-st-bg border border-st-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
            >
              <option value="todos">Contrato: Todos</option>
              <option value="activo">Contrato: Activo</option>
              <option value="proximo_vencer">Próximo a Vencer (&le; 30d)</option>
              <option value="vencido">Contrato: Vencido</option>
            </select>

            <select
              value={filterAlertas}
              onChange={e => { setFilterAlertas(e.target.value); setPage(1); }}
              className="bg-st-bg border border-st-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
            >
              <option value="todos">Alertas: Todas</option>
              <option value="con_alertas">Con Alertas Graves</option>
              <option value="sin_alertas">Sin Alertas Graves</option>
            </select>

            <select
              value={filterVariacion}
              onChange={e => { setFilterVariacion(e.target.value); setPage(1); }}
              className="bg-st-bg border border-st-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
            >
              <option value="todos">Variación: Todas</option>
              <option value="crecio">Flota Creció (&gt;0)</option>
              <option value="disminuyo">Flota Cayó (&lt;0)</option>
              <option value="sin_cambio">Sin Cambio (0)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. TABLA PRINCIPAL */}
      <div className="bg-st-surface border border-st-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead>
              <tr className="bg-st-bg/60 text-st-muted border-b border-st-border select-none">
                <th className="py-3 px-3 uppercase font-bold text-[10px]">Acciones</th>
                
                <th
                  onClick={() => handleSort('semaforo_cliente')}
                  className="py-3 px-2 uppercase font-bold text-[10px] text-center cursor-pointer hover:text-white transition-colors w-10"
                >
                  <div className="flex items-center justify-center gap-1" title="Semáforo de estado">
                    <span>Sem.</span>
                    {sortBy === 'semaforo_cliente' ? (
                      sortDirection === 'asc' ? <ChevronUp className="w-3 h-3 text-st-accent" /> : <ChevronDown className="w-3 h-3 text-st-accent" />
                    ) : <ArrowUpDown className="w-3 h-3 text-st-muted/50" />}
                  </div>
                </th>

                <th
                  onClick={() => handleSort('cliente')}
                  className="py-3 px-4 uppercase font-bold text-[10px] cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Cliente</span>
                    {sortBy === 'cliente' ? (
                      sortDirection === 'asc' ? <ChevronUp className="w-3 h-3 text-st-accent" /> : <ChevronDown className="w-3 h-3 text-st-accent" />
                    ) : <ArrowUpDown className="w-3 h-3 text-st-muted/50" />}
                  </div>
                </th>

                <th
                  onClick={() => handleSort('contrato_fecha_vencimiento')}
                  className="py-3 px-4 uppercase font-bold text-[10px] cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Contrato</span>
                    {sortBy === 'contrato_fecha_vencimiento' ? (
                      sortDirection === 'asc' ? <ChevronUp className="w-3 h-3 text-st-accent" /> : <ChevronDown className="w-3 h-3 text-st-accent" />
                    ) : <ArrowUpDown className="w-3 h-3 text-st-muted/50" />}
                  </div>
                </th>

                <th className="py-3 px-4 uppercase font-bold text-[10px]">Plan Contratado</th>

                <th
                  onClick={() => handleSort('cantidad_dispositivos')}
                  className="py-3 px-4 uppercase font-bold text-[10px] text-right cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Starlinks</span>
                    {sortBy === 'cantidad_dispositivos' ? (
                      sortDirection === 'asc' ? <ChevronUp className="w-3 h-3 text-st-accent" /> : <ChevronDown className="w-3 h-3 text-st-accent" />
                    ) : <ArrowUpDown className="w-3 h-3 text-st-muted/50" />}
                  </div>
                </th>

                <th
                  onClick={() => handleSort('delta_starlinks_vs_mes_anterior')}
                  className="py-3 px-4 uppercase font-bold text-[10px] text-right cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Var. Mes</span>
                    {sortBy === 'delta_starlinks_vs_mes_anterior' ? (
                      sortDirection === 'asc' ? <ChevronUp className="w-3 h-3 text-st-accent" /> : <ChevronDown className="w-3 h-3 text-st-accent" />
                    ) : <ArrowUpDown className="w-3 h-3 text-st-muted/50" />}
                  </div>
                </th>

                <th
                  onClick={() => handleSort('calidad_servicio_score')}
                  className="py-3 px-4 uppercase font-bold text-[10px] text-right cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Calidad</span>
                    {sortBy === 'calidad_servicio_score' ? (
                      sortDirection === 'asc' ? <ChevronUp className="w-3 h-3 text-st-accent" /> : <ChevronDown className="w-3 h-3 text-st-accent" />
                    ) : <ArrowUpDown className="w-3 h-3 text-st-muted/50" />}
                  </div>
                </th>

                <th
                  onClick={() => handleSort('monto_promedio_facturacion')}
                  className="py-3 px-4 uppercase font-bold text-[10px] text-right cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Fact. Promedio</span>
                    {sortBy === 'monto_promedio_facturacion' ? (
                      sortDirection === 'asc' ? <ChevronUp className="w-3 h-3 text-st-accent" /> : <ChevronDown className="w-3 h-3 text-st-accent" />
                    ) : <ArrowUpDown className="w-3 h-3 text-st-muted/50" />}
                  </div>
                </th>

                <th
                  onClick={() => handleSort('alertas_graves_pendientes')}
                  className="py-3 px-4 uppercase font-bold text-[10px] text-center cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Alertas</span>
                    {sortBy === 'alertas_graves_pendientes' ? (
                      sortDirection === 'asc' ? <ChevronUp className="w-3 h-3 text-st-accent" /> : <ChevronDown className="w-3 h-3 text-st-accent" />
                    ) : <ArrowUpDown className="w-3 h-3 text-st-muted/50" />}
                  </div>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-st-border/50">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-st-muted">
                    <Activity className="w-8 h-8 text-st-accent animate-spin mx-auto mb-2" />
                    <span>Cargando cartera de clientes...</span>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-st-muted">
                    <Building2 className="w-8 h-8 text-st-muted mx-auto mb-2 opacity-50" />
                    <span>No se encontraron clientes que coincidan con la búsqueda.</span>
                  </td>
                </tr>
              ) : (
                data.map(item => (
                  <tr
                    key={item.tenant_id}
                    className="hover:bg-white/5 transition-colors group"
                  >
                    {/* Acciones */}
                    <td className="py-3 px-3 relative">
                      <div className="relative inline-block">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setActiveMenuTenantId(activeMenuTenantId === item.tenant_id ? null : item.tenant_id);
                          }}
                          className="p-1.5 rounded-lg text-st-muted hover:text-white hover:bg-white/10 transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {activeMenuTenantId === item.tenant_id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setActiveMenuTenantId(null)}
                            />
                            <div className="absolute top-full left-0 mt-1 w-48 rounded-lg bg-st-surface border border-st-border shadow-2xl py-1 z-20">
                              <button
                                onClick={() => {
                                  setActiveMenuTenantId(null);
                                  navigate(`/reseller/clientes/${item.tenant_id}/dashboard`);
                                }}
                                className="w-full text-left px-3 py-1.5 text-xs text-white hover:bg-white/10 flex items-center gap-2"
                              >
                                <ExternalLink className="w-3.5 h-3.5 text-st-accent" />
                                <span>Ver Cliente</span>
                              </button>

                              <button
                                onClick={() => {
                                  setActiveMenuTenantId(null);
                                  navigate(`/reseller/clientes/${item.tenant_id}/servicios`);
                                }}
                                className="w-full text-left px-3 py-1.5 text-xs text-st-muted hover:text-white hover:bg-white/10 flex items-center gap-2"
                              >
                                <Radio className="w-3.5 h-3.5" />
                                <span>Ver Servicios</span>
                              </button>

                              <button
                                onClick={() => {
                                  setActiveMenuTenantId(null);
                                  navigate(`/reseller/clientes/${item.tenant_id}/alertas`);
                                }}
                                className="w-full text-left px-3 py-1.5 text-xs text-st-muted hover:text-white hover:bg-white/10 flex items-center gap-2"
                              >
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                                <span>Ver Alertas</span>
                              </button>

                              <button
                                onClick={() => {
                                  setActiveMenuTenantId(null);
                                  navigate(`/reseller/clientes/${item.tenant_id}/comprobantes`);
                                }}
                                className="w-full text-left px-3 py-1.5 text-xs text-st-muted hover:text-white hover:bg-white/10 flex items-center gap-2"
                              >
                                <CreditCard className="w-3.5 h-3.5 text-green-400" />
                                <span>Ver Facturación</span>
                              </button>

                              <div className="h-px bg-st-border my-1" />

                              <button
                                onClick={() => {
                                  setActiveMenuTenantId(null);
                                  navigate(`/reseller/clientes/${item.tenant_id}/organizacion`);
                                }}
                                className="w-full text-left px-3 py-1.5 text-xs text-st-muted hover:text-white hover:bg-white/10 flex items-center gap-2"
                              >
                                <Building2 className="w-3.5 h-3.5 text-blue-400" />
                                <span>Jerarquía Org.</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </td>

                    {/* Semáforo (Solo Icono) */}
                    <td className="py-3 px-2 text-center">
                      <div className="flex items-center justify-center" title={`${item.semaforo_cliente}: ${item.motivo_semaforo}`}>
                        <span className={`w-3.5 h-3.5 rounded-full inline-block ${
                          item.semaforo_cliente === 'ROJO' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse' :
                          item.semaforo_cliente === 'AMARILLO' ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]' :
                          'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]'
                        }`} />
                      </div>
                    </td>

                    {/* Cliente (Nombre Comercial + Código en 2da línea) */}
                    <td
                      className="py-3 px-4 cursor-pointer"
                      onClick={() => navigate(`/reseller/clientes/${item.tenant_id}/dashboard`)}
                    >
                      <div className="space-y-0.5">
                        <p className="font-bold text-white group-hover:text-st-accent transition-colors leading-tight">
                          {item.cliente}
                        </p>
                        <p className="text-[10px] font-mono text-st-muted tracking-wide">
                          {item.tenant_codigo}
                        </p>
                      </div>
                    </td>

                    {/* Contrato */}
                    <td className="py-3 px-4">
                      {item.contrato_fecha_vencimiento ? (
                        <div className="space-y-0.5">
                          <p className="text-white font-mono text-[11px]">
                            {item.contrato_fecha_inicio || '---'} &rarr; {item.contrato_fecha_vencimiento}
                          </p>
                          <p className="text-[10px]">
                            <span className={`font-semibold ${
                              item.dias_para_vencimiento !== null && item.dias_para_vencimiento <= 30
                                ? 'text-amber-400'
                                : 'text-st-muted'
                            }`}>
                              Activo · {item.dias_para_vencimiento} días restantes
                            </span>
                          </p>
                        </div>
                      ) : (
                        <span className="text-st-muted italic text-[11px]">Sin contrato activo</span>
                      )}
                    </td>

                    {/* Plan Contratado */}
                    <td className="py-3 px-4">
                      {item.planes_contratados ? (
                        <span className="inline-block bg-st-accent/15 border border-st-accent/30 text-st-accent font-mono text-[10px] font-semibold px-2 py-0.5 rounded truncate max-w-[160px]">
                          {item.planes_contratados}
                        </span>
                      ) : (
                        <span className="text-st-muted italic text-[11px]">---</span>
                      )}
                    </td>

                    {/* Starlinks (Solo Cantidad) */}
                    <td className="py-3 px-4 text-right">
                      <div className="space-y-0.5 font-mono">
                        <p className="font-bold text-white text-sm">{item.cantidad_dispositivos}</p>
                        <p className="text-[10px] text-st-muted">
                          {item.lineas_activas} act · {item.lineas_suspendidas} susp
                        </p>
                      </div>
                    </td>

                    {/* Variación Mes */}
                    <td className="py-3 px-4 text-right font-mono">
                      {item.delta_starlinks_vs_mes_anterior > 0 ? (
                        <span className="text-green-400 font-bold">
                          +{item.delta_starlinks_vs_mes_anterior} (+{item.delta_starlinks_pct}%)
                        </span>
                      ) : item.delta_starlinks_vs_mes_anterior < 0 ? (
                        <span className="text-red-400 font-bold">
                          {item.delta_starlinks_vs_mes_anterior} ({item.delta_starlinks_pct}%)
                        </span>
                      ) : (
                        <span className="text-st-muted">0 (0.0%)</span>
                      )}
                    </td>

                    {/* Calidad de Servicio */}
                    <td className="py-3 px-4 text-right">
                      <div className="space-y-0.5 font-mono">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                          item.calidad_servicio_score >= 90 ? 'bg-green-500/20 text-green-400' :
                          item.calidad_servicio_score >= 80 ? 'bg-amber-400/20 text-amber-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          Score {item.calidad_servicio_score}
                        </span>
                        <p className="text-[10px] text-st-muted mt-1">
                          {item.disponibilidad_pct}% · {item.latencia_avg_ms}ms · {item.packet_loss_pct}%
                        </p>
                      </div>
                    </td>

                    {/* Facturación Promedio */}
                    <td className="py-3 px-4 text-right font-mono">
                      <p className="font-bold text-white text-sm">
                        {item.moneda_facturacion} {item.monto_promedio_facturacion?.toLocaleString()}
                        <span className="text-[10px] text-st-muted font-normal"> / mes</span>
                      </p>
                      <p className="text-[10px] text-st-muted">
                        Último: {item.moneda_facturacion} {item.ultimo_monto_facturacion?.toLocaleString()}
                      </p>
                    </td>

                    {/* Alertas Críticas */}
                    <td className="py-3 px-4 text-center">
                      {item.alertas_graves_pendientes > 0 ? (
                        <span className="px-2.5 py-1 bg-red-500/20 border border-red-500/40 text-red-400 text-[10px] font-bold rounded-full font-mono inline-flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {item.alertas_graves_pendientes} graves
                        </span>
                      ) : (
                        <span className="text-st-muted text-[10px]">Sin críticas</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 5. PAGINACIÓN */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 p-4 border-t border-st-border text-xs text-st-muted">
          <div>
            Mostrando {total === 0 ? 0 : (page - 1) * pageSize + 1} &ndash; {Math.min(page * pageSize, total)} de {total} clientes
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span>Registros por página:</span>
              <select
                value={pageSize}
                onChange={e => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="bg-st-bg border border-st-border rounded px-2 py-1 text-white focus:outline-none cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="p-1.5 border border-st-border rounded hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 text-white" />
              </button>

              <span className="px-3 font-mono font-bold text-white">
                {page} / {totalPages}
              </span>

              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="p-1.5 border border-st-border rounded hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResellerClients;
