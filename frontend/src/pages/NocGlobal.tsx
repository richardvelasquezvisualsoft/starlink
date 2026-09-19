import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Radio, RefreshCw, AlertTriangle, CheckCircle2, XCircle, 
  WifiOff, Activity, ArrowUpDown, ChevronUp, ChevronDown, 
  Building2, ShieldAlert, MapPin, Clock, Search,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import client from '../api/client';

interface NocSummary {
  servicios_totales: number;
  operativos: number;
  offline: number;
  sin_telemetria: number;
  degradados: number;
  alertas_criticas_activas: number;
  clientes_afectados: number;
  timestamp: string;
}

interface ClienteAfectado {
  tenant_id: number;
  cliente: string;
  tenant_codigo: string;
  servicios_totales: number;
  operativos: number;
  offline: number;
  degradados: number;
  sin_telemetria: number;
  alertas_criticas: number;
  latencia_avg_ms: number;
  packet_loss_avg_pct: number;
  impacto_pct: number;
}

interface NocServicio {
  dispositivo_id: number;
  device_id: string;
  dispositivo_nombre: string;
  kit_starlink: string;
  tenant_id: number;
  tenant_codigo: string;
  cliente: string;
  numero_linea: string;
  plan_nombre: string;
  estado_operativo_starmonitor: 'OPERATIVO' | 'DEGRADADO' | 'OFFLINE' | 'SIN_TELEMETRIA';
  conectado: boolean;
  latencia_ms: number;
  packet_loss_pct: number;
  downlink_mbps: number;
  uplink_mbps: number;
  signal_quality_pct: number;
  obstruction_pct: number;
  uptime_segundos: number;
  software_version: string;
  fecha_telemetria: string | null;
  minutos_sin_reportar: number;
  alertas_activas_count: number;
  motivo_degradado: string | null;
}

interface NocAlerta {
  id: number;
  criticidad: string;
  codigo_alerta: string;
  nombre_alerta: string;
  descripcion: string;
  tenant_id: number;
  cliente: string;
  tenant_codigo: string;
  dispositivo_id: number;
  device_id: string;
  dispositivo_nombre: string;
  numero_linea: string;
  fecha_hora_deteccion: string;
  activa: boolean;
  reconocida: boolean;
}

interface NocEvento {
  id: string;
  timestamp: string;
  tipo_evento: string;
  severidad: string;
  descripcion: string;
  cliente: string;
  device_id: string;
}

interface NocGeozona {
  dispositivo_id: number;
  device_id: string;
  dispositivo_nombre: string;
  tenant_id: number;
  cliente: string;
  nombre_geozona: string;
  dentro_geozona: boolean;
  fecha_ultimo_cambio: string | null;
  requiere_aprobacion: boolean;
}

