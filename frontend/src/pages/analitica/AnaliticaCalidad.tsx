import React, { useState, useEffect, useMemo } from 'react';
import AnaliticaLayout from './AnaliticaLayout';
import client from '../../api/client';
import {
  Activity,
  ArrowUpDown,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  Users,
  Calendar,
  AlertTriangle,
  SlidersHorizontal,
  Info,
  ExternalLink
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine
} from 'recharts';

interface MonthlySeriesItem {
  periodo: string;
  mes_label: string;
  mes_corto: string;
  es_mes_en_curso: boolean;
  disponibilidad_pct: number;
  latencia_ms: number;
  packet_loss_pct: number;
  minutos_offline: number;
  offline_formateado: string;
  download_gb: number;
  upload_gb: number;
  obstruccion_pct: number;
  tiene_datos?: boolean;
}

interface CalidadItem {
  tenant_id: number;
  cliente: string;
  codigo: string;
  disponibilidad_starmonitor: number;
  latencia_ms: number;
  packet_loss_pct: number;
  download_gb: number;
  upload_gb: number;
  obstruccion_pct: number;
  minutos_offline: number;
  offline_formateado: string;
  meses_con_datos: number;
  tendencia: string;
  alertas_graves?: number;
}

interface ClienteOption {
  tenant_id: number;
  cliente: string;
  codigo: string;
}

interface CalidadApiResponse {
  modo: string;
  rango_tiempo?: string;
  rango_label?: string;
  periodo_meses: number;
  excluir_mes_en_curso: boolean;
  es_todos: boolean;
  cliente?: ClienteOption | null;
  clientes_disponibles: ClienteOption[];
  mes_actual_periodo: string;
  mes_actual_nombre: string;
  datos_incompletos?: boolean;
  sin_datos?: boolean;
  mensaje_vacio?: string | null;
  kpis_cartera?: {
    disponibilidad_cartera: number;
    clientes_degradados: number;
    clientes_con_offline: number;
    clientes_criticos: number;
  } | null;
  kpis_tecnicos?: {
    disponibilidad_promedio_mensual: number | null;
    latencia_promedio: number | null;
    packet_loss_promedio: number | null;
    offline_promedio_mensual_minutos: number | null;
    offline_promedio_formateado: string;
    subtitulo_disponibilidad: string;
    subtitulo_latencia: string;
    subtitulo_packet_loss: string;
    subtitulo_offline: string;
    aviso_incompleto?: string | null;
    num_meses_calculados: number;
  } | null;
  series_mensual: MonthlySeriesItem[];
  tabla_calidad: CalidadItem[];
}

