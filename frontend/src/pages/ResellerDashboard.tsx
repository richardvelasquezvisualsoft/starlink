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

const ResellerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<any>(null);
  const [topClients, setTopClients] = useState<any[]>([]);
  const [portfolioTrend, setPortfolioTrend] = useState<any[]>([]);
  const [qualityTrend, setQualityTrend] = useState<any[]>([]);
  const [billingTrend, setBillingTrend] = useState<any[]>([]);
  const [criticalAlerts, setCriticalAlerts] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [provisioning, setProvisioning] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartMeta, setChartMeta] = useState<any>(null);
  const [activeSeries, setActiveSeries] = useState({
    downlink: true,
    uplink: true,
    latency: true,
    packetLoss: true,
    obstruction: true
  });

  // Estados de filtros idénticos a Calidad Histórica
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear().toString();
  const currentMonth = (currentDate.getMonth() + 1).toString().padStart(2, '0');

  const [modo, setModo] = useState<'historico_mensual' | 'operativo'>('historico_mensual');
  const [rangoTiempo, setRangoTiempo] = useState<string>('30d');
  
  // Rolling mode vs Calendar mode
  // If periodoMeses > 0, it's rolling mode. If 0, it's calendar mode (Year/Month).
  const [periodoMeses, setPeriodoMeses] = useState<number>(6); 
  const [excluirMesEnCurso, setExcluirMesEnCurso] = useState<boolean>(false);
  
  const [selectedYear, setSelectedYear] = useState<string>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth);
  const [availableYears, setAvailableYears] = useState<string[]>([currentYear]);
  
  const [sortField, setSortField] = useState<string>('starlinks_con_actividad');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [loading, setLoading] = useState(true);

  // Fetch available years on mount
  useEffect(() => {
    client.get('/reseller/dashboard/available-years')
      .then(res => {
        if (res.data && res.data.length > 0) {
          setAvailableYears(res.data);
          // If current year is not in the list, we still keep it, or we can select the first available
          if (!res.data.includes(currentYear)) {
            setSelectedYear(res.data[0]);
          }
        }
      })
      .catch(err => console.error("Error fetching available years", err));
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        modo,
        rango_tiempo: rangoTiempo,
        periodo_meses: periodoMeses > 0 ? periodoMeses : 1, // If calendar mode, we might just pass 1 or let backend handle year/month
        excluir_mes_en_curso: excluirMesEnCurso,
      };
      
      // In calendar mode, we pass year and month
      if (periodoMeses === 0) {
         params.year = parseInt(selectedYear);
         if (selectedMonth && selectedMonth !== 'todos') {
             // Backend might expect "2026-09" or just month depending on how it's implemented.
             // We'll pass the specific month string "2026-09" for compatibility if that was the prior expectation,
             // or just month. The old code sent selectedMonth directly. Let's send "YYYY-MM".
             params.month = `${selectedYear}-${selectedMonth}`;
         } else {
             params.month = ''; 
         }
      }

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
        if (periodoMeses === 0) {
           chartParams.year = parseInt(selectedYear);
           if (selectedMonth && selectedMonth !== 'todos') {
               chartParams.month = `${selectedYear}-${selectedMonth}`;
           }
        }
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
        const payload = results[8].data;
        if (payload && payload.legacyData) {
          setChartData(payload.legacyData);
          setChartMeta({
            range: payload.range,
            sourceTable: payload.source,
            anchorMode: payload.anchorMode,
            from: payload.from,
            to: payload.to,
            rowsReturned: payload.rowCount,
            pointCount: payload.pointCount,
            kpis: payload.kpis
          });
        } else if (Array.isArray(payload)) {
          setChartData(payload);
          setChartMeta(null);
        } else {
          setChartData([]);
          setChartMeta(null);
        }
      } else {
        setChartData([]);
        setChartMeta(null);
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

  const currentRangoLabel = summary?.rango_label || (modo === 'operativo' ? rangoTiempo : 
    (periodoMeses > 0 ? `Últimos ${periodoMeses} meses` : 
      (selectedMonth === 'todos' ? `Año ${selectedYear}` : `Mes ${selectedYear}-${selectedMonth}`)
    )
  );

  return (
    <div className="space-y-6">
      {/* BARRA SUPERIOR DE ENCABEZADO Y FILTROS */}
      <div className="bg-st-surface border border-st-border rounded-2xl p-4 shadow-lg shadow-black/20">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white font-sans">Dashboard Reseller</h1>
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
                {/* SELECTORES DE AÑO Y MES (Modo Calendario) */}
                <div className={`flex items-center gap-2 ${periodoMeses > 0 ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                  <select
                    value={selectedYear}
                    onChange={(e) => {
                      setSelectedYear(e.target.value);
                      setSelectedMonth('todos'); // Reset to "Todos los meses" on year change
                    }}
                    className="bg-st-bg border border-st-border text-white text-xs font-medium rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-st-accent cursor-pointer"
                  >
                    {availableYears.map(yr => (
                       <option key={yr} value={yr}>Año {yr}</option>
                    ))}
                  </select>

                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-st-bg border border-st-border text-white text-xs font-medium rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-st-accent cursor-pointer"
                  >
                    <option value="todos">Todos los meses</option>
                    {(() => {
                      const isCurrentYear = selectedYear === new Date().getFullYear().toString();
                      const maxMonth = isCurrentYear ? new Date().getMonth() + 1 : 12;
                      const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
                      
                      return monthNames.slice(0, maxMonth).map((name, index) => {
                        const mStr = (index + 1).toString().padStart(2, '0');
                        return (
                          <option key={mStr} value={mStr}>{name}</option>
                        );
                      }).reverse(); // Most recent first as per standard UX for months, or standard calendar order? User said: "Todos los meses, Sep, Ago, Jul... Ene"
                    })()}
                  </select>
                </div>

                {/* SELECTOR DE PERÍODO MENSUAL (Modo Rodante) */}
                <div className="flex items-center bg-st-bg p-1 rounded-xl border border-st-border">
                  <button
                    onClick={() => {
                      if (periodoMeses === 6) {
                         setPeriodoMeses(0); // Toggle off back to calendar mode
                      } else {
                         setPeriodoMeses(6);
                      }
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      periodoMeses === 6
                        ? 'bg-st-accent text-black shadow-sm'
                        : 'text-st-muted hover:text-white'
                    }`}
                  >
                    Últimos 6 meses
                  </button>
                  <button
                    onClick={() => {
                      if (periodoMeses === 12) {
                         setPeriodoMeses(0); // Toggle off back to calendar mode
                      } else {
                         setPeriodoMeses(12);
                      }
                    }}
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
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3.5">
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

      {/* BLOQUE 2 - TELEMETRÍA EN TIEMPO REAL / OPERATIVA */}
      {modo === 'operativo' ? (
        <div className="bg-st-surface border border-st-border rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-st-accent" />
                {['15min', '30min', '1h'].includes(rangoTiempo) ? 'Telemetría en Tiempo Real' : 'Telemetría Operativa'} ({rangoTiempo})
              </h2>
              <p className="text-[11px] text-st-muted font-sans mt-0.5">Monitoreo de red y enlaces satelitales.</p>
            </div>
          </div>

          {/* 8 KPIs operativos calculados de chartData o summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
            {[
              { label: 'Terminales Online', value: chartMeta?.kpis?.online ?? summary?.terminales_online ?? 0, color: 'text-[#00E5FF]' },
              { label: 'Terminales Offline', value: chartMeta?.kpis?.offline ?? summary?.terminales_offline ?? 0, color: 'text-red-400' },
              { label: 'Degradados', value: chartMeta?.kpis?.degraded ?? summary?.degradados ?? 0, color: 'text-orange-400' },
              { label: 'Latencia Prom', value: (chartMeta?.kpis?.latencyAvgMs ?? (chartData.length ? Math.round(chartData.reduce((acc, c) => acc + (c.latency_ms || 0), 0) / chartData.length) : 0)) + ' ms', color: 'text-[#F59E0B]' },
              { label: 'Packet Loss', value: (chartMeta?.kpis?.packetLossPct ?? (chartData.length ? (chartData.reduce((acc, c) => acc + (c.packet_loss_pct || 0), 0) / chartData.length) : 0)).toFixed(2) + '%', color: 'text-[#EF4444]' },
              { label: 'Obstrucción', value: (chartMeta?.kpis?.obstructionPct ?? (chartData.length ? (chartData.reduce((acc, c) => acc + (c.obstruction_pct || 0), 0) / chartData.length) : 0)).toFixed(2) + '%', color: 'text-[#A855F7]' },
              { label: 'Disponibilidad', value: (chartMeta?.kpis?.availabilityPct ?? 99.9) + '%', color: 'text-[#10B981]' },
              { label: 'Alertas Activas', value: chartMeta?.kpis?.activeAlerts ?? criticalAlerts?.length ?? 0, color: 'text-rose-400' }
            ].map((k, i) => (
              <div key={i} className="bg-black/30 p-2.5 rounded-lg border border-white/5 flex flex-col justify-between">
                <span className="text-[10px] text-st-muted uppercase">{k.label}</span>
                <span className={`text-lg font-bold ${k.color}`}>{k.value === null ? 'N/A' : k.value}</span>
              </div>
            ))}
          </div>
          
          {chartData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-st-muted text-sm font-semibold italic border border-st-border rounded-lg bg-black/10">
              Sin datos de telemetría en el rango seleccionado
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[300px]">
              {/* Gráfico de Tráfico */}
              <div className="flex flex-col bg-black/10 rounded-lg p-3 border border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-white">Tráfico (Downlink / Uplink)</span>
                  <div className="flex gap-3">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={activeSeries.downlink} onChange={() => setActiveSeries(p => ({ ...p, downlink: !p.downlink }))} className="accent-[#00E5FF]" />
                      <span className="text-st-muted text-[10px]">Downlink</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={activeSeries.uplink} onChange={() => setActiveSeries(p => ({ ...p, uplink: !p.uplink }))} className="accent-[#3B82F6]" />
                      <span className="text-st-muted text-[10px]">Uplink</span>
                    </label>
                  </div>
                </div>
                <div className="flex-1 min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorDown" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00E5FF" stopOpacity={0.4}/><stop offset="95%" stopColor="#00E5FF" stopOpacity={0.0}/></linearGradient>
                        <linearGradient id="colorUp" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4}/><stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0}/></linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                      <XAxis dataKey="timestamp" stroke="#444" tick={{ fill: '#ffffff', fontSize: 10, fontWeight: 'bold' }} tickFormatter={(val: string) => formatTimeLabel(val, rangoTiempo)} interval={0} />
                      <YAxis stroke="#444" tick={{ fill: '#ffffff', fontSize: 10 }} width={35} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: '8px' }} 
                        itemStyle={{ color: '#fff' }} 
                        labelFormatter={(label) => formatTimeLabel(label, rangoTiempo)} 
                        formatter={(val: any, name: string) => {
                          const n = Number(val);
                          if (isNaN(n)) return [val, name];
                          return [`${n.toFixed(2)} Mbps`, name];
                        }}
                      />
                      {activeSeries.downlink && <Area type="monotone" dataKey="downlink_mbps" name="Downlink" stroke="#00E5FF" fillOpacity={1} fill="url(#colorDown)" strokeWidth={2} />}
                      {activeSeries.uplink && <Area type="monotone" dataKey="uplink_mbps" name="Uplink" stroke="#3B82F6" fillOpacity={1} fill="url(#colorUp)" strokeWidth={2} />}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Gráfico de Calidad */}
              <div className="flex flex-col bg-black/10 rounded-lg p-3 border border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-white">Calidad (Latencia / Drop / Obstrucción)</span>
                  <div className="flex gap-3">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={activeSeries.latency} onChange={() => setActiveSeries(p => ({ ...p, latency: !p.latency }))} className="accent-[#F59E0B]" />
                      <span className="text-st-muted text-[10px]">Latencia</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={activeSeries.packetLoss} onChange={() => setActiveSeries(p => ({ ...p, packetLoss: !p.packetLoss }))} className="accent-[#EF4444]" />
                      <span className="text-st-muted text-[10px]">Drop</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={activeSeries.obstruction} onChange={() => setActiveSeries(p => ({ ...p, obstruction: !p.obstruction }))} className="accent-[#A855F7]" />
                      <span className="text-st-muted text-[10px]">Obs</span>
                    </label>
                  </div>
                </div>
                <div className="flex-1 min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorLat" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#F59E0B" stopOpacity={0.4}/><stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0}/></linearGradient>
                        <linearGradient id="colorDrop" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#EF4444" stopOpacity={0.4}/><stop offset="95%" stopColor="#EF4444" stopOpacity={0.0}/></linearGradient>
                        <linearGradient id="colorObs" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#A855F7" stopOpacity={0.4}/><stop offset="95%" stopColor="#A855F7" stopOpacity={0.0}/></linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                      <XAxis dataKey="timestamp" stroke="#444" tick={{ fill: '#ffffff', fontSize: 10, fontWeight: 'bold' }} tickFormatter={(val: string) => formatTimeLabel(val, rangoTiempo)} interval={0} />
                      <YAxis stroke="#444" tick={{ fill: '#ffffff', fontSize: 10 }} width={35} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: '8px' }} 
                        itemStyle={{ color: '#fff' }} 
                        labelFormatter={(label) => formatTimeLabel(label, rangoTiempo)} 
                        formatter={(val: any, name: string) => {
                          const n = Number(val);
                          if (isNaN(n)) return [val, name];
                          if (name === 'Latencia') return [`${n.toFixed(2)} ms`, name];
                          if (name === 'Drop' || name === 'Obstrucción') return [`${n.toFixed(2)}%`, name];
                          return [n.toFixed(2), name];
                        }}
                      />
                      {activeSeries.latency && <Area type="monotone" dataKey="latency_ms" name="Latencia" stroke="#F59E0B" fillOpacity={1} fill="url(#colorLat)" strokeWidth={2} />}
                      {activeSeries.packetLoss && <Area type="monotone" dataKey="packet_loss_pct" name="Drop" stroke="#EF4444" fillOpacity={1} fill="url(#colorDrop)" strokeWidth={2} />}
                      {activeSeries.obstruction && <Area type="monotone" dataKey="obstruction_pct" name="Obstrucción" stroke="#A855F7" fillOpacity={1} fill="url(#colorObs)" strokeWidth={2} />}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
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
                    <stop offset="5%" stopColor="#ffffff" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#ffffff" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                <XAxis dataKey="periodo" stroke="#444" tick={{ fill: '#ffffff', fontWeight: 'bold', fontSize: 11 }} fontSize={11} tickMargin={10} tickFormatter={formatPeriodLabel} interval={0} />
                <YAxis yAxisId="left" stroke="#444" tick={{ fill: '#ffffff', fontWeight: 'bold', fontSize: 11 }} fontSize={11} />
                <YAxis yAxisId="right" orientation="right" stroke="#444" tick={{ fill: '#ffffff', fontWeight: 'bold', fontSize: 11 }} fontSize={11} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                  labelFormatter={(label) => {
                    const formatted = formatPeriodLabel(label);
                    return formatted !== label ? `${formatted} (${label})` : label;
                  }}
                />
                <Area yAxisId="left" type="monotone" dataKey="clientes_activos" name="Clientes" stroke="#00E5FF" fillOpacity={1} fill="url(#colorClients)" strokeWidth={2} />
                <Area yAxisId="right" type="monotone" dataKey="starlinks_con_actividad" name="Starlinks" stroke="#ffffff" fillOpacity={1} fill="url(#colorStars)" strokeWidth={2} />
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
                <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                <XAxis dataKey="periodo" stroke="#444" tick={{ fill: '#ffffff', fontWeight: 'bold', fontSize: 11 }} fontSize={11} tickMargin={10} tickFormatter={formatPeriodLabel} interval={0} />
                <YAxis domain={[(dataMin: number) => Math.max(0, Math.floor(dataMin - 5)), 100]} stroke="#444" tick={{ fill: '#ffffff', fontWeight: 'bold', fontSize: 11 }} fontSize={11} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: '8px' }}
                  labelFormatter={(label) => {
                    const formatted = formatPeriodLabel(label);
                    return formatted !== label ? `${formatted} (${label})` : label;
                  }}
                />
                <Line connectNulls={false} type="monotone" dataKey="calidad_global_score" name="Quality Score" stroke="#00E5FF" strokeWidth={3} dot={{r: 4, fill: '#00E5FF'}} />
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
                <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                <XAxis dataKey="periodo" stroke="#444" tick={{ fill: '#ffffff', fontWeight: 'bold', fontSize: 11 }} fontSize={11} tickMargin={10} tickFormatter={formatPeriodLabel} />
                <YAxis stroke="#444" tick={{ fill: '#ffffff', fontWeight: 'bold', fontSize: 11 }} fontSize={11} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: '8px' }}
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

export default ResellerDashboard;