const formatUptime = (seconds: number) => {
  if (!seconds || seconds <= 0) return '0s';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h`;
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
};

const NocGlobal: React.FC = () => {
  const navigate = useNavigate();

  // State
  const [summary, setSummary] = useState<NocSummary & { clientes_disponibles?: any[] } | null>(null);
  const [clientesAfectados, setClientesAfectados] = useState<ClienteAfectado[]>([]);
  const [servicios, setServicios] = useState<NocServicio[]>([]);
  const [totalServicios, setTotalServicios] = useState(0);
  const [alertas, setAlertas] = useState<NocAlerta[]>([]);
  const [eventos, setEventos] = useState<NocEvento[]>([]);
  const [geozonas, setGeozonas] = useState<NocGeozona[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBackgroundRefreshing, setIsBackgroundRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Auto-refresh state (Default: 900s = 15min cadencia Starlink API)
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(900);
  const [countdown, setCountdown] = useState<number>(900);

  // Filters & Pagination State
  const [selectedClienteId, setSelectedClienteId] = useState<number | ''>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState('TODOS');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [sortBy, setSortBy] = useState('estado_operativo_starmonitor');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Fetch Data
  const fetchData = useCallback(async (isBackground: boolean = false) => {
    if (isBackground) {
      setIsBackgroundRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const cliParam = selectedClienteId !== '' ? selectedClienteId : undefined;
      const [sumRes, cliRes, servRes, aleRes, eveRes, geoRes] = await Promise.all([
        client.get('/reseller/noc/summary', { params: { cliente_id: cliParam } }),
        client.get('/reseller/noc/clientes-afectados', { params: { cliente_id: cliParam } }),
        client.get('/reseller/noc/servicios', {
          params: {
            q: searchTerm || undefined,
            cliente_id: cliParam,
            estado_operativo: filterEstado,
            page,
            pageSize,
            sortBy,
            sortDirection
          }
        }),
        client.get('/reseller/noc/alertas', { params: { cliente_id: cliParam } }),
        client.get('/reseller/noc/eventos', { params: { cliente_id: cliParam } }),
        client.get('/reseller/noc/geozonas', { params: { cliente_id: cliParam } })
      ]);

      setSummary(sumRes.data);
      setClientesAfectados(cliRes.data);
      setServicios(servRes.data.data);
      setTotalServicios(servRes.data.total);
      setAlertas(aleRes.data);
      setEventos(eveRes.data);
      setGeozonas(geoRes.data);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Error loading NOC data:', err);
    } finally {
      setLoading(false);
      setIsBackgroundRefreshing(false);
    }
  }, [searchTerm, selectedClienteId, filterEstado, page, pageSize, sortBy, sortDirection]);

  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  // Auto-refresh interval effect
  useEffect(() => {
    if (autoRefreshInterval === 0) {
      setCountdown(0);
      return;
    }
    setCountdown(autoRefreshInterval);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchData(true);
          return autoRefreshInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoRefreshInterval, fetchData]);

  const formatCountdown = (seconds: number) => {
    if (seconds <= 0) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDirection('asc');
    }
    setPage(1);
  };

  const totalPages = Math.ceil(totalServicios / pageSize) || 1;

  return (
    <div className="space-y-6">
      {/* 1. ENCABEZADO Y CONTROLES DEL NOC */}
      <div className="bg-st-surface border border-st-border rounded-2xl p-4 shadow-lg shadow-black/20">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Radio className="w-6 h-6 text-st-accent animate-pulse" />
              <h1 className="text-2xl font-bold tracking-tight text-white font-sans">NOC Global</h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-st-accent/15 text-st-accent border border-st-accent/30 font-bold uppercase tracking-wider">
                Tiempo Real
              </span>
            </div>
            <p className="text-xs text-st-muted mt-0.5">
              Centro de operaciones de red en tiempo real para la cartera de terminales Starlink.
            </p>
          </div>

          {/* CONTROLES: FILTRO CLIENTE + AUTO-REFRESCO + MANUAL */}
          <div className="flex flex-wrap items-center gap-3">
            {/* SELECTOR DE CLIENTE */}
            <div className="flex items-center gap-2 bg-st-bg px-3 py-1.5 rounded-xl border border-st-border">
              <Building2 className="w-3.5 h-3.5 text-st-accent" />
              <select
                value={selectedClienteId}
                onChange={(e) => {
                  setSelectedClienteId(e.target.value ? Number(e.target.value) : '');
                  setPage(1);
                }}
                className="bg-transparent text-white text-xs font-semibold focus:outline-none cursor-pointer"
              >
                <option value="" className="bg-st-surface text-white">Todos los clientes ({summary?.clientes_disponibles?.length || 0})</option>
                {summary?.clientes_disponibles?.map((c: any) => (
                  <option key={c.tenant_id} value={c.tenant_id} className="bg-st-surface text-white">
                    {c.cliente} ({c.codigo})
                  </option>
                ))}
              </select>
            </div>

            {/* SELECTOR DE AUTO-REFRESCO */}
            <div className="flex items-center gap-2 bg-st-bg px-3 py-1.5 rounded-xl border border-st-border">
              <Clock className="w-3.5 h-3.5 text-st-muted" />
              <select
                value={autoRefreshInterval}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setAutoRefreshInterval(val);
                  setCountdown(val);
                }}
                className="bg-transparent text-white text-xs font-semibold focus:outline-none cursor-pointer"
              >
                <option value={900} className="bg-st-surface text-white">Cada 15 min (Telemetría)</option>
                <option value={300} className="bg-st-surface text-white">Cada 5 min</option>
                <option value={60} className="bg-st-surface text-white">Cada 1 min</option>
                <option value={30} className="bg-st-surface text-white">Cada 30 seg</option>
                <option value={0} className="bg-st-surface text-white">Manual / Pausado</option>
              </select>
            </div>

            {/* BADGE DE ESTADO DE REFRESCO Y CUENTA REGRESIVA */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-st-surface border border-st-border rounded-xl px-3 py-1.5 text-xs font-semibold">
                <div className={`w-2 h-2 rounded-full ${autoRefreshInterval > 0 ? 'bg-st-online animate-ping' : 'bg-st-muted'}`} />
                <span className="text-st-muted">
                  {autoRefreshInterval > 0 ? (
                    <>Auto: <strong className="text-white">{formatCountdown(countdown)}</strong></>
                  ) : (
                    'Pausado'
                  )}
                </span>
                {lastUpdated && (
                  <span className="text-[10px] text-st-muted/70 pl-1 border-l border-white/10">
                    {lastUpdated}
                  </span>
                )}
              </div>

              <button
                onClick={() => { setCountdown(autoRefreshInterval); fetchData(false); }}
                disabled={loading || isBackgroundRefreshing}
                className="flex items-center gap-2 px-4 h-9 bg-st-surface border border-st-border rounded-lg text-xs font-semibold text-white hover:bg-white/5 active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-st-muted ${(loading && !isBackgroundRefreshing) || isBackgroundRefreshing ? 'animate-spin' : ''}`} />
                <span>Refrescar</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. KPI SUPERIORES (7 CARDS CON FILTRO INTERACTIVO) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div 
          onClick={() => { setFilterEstado('TODOS'); setPage(1); }}
          className={`bg-st-surface border rounded-xl p-3 flex flex-col justify-between cursor-pointer transition-all hover:border-st-accent/40 ${
            filterEstado === 'TODOS' ? 'ring-2 ring-st-accent border-transparent shadow-lg shadow-st-accent/10' : 'border-st-border'
          }`}
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-st-muted uppercase">Servicios Totales</span>
            <Activity className="w-4 h-4 text-st-accent" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold font-mono text-white">{summary?.servicios_totales || 0}</span>
            <p className="text-[10px] text-st-muted mt-0.5">Líneas activas</p>
          </div>
        </div>

        <div 
          onClick={() => { setFilterEstado('OPERATIVO'); setPage(1); }}
          className={`bg-st-surface border rounded-xl p-3 flex flex-col justify-between cursor-pointer transition-all hover:border-green-400/40 ${
            filterEstado === 'OPERATIVO' ? 'ring-2 ring-green-400 border-transparent shadow-lg shadow-green-500/10' : 'border-st-border'
          }`}
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-st-muted uppercase">Operativos</span>
            <CheckCircle2 className="w-4 h-4 text-green-400" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold font-mono text-green-400">{summary?.operativos || 0}</span>
            <p className="text-[10px] text-st-muted mt-0.5">Normal sin alertas</p>
          </div>
        </div>

        <div 
          onClick={() => { setFilterEstado('OFFLINE'); setPage(1); }}
          className={`bg-st-surface border rounded-xl p-3 flex flex-col justify-between cursor-pointer transition-all hover:border-red-500/40 ${
            filterEstado === 'OFFLINE' ? 'ring-2 ring-red-500 border-transparent shadow-lg shadow-red-500/10' : 'border-st-border'
          }`}
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-st-muted uppercase">Offline</span>
            <XCircle className="w-4 h-4 text-red-500" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold font-mono text-red-500">{summary?.offline || 0}</span>
            <p className="text-[10px] text-st-muted mt-0.5">Sin conexión Starlink</p>
          </div>
        </div>

        <div 
          onClick={() => { setFilterEstado('SIN_TELEMETRIA'); setPage(1); }}
          className={`bg-st-surface border rounded-xl p-3 flex flex-col justify-between cursor-pointer transition-all hover:border-gray-400/40 ${
            filterEstado === 'SIN_TELEMETRIA' ? 'ring-2 ring-gray-400 border-transparent shadow-lg shadow-white/10' : 'border-st-border'
          }`}
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-st-muted uppercase">Sin Telemetría</span>
            <WifiOff className="w-4 h-4 text-gray-400" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold font-mono text-gray-300">{summary?.sin_telemetria || 0}</span>
            <p className="text-[10px] text-st-muted mt-0.5">Sin reporte reciente</p>
          </div>
        </div>

        <div 
          onClick={() => { setFilterEstado('DEGRADADO'); setPage(1); }}
          className={`bg-st-surface border rounded-xl p-3 flex flex-col justify-between cursor-pointer transition-all hover:border-amber-400/40 ${
            filterEstado === 'DEGRADADO' ? 'ring-2 ring-amber-400 border-transparent shadow-lg shadow-amber-500/10' : 'border-st-border'
          }`}
          title="Calculado por STARMONITOR cuando latencia > 100ms, pérdida > 2% u obstrucción > 0.5%"
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-st-muted uppercase">Degradados</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold font-mono text-amber-400">{summary?.degradados || 0}</span>
            <p className="text-[10px] text-amber-400/80 mt-0.5 font-medium">STARMONITOR</p>
          </div>
        </div>

        <div className="bg-st-surface border border-st-border rounded-xl p-3 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-st-muted uppercase">Alertas Críticas</span>
            <ShieldAlert className="w-4 h-4 text-red-400" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold font-mono text-red-400">{summary?.alertas_criticas_activas || 0}</span>
            <p className="text-[10px] text-st-muted mt-0.5">En flota</p>
          </div>
        </div>

        <div className="bg-st-surface border border-st-border rounded-xl p-3 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-st-muted uppercase">Clientes Afectados</span>
            <Building2 className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold font-mono text-blue-400">{summary?.clientes_afectados || 0}</span>
            <p className="text-[10px] text-st-muted mt-0.5">Requieren atención</p>
          </div>
        </div>
      </div>

      {/* 3. DOS COLUMNAS: CLIENTES AFECTADOS & ALERTAS ACTIVAS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CLIENTES AFECTADOS */}
        <div className="lg:col-span-2 bg-st-surface border border-st-border rounded-xl p-5 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Clientes Afectados</h2>
              <p className="text-xs text-st-muted mt-0.5">Agregado por cliente ordenado por porcentaje de impacto.</p>
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead>
                <tr className="text-st-muted border-b border-st-border">
                  <th className="pb-2.5 font-bold uppercase text-[10px]">Cliente</th>
                  <th className="pb-2.5 font-bold text-right uppercase text-[10px]">Tot.</th>
                  <th className="pb-2.5 font-bold text-right uppercase text-[10px] text-green-400">OK</th>
                  <th className="pb-2.5 font-bold text-right uppercase text-[10px] text-red-500">Off</th>
                  <th className="pb-2.5 font-bold text-right uppercase text-[10px] text-amber-400">Deg.</th>
                  <th className="pb-2.5 font-bold text-right uppercase text-[10px]">Sin Tel.</th>
                  <th className="pb-2.5 font-bold text-right uppercase text-[10px] text-red-400">Alertas</th>
                  <th className="pb-2.5 font-bold text-right uppercase text-[10px]">Latencia</th>
                  <th className="pb-2.5 font-bold text-right uppercase text-[10px]">Pérdida</th>
                  <th className="pb-2.5 font-bold text-right uppercase text-[10px]">Impacto %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-st-border/50 font-mono">
                {clientesAfectados.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-st-muted italic">
                      Todos los clientes operan con 100% de disponibilidad.
                    </td>
                  </tr>
                ) : (
                  clientesAfectados.map((cli) => (
                    <tr
                      key={cli.tenant_id}
                      className="hover:bg-white/5 cursor-pointer transition-colors"
                      onClick={() => navigate(`/reseller/clientes/${cli.tenant_id}/dashboard`)}
                    >
                      <td className="py-2.5 text-white font-medium font-sans flex items-center gap-1.5">
                        <span>{cli.cliente}</span>
                        <span className="text-[9px] font-mono px-1 py-0.2 bg-white/10 text-st-muted rounded">
                          {cli.tenant_codigo}
                        </span>
                      </td>
                      <td className="py-2.5 text-right text-white">{cli.servicios_totales}</td>
                      <td className="py-2.5 text-right text-green-400">{cli.operativos}</td>
                      <td className="py-2.5 text-right text-red-500 font-bold">{cli.offline || '-'}</td>
                      <td className="py-2.5 text-right text-amber-400 font-bold">{cli.degradados || '-'}</td>
                      <td className="py-2.5 text-right text-gray-400">{cli.sin_telemetria || '-'}</td>
                      <td className="py-2.5 text-right text-red-400 font-bold">{cli.alertas_criticas || '-'}</td>
                      <td className="py-2.5 text-right text-st-muted">{cli.latencia_avg_ms} ms</td>
                      <td className="py-2.5 text-right text-st-muted">{cli.packet_loss_avg_pct}%</td>
                      <td className="py-2.5 text-right">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          cli.impacto_pct > 50 ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                          cli.impacto_pct > 0 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                          'bg-green-500/20 text-green-400'
                        }`}>
                          {cli.impacto_pct}%
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ALERTAS ACTIVAS */}
        <div className="bg-st-surface border border-st-border rounded-xl p-5 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                Alertas Activas
              </h2>
              <p className="text-xs text-st-muted mt-0.5">Alertas persistidas en log.</p>
            </div>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[320px] pr-1">
            {alertas.length === 0 ? (
              <p className="text-st-muted text-xs italic py-8 text-center">No hay alertas activas registradas.</p>
            ) : (
              alertas.map((alt) => (
                <div key={alt.id} className="bg-white/5 p-3 rounded-lg border border-white/5 space-y-1.5">
                  <div className="flex justify-between items-start gap-2">
                    <span className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                      alt.criticidad === 'CRITICAL' || alt.criticidad === 'CRITICA' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                      'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}>
                      {alt.criticidad}
                    </span>
                    <span className="text-[10px] text-st-muted font-mono">{alt.fecha_hora_deteccion.split('T')[0]}</span>
                  </div>
                  <div>
                    <p className="text-white text-xs font-semibold">{alt.nombre_alerta}</p>
                    <p className="text-[10px] text-st-muted leading-tight">{alt.descripcion}</p>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-st-muted pt-1 border-t border-white/5 font-mono">
                    <span>{alt.cliente}</span>
                    <span className="text-st-accent">{alt.device_id}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 4. FILTROS & TABLA PRINCIPAL DE SERVICIOS / EQUIPOS (NOC TERMINALS) */}
      <div className="bg-st-surface border border-st-border rounded-xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-st-border pb-4">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Servicios & Terminales NOC</h2>
            <p className="text-xs text-st-muted mt-0.5">Monitoreo detallado de telemetría y estado operativo STARMONITOR.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Buscador */}
            <div className="relative flex-1 md:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-st-muted" />
              <input
                type="text"
                placeholder="Buscar cliente, terminal o línea..."
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
                className="w-full bg-st-bg border border-st-border rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-st-muted focus:outline-none focus:border-st-accent"
              />
            </div>

            {/* Selector Estado Operativo */}
            <select
              value={filterEstado}
              onChange={e => { setFilterEstado(e.target.value); setPage(1); }}
              className="bg-st-bg border border-st-border rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none cursor-pointer"
            >
              <option value="TODOS">Estado: Todos</option>
              <option value="OPERATIVO">OPERATIVO</option>
              <option value="DEGRADADO">DEGRADADO (STARMONITOR)</option>
              <option value="OFFLINE">OFFLINE</option>
              <option value="SIN_TELEMETRIA">SIN TELEMETRÍA</option>
            </select>
          </div>
        </div>

        {/* Tabla NOC */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead>
              <tr className="bg-st-bg/60 text-st-muted border-b border-st-border select-none">
                <th
                  onClick={() => handleSort('estado_operativo_starmonitor')}
                  className="py-3 px-3 uppercase font-bold text-[10px] cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Estado STARMONITOR</span>
                    {sortBy === 'estado_operativo_starmonitor' ? (
                      sortDirection === 'asc' ? <ChevronUp className="w-3 h-3 text-st-accent" /> : <ChevronDown className="w-3 h-3 text-st-accent" />
                    ) : <ArrowUpDown className="w-3 h-3 text-st-muted/50" />}
                  </div>
                </th>

                <th
                  onClick={() => handleSort('cliente')}
                  className="py-3 px-3 uppercase font-bold text-[10px] cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Cliente</span>
                    {sortBy === 'cliente' ? (
                      sortDirection === 'asc' ? <ChevronUp className="w-3 h-3 text-st-accent" /> : <ChevronDown className="w-3 h-3 text-st-accent" />
                    ) : <ArrowUpDown className="w-3 h-3 text-st-muted/50" />}
                  </div>
                </th>

                <th className="py-3 px-3 uppercase font-bold text-[10px]">Service Line</th>
                <th className="py-3 px-3 uppercase font-bold text-[10px]">Terminal / Kit</th>

                <th
                  onClick={() => handleSort('latencia_ms')}
                  className="py-3 px-3 uppercase font-bold text-[10px] text-right cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Latencia</span>
                    {sortBy === 'latencia_ms' ? (
                      sortDirection === 'asc' ? <ChevronUp className="w-3 h-3 text-st-accent" /> : <ChevronDown className="w-3 h-3 text-st-accent" />
                    ) : <ArrowUpDown className="w-3 h-3 text-st-muted/50" />}
                  </div>
                </th>

                <th
                  onClick={() => handleSort('packet_loss_pct')}
                  className="py-3 px-3 uppercase font-bold text-[10px] text-right cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Pérdida Paquetes</span>
                    {sortBy === 'packet_loss_pct' ? (
                      sortDirection === 'asc' ? <ChevronUp className="w-3 h-3 text-st-accent" /> : <ChevronDown className="w-3 h-3 text-st-accent" />
                    ) : <ArrowUpDown className="w-3 h-3 text-st-muted/50" />}
                  </div>
                </th>

                <th className="py-3 px-3 uppercase font-bold text-[10px] text-right">Download</th>
                <th className="py-3 px-3 uppercase font-bold text-[10px] text-right">Upload</th>
                <th className="py-3 px-3 uppercase font-bold text-[10px] text-right">Obstrucción</th>
                <th className="py-3 px-3 uppercase font-bold text-[10px] text-right">Uptime</th>
                <th className="py-3 px-3 uppercase font-bold text-[10px]">Última Telemetría</th>
                <th className="py-3 px-3 uppercase font-bold text-[10px] text-center">Alertas</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-st-border/50 font-mono text-[11px]">
              {loading ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-st-muted font-sans">
                    <Activity className="w-8 h-8 text-st-accent animate-spin mx-auto mb-2" />
                    <span>Cargando datos de telemetría y red...</span>
                  </td>
                </tr>
              ) : servicios.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-st-muted font-sans">
                    <WifiOff className="w-8 h-8 text-st-muted mx-auto mb-2 opacity-50" />
                    <span>No se encontraron terminales con los filtros seleccionados.</span>
                  </td>
                </tr>
              ) : (
                servicios.map((s) => (
                  <tr key={s.dispositivo_id} className="hover:bg-white/5 transition-colors">
                    {/* Estado STARMONITOR */}
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold ${
                          s.estado_operativo_starmonitor === 'OPERATIVO' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                          s.estado_operativo_starmonitor === 'DEGRADADO' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                          s.estado_operativo_starmonitor === 'OFFLINE' ? 'bg-red-500/20 text-red-500 border border-red-500/30 animate-pulse' :
                          'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                        }`}
                        title={s.motivo_degradado || s.estado_operativo_starmonitor}
                      >
                        <span className={`w-2 h-2 rounded-full ${
                          s.estado_operativo_starmonitor === 'OPERATIVO' ? 'bg-green-400' :
                          s.estado_operativo_starmonitor === 'DEGRADADO' ? 'bg-amber-400' :
                          s.estado_operativo_starmonitor === 'OFFLINE' ? 'bg-red-500' :
                          'bg-gray-400'
                        }`} />
                        <span>{s.estado_operativo_starmonitor}</span>
                      </span>
                    </td>

                    {/* Cliente */}
                    <td className="py-3 px-3 font-sans">
                      <p className="font-bold text-white">{s.cliente}</p>
                      <p className="text-[10px] font-mono text-st-muted">{s.tenant_codigo}</p>
                    </td>

                    {/* Service Line */}
                    <td className="py-3 px-3">
                      <p className="text-white font-semibold">{s.numero_linea}</p>
                      <p className="text-[10px] text-st-muted">{s.plan_nombre}</p>
                    </td>

                    {/* Terminal / Kit */}
                    <td className="py-3 px-3">
                      <p className="text-st-accent font-semibold">{s.device_id}</p>
                      <p className="text-[10px] text-st-muted">{s.kit_starlink}</p>
                    </td>

                    {/* Latencia */}
                    <td className="py-3 px-3 text-right">
                      <span className={`font-bold ${s.latencia_ms > 100 ? 'text-amber-400' : 'text-white'}`}>
                        {s.latencia_ms > 0 ? `${s.latencia_ms} ms` : '-'}
                      </span>
                    </td>

                    {/* Pérdida Paquetes */}
                    <td className="py-3 px-3 text-right">
                      <span className={`font-bold ${s.packet_loss_pct > 2.0 ? 'text-red-400' : 'text-white'}`}>
                        {s.packet_loss_pct}%
                      </span>
                    </td>

                    {/* Download */}
                    <td className="py-3 px-3 text-right text-white">
                      {s.downlink_mbps > 0 ? `${s.downlink_mbps} Mbps` : '-'}
                    </td>

                    {/* Upload */}
                    <td className="py-3 px-3 text-right text-white">
                      {s.uplink_mbps > 0 ? `${s.uplink_mbps} Mbps` : '-'}
                    </td>

                    {/* Obstrucción */}
                    <td className="py-3 px-3 text-right">
                      <span className={s.obstruction_pct > 0.5 ? 'text-amber-400 font-bold' : 'text-st-muted'}>
                        {s.obstruction_pct}%
                      </span>
                    </td>

                    {/* Uptime */}
                    <td className="py-3 px-3 text-right text-st-muted">
                      {formatUptime(s.uptime_segundos)}
                    </td>

                    {/* Última Telemetría */}
                    <td className="py-3 px-3 font-sans">
                      <p className="text-white text-[11px] font-mono">{s.fecha_telemetria || 'Sin reporte'}</p>
                    </td>

                    {/* Alertas */}
                    <td className="py-3 px-3 text-center">
                      {s.alertas_activas_count > 0 ? (
                        <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-bold border border-red-500/30">
                          {s.alertas_activas_count}
                        </span>
                      ) : (
                        <span className="text-st-muted">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-3 border-t border-st-border text-xs text-st-muted">
          <div className="flex items-center gap-2">
            <span>Mostrar</span>
            <select
              value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="bg-st-bg border border-st-border rounded px-2 py-1 text-white focus:outline-none"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span>registros por página</span>
          </div>

          <div className="flex items-center gap-3 font-mono">
            <span>
              Página {page} de {totalPages} ({totalServicios} terminales totales)
            </span>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1 rounded bg-st-bg border border-st-border text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/10"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1 rounded bg-st-bg border border-st-border text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/10"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 5. BLOQUE INFERIOR: GEOZONAS & EVENTOS RECIENTES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GEOZONAS DE FLOTA */}
        <div className="bg-st-surface border border-st-border rounded-xl p-5">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <MapPin className="w-4 h-4 text-st-accent" />
                Monitoreo de Geozonas
              </h2>
              <p className="text-xs text-st-muted mt-0.5">Estado en tiempo real de terminales asignados a geozonas.</p>
            </div>
          </div>

          {geozonas.length === 0 ? (
            <p className="text-st-muted text-xs italic py-6 text-center">No hay terminales asociados a geozonas activas.</p>
          ) : (
            <div className="space-y-2.5 font-mono text-xs">
              {geozonas.map((gz, idx) => (
                <div key={idx} className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5">
                  <div>
                    <p className="text-white font-medium font-sans">{gz.cliente} · <span className="text-st-accent font-mono">{gz.device_id}</span></p>
                    <p className="text-[10px] text-st-muted mt-0.5">Geozona: {gz.nombre_geozona}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded text-[10px] font-bold ${
                    gz.dentro_geozona ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}>
                    {gz.dentro_geozona ? 'DENTRO DE GEOZONA' : 'FUERA DE GEOZONA'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* EVENTOS RECIENTES */}
        <div className="bg-st-surface border border-st-border rounded-xl p-5">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-st-accent" />
                Eventos Recientes
              </h2>
              <p className="text-xs text-st-muted mt-0.5">Historial operacional de alertas y comandos remotos en BD.</p>
            </div>
          </div>

          {eventos.length === 0 ? (
            <p className="text-st-muted text-xs italic py-6 text-center">No se encontraron eventos recientes en log.</p>
          ) : (
            <div className="space-y-2.5 font-mono text-xs max-h-[250px] overflow-y-auto pr-1">
              {eventos.map((ev) => (
                <div key={ev.id} className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5">
                  <div className="space-y-0.5">
                    <p className="text-white text-xs font-sans font-medium">{ev.descripcion}</p>
                    <p className="text-[10px] text-st-muted">{ev.cliente} · {ev.device_id}</p>
                  </div>
                  <span className="text-[10px] text-st-muted whitespace-nowrap">{ev.timestamp.split('.')[0]}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NocGlobal;
