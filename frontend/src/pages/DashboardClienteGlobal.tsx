import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Satellite, Activity, CreditCard, 
  AlertTriangle, ShieldAlert, Clock, DollarSign,
  ChevronUp, ChevronDown, ArrowUpDown,
  Calendar, SlidersHorizontal, RefreshCw
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line
} from 'recharts';
import client from '../api/client';
import { useResellerTheme } from '../context/ResellerThemeContext';

const formatGBtoTB = (gb: number | undefined | null) => {
  if (gb === undefined || gb === null) return '0 GB';
  if (gb < 1) return `${(gb * 1024).toFixed(1)} MB`;
  if (gb >= 1024) return `${(gb / 1024).toFixed(1)} TB`;
  return `${gb.toFixed(1)} GB`;
};

const formatPeriodLabel = (val: string) => {
  if (!val) return '';
  const s = String(val).trim();
  const monthNames: Record<string, string> = {
    '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr',
    '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Ago',
    '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dic',
    '1': 'Ene', '2': 'Feb', '3': 'Mar', '4': 'Abr',
    '5': 'May', '6': 'Jun', '7': 'Jul', '8': 'Ago',
    '9': 'Sep'
  };

  if (/^\d{6}$/.test(s)) {
    const mm = s.slice(4, 6);
    return monthNames[mm] || s;
  }
  if (/^\d{4}-\d{2}$/.test(s)) {
    const mm = s.slice(5, 7);
    return monthNames[mm] || s;
  }
  if (/^\d{4}\/\d{2}$/.test(s)) {
    const mm = s.slice(5, 7);
    return monthNames[mm] || s;
  }
  return s;
};

const formatTimeLabel = (val: string, rango: string = '') => {
  if (!val) return '';
  const date = new Date(val);
  if (!isNaN(date.getTime())) {
    if (rango === '1d' || rango === '24h' || rango === '7d' || rango === '30d') {
      return date.toLocaleDateString([], { day: '2-digit', month: 'short' });
    }
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  }
  return val;
};

