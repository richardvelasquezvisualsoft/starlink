import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BellRing,
  AlertTriangle,
  AlertOctagon,
  Info,
  Clock,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  X,
  Satellite,
  Building2,
  Activity,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ShieldAlert,
  Radio,
  Eye,
  Repeat
} from 'lucide-react';
import client from '../api/client';

interface AlertItem {
  id: number;
  dispositivo_id: number;
  device_id: string;
  dispositivo_nombre: string;
  kit_starlink: string;
  tenant_id: number;
  cliente: string;
  razon_social?: string;
  tenant_codigo: string;
  linea_servicio_id?: number;
  numero_linea: string;
  plan_nombre: string;
  catalogo_alerta_id: number;
  codigo_alerta: string;
  nombre_alerta: string;
  descripcion: string;
  criticidad: string;
  fecha_hora_deteccion: string;
  antiguedad_formateada: string;
  antiguedad_minutos: number;
  activa: boolean;
  reconocida: boolean;
  fecha_reconocimiento?: string;
  reconocida_por?: number;
  fecha_hora_cierre?: string;
  duracion_formateada?: string;
  reincidencias_24h: number;
  reincidencias_7d: number;
  reincidencia_texto: string;
  contexto_tecnico?: {
    conectado?: boolean;
    estado_operativo?: string;
    ping_latency_ms?: number;
    ping_drop_rate?: number;
    porcentaje_obstruccion?: number;
    fecha_telemetria?: string;
  };
}

interface AlertResumen {
  alertas_activas: number;
  criticas_altas: number;
  sin_reconocer: number;
  clientes_afectados?: number;
  servicios_afectados?: number;
  abiertas_sobre_umbral: number;
  umbral_antiguedad_horas: number;
}

interface RecurrenteItem {
  tenant_id: number;
  cliente: string;
  dispositivo_id: number;
  device_id: string;
  dispositivo_nombre: string;
  catalogo_alerta_id: number;
  codigo_alerta: string;
  nombre_alerta: string;
  criticidad: string;
  ocurrencias_24h: number;
  ocurrencias_7d: number;
  ocurrencias_totales: number;
  ultima_ocurrencia: string;
  estado_actual: string;
}

interface CatalogItem {
  id: number;
  codigo_alerta: string;
  nombre: string;
  criticidad: string;
}

interface ClientFilterItem {
  tenant_id: number;
  cliente: string;
}