const AnaliticaCalidad: React.FC = () => {
  const [data, setData] = useState<CalidadApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filtros
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);
  const [modo, setModo] = useState<'historico_mensual' | 'operativo'>('historico_mensual');
  const [rangoTiempo, setRangoTiempo] = useState<'3h' | '1d' | '7d' | '30d'>('30d');
  const [periodoMeses, setPeriodoMeses] = useState<number>(6);
  const [excluirMesEnCurso, setExcluirMesEnCurso] = useState<boolean>(false);

  // Métrica seleccionada para el gráfico histórico
  const [chartMetric, setChartMetric] = useState<'disponibilidad' | 'latencia' | 'packet_loss' | 'offline'>('disponibilidad');

  // Ordenamiento de tabla
  const [sortBy, setSortBy] = useState<string>('disponibilidad_starmonitor');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const params: any = {
        modo,
        rango_tiempo: rangoTiempo,
        periodo_meses: periodoMeses,
        excluir_mes_en_curso: excluirMesEnCurso
      };
      if (selectedTenantId) {
        params.tenant_id = selectedTenantId;
      }
      const res = await client.get('/reseller/analytics/calidad', { params });
      setData(res.data);
    } catch (err) {
      console.error('Error fetching calidad analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedTenantId, modo, rangoTiempo, periodoMeses, excluirMesEnCurso]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('asc');
    }
  };

  const sortedItems = useMemo(() => {
    if (!data?.tabla_calidad) return [];
    const list = [...data.tabla_calidad];
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
  }, [data?.tabla_calidad, sortBy, sortDirection]);

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

  const selectedClientObj = useMemo(() => {
    if (!selectedTenantId) return null;
    return data?.clientes_disponibles?.find(c => c.tenant_id === selectedTenantId) || data?.cliente || null;
  }, [selectedTenantId, data]);

  // Configuración del gráfico según la métrica seleccionada
  const chartConfig = useMemo(() => {
    switch (chartMetric) {
      case 'disponibilidad':
        return {
          title: 'Evolución de Disponibilidad STARMONITOR',
          unit: '%',
          dataKey: 'disponibilidad_pct',
          kpiValue: data?.kpis_tecnicos?.disponibilidad_promedio_mensual ?? (data?.kpis_cartera?.disponibilidad_cartera ?? null),
          color: '#10B981',
          gradientId: 'dispGrad',
          yDomain: [90, 100],
          kpiLabel: 'Promedio Período'
        };
      case 'latencia':
        return {
          title: 'Evolución de Latencia',
          unit: 'ms',
          dataKey: 'latencia_ms',
          kpiValue: data?.kpis_tecnicos?.latencia_promedio ?? null,
          color: '#00A8E8',
          gradientId: 'latGrad',
          yDomain: ['auto', 'auto'],
          kpiLabel: 'Latencia Promedio'
        };
      case 'packet_loss':
        return {
          title: 'Evolución de Pérdida de Paquetes',
          unit: '%',
          dataKey: 'packet_loss_pct',
          kpiValue: data?.kpis_tecnicos?.packet_loss_promedio ?? null,
          color: '#A855F7',
          gradientId: 'lossGrad',
          yDomain: [0, 'auto'],
          kpiLabel: 'Packet Loss Promedio'
        };
      case 'offline':
        return {
          title: 'Tiempo Offline',
          unit: 'min',
          dataKey: 'minutos_offline',
          kpiValue: data?.kpis_tecnicos?.offline_promedio_mensual_minutos ?? null,
          color: '#F59E0B',
          gradientId: 'offGrad',
          yDomain: [0, 'auto'],
          kpiLabel: 'Offline Promedio'
        };
    }
  }, [chartMetric, data]);

  const CustomChartTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item: MonthlySeriesItem = payload[0].payload;
      return (
        <div className="bg-st-surface/95 backdrop-blur-md border border-st-border p-3 rounded-xl shadow-2xl text-xs space-y-1.5 min-w-[180px]">
          <div className="flex items-center justify-between gap-2 border-b border-st-border/60 pb-1.5">
            <span className="font-bold text-white">{item.mes_label}</span>
            {item.es_mes_en_curso && (
              <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                {modo === 'historico_mensual' ? 'Mes en curso' : 'Actual'}
              </span>
            )}
          </div>
          <div className="space-y-1 pt-0.5 font-mono text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-st-muted">Disponibilidad:</span>
              <strong className="text-st-online">{item.disponibilidad_pct}%</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-st-muted">Latencia:</span>
              <strong className="text-white">{item.latencia_ms} ms</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-st-muted">Packet Loss:</span>
              <strong className="text-purple-400">{item.packet_loss_pct}%</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-st-muted">Tiempo Offline:</span>
              <strong className="text-amber-400">{item.offline_formateado}</strong>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <AnaliticaLayout>
      <div className="space-y-6">
        {/* BARRA DE CONTROL Y FILTROS */}
        <div className="bg-st-surface border border-st-border rounded-2xl p-4 shadow-lg">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            
            {/* SELECTOR DE CLIENTE Y NOMBRE DESTACADO */}
            <div className="flex flex-col md:flex-row md:items-center gap-3.5 flex-wrap">
              <div className="flex items-center gap-2 text-st-muted text-xs font-semibold">
                <Users className="w-4 h-4 text-st-accent" />
                <span>Cliente:</span>
              </div>
              <div className="relative min-w-[260px]">
                <select
                  value={selectedTenantId ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedTenantId(val ? Number(val) : null);
                  }}
                  className="w-full bg-st-bg border border-st-border rounded-xl px-3.5 py-2 text-xs font-bold text-white focus:outline-none focus:border-st-accent focus:ring-1 focus:ring-st-accent cursor-pointer transition-colors"
                >
                  <option value="">Todos los clientes</option>
                  {data?.clientes_disponibles?.map((c) => (
                    <option key={c.tenant_id} value={c.tenant_id}>
                      {c.cliente} ({c.codigo})
                    </option>
                  ))}
                </select>
              </div>

              {/* NOMBRE DESTACADO DEL CLIENTE EN MAYÚSCULAS Y NEGRILLA */}
              <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-st-bg border border-st-border/80 shadow-inner">
                <div className={`w-2.5 h-2.5 rounded-full ${selectedClientObj ? 'bg-st-accent animate-pulse' : 'bg-st-online'}`} />
                <span className="text-sm sm:text-base md:text-lg font-black tracking-wide text-white uppercase font-sans">
                  {selectedClientObj ? selectedClientObj.cliente.toUpperCase() : 'TODOS LOS CLIENTES'}
                </span>
                {selectedClientObj?.codigo && (
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-st-accent/15 text-st-accent border border-st-accent/30">
                    {selectedClientObj.codigo}
                  </span>
                )}
              </div>
            </div>

            {/* MODO, PERÍODO Y CONFIGURACIÓN */}
            <div className="flex flex-wrap items-center gap-3">
              {/* SELECTOR DE MODO */}
              <div className="flex items-center bg-st-bg p-1 rounded-xl border border-st-border">
                <button
                  onClick={() => setModo('historico_mensual')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    modo === 'historico_mensual'
                      ? 'bg-st-accent text-black shadow-sm'
                      : 'text-st-muted hover:text-white'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Histórico mensual</span>
                </button>
                <button
                  onClick={() => setModo('operativo')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    modo === 'operativo'
                      ? 'bg-st-accent text-black shadow-sm'
                      : 'text-st-muted hover:text-white'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Operativo / Tiempo Real</span>
                </button>
              </div>

              {/* OPCIONES DE PERÍODO SEGÚN EL MODO */}
              {modo === 'historico_mensual' ? (
                <>
                  {/* SELECTOR DE PERÍODO MENSUAL */}
                  <div className="flex items-center bg-st-bg p-1 rounded-xl border border-st-border">
                    <button
                      onClick={() => setPeriodoMeses(6)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        periodoMeses === 6
                          ? 'bg-st-accent text-black shadow-sm'
                          : 'text-st-muted hover:text-white'
                      }`}
                    >
                      Últimos 6 meses
                    </button>
                    <button
                      onClick={() => setPeriodoMeses(12)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        periodoMeses === 12
                          ? 'bg-st-accent text-black shadow-sm'
                          : 'text-st-muted hover:text-white'
                      }`}
                    >
                      Últimos 12 meses
                    </button>
                  </div>

                  {/* TOGGLE EXCLUIR MES EN CURSO */}
                  <button
                    onClick={() => setExcluirMesEnCurso(!excluirMesEnCurso)}
                    title="Alternar inclusión del mes actual no cerrado"
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                      excluirMesEnCurso
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/40'
                        : 'bg-st-bg text-st-muted hover:text-white border-st-border'
                    }`}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>{excluirMesEnCurso ? 'Mes cerrado únicamente' : 'Incluye mes en curso'}</span>
                  </button>
                </>
              ) : (
                /* MODO OPERATIVO: BOTONES 3h, 1d, 7d, 30d */
                <div className="flex items-center bg-st-bg p-1 rounded-xl border border-st-border">
                  <button
                    onClick={() => setRangoTiempo('3h')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      rangoTiempo === '3h'
                        ? 'bg-st-accent text-black shadow-sm'
                        : 'text-st-muted hover:text-white'
                    }`}
                  >
                    3h
                  </button>
                  <button
                    onClick={() => setRangoTiempo('1d')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      rangoTiempo === '1d'
                        ? 'bg-st-accent text-black shadow-sm'
                        : 'text-st-muted hover:text-white'
                    }`}
                  >
                    1d (24h)
                  </button>
                  <button
                    onClick={() => setRangoTiempo('7d')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      rangoTiempo === '7d'
                        ? 'bg-st-accent text-black shadow-sm'
                        : 'text-st-muted hover:text-white'
                    }`}
                  >
                    7d
                  </button>
                  <button
                    onClick={() => setRangoTiempo('30d')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      rangoTiempo === '30d'
                        ? 'bg-st-accent text-black shadow-sm'
                        : 'text-st-muted hover:text-white'
                    }`}
                  >
                    30d
                  </button>
                </div>
              )}

              {/* BOTÓN REFRESCAR */}
              <button
                onClick={fetchData}
                disabled={isLoading}
                title="Actualizar datos"
                className="p-2 rounded-xl bg-st-bg border border-st-border text-st-muted hover:text-white hover:border-st-accent/40 transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-st-accent' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* AVISOS DE MES EN CURSO / DATOS INCOMPLETOS / DATOS VACÍOS */}
        {data && !isLoading && (
          <>
            {/* ALERTA DE DATOS INCOMPLETOS */}
            {data.datos_incompletos && data.kpis_tecnicos?.aviso_incompleto && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3 text-amber-400 text-xs">
                <Info className="w-4 h-4 flex-shrink-0" />
                <div>
                  <span className="font-bold">Información de período parcial: </span>
                  <span>{data.kpis_tecnicos.aviso_incompleto}</span>
                </div>
              </div>
            )}

            {/* ALERTA DE SIN DATOS */}
            {data.sin_datos && (
              <div className="p-4 rounded-xl bg-st-surface border border-st-offline/30 flex items-center gap-3 text-st-offline text-xs">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <div>
                  <span className="font-bold">Sin registros históricos: </span>
                  <span>{data.mensaje_vacio || 'No existen datos históricos para el período seleccionado.'}</span>
                </div>
              </div>
            )}
          </>
        )}

        {/* CONTENIDO PRINCIPAL */}
        {isLoading ? (
          <div className="py-20 text-center text-st-muted bg-st-surface border border-st-border rounded-2xl">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-st-accent" />
            <p className="text-xs font-semibold">Calculando analítica histórica mensual...</p>
          </div>
        ) : !data ? (
          <div className="py-12 text-center text-st-muted bg-st-surface border border-st-border rounded-2xl">
            Sin información de calidad disponible.
          </div>
        ) : (
          <div className="space-y-6">

            {/* ---------------------------------------------------- */}
            {/* SECCIÓN 1: KPI CARDS                                */}
            {/* ---------------------------------------------------- */}
            {data.es_todos ? (
              /* CASO A: TODOS LOS CLIENTES (SALUD DE CARTERA) */
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-st-surface border border-st-border rounded-xl p-4 shadow-md relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-st-online/5 rounded-full blur-xl pointer-events-none" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-st-muted block">
                    Disponibilidad STARMONITOR
                  </span>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-2xl font-black text-st-online font-mono">
                      {data.kpis_cartera?.disponibilidad_cartera ?? '—'}%
                    </span>
                    <span className="text-[10px] text-st-muted font-semibold">Promedio Cartera</span>
                  </div>
                  <div className="mt-1 text-[10px] text-st-muted">
                    Promedio últimos {periodoMeses} meses
                  </div>
                </div>

                <div className="bg-st-surface border border-st-border rounded-xl p-4 shadow-md">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-st-muted block">
                    Clientes Degradados
                  </span>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className={`text-2xl font-black font-mono ${
                      (data.kpis_cartera?.clientes_degradados || 0) > 0 ? 'text-st-warning' : 'text-white'
                    }`}>
                      {data.kpis_cartera?.clientes_degradados ?? 0}
                    </span>
                    <span className={`text-[10px] font-semibold ${
                      (data.kpis_cartera?.clientes_degradados || 0) > 0 ? 'text-st-warning' : 'text-st-online'
                    }`}>
                      {(data.kpis_cartera?.clientes_degradados || 0) > 0 ? 'Atención' : 'Normal'}
                    </span>
                  </div>
                  <div className="mt-1 text-[10px] text-st-muted">
                    Disponibilidad &lt; 98.0%
                  </div>
                </div>

                <div className="bg-st-surface border border-st-border rounded-xl p-4 shadow-md">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-st-muted block">
                    Clientes con Offline
                  </span>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-2xl font-black font-mono text-purple-400">
                      {data.kpis_cartera?.clientes_con_offline ?? 0}
                    </span>
                    <span className="text-[10px] text-purple-400 font-semibold">Impactados</span>
                  </div>
                  <div className="mt-1 text-[10px] text-st-muted">
                    Eventos en el período
                  </div>
                </div>

                <div className="bg-st-surface border border-st-border rounded-xl p-4 shadow-md">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-st-muted block">
                    Clientes Críticos
                  </span>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className={`text-2xl font-black font-mono ${
                      (data.kpis_cartera?.clientes_criticos || 0) > 0 ? 'text-st-offline' : 'text-white'
                    }`}>
                      {data.kpis_cartera?.clientes_criticos ?? 0}
                    </span>
                    <span className={`text-[10px] font-semibold ${
                      (data.kpis_cartera?.clientes_criticos || 0) > 0 ? 'text-st-offline' : 'text-st-online'
                    }`}>
                      {(data.kpis_cartera?.clientes_criticos || 0) > 0 ? 'Riesgo Alto' : 'Sin Alertas'}
                    </span>
                  </div>
                  <div className="mt-1 text-[10px] text-st-muted">
                    Alertas graves activas
                  </div>
                </div>
              </div>
            ) : (
              /* CASO B: CLIENTE ESPECÍFICO (4 KPIS TÉCNICOS HISTÓRICOS EN 2 NIVELES) */
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <div className="text-xs text-st-muted flex items-center gap-2">
                    <span>Cliente: <strong className="text-white">{data.cliente?.cliente}</strong></span>
                    <span className="font-mono text-[11px] text-st-muted/80">({data.cliente?.codigo})</span>
                  </div>
                  <button
                    onClick={() => setSelectedTenantId(null)}
                    className="text-xs text-st-accent hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <span>&larr; Volver a Todos los clientes</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {/* KPI 1: DISPONIBILIDAD PROMEDIO MENSUAL */}
                  <div className="bg-st-surface border border-st-border rounded-xl p-4 shadow-md relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-st-online/5 rounded-full blur-xl pointer-events-none" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-st-muted block">
                      Disponibilidad Promedio Mensual
                    </span>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-2xl font-black text-st-online font-mono">
                        {data.kpis_tecnicos?.disponibilidad_promedio_mensual !== null && data.kpis_tecnicos?.disponibilidad_promedio_mensual !== undefined
                          ? `${data.kpis_tecnicos.disponibilidad_promedio_mensual}%`
                          : '—'}
                      </span>
                      <span className="text-[10px] text-st-online font-semibold">Nivel 2</span>
                    </div>
                    <div className="mt-1 text-[10px] text-st-muted">
                      {data.kpis_tecnicos?.subtitulo_disponibilidad || `Promedio últimos ${periodoMeses} meses`}
                    </div>
                  </div>

                  {/* KPI 2: LATENCIA PROMEDIO */}
                  <div className="bg-st-surface border border-st-border rounded-xl p-4 shadow-md">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-st-muted block">
                      Latencia Promedio
                    </span>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-2xl font-black text-white font-mono">
                        {data.kpis_tecnicos?.latencia_promedio !== null && data.kpis_tecnicos?.latencia_promedio !== undefined
                          ? `${data.kpis_tecnicos.latencia_promedio} `
                          : '—'}
                        {data.kpis_tecnicos?.latencia_promedio !== null && data.kpis_tecnicos?.latencia_promedio !== undefined && (
                          <span className="text-xs font-normal">ms</span>
                        )}
                      </span>
                      <span className="text-[10px] text-st-accent font-semibold">Saludable</span>
                    </div>
                    <div className="mt-1 text-[10px] text-st-muted">
                      {data.kpis_tecnicos?.subtitulo_latencia || `Promedio mensual · Últimos ${periodoMeses} meses`}
                    </div>
                  </div>

                  {/* KPI 3: PÉRDIDA DE PAQUETES PROMEDIO */}
                  <div className="bg-st-surface border border-st-border rounded-xl p-4 shadow-md">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-st-muted block">
                      Pérdida de Paquetes Promedio
                    </span>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-2xl font-black text-white font-mono">
                        {data.kpis_tecnicos?.packet_loss_promedio !== null && data.kpis_tecnicos?.packet_loss_promedio !== undefined
                          ? `${data.kpis_tecnicos.packet_loss_promedio}%`
                          : '—'}
                      </span>
                      <span className="text-[10px] text-st-muted">Promedio</span>
                    </div>
                    <div className="mt-1 text-[10px] text-st-muted">
                      {data.kpis_tecnicos?.subtitulo_packet_loss || `Promedio mensual · Últimos ${periodoMeses} meses`}
                    </div>
                  </div>

                  {/* KPI 4: OFFLINE PROMEDIO MENSUAL */}
                  <div className="bg-st-surface border border-st-border rounded-xl p-4 shadow-md">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-st-muted block">
                      Offline Promedio Mensual
                    </span>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-2xl font-black font-mono text-purple-400">
                        {data.kpis_tecnicos?.offline_promedio_formateado || '—'}
                      </span>
                      <span className="text-[10px] text-purple-400 font-semibold">Mensual</span>
                    </div>
                    <div className="mt-1 text-[10px] text-st-muted">
                      {data.kpis_tecnicos?.subtitulo_offline || `Promedio mensual · Últimos ${periodoMeses} meses`}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ---------------------------------------------------- */}
            {/* SECCIÓN 2: GRÁFICO HISTÓRICO MENSUAL INTERACTIVO    */}
            {/* ---------------------------------------------------- */}
            {data.series_mensual && data.series_mensual.length > 0 && (
              <div className="bg-st-surface border border-st-border rounded-xl p-5 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-st-border pb-3">
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Activity className="w-4 h-4 text-st-accent" />
                      {chartConfig.title}
                    </h3>
                    <p className="text-[11px] text-st-muted mt-0.5">
                      {data.es_todos
                        ? 'Promedio mensual de cartera · Los valores mensuales alimentan el promedio del período'
                        : `Valores mensuales reales utilizados para calcular el KPI de ${data.cliente?.cliente || 'cliente'}`}
                    </p>
                  </div>

                  {/* SELECTOR DE MÉTRICA EN EL GRÁFICO */}
                  <div className="flex items-center gap-1 bg-st-bg p-1 rounded-xl border border-st-border overflow-x-auto no-scrollbar">
                    <button
                      onClick={() => setChartMetric('disponibilidad')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap cursor-pointer ${
                        chartMetric === 'disponibilidad'
                          ? 'bg-st-online/20 text-st-online border border-st-online/40 shadow-sm'
                          : 'text-st-muted hover:text-white'
                      }`}
                    >
                      Disponibilidad (%)
                    </button>
                    <button
                      onClick={() => setChartMetric('latencia')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap cursor-pointer ${
                        chartMetric === 'latencia'
                          ? 'bg-st-accent/20 text-st-accent border border-st-accent/40 shadow-sm'
                          : 'text-st-muted hover:text-white'
                      }`}
                    >
                      Latencia (ms)
                    </button>
                    <button
                      onClick={() => setChartMetric('packet_loss')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap cursor-pointer ${
                        chartMetric === 'packet_loss'
                          ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40 shadow-sm'
                          : 'text-st-muted hover:text-white'
                      }`}
                    >
                      Packet Loss (%)
                    </button>
                    <button
                      onClick={() => setChartMetric('offline')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap cursor-pointer ${
                        chartMetric === 'offline'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm'
                          : 'text-st-muted hover:text-white'
                      }`}
                    >
                      Offline (min)
                    </button>
                  </div>
                </div>

                {/* GRÁFICO RECHARTS */}
                <div className="h-64 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={data.series_mensual}
                      margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id={chartConfig.gradientId} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={chartConfig.color} stopOpacity={0.4} />
                          <stop offset="95%" stopColor={chartConfig.color} stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                      <XAxis
                        dataKey="mes_corto"
                        stroke="#666"
                        fontSize={11}
                        tickLine={false}
                        tick={{ fill: '#888' }}
                      />
                      <YAxis
                        stroke="#666"
                        fontSize={11}
                        tickLine={false}
                        domain={chartConfig.yDomain as any}
                        tick={{ fill: '#888' }}
                        unit={chartMetric === 'disponibilidad' || chartMetric === 'packet_loss' ? '%' : ''}
                      />
                      <Tooltip content={<CustomChartTooltip />} />
                      {chartConfig.kpiValue !== null && chartConfig.kpiValue !== undefined && (
                        <ReferenceLine
                          y={chartConfig.kpiValue}
                          stroke={chartConfig.color}
                          strokeDasharray="4 4"
                          strokeOpacity={0.8}
                          label={{
                            value: `KPI: ${chartConfig.kpiValue}${chartConfig.unit}`,
                            fill: chartConfig.color,
                            fontSize: 10,
                            position: 'top'
                          }}
                        />
                      )}
                      <Area
                        type="monotone"
                        dataKey={chartConfig.dataKey}
                        stroke={chartConfig.color}
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill={`url(#${chartConfig.gradientId})`}
                        dot={{ r: 4, fill: chartConfig.color, strokeWidth: 1, stroke: '#000' }}
                        activeDot={{ r: 6, fill: '#fff', stroke: chartConfig.color, strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* LEYENDA DEL GRÁFICO */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-st-border/50 text-[11px] text-st-muted">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: chartConfig.color }} />
                      <span>{modo === 'historico_mensual' ? 'Valor mensual real' : 'Muestra de telemetría'}</span>
                    </span>
                    {chartConfig.kpiValue !== null && (
                      <span className="flex items-center gap-1.5 font-mono">
                        <span className="w-3 h-0.5 border-b border-dashed" style={{ borderColor: chartConfig.color }} />
                        <span>KPI Promedio: <strong>{chartConfig.kpiValue}{chartConfig.unit}</strong></span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {modo === 'historico_mensual' ? (
                      <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-bold">
                        Septiembre 2026: Mes en curso (Provisional)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-st-accent/10 text-st-accent border border-st-accent/30 text-[10px] font-bold">
                        Ventana Operativa: {data.rango_label || rangoTiempo}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ---------------------------------------------------- */}
            {/* SECCIÓN 3: TABLA DE DETALLE / MATRIZ DE CALIDAD      */}
            {/* ---------------------------------------------------- */}
            {!data.es_todos ? (
              /* CASO CLIENTE ESPECÍFICO: TABLA DE DESGLOSE */
              <div className="bg-st-surface border border-st-border rounded-xl overflow-hidden shadow-xl space-y-4">
                <div className="p-4 border-b border-st-border bg-st-bg/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-st-accent" />
                      {modo === 'historico_mensual'
                        ? `Desglose Mensual · Nivel 1 (${data.cliente?.cliente})`
                        : `Muestras de Telemetría (${data.cliente?.cliente})`}
                    </h2>
                    <p className="text-[11px] text-st-muted mt-0.5">
                      {modo === 'historico_mensual'
                        ? 'Valores mensuales calculados de manera independiente para cada mes del período'
                        : `Telemetría y calidad registrada durante ${data.rango_label || rangoTiempo}`}
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-st-bg/80 text-st-muted uppercase tracking-wider font-semibold border-b border-st-border">
                        <th className="py-3 px-4">{modo === 'historico_mensual' ? 'Mes / Período' : 'Hora / Intervalo'}</th>
                        <th className="py-3 px-4 text-center">Disponibilidad STARMONITOR</th>
                        <th className="py-3 px-4 text-center">Latencia (ms)</th>
                        <th className="py-3 px-4 text-center">Packet Loss (%)</th>
                        <th className="py-3 px-4 text-center">Download (GB)</th>
                        <th className="py-3 px-4 text-center">Upload (GB)</th>
                        <th className="py-3 px-4 text-center">Obstrucción (%)</th>
                        <th className="py-3 px-4 text-center">Tiempo Offline</th>
                        <th className="py-3 px-4 text-right">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-st-border/50 font-mono">
                      {data.series_mensual.map((m) => (
                        <tr key={m.periodo} className="hover:bg-white/[0.03] transition-colors">
                          <td className="py-3 px-4 font-bold text-white flex items-center gap-2 font-sans">
                            <span>{m.mes_label}</span>
                            {m.es_mes_en_curso && (
                              <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                {modo === 'historico_mensual' ? 'Mes en curso' : 'Actual'}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-st-online">
                            {m.disponibilidad_pct}%
                          </td>
                          <td className="py-3 px-4 text-center text-white">{m.latencia_ms} ms</td>
                          <td className="py-3 px-4 text-center text-st-muted">{m.packet_loss_pct}%</td>
                          <td className="py-3 px-4 text-center text-white">{m.download_gb} GB</td>
                          <td className="py-3 px-4 text-center text-st-muted">{m.upload_gb} GB</td>
                          <td className="py-3 px-4 text-center text-st-muted">{m.obstruccion_pct}%</td>
                          <td className="py-3 px-4 text-center font-semibold text-purple-400">
                            {m.offline_formateado}
                          </td>
                          <td className="py-3 px-4 text-right font-sans">
                            <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded border ${
                              m.disponibilidad_pct >= 99.5
                                ? 'bg-st-online/10 text-st-online border-st-online/30'
                                : m.disponibilidad_pct < 98.0
                                ? 'bg-st-offline/10 text-st-offline border-st-offline/30'
                                : 'bg-st-warning/10 text-st-warning border-st-warning/30'
                            }`}>
                              {m.disponibilidad_pct >= 99.5 ? 'EXCELENTE' : m.disponibilidad_pct < 98.0 ? 'DEGRADADO' : 'ESTABLE'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {/* FILA DE RESUMEN PROMEDIO */}
                    <tfoot>
                      <tr className="bg-st-accent/10 border-t-2 border-st-accent/40 font-mono font-bold text-white">
                        <td className="py-3.5 px-4 font-sans uppercase tracking-wider text-st-accent text-xs">
                          {modo === 'historico_mensual' ? 'Promedio Período (KPI Nivel 2)' : 'Promedio Ventana'}
                        </td>
                        <td className="py-3.5 px-4 text-center text-st-online text-sm">
                          {data.kpis_tecnicos?.disponibilidad_promedio_mensual}%
                        </td>
                        <td className="py-3.5 px-4 text-center text-sm">
                          {data.kpis_tecnicos?.latencia_promedio} ms
                        </td>
                        <td className="py-3.5 px-4 text-center text-purple-400 text-sm">
                          {data.kpis_tecnicos?.packet_loss_promedio}%
                        </td>
                        <td className="py-3.5 px-4 text-center text-st-muted text-xs">—</td>
                        <td className="py-3.5 px-4 text-center text-st-muted text-xs">—</td>
                        <td className="py-3.5 px-4 text-center text-st-muted text-xs">—</td>
                        <td className="py-3.5 px-4 text-center text-purple-400 text-sm">
                          {data.kpis_tecnicos?.offline_promedio_formateado}
                        </td>
                        <td className="py-3.5 px-4 text-right font-sans text-[11px] text-st-accent">
                          Calculado
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            ) : (
              /* CASO TODOS LOS CLIENTES: MATRIZ DE CALIDAD POR CLIENTE */
              <div className="bg-st-surface border border-st-border rounded-xl overflow-hidden shadow-xl space-y-4">
                <div className="p-4 border-b border-st-border bg-st-bg/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Activity className="w-4 h-4 text-st-accent" />
                      {modo === 'historico_mensual'
                        ? `Matriz de Calidad Histórica por Cliente (Últimos ${periodoMeses} meses)`
                        : `Matriz de Calidad Operativa por Cliente (${data.rango_label || rangoTiempo})`}
                    </h2>
                    <p className="text-[11px] text-st-muted mt-0.5">
                      {modo === 'historico_mensual'
                        ? 'Indicadores calculados como promedio mensual en dos niveles para cada cliente de la cartera'
                        : `Indicadores de telemetría y calidad consolidada durante ${data.rango_label || rangoTiempo}`}
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-st-bg/80 text-st-muted uppercase tracking-wider font-semibold border-b border-st-border">
                        <th
                          className="py-3 px-4 cursor-pointer select-none hover:text-white transition-colors group"
                          onClick={() => handleSort('cliente')}
                        >
                          <div className="flex items-center gap-1.5">
                            <span>Cliente</span>
                            {renderSortIcon('cliente')}
                          </div>
                        </th>
                        <th
                          className="py-3 px-4 text-center cursor-pointer select-none hover:text-white transition-colors group"
                          onClick={() => handleSort('disponibilidad_starmonitor')}
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            <span>Disponibilidad Promedio</span>
                            {renderSortIcon('disponibilidad_starmonitor')}
                          </div>
                        </th>
                        <th
                          className="py-3 px-4 text-center cursor-pointer select-none hover:text-white transition-colors group"
                          onClick={() => handleSort('latencia_ms')}
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            <span>Latencia Prom. (ms)</span>
                            {renderSortIcon('latencia_ms')}
                          </div>
                        </th>
                        <th
                          className="py-3 px-4 text-center cursor-pointer select-none hover:text-white transition-colors group"
                          onClick={() => handleSort('packet_loss_pct')}
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            <span>Packet Loss Prom. (%)</span>
                            {renderSortIcon('packet_loss_pct')}
                          </div>
                        </th>
                        <th
                          className="py-3 px-4 text-center cursor-pointer select-none hover:text-white transition-colors group"
                          onClick={() => handleSort('download_gb')}
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            <span>Download (GB)</span>
                            {renderSortIcon('download_gb')}
                          </div>
                        </th>
                        <th
                          className="py-3 px-4 text-center cursor-pointer select-none hover:text-white transition-colors group"
                          onClick={() => handleSort('upload_gb')}
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            <span>Upload (GB)</span>
                            {renderSortIcon('upload_gb')}
                          </div>
                        </th>
                        <th
                          className="py-3 px-4 text-center cursor-pointer select-none hover:text-white transition-colors group"
                          onClick={() => handleSort('minutos_offline')}
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            <span>Offline Promedio</span>
                            {renderSortIcon('minutos_offline')}
                          </div>
                        </th>
                        <th
                          className="py-3 px-4 text-center cursor-pointer select-none hover:text-white transition-colors group"
                          onClick={() => handleSort('tendencia')}
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            <span>Tendencia</span>
                            {renderSortIcon('tendencia')}
                          </div>
                        </th>
                        <th className="py-3 px-4 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-st-border/50">
                      {sortedItems.map((item) => (
                        <tr key={item.tenant_id} className="hover:bg-white/[0.03] transition-colors">
                          <td className="py-3 px-4 font-bold text-white">
                            <div>{item.cliente || `Cliente #${item.tenant_id}`}</div>
                            <div className="text-[10px] font-mono text-st-muted">{item.codigo || `CLI-${item.tenant_id}`}</div>
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-st-online">
                            {item.disponibilidad_starmonitor !== null && item.disponibilidad_starmonitor !== undefined
                              ? `${item.disponibilidad_starmonitor}%`
                              : '—'}
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-white">
                            {item.latencia_ms !== null && item.latencia_ms !== undefined
                              ? `${item.latencia_ms} ms`
                              : '—'}
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-st-muted">
                            {item.packet_loss_pct !== null && item.packet_loss_pct !== undefined
                              ? `${item.packet_loss_pct}%`
                              : '—'}
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-white">
                            {item.download_gb !== null && item.download_gb !== undefined
                              ? `${item.download_gb} GB`
                              : '—'}
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-st-muted">
                            {item.upload_gb !== null && item.upload_gb !== undefined
                              ? `${item.upload_gb} GB`
                              : '—'}
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-semibold text-purple-400">
                            {item.offline_formateado || '0 min'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded border ${
                              (item.tendencia || 'ESTABLE') === 'EXCELENTE'
                                ? 'bg-st-online/10 text-st-online border-st-online/30'
                                : (item.tendencia || 'ESTABLE') === 'DEGRADADO'
                                ? 'bg-st-offline/10 text-st-offline border-st-offline/30'
                                : 'bg-st-warning/10 text-st-warning border-st-warning/30'
                            }`}>
                              {item.tendencia || 'ESTABLE'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => setSelectedTenantId(item.tenant_id)}
                              className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-st-bg border border-st-border text-st-accent hover:bg-st-accent/10 hover:border-st-accent/30 transition-all cursor-pointer inline-flex items-center gap-1"
                            >
                              <span>Ver Histórico</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AnaliticaLayout>
  );
};

export default AnaliticaCalidad;
