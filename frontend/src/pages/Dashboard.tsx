import React, { useState, useEffect } from 'react';
import {
  Satellite,
  AlertTriangle,
  Activity,
  Database,
  Search,
  SlidersHorizontal,
  ChevronRight,
  ChevronLeft,
  Navigation
} from 'lucide-react';
import ResellerDashboard from './ResellerDashboard';
import {
  ResponsiveContainer,
  AreaChart, Area,
  BarChart, Bar,
  LineChart, Line,
  XAxis, YAxis,
  CartesianGrid, Tooltip
} from 'recharts';
import client from '../api/client';
import { AccountSearchSelect } from '../components/AccountSearchSelect';
import { DashboardFilterBar, DashboardFilterState } from '../components/ui/DashboardFilterBar';

interface KPIState {
  active_terminals: number;
  total_terminals: number;
  critical_alerts: number;
  avg_latency_ms: number;
  total_data_usage_gb: number;
}

interface DeviceItem {
  id: number;
  device_id: string;
  nombre: string;
  kit_starlink: string;
  estado: string;
  latitud: number;
  longitud: number;
  cuenta_nombre: string;
  numero_linea: string;
  plan_contratado: string;
}

const Dashboard: React.FC = () => {
  // Stats states
  const [kpis, setKpis] = useState<KPIState>({
    active_terminals: 0,
    total_terminals: 0,
    critical_alerts: 0,
    avg_latency_ms: 0.0,
    total_data_usage_gb: 0.0
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [geoPoints, setGeoPoints] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);

  // Filter states
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedPlanType, setSelectedPlanType] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterState, setFilterState] = useState<DashboardFilterState>({
    modo: 'historico',
    year: '2026',
    month: '9',
    rango: '12m',
    incluyeMesEnCurso: true,
    tiempoRealWindow: '30d'
  });

  const handleFilterChange = (newFilters: DashboardFilterState) => {
    setFilterState(newFilters);
  };
  
  // Table paging
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Chart config states
  const [chartType, setChartType] = useState<'area' | 'bar' | 'line'>('area');
  const [activeSeries, setActiveSeries] = useState({
    downlink: true,
    uplink: true,
    latency: true
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const kpiParams: any = { modo: filterState.modo };
      if (selectedAccount) kpiParams.cuenta_id = selectedAccount;
      if (filterState.modo === 'historico') {
        if (filterState.year !== 'ALL') kpiParams.year = filterState.year;
        if (filterState.month !== 'ALL') kpiParams.month = filterState.month;
        kpiParams.rango = filterState.rango;
      } else {
        kpiParams.window = filterState.tiempoRealWindow;
        kpiParams.rango_tiempo = filterState.tiempoRealWindow;
      }

      // 1. Fetch KPIs
      const kpisRes = await client.get('/dashboard/kpis', { params: kpiParams });
      setKpis(kpisRes.data);

      // 2. Fetch Chart Telemetry Trend
      const chartRes = await client.get('/dashboard/chart', { params: kpiParams });
      setChartData(chartRes.data);

      // 3. Fetch Accounts for dropdown
      const accountsRes = await client.get('/cuentas');
      setAccounts(accountsRes.data);

      // 4. Fetch Geolocations
      const geoRes = await client.get('/dashboard/geolocations');
      setGeoPoints(geoRes.data);

      // 5. Fetch Service Lines to rebuild terminal details table
      const linesRes = await client.get('/lineas-servicio');
      const devsRes = await client.get('/dispositivos');

      // Rebuild combined terminal structures
      const compiledDevices: DeviceItem[] = devsRes.data.map((d: any) => {
        const line = linesRes.data.find((l: any) => l.dispositivo_id === d.id);
        const geo = geoRes.data.find((g: any) => g.dispositivo_id === d.id);
        return {
          id: d.id,
          device_id: d.device_id,
          nombre: d.nombre || 'Terminal Satelital',
          kit_starlink: d.kit_starlink || 'Standard Rectangular',
          estado: geo?.estado || 'Online',
          latitud: geo?.latitud || -33.4489,
          longitud: geo?.longitud || -70.6693,
          cuenta_nombre: line?.cuenta?.nombre || 'Sin cuenta asociada',
          numero_linea: line?.numero_linea || 'N/A',
          plan_contratado: line?.plan_contratado || 'N/A'
        };
      });

      setDevices(compiledDevices);
    } catch (err) {
      console.error("Error fetching dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedAccount, filterState]);

  // Apply frontend filters
  const filteredDevices = devices.filter(d => {
    const matchesSearch = 
      d.nombre.toLowerCase().includes(searchQuery.toLowerCase()) || 
      d.device_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.numero_linea.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesStatus = 
      selectedStatus === '' || 
      (selectedStatus === 'Online' && d.estado === 'Online') || 
      (selectedStatus === 'Offline' && d.estado === 'Offline');

    const matchesPlanType =
      selectedPlanType === '' ||
      (selectedPlanType === 'Mobile' && d.plan_contratado.toLowerCase().includes('mobile')) ||
      (selectedPlanType === 'Fixed' && !d.plan_contratado.toLowerCase().includes('mobile'));

    return matchesSearch && matchesStatus && matchesPlanType;
  });

  // Pagination bounds
  const totalPages = Math.ceil(filteredDevices.length / itemsPerPage);
  const pagedDevices = filteredDevices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const isGlobal = window.location.pathname === '/reseller/dashboard';

  if (isGlobal) {
    return <ResellerDashboard />;
  }

  return (
    <div className="space-y-6">
      {/* Title & Actions Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-st-primary font-sans leading-tight">Dashboard Analítico</h1>
          <p className="text-[14px] font-medium text-client-text-muted mt-0.5">Visualización consolidada de telemetría, alertas y consumo.</p>
        </div>
      </div>

      {/* Primary Dashboard Filter Bar */}
      <DashboardFilterBar
        initialState={filterState}
        onFilterChange={handleFilterChange}
        onRefresh={fetchData}
        loading={loading}
      />

      {/* Filters Row */}
      <div className="bg-st-surface border border-st-border rounded-[14px] p-3 flex flex-wrap gap-4 items-center shadow-sm">
        <div className="flex items-center gap-2 px-2 text-client-text-muted text-xs font-bold uppercase tracking-wider">
          <SlidersHorizontal className="w-4 h-4 text-client-primary" />
          <span>Filtros Rápidos</span>
        </div>

        <div className="h-6 w-px bg-st-border hidden md:block"></div>

        {/* Account Filter with Search */}
        <div className="min-w-[200px]">
          <AccountSearchSelect
            accounts={accounts}
            selectedAccount={selectedAccount}
            onSelectAccount={(accId) => {
              setSelectedAccount(accId);
              setCurrentPage(1);
            }}
          />
        </div>

        {/* Status Filter */}
        <select
          value={selectedStatus}
          onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
          className="h-10 bg-st-bg border border-st-border text-st-primary text-sm font-medium rounded-[10px] px-3 focus:outline-none focus:ring-2 focus:ring-client-primary/20 focus:border-client-primary transition-all cursor-pointer"
        >
          <option value="">TODOS LOS ESTADOS</option>
          <option value="Online">ONLINE</option>
          <option value="Offline">OFFLINE</option>
        </select>

        {/* Subscription Plan Type Filter */}
        <select
          value={selectedPlanType}
          onChange={(e) => { setSelectedPlanType(e.target.value); setCurrentPage(1); }}
          className="h-10 bg-st-bg border border-st-border text-st-primary text-sm font-medium rounded-[10px] px-3 focus:outline-none focus:ring-2 focus:ring-client-primary/20 focus:border-client-primary transition-all cursor-pointer"
        >
          <option value="">TODAS LAS SUSCRIPCIONES</option>
          <option value="Fixed">PLANES FIJOS</option>
          <option value="Mobile">PLANES MÓVILES</option>
        </select>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Active Terminals */}
        <div className="bg-st-surface border border-st-border rounded-[16px] p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group min-h-[140px]">
          <div className="flex items-start justify-between w-full z-10">
            <div className="w-10 h-10 rounded-lg bg-client-primary-soft text-client-primary flex items-center justify-center flex-shrink-0">
              <Satellite className="w-5 h-5" />
            </div>
            <p className="text-[10px] px-2 py-0.5 bg-st-bg text-st-muted rounded-md font-bold uppercase tracking-wider">
              12 MESES
            </p>
          </div>
          <div className="space-y-0.5 z-10 mt-4">
            <p className="text-[13px] font-bold text-st-muted tracking-wide">Servicios Activos</p>
            <p className="text-[32px] font-bold text-st-primary font-sans leading-none">
              {kpis.active_terminals} <span className="text-sm font-semibold text-st-muted">/ {kpis.total_terminals}</span>
            </p>
          </div>
        </div>

        {/* Active Alerts */}
        <div className="bg-st-surface border border-st-border rounded-[16px] p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group min-h-[140px]">
          <div className="flex items-start justify-between w-full z-10">
            <div className="w-10 h-10 rounded-lg bg-client-warning-soft text-client-warning flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <p className="text-[10px] px-2 py-0.5 bg-st-bg text-st-muted rounded-md font-bold uppercase tracking-wider">
              CRÍTICAS AHORA
            </p>
          </div>
          <div className="space-y-0.5 z-10 mt-4">
            <p className="text-[13px] font-bold text-st-muted tracking-wide">Alertas Críticas</p>
            <p className="text-[32px] font-bold text-st-primary font-sans leading-none">{kpis.critical_alerts}</p>
          </div>
        </div>

        {/* Avg Latency */}
        {!isGlobal && (
          <div className="bg-st-surface border border-st-border rounded-[16px] p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group min-h-[140px]">
            <div className="flex items-start justify-between w-full z-10">
              <div className="w-10 h-10 rounded-lg bg-client-accent-soft text-client-accent flex items-center justify-center flex-shrink-0">
                <Activity className="w-5 h-5" />
              </div>
              <p className="text-[10px] px-2 py-0.5 bg-st-bg text-st-muted rounded-md font-bold uppercase tracking-wider">
                ESTADO RED
              </p>
            </div>
            <div className="space-y-0.5 z-10 mt-4">
              <p className="text-[13px] font-bold text-st-muted tracking-wide">Latencia Promedio</p>
              <p className="text-[32px] font-bold text-st-primary font-sans leading-none">{kpis.avg_latency_ms} <span className="text-sm font-semibold text-st-muted">ms</span></p>
            </div>
          </div>
        )}

        {/* Data Consumption */}
        <div className={`bg-st-surface border border-st-border rounded-[16px] p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group min-h-[140px] ${isGlobal ? 'md:col-span-2' : ''}`}>
          <div className="flex items-start justify-between w-full z-10">
            <div className="w-10 h-10 rounded-lg bg-client-info-soft text-client-info flex items-center justify-center flex-shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <p className="text-[10px] px-2 py-0.5 bg-st-bg text-st-muted rounded-md font-bold uppercase tracking-wider">
              MES ACTUAL
            </p>
          </div>
          <div className="space-y-0.5 z-10 mt-4">
            <p className="text-[13px] font-bold text-st-muted tracking-wide">Consumo Total</p>
            <p className="text-[32px] font-bold text-st-primary font-sans leading-none">{kpis.total_data_usage_gb} <span className="text-sm font-semibold text-st-muted">GB</span></p>
          </div>
        </div>
      </div>

      {/* Main Charts & Radar Grid */}
      {!isGlobal && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Historical Telemetry Chart */}
        <div className="lg:col-span-2 bg-st-surface border border-st-border rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-st-primary leading-tight">
                {filterState.modo === 'tiempo_real'
                  ? `Tendencia de Telemetría Operativa (${filterState.tiempoRealWindow})`
                  : `Tendencia de Telemetría Histórica (${filterState.year === 'ALL' ? 'Total' : `${filterState.month}/${filterState.year}`})`}
              </h2>
              <p className="text-[11px] text-st-muted">Consolidación de velocidad de transmisión y latencias de conexión.</p>
            </div>
            
            {/* Chart Type Toggles */}
            <div className="flex bg-st-bg p-1 rounded-lg border border-st-border self-start">
              <button
                onClick={() => setChartType('area')}
                className={`px-3 py-1 text-xs font-bold uppercase rounded-md cursor-pointer transition-colors ${chartType === 'area' ? 'bg-st-surface text-st-accent font-bold' : 'text-st-muted hover:text-st-primary'}`}
              >
                Área
              </button>
              <button
                onClick={() => setChartType('bar')}
                className={`px-3 py-1 text-xs font-bold uppercase rounded-md cursor-pointer transition-colors ${chartType === 'bar' ? 'bg-st-surface text-st-accent font-bold' : 'text-st-muted hover:text-st-primary'}`}
              >
                Barras
              </button>
              <button
                onClick={() => setChartType('line')}
                className={`px-3 py-1 text-xs font-bold uppercase rounded-md cursor-pointer transition-colors ${chartType === 'line' ? 'bg-st-surface text-st-accent font-bold' : 'text-st-muted hover:text-st-primary'}`}
              >
                Líneas
              </button>
            </div>
          </div>

          {/* Series Toggle Legends */}
          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold select-none">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={activeSeries.downlink}
                onChange={() => setActiveSeries(p => ({ ...p, downlink: !p.downlink }))}
                className="accent-[#0F766E]"
              />
              <span className="w-2.5 h-2.5 rounded-full bg-[#0F766E] block" />
              <span className={activeSeries.downlink ? 'text-st-primary' : 'text-st-muted'}>Downlink (Mbps)</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={activeSeries.uplink}
                onChange={() => setActiveSeries(p => ({ ...p, uplink: !p.uplink }))}
                className="accent-[#2563EB]"
              />
              <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB] block" />
              <span className={activeSeries.uplink ? 'text-st-primary' : 'text-st-muted'}>Uplink (Mbps)</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={activeSeries.latency}
                onChange={() => setActiveSeries(p => ({ ...p, latency: !p.latency }))}
                className="accent-[#F59E0B]"
              />
              <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B] block" />
              <span className={activeSeries.latency ? 'text-st-primary' : 'text-st-muted'}>Latencia (ms)</span>
            </label>
          </div>

          {/* Recharts Container */}
          <div className="h-80 w-full rounded-[16px] p-3">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-st-muted text-sm font-semibold">
                Sin registros en el rango seleccionado
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'area' ? (
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="timestamp" stroke="var(--color-text-muted)" fontSize={10} axisLine={false} tickLine={false} />
                    <YAxis stroke="var(--color-text-muted)" fontSize={10} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--color-bg-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)' }} />
                    {activeSeries.downlink && (
                      <Area type="monotone" dataKey="downlink_mbps" stroke="#0F766E" fill="#0F766E" fillOpacity={0.15} strokeWidth={2.5} />
                    )}
                    {activeSeries.uplink && (
                      <Area type="monotone" dataKey="uplink_mbps" stroke="#2563EB" fill="#2563EB" fillOpacity={0.15} strokeWidth={2.5} />
                    )}
                    {activeSeries.latency && (
                      <Area type="monotone" dataKey="latency_ms" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.15} strokeWidth={2.5} />
                    )}
                  </AreaChart>
                ) : chartType === 'bar' ? (
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="timestamp" stroke="var(--color-text-muted)" fontSize={10} axisLine={false} tickLine={false} />
                    <YAxis stroke="var(--color-text-muted)" fontSize={10} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--color-bg-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)' }} />
                    {activeSeries.downlink && <Bar dataKey="downlink_mbps" fill="#0F766E" radius={[4, 4, 0, 0]} />}
                    {activeSeries.uplink && <Bar dataKey="uplink_mbps" fill="#2563EB" radius={[4, 4, 0, 0]} />}
                    {activeSeries.latency && <Bar dataKey="latency_ms" fill="#F59E0B" radius={[4, 4, 0, 0]} />}
                  </BarChart>
                ) : (
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="timestamp" stroke="var(--color-text-muted)" fontSize={10} axisLine={false} tickLine={false} />
                    <YAxis stroke="var(--color-text-muted)" fontSize={10} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--color-bg-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)' }} />
                    {activeSeries.downlink && <Line connectNulls={false} type="monotone" dataKey="downlink_mbps" stroke="#0F766E" strokeWidth={2.5} dot={{ r: 2 }} />}
                    {activeSeries.uplink && <Line connectNulls={false} type="monotone" dataKey="uplink_mbps" stroke="#2563EB" strokeWidth={2.5} dot={{ r: 2 }} />}
                    {activeSeries.latency && <Line connectNulls={false} type="monotone" dataKey="latency_ms" stroke="#F59E0B" strokeWidth={2.5} dot={{ r: 2 }} />}
                  </LineChart>
                )}
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Satellite Map/Radar Preview */}
        <div className="bg-st-surface border border-st-border rounded-xl p-5 flex flex-col space-y-4">
          <div>
            <h2 className="text-base font-bold text-st-primary leading-tight">Radar de Geolocalización</h2>
            <p className="text-[11px] text-st-muted font-sans">Ubicación satelital y estado actual de terminales.</p>
          </div>

          {/* Radar Screen Visualizer */}
          <div className="flex-1 min-h-[250px] relative bg-st-bg border border-st-border/80 rounded-xl overflow-hidden flex items-center justify-center">
            {/* Grid background lines */}
            <div className="absolute inset-0 bg-[radial-gradient(#111111_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
            <div className="absolute w-[200px] h-[200px] border border-st-border/30 rounded-full animate-[spin_20s_linear_infinite]" />
            <div className="absolute w-[100px] h-[100px] border border-st-border/20 rounded-full" />
            <div className="absolute h-full w-px bg-st-border/25" />
            <div className="absolute w-full h-px bg-st-border/25" />

            {/* Simulated sweep line */}
            <div className="absolute w-1/2 h-1/2 origin-bottom-right right-1/2 bottom-1/2 bg-gradient-to-tr from-transparent to-st-accent/10 border-r border-st-accent/25 animate-[spin_6s_linear_infinite] pointer-events-none" />

            {/* Terminal Plots */}
            {geoPoints.map((pt, index) => {
              // Convert coordinates to simulated X/Y positions on screen
              // Scale lat/lng values Chile/Peru range (-15 to -45) to container %
              const pctX = ((pt.longitud + 80) / 20) * 100;
              const pctY = ((pt.latitud + 45) / 30) * 100;
              
              const constrainedX = Math.max(10, Math.min(90, pctX));
              const constrainedY = Math.max(10, Math.min(90, pctY));

              return (
                <div
                  key={`pt-${index}`}
                  className="absolute group cursor-pointer"
                  style={{ left: `${constrainedX}%`, top: `${constrainedY}%` }}
                >
                  <span className="relative flex h-3 w-3">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 ${pt.estado === 'Online' ? 'bg-client-success' : 'bg-client-danger'}`} />
                    <span className={`relative inline-flex rounded-full h-3 w-3 border border-st-primary/20 ${pt.estado === 'Online' ? 'bg-client-success' : 'bg-client-danger'}`} />
                  </span>
                  
                  {/* Tooltip on hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-5 left-1/2 -translate-x-1/2 w-36 bg-st-surface border border-st-border rounded p-2 text-[9px] shadow-2xl z-10 pointer-events-none">
                    <p className="font-bold text-st-primary truncate">{pt.nombre}</p>
                    <p className="text-st-muted font-mono">{pt.device_id}</p>
                    <p className="text-st-muted">Lat: {pt.latitud.toFixed(4)}</p>
                    <p className="text-st-muted">Lon: {pt.longitud.toFixed(4)}</p>
                    <p className={`font-semibold ${pt.estado === 'Online' ? 'text-client-success' : 'text-client-danger'}`}>{pt.estado}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-between text-[10px] text-st-muted border-t border-st-border/50 pt-3">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-client-success block" /> Online</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-client-danger block" /> Offline</span>
            <span className="flex items-center gap-1 font-mono uppercase"><Navigation className="w-3 h-3 text-client-accent animate-pulse" /> Radar Activo</span>
          </div>
        </div>
      </div>
      )}

      {/* Dense Data Grid (Table) */}
      {!isGlobal && (
        <div className="bg-st-surface border border-st-border rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-st-primary leading-tight">Terminales de la Flota</h2>
            <p className="text-[11px] text-st-muted font-sans">Administración de dispositivos activos y su telemetría asociada.</p>
          </div>

          {/* Search bar */}
          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 text-st-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por ID, nombre o línea..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-4 py-2 bg-st-bg border border-st-border rounded-lg text-sm text-st-primary placeholder-st-muted/50 focus:outline-none focus:ring-1 focus:ring-st-accent focus:border-st-accent"
            />
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-st-border bg-client-bg-subtle text-[10px] font-bold text-client-text-secondary uppercase tracking-wider">
                <th className="py-3 px-4">Dispositivo ID</th>
                <th className="py-3 px-4">Nombre</th>
                <th className="py-3 px-4">Línea de Servicio</th>
                <th className="py-3 px-4">Cuenta</th>
                <th className="py-3 px-4">Plan / Suscripción</th>
                <th className="py-3 px-4">Kit Starlink</th>
                <th className="py-3 px-4 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-st-border/30 text-sm bg-st-surface">
              {pagedDevices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-st-muted text-sm">
                    No se encontraron terminales con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                pagedDevices.map(d => (
                  <tr key={d.id} className="hover:bg-client-bg-soft transition-colors group">
                    <td className="py-3 px-4 font-mono font-bold text-client-accent select-all">{d.device_id}</td>
                    <td className="py-3 px-4 font-semibold text-st-primary">{d.nombre}</td>
                    <td className="py-3 px-4 font-mono text-st-muted">{d.numero_linea}</td>
                    <td className="py-3 px-4 text-st-muted max-w-[150px] truncate">{d.cuenta_nombre}</td>
                    <td className="py-3 px-4 text-xs font-semibold text-st-primary">{d.plan_contratado}</td>
                    <td className="py-3 px-4 text-xs text-st-muted">{d.kit_starlink}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className={`px-2 py-1 rounded-[6px] text-xs font-bold uppercase tracking-wide flex items-center gap-1.5 ${d.estado === 'Online' ? 'bg-client-success-soft text-client-success' : 'bg-client-danger-soft text-client-danger'}`}>
                           <span className={`w-1.5 h-1.5 rounded-full ${d.estado === 'Online' ? 'bg-client-success animate-pulse' : 'bg-client-danger'}`} />
                           {d.estado}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-st-border pt-4 text-xs text-st-muted select-none">
            <span>Mostrando página <b>{currentPage}</b> de <b>{totalPages}</b> (Total: <b>{filteredDevices.length}</b>)</span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-st-border bg-st-bg hover:text-st-primary disabled:opacity-30 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-st-border bg-st-bg hover:text-st-primary disabled:opacity-30 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    )}
  </div>
);
};

export default Dashboard;