const Alerts: React.FC = () => {
  const navigate = useNavigate();
  const isClientView = window.location.pathname.startsWith('/cliente');

  // State
  const [activeTab, setActiveTab] = useState<'activas' | 'historicas' | 'recurrentes'>('activas');
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [resumen, setResumen] = useState<AlertResumen>({
    alertas_activas: 0,
    criticas_altas: 0,
    sin_reconocer: 0,
    clientes_afectados: 0,
    servicios_afectados: 0,
    abiertas_sobre_umbral: 0,
    umbral_antiguedad_horas: 24
  });
  
  const [alertsList, setAlertsList] = useState<AlertItem[]>([]);
  const [recurrentesList, setRecurrentesList] = useState<RecurrenteItem[]>([]);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [clientOptions, setClientOptions] = useState<ClientFilterItem[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  // Filters & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<string>('todas');
  const [selectedSeveridad, setSelectedSeveridad] = useState<string>('todas');
  const [selectedEstado, setSelectedEstado] = useState<string>('todas');
  const [selectedReconocimiento, setSelectedReconocimiento] = useState<string>('todas');
  const [selectedTipoAlerta, setSelectedTipoAlerta] = useState<string>('todas');
  
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Sorting
  const [sortBy, setSortBy] = useState<string>('fecha_hora_deteccion');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Selected Alert for Lateral Drawer
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Fetch Summary statistics
  const fetchResumen = async () => {
    try {
      const res = await client.get('/reseller/alertas/resumen');
      setResumen(res.data);
    } catch (err) {
      console.error('Error fetching alertas resumen:', err);
    }
  };

  // Fetch Catalogs and Clients
  const fetchMetadata = async () => {
    try {
      if (isClientView) {
        const catRes = await client.get('/reseller/alertas/catalogo');
        setCatalogItems(catRes.data || []);
      } else {
        const [catRes, cliRes] = await Promise.all([
          client.get('/reseller/alertas/catalogo'),
          client.get('/reseller/clientes')
        ]);
        setCatalogItems(catRes.data || []);
        if (cliRes.data && Array.isArray(cliRes.data)) {
          const list = cliRes.data.map((c: any) => ({
            tenant_id: c.tenant_id,
            cliente: c.cliente
          }));
          setClientOptions(list);
        }
      }
    } catch (err) {
      console.error('Error fetching metadata:', err);
    }
  };

  // Fetch Main Alerts List
  const fetchAlerts = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      if (activeTab === 'recurrentes') {
        const res = await client.get('/reseller/alertas/recurrentes');
        setRecurrentesList(res.data || []);
        setTotalCount((res.data || []).length);
        setTotalPages(1);
      } else {
        const params: any = {
          tab: activeTab,
          page,
          pageSize,
          sortBy,
          sortDirection
        };
        if (searchTerm.trim()) params.q = searchTerm.trim();
        if (!isClientView && selectedClient !== 'todas') params.cliente_id = Number(selectedClient);
        if (selectedSeveridad !== 'todas') params.criticidad = selectedSeveridad;
        if (selectedEstado !== 'todas') params.estado = selectedEstado;
        if (selectedReconocimiento !== 'todas') params.reconocida = selectedReconocimiento;
        if (selectedTipoAlerta !== 'todas') params.tipo_alerta = selectedTipoAlerta;

        const res = await client.get('/reseller/alertas', { params });
        setAlertsList(res.data.items || []);
        setTotalCount(res.data.total || 0);
        setTotalPages(res.data.totalPages || 1);
      }
    } catch (err: any) {
      console.error('Error fetching alerts list:', err);
      setFetchError('No se pudieron cargar las alertas.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchResumen();
    fetchAlerts();
  }, [
    activeTab,
    page,
    pageSize,
    sortBy,
    sortDirection,
    selectedClient,
    selectedSeveridad,
    selectedEstado,
    selectedReconocimiento,
    selectedTipoAlerta
  ]);

  // Handle Search submit / debounce
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchAlerts();
  };

  // Handle Acknowledge / Reconocer Action
  const handleReconocer = async (alertaId: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActionLoadingId(alertaId);
    try {
      await client.post(`/reseller/alertas/${alertaId}/reconocer`);
      // Update local state smoothly
      setAlertsList(prev =>
        prev.map(a => (a.id === alertaId ? { ...a, reconocida: true, fecha_reconocimiento: new Date().toISOString() } : a))
      );
      if (selectedAlert && selectedAlert.id === alertaId) {
        setSelectedAlert(prev => prev ? { ...prev, reconocida: true, fecha_reconocimiento: new Date().toISOString() } : null);
      }
      setIsDrawerOpen(false);
      fetchResumen();
    } catch (err) {
      console.error('Error al reconocer alerta:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Sort toggle helper
  const handleHeaderSort = (columnKey: string) => {
    if (sortBy === columnKey) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(columnKey);
      setSortDirection('desc');
    }
    setPage(1);
  };

  // Render Sort Icon
  const renderSortIcon = (columnKey: string) => {
    if (sortBy !== columnKey) return <ArrowUpDown className="w-3 h-3 text-st-muted/50 ml-1 inline" />;
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-st-accent ml-1 inline" />
    ) : (
      <ArrowDown className="w-3 h-3 text-st-accent ml-1 inline" />
    );
  };

  // Export Filtered CSV
  const handleExportCSV = () => {
    if (alertsList.length === 0) return;
    const headers = [
      ...(isClientView ? [] : ['Cliente']),
      'Service Line',
      'Equipo',
      'Device ID',
      'Codigo Alerta',
      'Nombre Alerta',
      'Severidad',
      'Fecha Deteccion',
      'Fecha Cierre',
      'Activa',
      'Reconocida',
      'Fecha Reconocimiento',
      'Reincidencias 24h',
      'Reincidencias 7d'
    ];
    
    const csvRows = [headers.join(',')];
    
    alertsList.forEach(item => {
      const row = [
        ...(isClientView ? [] : [`"${(item.cliente || '').replace(/"/g, '""')}"`]),
        `"${(item.numero_linea || '').replace(/"/g, '""')}"`,
        `"${(item.dispositivo_nombre || '').replace(/"/g, '""')}"`,
        `"${(item.device_id || '').replace(/"/g, '""')}"`,
        `"${(item.codigo_alerta || '').replace(/"/g, '""')}"`,
        `"${(item.nombre_alerta || '').replace(/"/g, '""')}"`,
        `"${item.criticidad}"`,
        `"${item.fecha_hora_deteccion}"`,
        `"${item.fecha_hora_cierre || ''}"`,
        `"${item.activa ? 'Sí' : 'No'}"`,
        `"${item.reconocida ? 'Sí' : 'No'}"`,
        `"${item.fecha_reconocimiento || ''}"`,
        `"${item.reincidencias_24h}"`,
        `"${item.reincidencias_7d}"`
      ];
      csvRows.push(row.join(','));
    });
    
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const prefix = isClientView ? 'alertas_mis_servicios' : 'alertas_globales';
    link.setAttribute('download', `${prefix}_starmonitor_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Severity Badge Helper
  const getSeverityBadge = (criticidad: string) => {
    const norm = (criticidad || '').toLowerCase();
    if (norm === 'critical' || norm === 'critica' || norm === 'crítica') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider bg-st-offline/10 text-st-offline border-st-offline/30">
          <AlertOctagon className="w-3 h-3" />
          Crítica
        </span>
      );
    }
    if (norm === 'high' || norm === 'alta') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider bg-orange-500/10 text-orange-400 border-orange-500/30">
          <AlertTriangle className="w-3 h-3" />
          Alta
        </span>
      );
    }
    if (norm === 'warning' || norm === 'media' || norm === 'medium') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider bg-st-warning/10 text-st-warning border-st-warning/30">
          <AlertTriangle className="w-3 h-3" />
          Media
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider bg-blue-500/10 text-blue-400 border-blue-500/30">
        <Info className="w-3 h-3" />
        Baja
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 5. CABECERA DE ALERTAS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-st-surface border border-st-border p-6 rounded-2xl shadow-lg relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-st-offline/5 rounded-full blur-3xl pointer-events-none" />
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-st-offline/10 border border-st-offline/20 rounded-xl text-st-offline">
              <BellRing className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className={`text-2xl font-bold tracking-tight font-sans text-white`}>
                {isClientView ? 'ALERTAS' : 'Alertas Globales'}
              </h1>
              <p className={`text-xs mt-0.5 text-st-muted`}>
                {isClientView ? 'Monitoreo de alertas e incidencias de tus servicios Starlink.' : 'Gestión de alertas e incidencias de la cartera Starlink'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <button
            onClick={handleExportCSV}
            disabled={alertsList.length === 0}
            className={`flex items-center gap-2 px-4 h-9 bg-st-surface border border-st-border rounded-lg text-xs font-semibold text-white hover:bg-white/5 transition-all active:scale-[0.98] cursor-pointer whitespace-nowrap disabled:opacity-50`}
            title="Exportar lista filtrada a CSV"
          >
            <Download className="w-3.5 h-3.5 text-st-accent" />
            <span>Exportar</span>
          </button>

          <button
            onClick={() => {
              fetchResumen();
              fetchAlerts();
            }}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 h-9 bg-st-surface border border-st-border rounded-lg text-xs font-semibold text-white hover:bg-white/5 transition-all active:scale-[0.98] cursor-pointer whitespace-nowrap disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-st-muted ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refrescar</span>
          </button>
        </div>
      </div>

      {/* 6. KPI SUPERIORES (5 CARDS COMPACTAS) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* KPI 1 — Alertas activas */}
        <div className="bg-st-surface border border-st-border rounded-xl p-4 flex flex-col justify-between hover:border-st-offline/40 transition-all">
          <div className={`flex items-center justify-between text-st-muted`}>
            <span className="text-[11px] font-semibold uppercase tracking-wider">Alertas Activas</span>
            <Radio className="w-4 h-4 text-st-offline animate-ping" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className={`text-2xl font-black font-mono text-white`}>{resumen.alertas_activas}</span>
            <span className="text-[10px] text-st-offline font-semibold">En monitoreo</span>
          </div>
        </div>

        {/* KPI 2 — Críticas/Altas activas */}
        <div className="bg-st-surface border border-st-border rounded-xl p-4 flex flex-col justify-between hover:border-orange-500/40 transition-all">
          <div className={`flex items-center justify-between text-st-muted`}>
            <span className="text-[11px] font-semibold uppercase tracking-wider">Críticas / Altas</span>
            <ShieldAlert className="w-4 h-4 text-orange-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className={`text-2xl font-black font-mono text-white`}>{resumen.criticas_altas}</span>
            <span className="text-[10px] text-orange-400 font-semibold">Prioridad alta</span>
          </div>
        </div>

        {/* KPI 3 — Sin reconocer */}
        <div className="bg-st-surface border border-st-border rounded-xl p-4 flex flex-col justify-between hover:border-st-warning/40 transition-all">
          <div className={`flex items-center justify-between text-st-muted`}>
            <span className="text-[11px] font-semibold uppercase tracking-wider">Sin Reconocer</span>
            <AlertTriangle className="w-4 h-4 text-st-warning" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className={`text-2xl font-black font-mono text-white`}>{resumen.sin_reconocer}</span>
            <span className="text-[10px] text-st-warning font-semibold">Pendientes operador</span>
          </div>
        </div>

        {/* KPI 4 — Servicios Afectados / Clientes Afectados */}
        <div className="bg-st-surface border border-st-border rounded-xl p-4 flex flex-col justify-between hover:border-st-accent/40 transition-all">
          <div className={`flex items-center justify-between text-st-muted`}>
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              {isClientView ? 'Servicios Afectados' : 'Clientes Afectados'}
            </span>
            {isClientView ? <Satellite className="w-4 h-4 text-st-accent" /> : <Building2 className="w-4 h-4 text-st-accent" />}
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className={`text-2xl font-black font-mono text-white`}>
              {isClientView ? (resumen.servicios_afectados ?? resumen.clientes_afectados) : resumen.clientes_afectados}
            </span>
            <span className="text-[10px] text-st-accent font-semibold">
              {isClientView ? 'Con alerta activa' : 'Tenants en cartera'}
            </span>
          </div>
        </div>

        {/* KPI 5 — Abiertas > 24h */}
        <div className="bg-st-surface border border-st-border rounded-xl p-4 flex flex-col justify-between hover:border-purple-500/40 transition-all col-span-2 sm:col-span-1">
          <div className={`flex items-center justify-between text-st-muted`}>
            <span className="text-[11px] font-semibold uppercase tracking-wider">Abiertas &gt; 24h</span>
            <Clock className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className={`text-2xl font-black font-mono text-white`}>{resumen.abiertas_sobre_umbral}</span>
            <span className="text-[10px] text-purple-400 font-semibold">Umbral antigüedad</span>
          </div>
        </div>
      </div>

      {/* 7 & 8. BUSCADOR Y FILTROS PRINCIPALES */}
      <div className="bg-st-surface border border-st-border p-4 rounded-xl space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-st-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder={isClientView ? "Buscar por servicio, equipo o alerta..." : "Buscar por cliente, servicio, equipo o alerta..."}
              className={`w-full bg-st-bg border border-st-border rounded-xl pl-10 pr-10 py-2 text-xs text-white placeholder-st-muted focus:outline-none focus:border-st-accent transition-all`}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setPage(1);
                }}
                className={`absolute right-3 top-1/2 -translate-y-1/2 text-st-muted hover:text-white`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="submit"
            className="w-full sm:w-auto px-4 py-2 bg-st-accent hover:bg-st-accent/90 text-white font-semibold text-xs rounded-xl transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filtrar</span>
          </button>
        </form>

        {/* Dropdowns */}
        <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-2 border-t border-st-border/50`}>
          {/* Cliente (RESELLER view only) */}
          {!isClientView && (
            <div>
              <label className="block text-[10px] font-bold text-st-muted uppercase mb-1">Cliente</label>
              <select
                value={selectedClient}
                onChange={e => {
                  setSelectedClient(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-st-bg border border-st-border rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-st-accent"
              >
                <option value="todas">Todos los clientes</option>
                {clientOptions.map(c => (
                  <option key={c.tenant_id} value={c.tenant_id.toString()}>
                    {c.cliente}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Severidad */}
          <div>
            <label className={`block text-[10px] font-bold uppercase mb-1 text-st-muted`}>Severidad</label>
            <select
              value={selectedSeveridad}
              onChange={e => {
                setSelectedSeveridad(e.target.value);
                setPage(1);
              }}
              className={`w-full bg-st-bg border border-st-border rounded-lg px-2.5 py-1.5 text-xs text-white bg-st-surface focus:outline-none focus:border-st-accent`}
            >
              <option value="todas">Todas las severidades</option>
              <option value="critical">Crítica</option>
              <option value="high">Alta</option>
              <option value="warning">Media</option>
              <option value="info">Baja</option>
            </select>
          </div>

          {/* Estado */}
          <div>
            <label className={`block text-[10px] font-bold uppercase mb-1 text-st-muted`}>Estado</label>
            <select
              value={selectedEstado}
              onChange={e => {
                setSelectedEstado(e.target.value);
                setPage(1);
              }}
              className={`w-full bg-st-bg border border-st-border rounded-lg px-2.5 py-1.5 text-xs text-white bg-st-surface focus:outline-none focus:border-st-accent`}
            >
              <option value="todas">Todos los estados</option>
              <option value="activas">Activas</option>
              <option value="cerradas">Históricas / Cerradas</option>
            </select>
          </div>

          {/* Reconocimiento */}
          <div>
            <label className={`block text-[10px] font-bold uppercase mb-1 text-st-muted`}>Reconocimiento</label>
            <select
              value={selectedReconocimiento}
              onChange={e => {
                setSelectedReconocimiento(e.target.value);
                setPage(1);
              }}
              className={`w-full bg-st-bg border border-st-border rounded-lg px-2.5 py-1.5 text-xs text-white bg-st-surface focus:outline-none focus:border-st-accent`}
            >
              <option value="todas">Todas</option>
              <option value="no_reconocidas">No reconocidas</option>
              <option value="reconocidas">Reconocidas</option>
            </select>
          </div>

          {/* Tipo de Alerta */}
          <div>
            <label className={`block text-[10px] font-bold uppercase mb-1 text-st-muted`}>Tipo de alerta</label>
            <select
              value={selectedTipoAlerta}
              onChange={e => {
                setSelectedTipoAlerta(e.target.value);
                setPage(1);
              }}
              className={`w-full bg-st-bg border border-st-border rounded-lg px-2.5 py-1.5 text-xs text-white bg-st-surface focus:outline-none focus:border-st-accent truncate`}
            >
              <option value="todas">Todos los tipos</option>
              {catalogItems.map(cat => (
                <option key={cat.id} value={cat.codigo_alerta}>
                  {cat.nombre} ({cat.codigo_alerta})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 9. TABS PRINCIPALES */}
      <div className="flex items-center justify-between border-b border-st-border pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setActiveTab('activas');
              setPage(1);
            }}
            className={`px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'activas'
                ? 'bg-st-offline/10 text-st-offline border border-st-offline/30 shadow-md'
                : `text-st-muted hover:text-white hover:bg-st-surface`
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-st-offline animate-ping block" />
            <span>Activas ({resumen.alertas_activas})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('historicas');
              setPage(1);
            }}
            className={`px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'historicas'
                ? 'bg-st-online/10 text-st-online border border-st-online/30 shadow-md'
                : `text-st-muted hover:text-white hover:bg-st-surface`
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Históricas</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('recurrentes');
              setPage(1);
            }}
            className={`px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'recurrentes'
                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30 shadow-md'
                : `text-st-muted hover:text-white hover:bg-st-surface`
            }`}
          >
            <Repeat className="w-3.5 h-3.5" />
            <span>Recurrentes</span>
          </button>
        </div>

        <div className={`text-xs font-mono hidden sm:block text-st-muted`}>
          Mostrando {totalCount} registro(s)
        </div>
      </div>

      {/* Error UI Banner */}
      {fetchError && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            <span>{fetchError}</span>
          </div>
          <button 
            onClick={() => { setFetchError(null); fetchResumen(); fetchAlerts(); }} 
            className="px-3 py-1.5 bg-red-500/20 text-white rounded-lg text-xs font-bold hover:bg-red-500/30 transition-all cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* TAB CONTENT TABLES */}
      <div className="bg-st-surface border border-st-border rounded-xl overflow-hidden shadow-xl">
        {/* 10. TAB ACTIVAS & HISTÓRICAS */}
        {activeTab !== 'recurrentes' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={`bg-st-bg/80 uppercase tracking-wider font-extrabold border-b border-st-border text-st-muted`}>
                  <th
                    className={`py-3 px-4 cursor-pointer hover:text-white`}
                    onClick={() => handleHeaderSort('criticidad')}
                  >
                    {isClientView ? 'CRITICIDAD' : 'Severidad'} {renderSortIcon('criticidad')}
                  </th>
                  {!isClientView && (
                    <th
                      className={`py-3 px-4 cursor-pointer hover:text-white`}
                      onClick={() => handleHeaderSort('cliente')}
                    >
                      Cliente {renderSortIcon('cliente')}
                    </th>
                  )}
                  <th className="py-3 px-4">{isClientView ? 'SERVICIO' : 'Service Line'}</th>
                  <th className="py-3 px-4">{isClientView ? 'DISPOSITIVO' : 'Equipo / Terminal'}</th>
                  <th className="py-3 px-4">{isClientView ? 'ALERTA' : 'Alerta'}</th>
                  <th
                    className={`py-3 px-4 cursor-pointer hover:text-white`}
                    onClick={() => handleHeaderSort('fecha_hora_deteccion')}
                  >
                    {isClientView ? 'FECHA DE DETECCIÓN' : (activeTab === 'activas' ? 'Detectada' : 'Inicio')} {renderSortIcon('fecha_hora_deteccion')}
                  </th>
                  {activeTab === 'activas' ? (
                    <th
                      className={`py-3 px-4 cursor-pointer hover:text-white`}
                      onClick={() => handleHeaderSort('antiguedad')}
                    >
                      {isClientView ? 'ANTIGÜEDAD' : 'Antigüedad'} {renderSortIcon('antiguedad')}
                    </th>
                  ) : (
                    <>
                      <th className="py-3 px-4">Cierre</th>
                      <th className="py-3 px-4">Duración</th>
                    </>
                  )}
                  {activeTab === 'activas' && (
                    <th
                      className={`py-3 px-4 cursor-pointer hover:text-white`}
                      onClick={() => handleHeaderSort('reincidencias')}
                    >
                      {isClientView ? 'REINCIDENCIAS' : 'Reincidencias'} {renderSortIcon('reincidencias')}
                    </th>
                  )}
                  <th
                    className={`py-3 px-4 cursor-pointer hover:text-white`}
                    onClick={() => handleHeaderSort('reconocida')}
                  >
                    {isClientView ? 'SEGUIMIENTO' : 'Reconocida'} {renderSortIcon('reconocida')}
                  </th>
                  <th className="py-3 px-4 text-right">{isClientView ? 'ACCIÓN' : 'Acción'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-st-border/50">
                {isLoading ? (
                  <tr>
                    <td colSpan={isClientView ? 10 : 11} className="py-12 text-center text-st-muted">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-st-accent" />
                      Cargando bandeja de alertas...
                    </td>
                  </tr>
                ) : alertsList.length === 0 ? (
                  <tr>
                    <td colSpan={isClientView ? 10 : 11} className="py-12 text-center text-st-muted">
                      {activeTab === 'activas' ? (
                        <div className="flex flex-col items-center space-y-2">
                          <CheckCircle2 className="w-10 h-10 text-st-online opacity-80" />
                          <p className={`font-bold text-sm text-white`}>No hay alertas activas</p>
                          <p className={`text-xs text-st-muted`}>
                            {isClientView 
                              ? 'Todos tus servicios se encuentran operando sin incidencias activas.' 
                              : 'Toda la cartera se encuentra operando sin incidencias activas.'}
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center space-y-2">
                          <Info className="w-10 h-10 text-st-muted opacity-80" />
                          <p className={`font-bold text-sm text-white`}>No hay alertas históricas registradas</p>
                        </div>
                      )}
                    </td>
                  </tr>
                ) : (
                  alertsList.map(item => (
                    <tr
                      key={item.id}
                      onClick={() => {
                        setSelectedAlert(item);
                        setIsDrawerOpen(true);
                      }}
                      className="hover:bg-white/[0.03] transition-colors cursor-pointer"
                    >
                      {/* Severidad */}
                      <td className="py-3 px-4">{getSeverityBadge(item.criticidad)}</td>

                      {/* Cliente (RESELLER only) */}
                      {!isClientView && (
                        <td className="py-3 px-4">
                          <div className={`font-bold text-white`}>{item.cliente}</div>
                          <div className="text-[10px] text-st-muted font-mono">{item.tenant_codigo}</div>
                        </td>
                      )}

                      {/* Service Line */}
                      <td className="py-3 px-4">
                        <div className="font-mono text-st-accent font-semibold">{item.numero_linea}</div>
                        <div className={`text-[10px] text-st-muted`}>{item.plan_nombre}</div>
                      </td>

                      {/* Equipo */}
                      <td className="py-3 px-4">
                        <div className={`font-semibold truncate max-w-[180px] text-white`}>
                          {item.dispositivo_nombre}
                        </div>
                        <div className={`text-[10px] font-mono flex items-center gap-1 text-st-muted`}>
                          <Satellite className="w-3 h-3 text-st-accent" />
                          {item.device_id}
                        </div>
                      </td>

                      {/* Código / Alerta */}
                      <td className="py-3 px-4">
                        <div className={`font-bold text-white`}>{item.nombre_alerta}</div>
                        <div className={`text-[10px] font-mono uppercase text-st-muted`}>
                          {item.codigo_alerta}
                        </div>
                      </td>

                      {/* Detectada / Inicio */}
                      <td className={`py-3 px-4 font-mono text-[11px] text-st-muted`}>
                        {new Date(item.fecha_hora_deteccion).toLocaleString('es-ES', {
                          month: 'short',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>

                      {/* Antigüedad or Cierre/Duración */}
                      {activeTab === 'activas' ? (
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 font-mono text-xs px-2 py-1 rounded border ${
                            isClientView 
                              ? 'bg-white/5 text-st-muted font-bold border-white/10' 
                              : 'bg-st-bg text-white border-st-border'
                          }`}>
                            <Clock className={`w-3 h-3 text-st-warning`} />
                            {isClientView ? (
                              (() => {
                                const diffMs = Math.max(0, Date.now() - new Date(item.fecha_hora_deteccion).getTime());
                                const d = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                                const h = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
                                const m = Math.floor((diffMs / (1000 * 60)) % 60);
                                if (d > 0) return `${d}d ${h}h ${m}m`;
                                if (h > 0) return `${h}h ${m}m`;
                                return `${m}m`;
                              })()
                            ) : (
                              item.antiguedad_formateada
                            )}
                          </span>
                        </td>
                      ) : (
                        <>
                          <td className={`py-3 px-4 font-mono text-[11px] text-st-muted`}>
                            {item.fecha_hora_cierre
                              ? new Date(item.fecha_hora_cierre).toLocaleString('es-ES', {
                                  month: 'short',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })
                              : '-'}
                          </td>
                          <td className={`py-3 px-4 font-mono text-xs text-st-muted`}>
                            {item.duracion_formateada || '-'}
                          </td>
                        </>
                      )}

                      {/* Reincidencias */}
                      {activeTab === 'activas' && (
                        <td className="py-3 px-4">
                          <span className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded border ${
                            isClientView 
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                          }`}>
                            {isClientView ? (
                              `${item.reincidencias_24h || 0} (24h) / ${item.reincidencias_7d || 0} (7d)`
                            ) : (
                              item.reincidencia_texto
                            )}
                          </span>
                        </td>
                      )}

                      {/* Reconocida / Seguimiento */}
                      <td className="py-3 px-4">
                        {isClientView ? (
                          item.reconocida ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-sm" title="Alerta reconocida por la organización">
                              <Check className="w-3 h-3 text-emerald-600" />
                              Reconocida
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-white/5 text-st-muted font-bold border border-white/10" title="Sin gestión realizada">
                              Sin gestión
                            </span>
                          )
                        ) : item.reconocida ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-st-online/10 text-st-online border border-st-online/30">
                            <Check className="w-3 h-3" />
                            Sí
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-st-warning/10 text-st-warning border border-st-warning/30">
                            No
                          </span>
                        )}
                      </td>

                      {/* Acción */}
                      <td className="py-3 px-4 text-right" onClick={e => e.stopPropagation()}>
                        {isClientView ? (
                          <button
                            onClick={() => {
                              navigate('/cliente/solicitudes', {
                                state: { openModal: true, alertData: item }
                              });
                            }}
                            className="px-3 py-1.5 bg-st-accent hover:bg-st-accent/90 text-white font-bold text-[11px] rounded-lg transition-all active:scale-[0.98] cursor-pointer shadow-md inline-flex items-center gap-1"
                            title="Crear incidencia o seguimiento interno para esta alerta"
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>Crear incidencia</span>
                          </button>
                        ) : item.activa && !item.reconocida ? (
                          <button
                            onClick={e => handleReconocer(item.id, e)}
                            disabled={actionLoadingId === item.id}
                            className="px-3 py-1.5 bg-st-accent hover:bg-st-accent/90 text-white font-bold text-[11px] rounded-lg transition-all active:scale-[0.98] cursor-pointer shadow-md inline-flex items-center gap-1"
                            title="Confirmar conocimiento de la alerta activa"
                          >
                            {actionLoadingId === item.id ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <Check className="w-3 h-3" />
                            )}
                            <span>Reconocer</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedAlert(item);
                              setIsDrawerOpen(true);
                            }}
                            className={`px-2.5 py-1 bg-st-bg border border-st-border text-st-muted hover:text-white font-semibold text-[11px] rounded-lg transition-all cursor-pointer inline-flex items-center gap-1`}
                          >
                            <Eye className="w-3 h-3" />
                            <span>Ver detalle</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 18. TAB RECURRENTES */}
        {activeTab === 'recurrentes' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={`bg-st-bg/80 uppercase tracking-wider font-extrabold border-b border-st-border text-st-muted`}>
                  {!isClientView && <th className="py-3 px-4">Cliente</th>}
                  <th className="py-3 px-4">Equipo / Terminal</th>
                  <th className="py-3 px-4">Código / Alerta</th>
                  <th className="py-3 px-4 text-center">Ocurrencias 24 h</th>
                  <th className="py-3 px-4 text-center">Ocurrencias 7 días</th>
                  <th className="py-3 px-4 text-center">Totales</th>
                  <th className="py-3 px-4">Última Ocurrencia</th>
                  <th className="py-3 px-4">Severidad</th>
                  <th className="py-3 px-4 text-right">Estado Actual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-st-border/50">
                {isLoading ? (
                  <tr>
                    <td colSpan={isClientView ? 8 : 9} className="py-12 text-center text-st-muted">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-st-accent" />
                      Calculando alertas recurrentes...
                    </td>
                  </tr>
                ) : recurrentesList.length === 0 ? (
                  <tr>
                    <td colSpan={isClientView ? 8 : 9} className="py-12 text-center text-st-muted">
                      <div className="flex flex-col items-center space-y-2">
                        <CheckCircle2 className="w-10 h-10 text-st-online opacity-80" />
                        <p className="font-bold text-white text-sm">
                          No se detectaron alertas recurrentes en el período seleccionado
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  recurrentesList.map((rec, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.03] transition-colors">
                      {!isClientView && <td className="py-3 px-4 font-bold text-white">{rec.cliente}</td>}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{rec.dispositivo_nombre}</div>
                        <div className="text-[10px] text-st-muted font-mono">{rec.device_id}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className={`font-bold text-white`}>{rec.nombre_alerta}</div>
                        <div className={`text-[10px] font-mono uppercase text-st-muted`}>
                          {rec.codigo_alerta}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-white">
                        {rec.ocurrencias_24h}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-purple-400">
                        {rec.ocurrencias_7d}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-sm font-black text-st-accent">
                        {rec.ocurrencias_totales}
                      </td>
                      <td className={`py-3 px-4 font-mono text-[11px] text-st-muted`}>
                        {rec.ultima_ocurrencia
                          ? new Date(rec.ultima_ocurrencia).toLocaleString('es-ES', {
                              month: 'short',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : '-'}
                      </td>
                      <td className="py-3 px-4">{getSeverityBadge(rec.criticidad)}</td>
                      <td className="py-3 px-4 text-right">
                        {rec.estado_actual === 'Activa' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-st-offline/10 text-st-offline border border-st-offline/30">
                            Activa
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-st-online/10 text-st-online border border-st-online/30">
                            Resuelta
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 25. PAGINACIÓN ESCALABLE */}
        {activeTab !== 'recurrentes' && totalPages > 0 && (
          <div className={`bg-st-bg/60 border-t border-st-border px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-st-muted`}>
            <div className="flex items-center gap-2">
              <span>Registros por página:</span>
              <select
                value={pageSize}
                onChange={e => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className={`bg-st-surface border border-st-border rounded px-2 py-1 text-xs text-white bg-st-surface focus:outline-none`}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="flex items-center gap-4">
              <span>
                Página <strong className="text-white">{page}</strong> de{' '}
                <strong className="text-white">{totalPages}</strong> ({totalCount} total)
              </span>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className={`p-1.5 bg-st-surface border border-st-border rounded text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed`}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className={`p-1.5 bg-st-surface border border-st-border rounded text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed`}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 19 & 20. DETALLE DE ALERTA (DRAWER / PANEL LATERAL) */}
      {isDrawerOpen && selectedAlert && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-black/60 backdrop-blur-sm transition-opacity">
          <div
            className="fixed inset-0"
            onClick={() => setIsDrawerOpen(false)}
          />

          <div className="relative w-full max-w-xl bg-st-surface border-l border-st-border h-full max-h-screen shadow-2xl z-10 flex flex-col justify-between overflow-hidden">
            {/* Drawer Header Compact */}
            <div className="px-5 py-4 border-b border-st-border flex items-center justify-between bg-st-bg/70 shrink-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {getSeverityBadge(selectedAlert.criticidad)}
                  <span className="text-xs font-mono text-st-muted font-bold uppercase border border-st-border/80 px-2 py-0.5 rounded bg-st-bg/60">
                    {selectedAlert.codigo_alerta}
                  </span>
                  <h2 className={`text-lg sm:text-xl font-black font-sans text-white`}>
                    {selectedAlert.nombre_alerta}
                  </h2>
                </div>
                <p className={`text-xs font-medium line-clamp-1 text-st-muted`}>{selectedAlert.descripcion}</p>
              </div>

              <button
                onClick={() => setIsDrawerOpen(false)}
                className={`p-1.5 text-st-muted hover:text-white rounded-lg bg-st-surface border border-st-border hover:border-st-accent/40 transition-all cursor-pointer shrink-0 ml-2`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Content Compact */}
            <div className="p-4 sm:p-5 space-y-3.5 flex-1 overflow-y-auto">
              {/* 1. Identificación */}
              <div className="bg-st-bg/40 border border-st-border rounded-xl p-3.5 sm:p-4 space-y-2.5">
                <div className="flex items-center gap-2 text-st-muted">
                  <Building2 className="w-4 h-4 text-st-accent shrink-0" />
                  <span className={`text-xs sm:text-sm font-extrabold uppercase tracking-wider text-st-muted`}>
                    {isClientView ? 'Identificación del Servicio' : 'Identificación de Cartera'}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {!isClientView && (
                    <>
                      <div>
                        <span className={`text-xs block font-bold mb-0.5 text-st-muted`}>Cliente</span>
                        <span className={`font-bold text-xs sm:text-sm text-white`}>{selectedAlert.cliente}</span>
                      </div>
                      <div>
                        <span className={`text-xs block font-bold mb-0.5 text-st-muted`}>Código Tenant</span>
                        <span className="font-mono text-xs sm:text-sm text-white font-semibold">{selectedAlert.tenant_codigo}</span>
                      </div>
                    </>
                  )}
                  <div>
                    <span className={`text-xs block font-bold mb-0.5 text-st-muted`}>Service Line</span>
                    <span className="font-mono text-xs sm:text-sm text-st-accent font-bold">{selectedAlert.numero_linea}</span>
                  </div>
                  <div>
                    <span className={`text-xs block font-bold mb-0.5 text-st-muted`}>Plan</span>
                    <span className={`text-xs sm:text-sm font-bold text-white`}>{selectedAlert.plan_nombre}</span>
                  </div>
                  <div>
                    <span className={`text-xs block font-bold mb-0.5 text-st-muted`}>Terminal</span>
                    <span className={`font-bold text-xs sm:text-sm truncate block text-white`}>{selectedAlert.dispositivo_nombre}</span>
                  </div>
                  <div>
                    <span className={`text-xs block font-bold mb-0.5 text-st-muted`}>Device ID</span>
                    <span className={`font-mono text-xs font-bold text-st-muted`}>{selectedAlert.device_id}</span>
                  </div>
                </div>
              </div>

              {/* 2. Tiempos & Operación */}
              <div className="bg-st-bg/40 border border-st-border rounded-xl p-3.5 sm:p-4 space-y-2.5">
                <div className="flex items-center gap-2 text-st-muted">
                  <Clock className="w-4 h-4 text-st-warning shrink-0" />
                  <span className={`text-xs sm:text-sm font-extrabold uppercase tracking-wider text-st-muted`}>Tiempos &amp; Operación</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <span className={`text-xs block font-bold mb-0.5 text-st-muted`}>Fecha Detección</span>
                    <span className={`font-mono text-xs sm:text-sm font-bold text-white`}>
                      {new Date(selectedAlert.fecha_hora_deteccion).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className={`text-xs block font-bold mb-0.5 text-st-muted`}>Antigüedad</span>
                    <span className="font-mono font-black text-xs sm:text-sm text-st-warning">
                      {selectedAlert.antiguedad_formateada}
                    </span>
                  </div>
                  <div>
                    <span className={`text-xs block font-bold mb-0.5 text-st-muted`}>Estado Condición</span>
                    <span
                      className={`font-black text-xs sm:text-sm ${
                        selectedAlert.activa ? 'text-st-offline' : 'text-st-online'
                      }`}
                    >
                      {selectedAlert.activa ? 'Activa en Monitoreo' : 'Cerrada'}
                    </span>
                  </div>
                  <div>
                    <span className={`text-xs block font-bold mb-0.5 text-st-muted`}>Reconocimiento</span>
                    <span
                      className={`font-black text-xs sm:text-sm ${
                        selectedAlert.reconocida ? 'text-st-online' : 'text-st-warning'
                      }`}
                    >
                      {selectedAlert.reconocida ? 'Sí (Anotado)' : 'Pendiente'}
                    </span>
                  </div>
                  {selectedAlert.fecha_reconocimiento && (
                    <div className="col-span-2">
                      <span className={`text-xs block font-bold mb-0.5 text-st-muted`}>Fecha Reconocimiento</span>
                      <span className="font-mono text-xs font-bold text-st-online">
                        {new Date(selectedAlert.fecha_reconocimiento).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {selectedAlert.fecha_hora_cierre && (
                    <div className="col-span-2">
                      <span className={`text-xs block font-bold mb-0.5 text-st-muted`}>Fecha Cierre</span>
                      <span className="font-mono text-xs font-bold text-white">
                        {new Date(selectedAlert.fecha_hora_cierre).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Reincidencias & Contexto Técnico Consolidado */}
              <div className="bg-st-bg/40 border border-st-border rounded-xl p-3.5 sm:p-4 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-st-online shrink-0" />
                    <span className={`text-xs sm:text-sm font-extrabold uppercase tracking-wider text-white`}>
                      Telemetría y Reincidencias
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-lg border text-xs font-mono font-semibold bg-st-surface border-st-border text-st-muted`}>
                      24h: <strong className="text-white">{selectedAlert.reincidencias_24h}</strong>
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/30 text-xs font-mono text-purple-600 font-bold">
                      7d: <strong className="text-purple-700 font-black">{selectedAlert.reincidencias_7d}</strong>
                    </span>
                  </div>
                </div>

                {selectedAlert.contexto_tecnico ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center pt-1">
                    <div className={`p-2.5 sm:p-3 rounded-xl border bg-st-surface border-st-border`}>
                      <span className={`text-xs block font-bold uppercase mb-1 text-st-muted`}>Estado</span>
                      <span
                        className={`font-black text-sm sm:text-base ${
                          selectedAlert.contexto_tecnico.conectado ? 'text-st-online' : 'text-st-offline'
                        }`}
                      >
                        {selectedAlert.contexto_tecnico.conectado ? 'CONECTADO' : 'OFFLINE'}
                      </span>
                    </div>

                    <div className={`p-2.5 sm:p-3 rounded-xl border bg-st-surface border-st-border`}>
                      <span className={`text-xs block font-bold uppercase mb-1 text-st-muted`}>Latencia</span>
                      <span className={`font-black font-mono text-sm sm:text-base text-white`}>
                        {selectedAlert.contexto_tecnico.ping_latency_ms != null
                          ? `${selectedAlert.contexto_tecnico.ping_latency_ms} ms`
                          : 'N/A'}
                      </span>
                    </div>

                    <div className={`p-2.5 sm:p-3 rounded-xl border bg-st-surface border-st-border`}>
                      <span className={`text-xs block font-bold uppercase mb-1 text-st-muted`}>P. Loss</span>
                      <span className={`font-black font-mono text-sm sm:text-base text-white`}>
                        {selectedAlert.contexto_tecnico.ping_drop_rate != null
                          ? `${selectedAlert.contexto_tecnico.ping_drop_rate} %`
                          : '0 %'}
                      </span>
                    </div>

                    <div className={`p-2.5 sm:p-3 rounded-xl border bg-st-surface border-st-border`}>
                      <span className={`text-xs block font-bold uppercase mb-1 text-st-muted`}>Obstrucción</span>
                      <span className={`font-black font-mono text-sm sm:text-base text-white`}>
                        {selectedAlert.contexto_tecnico.porcentaje_obstruccion != null
                          ? `${selectedAlert.contexto_tecnico.porcentaje_obstruccion} %`
                          : '0 %'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className={`text-xs italic text-center py-2 text-st-muted`}>
                    Sin datos de telemetría reciente para este terminal.
                  </div>
                )}
              </div>
            </div>

            {/* Drawer Actions Footer Compact */}
            <div className="px-5 py-3.5 border-t border-st-border bg-st-bg/90 space-y-2.5 shrink-0">
              {selectedAlert.activa && !selectedAlert.reconocida && (
                <button
                  onClick={() => handleReconocer(selectedAlert.id)}
                  disabled={actionLoadingId === selectedAlert.id}
                  className="w-full py-2.5 bg-st-accent hover:bg-st-accent/90 text-white font-bold text-xs sm:text-sm rounded-xl transition-all active:scale-[0.98] cursor-pointer shadow-lg flex items-center justify-center gap-2"
                >
                  {actionLoadingId === selectedAlert.id ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>Reconocer Alerta</span>
                </button>
              )}

              <div className={`grid grid-cols-3 gap-2.5 w-full`}>
                {!isClientView && (
                  <button
                    onClick={() => {
                      setIsDrawerOpen(false);
                      navigate('/reseller/noc');
                    }}
                    className="py-2 px-3 bg-st-surface border border-st-border hover:border-st-accent/50 text-st-muted hover:text-white font-semibold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 w-full"
                  >
                    <Activity className="w-3.5 h-3.5 text-st-accent" />
                    <span>Ver en NOC</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setIsDrawerOpen(false);
                    navigate(isClientView ? '/cliente/calidad/telemetria' : '/reseller/telemetria', { state: { searchQuery: selectedAlert.device_id } });
                  }}
                  className={`py-2 px-3 bg-st-surface border border-st-border text-st-muted hover:text-white hover:border-st-accent/50 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 w-full`}
                >
                  <Radio className="w-3.5 h-3.5 text-purple-500" />
                  <span>Telemetría</span>
                </button>

                <button
                  onClick={() => {
                    setIsDrawerOpen(false);
                    navigate(isClientView ? '/cliente/servicios' : '/reseller/servicios', { state: { searchQuery: selectedAlert.numero_linea } });
                  }}
                  className={`py-2 px-3 bg-st-surface border border-st-border text-st-muted hover:text-white hover:border-st-accent/50 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 w-full`}
                >
                  <Satellite className="w-3.5 h-3.5 text-st-online" />
                  <span>Ver servicio</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Alerts;