const DashboardClienteGlobal: React.FC = () => {
  const navigate = useNavigate();
  const { themeMode } = useResellerTheme();
  const isLight = themeMode === 'light';
  const tickColor = isLight ? '#000000' : '#ffffff';
  const gridColor = isLight ? '#E2E8F0' : '#222222';
  const axisColor = isLight ? '#94A3B8' : '#444444';
  const [summary, setSummary] = useState<any>(null);
  const [topClients, setTopClients] = useState<any[]>([]);
  const [portfolioTrend, setPortfolioTrend] = useState<any[]>([]);
  const [qualityTrend, setQualityTrend] = useState<any[]>([]);
  const [billingTrend, setBillingTrend] = useState<any[]>([]);
  const [criticalAlerts, setCriticalAlerts] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [provisioning, setProvisioning] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [activeSeries, setActiveSeries] = useState({
    downlink: true,
    uplink: true,
    latency: true
  });

  // Estados de filtros idénticos a Calidad Histórica
  const [modo, setModo] = useState<'historico_mensual' | 'operativo'>('historico_mensual');
  const [rangoTiempo, setRangoTiempo] = useState<string>('30d');
  const [periodoMeses, setPeriodoMeses] = useState<number>(12);
  const [excluirMesEnCurso, setExcluirMesEnCurso] = useState<boolean>(false);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  
  const [sortField, setSortField] = useState<string>('starlinks_con_actividad');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        modo,
        rango_tiempo: rangoTiempo,
        periodo_meses: periodoMeses,
        excluir_mes_en_curso: excluirMesEnCurso,
      };
      if (selectedYear) params.year = parseInt(selectedYear);
      if (selectedMonth) params.month = selectedMonth;

      const fetchPromises = [
        client.get('/reseller/dashboard/summary', { params }),
        client.get('/reseller/dashboard/top-clients', { params }),
        client.get('/reseller/dashboard/portfolio-trend', { params }),
        client.get('/reseller/dashboard/quality-trend', { params }),
        client.get('/reseller/dashboard/billing-trend', { params }),
        client.get('/reseller/dashboard/critical-alerts'),
        client.get('/reseller/dashboard/contracts-expiring'),
        client.get('/reseller/dashboard/provisioning-pending')
      ];

      if (modo === 'operativo') {
        const chartParams: any = { modo: 'operativo', window: rangoTiempo, rango_tiempo: rangoTiempo };
        if (selectedYear) chartParams.year = parseInt(selectedYear);
        if (selectedMonth) chartParams.month = selectedMonth;
        fetchPromises.push(client.get('/dashboard/chart', { params: chartParams }));
      }

      const results = await Promise.all(fetchPromises);
      
      setSummary(results[0].data);
      setTopClients(results[1].data);
      setPortfolioTrend(results[2].data);
      setQualityTrend(results[3].data);
      setBillingTrend(results[4].data);
      setCriticalAlerts(results[5].data);
      setContracts(results[6].data);
      setProvisioning(results[7].data);
      
      if (modo === 'operativo') {
        const payload = results[8]?.data;
        if (payload && Array.isArray(payload.legacyData)) {
          setChartData(payload.legacyData);
        } else if (Array.isArray(payload)) {
          setChartData(payload);
        } else {
          setChartData([]);
        }
      } else {
        setChartData([]);
      }
    } catch (err) {
      console.error('Error fetching reseller dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [modo, rangoTiempo, periodoMeses, excluirMesEnCurso, selectedYear, selectedMonth]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      if (field === 'cliente') {
        setSortDir('asc');
      } else {
        setSortDir('desc');
      }
    }
  };

  const sortedTopClients = useMemo(() => {
    if (!topClients || topClients.length === 0) return [];
    const list = [...topClients];
    list.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (sortField === 'packet_loss_pct') {
        aVal = a.packet_loss_pct ?? a.packet_loss_avg_pct ?? 0;
        bVal = b.packet_loss_pct ?? b.packet_loss_avg_pct ?? 0;
      }

      if (aVal === undefined || aVal === null) aVal = '';
      if (bVal === undefined || bVal === null) bVal = '';

      if (typeof aVal === 'string') {
        const comp = aVal.localeCompare(String(bVal));
        return sortDir === 'asc' ? comp : -comp;
      }
      return sortDir === 'asc' ? (Number(aVal) - Number(bVal)) : (Number(bVal) - Number(aVal));
    });
    return list;
  }, [topClients, sortField, sortDir]);

  const renderSortIcon = (field: string) => {
    if (sortField === field) {
      return sortDir === 'asc' ? (
        <ChevronUp className="w-3.5 h-3.5 text-st-accent flex-shrink-0" />
      ) : (
        <ChevronDown className="w-3.5 h-3.5 text-st-accent flex-shrink-0" />
      );
    }
    return <ArrowUpDown className="w-3 h-3 text-st-muted/40 group-hover:text-st-muted flex-shrink-0 transition-colors" />;
  };

  if (loading && !summary) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Activity className="w-10 h-10 text-st-accent animate-spin" />
      </div>
    );
  }

  const facturacionStarlink = summary?.facturacion?.monto_facturado ?? summary?.facturacion?.monto_starlink ?? 0;
  const facturacionClientes = summary?.facturacion_clientes?.monto_facturado ?? summary?.facturacion_clientes?.monto_cobrado ?? (facturacionStarlink * 1.31);
  const margenUsd = summary?.facturacion_clientes?.margen_usd ?? (facturacionClientes - facturacionStarlink);
  const margenPct = summary?.facturacion_clientes?.margen_pct ?? (facturacionClientes > 0 ? (margenUsd / facturacionClientes) * 100 : 0);

  const kpis = [
    {
      title: "Clientes Activos",
      value: summary?.portafolio?.clientes_activos || 0,
      icon: Users,
      trend: "+1 cliente neto vs mes anterior"
    },
    {
      title: "Starlinks en Servicio",
      value: summary?.portafolio?.starlinks_con_actividad || 0,
      icon: Satellite,
      trend: "Total de líneas con tráfico"
    },
    {
      title: "Calidad Global",
      value: summary?.portafolio?.calidad_global_score || 0,
      icon: Activity,
      trend: (summary?.portafolio?.calidad_global_score || 0) >= 90 ? "EXCELENTE" : ((summary?.portafolio?.calidad_global_score || 0) >= 80 ? "BUENA" : "ATENCIÓN"),
      color: (summary?.portafolio?.calidad_global_score || 0) >= 90 ? "text-green-500" : "text-yellow-500"
    },
    {
      title: "Facturación Starlink",
      value: `USD ${facturacionStarlink.toLocaleString('es-PE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`,
      icon: CreditCard,
      trend: `${(summary?.facturacion?.variacion_vs_anterior_pct || 0) > 0 ? '▲' : '▼'} ${Math.abs(summary?.facturacion?.variacion_vs_anterior_pct || 0)}% vs mes anterior`
    },
    {
      title: "Facturación Clientes",
      value: `USD ${facturacionClientes.toLocaleString('es-PE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`,
      icon: DollarSign,
      trend: `Margen: +${margenPct.toFixed(1)}% (+USD ${Math.round(margenUsd).toLocaleString('es-PE')})`,
      color: "text-emerald-400",
      trendColor: "text-emerald-400 font-semibold"
    },
    {
      title: "Alertas Graves",
      value: summary?.alertas?.total_graves || 0,
      icon: AlertTriangle,
      trend: `${summary?.alertas?.sin_reconocer || 0} sin reconocer`,
      color: (summary?.alertas?.total_graves || 0) > 0 ? "text-red-500" : "text-st-muted"
    },
    {
      title: "Riesgo Operativo",
      value: summary?.riesgo?.offline || 0,
      icon: ShieldAlert,
      trend: `${summary?.riesgo?.offline || 0} offline, ${summary?.riesgo?.sin_telemetria || 0} sin telemetría`,
      color: (summary?.riesgo?.offline || 0) > 0 ? "text-yellow-500" : "text-st-muted"
    }
  ];

  const currentRangoLabel = summary?.rango_label || (modo === 'operativo' ? rangoTiempo : `Últimos ${periodoMeses} meses`);

  return (
    <div className="space-y-6">
      {/* BARRA SUPERIOR DE ENCABEZADO Y FILTROS */}
      <div className="bg-st-surface border border-st-border rounded-2xl p-4 shadow-lg shadow-black/20">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white font-sans">Dashboard Cliente</h1>
            <p className="text-xs text-st-muted mt-0.5">
              Vista ejecutiva consolidada de clientes B2B • <span className="text-st-accent font-semibold">{currentRangoLabel}</span>
            </p>
          </div>

          {/* MODO, PERÍODO Y CONFIGURACIÓN TEMPORAL (IDÉNTICO A CALIDAD HISTÓRICA) */}
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
                {/* SELECTORES DE AÑO Y MES */}
                <div className="flex items-center gap-2">
                  <select
                    value={selectedYear}
                    onChange={(e) => {
                      setSelectedYear(e.target.value);
                      if (e.target.value) {
                        setSelectedMonth('');
                      }
                    }}
                    className="bg-st-bg border border-st-border text-white text-xs font-medium rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-st-accent cursor-pointer"
                  >
                    <option value="">Todos los años</option>
                    <option value="2026">Año 2026</option>
                    <option value="2025">Año 2025</option>
                  </select>

                  <select
                    value={selectedMonth}
                    onChange={(e) => {
                      setSelectedMonth(e.target.value);
                      if (e.target.value) {
                        setSelectedYear('');
                      }
                    }}
                    className="bg-st-bg border border-st-border text-white text-xs font-medium rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-st-accent cursor-pointer"
                  >
                    <option value="">Todos los meses</option>
                    <option value="2026-09">2026-09 (Sep)</option>
                    <option value="2026-08">2026-08 (Ago)</option>
                    <option value="2026-07">2026-07 (Jul)</option>
                    <option value="2026-06">2026-06 (Jun)</option>
                    <option value="2026-05">2026-05 (May)</option>
                    <option value="2026-04">2026-04 (Abr)</option>
                    <option value="2026-03">2026-03 (Mar)</option>
                    <option value="2026-02">2026-02 (Feb)</option>
                    <option value="2026-01">2026-01 (Ene)</option>
                    <option value="2025-12">2025-12 (Dic)</option>
                    <option value="2025-11">2025-11 (Nov)</option>
                    <option value="2025-10">2025-10 (Oct)</option>
                  </select>
                </div>

                {/* SELECTOR DE PERÍODO MENSUAL */}
                <div className="flex items-center bg-st-bg p-1 rounded-xl border border-st-border">
                  <button
                    onClick={() => { setPeriodoMeses(6); setSelectedYear(''); setSelectedMonth(''); }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      periodoMeses === 6 && !selectedYear && !selectedMonth
                        ? 'bg-st-accent text-black shadow-sm'
                        : 'text-st-muted hover:text-white'
                    }`}
                  >
                    Últimos 6 meses
                  </button>
                  <button
                    onClick={() => { setPeriodoMeses(12); setSelectedYear(''); setSelectedMonth(''); }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      periodoMeses === 12 && !selectedYear && !selectedMonth
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
              /* MODO OPERATIVO: BOTONES 15min, 30min, 1h, 3h, 1d, 7d, 30d */
              <div className="flex items-center bg-st-bg p-1 rounded-xl border border-st-border">
                <button
                  onClick={() => setRangoTiempo('15min')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    rangoTiempo === '15min'
                      ? 'bg-st-accent text-black shadow-sm'
                      : 'text-st-muted hover:text-white'
                  }`}
                >
                  15min
                </button>
                <button
                  onClick={() => setRangoTiempo('30min')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    rangoTiempo === '30min'
                      ? 'bg-st-accent text-black shadow-sm'
                      : 'text-st-muted hover:text-white'
                  }`}
                >
                  30min
                </button>
                <button
                  onClick={() => setRangoTiempo('1h')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    rangoTiempo === '1h'
                      ? 'bg-st-accent text-black shadow-sm'
                      : 'text-st-muted hover:text-white'
                  }`}
                >
                  1h
                </button>
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
              disabled={loading}
              title="Actualizar datos"
              className="p-2 rounded-xl bg-st-bg border border-st-border text-st-muted hover:text-white hover:border-st-accent/40 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-st-accent' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* BLOQUE 1 - KPIs EJECUTIVOS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 sm:gap-3.5">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div key={idx} className="bg-st-surface border border-st-border rounded-xl p-4 flex flex-col justify-between hover:border-st-accent/40 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-bold text-st-muted uppercase tracking-wider">{kpi.title}</span>
                <Icon className={`w-4 h-4 ${kpi.color || 'text-st-accent'}`} />
              </div>
              <div>
                <span className={`text-2xl font-bold font-mono ${kpi.color || 'text-white'}`}>{kpi.value}</span>
                <p className={`text-[10px] mt-1 leading-tight ${kpi.trendColor || 'text-st-muted'}`}>{kpi.trend}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* BLOQUE 2 - EVOLUCIÓN, CALIDAD Y FACTURACIÓN O TELEMETRÍA EN TIEMPO REAL */}
      {modo === 'operativo' ? (
        <div className="bg-st-surface border border-st-border rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-st-accent" />
                Telemetría en Tiempo Real ({rangoTiempo})
              </h2>
              <p className="text-[11px] text-st-muted font-sans mt-0.5">Monitoreo de tráfico de red y latencia satelital en la ventana actual.</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-4 bg-black/20 p-2 rounded-lg border border-white/5">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activeSeries.downlink}
                  onChange={() => setActiveSeries(p => ({ ...p, downlink: !p.downlink }))}
                  className="accent-[#00E5FF]"
                />
                <span className="w-2.5 h-2.5 rounded-full bg-[#00E5FF] block shadow-[0_0_8px_rgba(0,229,255,0.6)]" />
                <span className={activeSeries.downlink ? 'text-white text-xs font-semibold' : 'text-st-muted text-xs'}>Downlink (Mbps)</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activeSeries.uplink}
                  onChange={() => setActiveSeries(p => ({ ...p, uplink: !p.uplink }))}
                  className="accent-[#3B82F6]"
                />
                <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6] block shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                <span className={activeSeries.uplink ? 'text-white text-xs font-semibold' : 'text-st-muted text-xs'}>Uplink (Mbps)</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activeSeries.latency}
                  onChange={() => setActiveSeries(p => ({ ...p, latency: !p.latency }))}
                  className="accent-[#F59E0B]"
                />
                <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B] block shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
                <span className={activeSeries.latency ? 'text-white text-xs font-semibold' : 'text-st-muted text-xs'}>Latencia (ms)</span>
              </label>
            </div>
          </div>
          
          <div className="h-[300px] w-full mt-4">
            {chartData.length === 0 ? (
               <div className="h-full flex items-center justify-center text-st-muted text-sm font-semibold italic">
                 Sin datos de telemetría en el rango seleccionado
               </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorDown" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00E5FF" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#00E5FF" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="colorUp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="colorLat" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                  <XAxis 
                    dataKey="timestamp" 
                    stroke="#444" 
                    tick={{ fill: '#ffffff', fontWeight: 'bold', fontSize: 11 }}
                    fontSize={11} 
                    tickMargin={12} 
                    tickFormatter={(val: string) => formatTimeLabel(val, rangoTiempo)} 
                    interval={0}
                  />
                  <YAxis 
                    stroke="#444" 
                    tick={{ fill: '#ffffff', fontWeight: 'bold', fontSize: 11 }}
                    fontSize={11} 
                    tickMargin={12} 
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)' }}
                    itemStyle={{ color: '#fff' }}
                    labelFormatter={(label) => {
                      return formatTimeLabel(label);
                    }}
                  />
                  {activeSeries.downlink && (
                    <Area type="monotone" dataKey="downlink_mbps" name="Downlink" stroke="#00E5FF" fillOpacity={1} fill="url(#colorDown)" strokeWidth={2.5} />
                  )}
                  {activeSeries.uplink && (
                    <Area type="monotone" dataKey="uplink_mbps" name="Uplink" stroke="#3B82F6" fillOpacity={1} fill="url(#colorUp)" strokeWidth={2.5} />
                  )}
                  {activeSeries.latency && (
                    <Area type="monotone" dataKey="latency_ms" name="Latencia" stroke="#F59E0B" fillOpacity={1} fill="url(#colorLat)" strokeWidth={2.5} />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-st-surface border border-st-border rounded-xl p-5 flex flex-col">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
            Evolución Cartera ({currentRangoLabel})
          </h2>
          <div className="flex-1 min-h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={portfolioTrend}>
                <defs>
                  <linearGradient id="colorClients" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00E5FF" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#00E5FF" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="colorStars" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={isLight ? '#0F172A' : '#ffffff'} stopOpacity={isLight ? 0.2 : 0.1}/>
                    <stop offset="95%" stopColor={isLight ? '#0F172A' : '#ffffff'} stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="periodo" stroke={axisColor} tick={{ fill: tickColor, fontWeight: 'bold', fontSize: 11 }} fontSize={11} tickMargin={10} tickFormatter={formatPeriodLabel} />
                <YAxis yAxisId="left" stroke={axisColor} tick={{ fill: tickColor, fontWeight: 'bold', fontSize: 11 }} fontSize={11} />
                <YAxis yAxisId="right" orientation="right" stroke={axisColor} tick={{ fill: tickColor, fontWeight: 'bold', fontSize: 11 }} fontSize={11} />
                <Tooltip 
                  contentStyle={{ backgroundColor: isLight ? '#ffffff' : '#111', borderColor: isLight ? '#cbd5e1' : '#333', borderRadius: '8px', color: isLight ? '#000000' : '#ffffff' }}
                  itemStyle={{ color: isLight ? '#000000' : '#fff' }}
                  labelFormatter={(label) => {
                    const formatted = formatPeriodLabel(label);
                    return formatted !== label ? `${formatted} (${label})` : label;
                  }}
                />
                <Area yAxisId="left" type="monotone" dataKey="clientes_activos" name="Clientes" stroke="#00E5FF" fillOpacity={1} fill="url(#colorClients)" strokeWidth={2} />
                <Area yAxisId="right" type="monotone" dataKey="starlinks_con_actividad" name="Starlinks" stroke={isLight ? '#0F172A' : '#ffffff'} fillOpacity={1} fill="url(#colorStars)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-st-surface border border-st-border rounded-xl p-5">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
            Calidad de Servicio ({currentRangoLabel})
          </h2>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={qualityTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="periodo" stroke={axisColor} tick={{ fill: tickColor, fontWeight: 'bold', fontSize: 11 }} fontSize={11} tickMargin={10} tickFormatter={formatPeriodLabel} />
                <YAxis domain={[80, 100]} stroke={axisColor} tick={{ fill: tickColor, fontWeight: 'bold', fontSize: 11 }} fontSize={11} />
                <Tooltip 
                  contentStyle={{ backgroundColor: isLight ? '#ffffff' : '#111', borderColor: isLight ? '#cbd5e1' : '#333', borderRadius: '8px', color: isLight ? '#000000' : '#ffffff' }}
                  itemStyle={{ color: isLight ? '#000000' : '#ffffff' }}
                  labelFormatter={(label) => {
                    const formatted = formatPeriodLabel(label);
                    return formatted !== label ? `${formatted} (${label})` : label;
                  }}
                />
                <Line type="monotone" dataKey="calidad_global_score" name="Quality Score" stroke="#00E5FF" strokeWidth={3} dot={{r: 4, fill: '#00E5FF'}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-st-surface border border-st-border rounded-xl p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Facturación vs Costo ({currentRangoLabel})
            </h2>
            <div className="flex items-center gap-3 text-[10px] font-medium">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Clientes
              </span>
              <span className="flex items-center gap-1 text-[#00E5FF]">
                <span className="w-2 h-2 rounded-full bg-[#00E5FF]"></span> Starlink
              </span>
            </div>
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={billingTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="periodo" stroke={axisColor} tick={{ fill: tickColor, fontWeight: 'bold', fontSize: 11 }} fontSize={11} tickMargin={10} tickFormatter={formatPeriodLabel} />
                <YAxis stroke={axisColor} tick={{ fill: tickColor, fontWeight: 'bold', fontSize: 11 }} fontSize={11} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: isLight ? '#ffffff' : '#111', borderColor: isLight ? '#cbd5e1' : '#333', borderRadius: '8px', color: isLight ? '#000000' : '#ffffff' }}
                  itemStyle={{ color: isLight ? '#000000' : '#ffffff' }}
                  labelFormatter={(label) => {
                    const formatted = formatPeriodLabel(label);
                    return formatted !== label ? `${formatted} (${label})` : label;
                  }}
                  formatter={(value: any, name: any) => [
                    `USD ${Number(value).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`,
                    name === 'facturacion_clientes' ? 'Facturación Clientes' :
                    name === 'costo_starlink' || name === 'monto_facturado' ? 'Costo Starlink' : name
                  ]}
                />
                <Bar dataKey="facturacion_clientes" name="facturacion_clientes" fill="#10B981" radius={[3, 3, 0, 0]} />
                <Bar dataKey={billingTrend.some(b => b.costo_starlink !== undefined) ? "costo_starlink" : "monto_facturado"} name="costo_starlink" fill="#00E5FF" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      )}

      {/* BLOQUE 3 - ALERTAS Y OPERACIONES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-2 bg-st-surface border border-st-border rounded-xl p-5">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            Alertas Críticas Recientes
          </h2>
          {criticalAlerts.length === 0 ? (
            <p className="text-st-muted text-sm italic">No hay alertas críticas pendientes.</p>
          ) : (
            <div className="space-y-3">
              {criticalAlerts.map((ca, idx) => (
                <div key={idx} className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5">
                  <div>
                    <p className="text-white text-sm font-medium">Tenant ID: {ca.tenant_id}</p>
                    <p className="text-xs text-st-muted mt-0.5">{ca.sin_reconocer} sin reconocer</p>
                  </div>
                  <div className="bg-red-500/20 text-red-400 px-3 py-1 rounded text-xs font-bold font-mono border border-red-500/30">
                    {ca.alertas_graves_pendientes} graves
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-st-surface border border-st-border rounded-xl p-5">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-yellow-500" />
            Contratos por Vencer
          </h2>
          {contracts.length === 0 ? (
            <p className="text-st-muted text-sm italic">No hay contratos próximos a vencer.</p>
          ) : (
            <div className="space-y-3">
              {contracts.slice(0, 4).map((ct, idx) => (
                <div key={idx} className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5">
                  <div className="flex-1 truncate pr-2">
                    <p className="text-white text-sm font-medium truncate">{ct.cliente}</p>
                    <p className="text-xs text-st-muted mt-0.5">{ct.fecha_fin}</p>
                  </div>
                  <div className="text-yellow-400 font-mono text-xs font-bold whitespace-nowrap">
                    {ct.dias_restantes} días
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-st-surface border border-st-border rounded-xl p-5">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <Satellite className="w-4 h-4 text-st-accent" />
            Provisioning
          </h2>
          {provisioning.length === 0 ? (
            <p className="text-st-muted text-sm italic">No hay aprovisionamientos pendientes.</p>
          ) : (
            <div className="space-y-3">
              {provisioning.slice(0, 4).map((pv, idx) => (
                <div key={idx} className="flex flex-col gap-1 bg-white/5 p-3 rounded-lg border border-white/5">
                  <div className="flex justify-between items-center">
                    <p className="text-white text-sm font-medium truncate pr-2">{pv.cliente}</p>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-st-accent/10 text-st-accent border border-st-accent/20">
                      {pv.estado}
                    </span>
                  </div>
                  {pv.mensaje_error && <p className="text-[10px] text-red-400">{pv.mensaje_error}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* BLOQUE 4 (AL FINAL) - TABLA TOP 10 DE EMPRESAS / CLIENTES */}
      <div className="bg-st-surface border border-st-border rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Top 10 Empresas con Mayor Flota Starlink</h2>
            <p className="text-xs text-st-muted mt-0.5">Ranking de clientes por concentración de terminales y calidad de servicio. Haz clic en las cabeceras para ordenar.</p>
          </div>
          <span className="text-[11px] font-medium text-st-muted bg-st-bg/60 border border-st-border px-2.5 py-1 rounded-lg self-start sm:self-auto">
            {sortedTopClients.length} empresas listadas
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="text-st-muted border-b border-st-border select-none">
                <th 
                  onClick={() => handleSort('starlinks_con_actividad')}
                  className="pb-3 px-2 font-semibold uppercase text-xs cursor-pointer hover:text-white transition-colors group w-10"
                >
                  <div className="flex items-center gap-1">
                    <span>#</span>
                    {renderSortIcon('starlinks_con_actividad')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('cliente')}
                  className="pb-3 px-3 font-semibold uppercase text-xs cursor-pointer hover:text-white transition-colors group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Empresa / Cliente</span>
                    {renderSortIcon('cliente')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('starlinks_con_actividad')}
                  className="pb-3 px-3 font-semibold text-right uppercase text-xs cursor-pointer hover:text-white transition-colors group"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Starlinks</span>
                    {renderSortIcon('starlinks_con_actividad')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('consumo_total_gb')}
                  className="pb-3 px-3 font-semibold text-right uppercase text-xs cursor-pointer hover:text-white transition-colors group"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Consumo Total</span>
                    {renderSortIcon('consumo_total_gb')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('latencia_avg_ms')}
                  className="pb-3 px-3 font-semibold text-right uppercase text-xs cursor-pointer hover:text-white transition-colors group"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Latencia Prom.</span>
                    {renderSortIcon('latencia_avg_ms')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('packet_loss_pct')}
                  className="pb-3 px-3 font-semibold text-right uppercase text-xs cursor-pointer hover:text-white transition-colors group"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Pérdida Paquetes</span>
                    {renderSortIcon('packet_loss_pct')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('calidad_servicio_score')}
                  className="pb-3 px-3 font-semibold text-right uppercase text-xs cursor-pointer hover:text-white transition-colors group"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Score Calidad</span>
                    {renderSortIcon('calidad_servicio_score')}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-st-border/50">
              {sortedTopClients.map((client, idx) => {
                const lossVal = client.packet_loss_pct !== undefined ? client.packet_loss_pct : client.packet_loss_avg_pct;
                return (
                  <tr 
                    key={client.tenant_id || idx} 
                    className="hover:bg-white/5 cursor-pointer transition-colors"
                    onClick={() => navigate(`/reseller/clientes/${client.tenant_id}/dashboard`)}
                  >
                    <td className="py-3 px-2 text-st-muted font-mono text-xs w-8">{idx + 1}</td>
                    <td className="py-3 px-3 text-white font-medium">{client.cliente}</td>
                    <td className="py-3 px-3 text-white font-mono text-right">{client.starlinks_con_actividad}</td>
                    <td className="py-3 px-3 text-white font-mono text-right" title={`${client.consumo_total_gb} GB`}>
                      {formatGBtoTB(client.consumo_total_gb)}
                    </td>
                    <td className="py-3 px-3 text-white font-mono text-right">{client.latencia_avg_ms} ms</td>
                    <td className="py-3 px-3 text-white font-mono text-right">
                      {lossVal !== undefined && lossVal !== null ? `${Number(lossVal).toFixed(2)}%` : '0.00%'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className={`font-mono px-2 py-0.5 rounded text-xs font-bold ${
                        client.calidad_servicio_score >= 90 ? 'bg-green-500/20 text-green-400' :
                        client.calidad_servicio_score >= 80 ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {client.calidad_servicio_score}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardClienteGlobal;
