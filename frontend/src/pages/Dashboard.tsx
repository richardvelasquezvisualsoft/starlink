import React, { useState, useEffect } from 'react';
import {
  Satellite,
  AlertTriangle,
  Activity,
  Database,
  Search,
  RefreshCw,
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
  const [accounts, setAccounts] = useState<any[]>([]);

  // Filter states
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedPlanType, setSelectedPlanType] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
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
    try {
      // 1. Fetch KPIs
      const kpiParams: any = {};
      if (selectedAccount) kpiParams.cuenta_id = selectedAccount;
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
    } catch (err) {}
  };

  useEffect(() => {
    fetchData();
  }, [selectedAccount]);

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
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans">Dashboard Analítico</h1>
          <p className="text-xs text-st-muted mt-0.5">Visualización consolidada de telemetría, alertas y consumo.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-3 py-2 bg-st-surface border border-st-border rounded-lg text-sm text-st-muted hover:text-white hover:border-white/20 transition-all active:scale-[0.98] cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refrescar</span>
          </button>
        </div>
      </div>

      {/* Filters Row */}
      <div className="bg-st-surface border border-st-border rounded-xl p-4 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2 text-st-muted text-xs font-bold uppercase tracking-wider">
          <SlidersHorizontal className="w-4 h-4 text-st-accent" />
          <span>Filtros Rápidos</span>
        </div>

        {/* Account Filter with Search */}
        <AccountSearchSelect
          accounts={accounts}
          selectedAccount={selectedAccount}
          onSelectAccount={(accId) => {
            setSelectedAccount(accId);
            setCurrentPage(1);
          }}
        />

        {/* Status Filter */}
        <select
          value={selectedStatus}
          onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
          className="bg-st-bg border border-st-border text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-st-accent focus:border-st-accent"
        >
          <option value="">TODOS LOS ESTADOS</option>
          <option value="Online">ONLINE</option>
          <option value="Offline">OFFLINE</option>
        </select>

        {/* Subscription Plan Type Filter */}
        <select
          value={selectedPlanType}
          onChange={(e) => { setSelectedPlanType(e.target.value); setCurrentPage(1); }}
          className="bg-st-bg border border-st-border text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-st-accent focus:border-st-accent"
        >
          <option value="">TODAS LAS SUSCRIPCIONES</option>
          <option value="Fixed">PLANES FIJOS</option>
          <option value="Mobile">PLANES MÓVILES</option>
        </select>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Active Terminals */}
        <div className="bg-st-surface border border-st-border rounded-xl p-5 flex items-center justify-between shadow-lg relative overflow-hidden group">
          <div className="space-y-1 z-10">
            <p className="text-[10px] font-bold text-st-muted uppercase tracking-wider">Terminales Activas</p>
            <p className="text-3xl font-bold text-white font-sans">
              {kpis.active_terminals} <span className="text-sm font-semibold text-st-muted">/ {kpis.total_terminals}</span>
            </p>
            <p className="text-[9px] px-2 py-0.5 bg-st-online/10 text-st-online border border-st-online/20 rounded inline-block font-semibold">
              ACUMULADO ÚLTIMOS 12 MESES
            </p>
          </div>
          <div className="w-12 h-12 rounded-lg bg-st-online/10 text-st-online flex items-center justify-center flex-shrink-0">
            <Satellite className="w-6 h-6" />
          </div>
          <div className="absolute -bottom-2 -right-2 w-16 h-16 bg-st-online/5 rounded-full blur-xl group-hover:scale-125 transition-transform" />
        </div>

        {/* Active Alerts */}
        <div className="bg-st-surface border border-st-border rounded-xl p-5 flex items-center justify-between shadow-lg relative overflow-hidden group">
          <div className="space-y-1 z-10">
            <p className="text-[10px] font-bold text-st-muted uppercase tracking-wider">Alertas Activas</p>
            <p className="text-3xl font-bold text-white font-sans">{kpis.critical_alerts}</p>
            <p className="text-[9px] px-2 py-0.5 bg-st-offline/10 text-st-offline border border-st-offline/20 rounded inline-block font-semibold">
              FALLAS CRÍTICAS AHORA
            </p>
          </div>
          <div className="w-12 h-12 rounded-lg bg-st-offline/10 text-st-offline flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-6 h-6 animate-bounce" />
          </div>
          <div className="absolute -bottom-2 -right-2 w-16 h-16 bg-st-offline/5 rounded-full blur-xl group-hover:scale-125 transition-transform" />
        </div>

        {/* Avg Latency (Only Contextual) */}
        {!isGlobal && (
          <div className="bg-st-surface border border-st-border rounded-xl p-5 flex items-center justify-between shadow-lg relative overflow-hidden group">
            <div className="space-y-1 z-10">
              <p className="text-[10px] font-bold text-st-muted uppercase tracking-wider">Latencia Promedio</p>
              <p className="text-3xl font-bold text-white font-sans">{kpis.avg_latency_ms} <span className="text-xs font-semibold text-st-muted">ms</span></p>
              <p className="text-[9px] px-2 py-0.5 bg-st-accent/10 text-st-accent border border-st-accent/20 rounded inline-block font-semibold">
                ESTADO DE RED GLOBAL
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-st-accent/10 text-st-accent flex items-center justify-center flex-shrink-0">
              <Activity className="w-6 h-6 animate-pulse" />
            </div>
            <div className="absolute -bottom-2 -right-2 w-16 h-16 bg-st-accent/5 rounded-full blur-xl group-hover:scale-125 transition-transform" />
          </div>
        )}

        {/* Data Consumption */}
        <div className={`bg-st-surface border border-st-border rounded-xl p-5 flex items-center justify-between shadow-lg relative overflow-hidden group ${isGlobal ? 'md:col-span-2' : ''}`}>
          <div className="space-y-1 z-10">
            <p className="text-[10px] font-bold text-st-muted uppercase tracking-wider">Consumo Total</p>
            <p className="text-3xl font-bold text-white font-sans">{kpis.total_data_usage_gb} <span className="text-xs font-semibold text-st-muted">GB</span></p>
            <p className="text-[9px] px-2 py-0.5 bg-[#D97706]/10 text-[#D97706] border border-[#D97706]/20 rounded inline-block font-semibold">
              TRÁFICO TOTAL DEL MES
            </p>
          </div>
          <div className="w-12 h-12 rounded-lg bg-[#D97706]/10 text-[#D97706] flex items-center justify-center flex-shrink-0">
            <Database className="w-6 h-6" />
          </div>
          <div className="absolute -bottom-2 -right-2 w-16 h-16 bg-[#D97706]/5 rounded-full blur-xl group-hover:scale-125 transition-transform" />
        </div>
      </div>

      {/* Main Charts & Radar Grid */}
      {!isGlobal && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Historical Telemetry Chart */}
        <div className="lg:col-span-2 bg-st-surface border border-st-border rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-white leading-tight">Tendencia de Telemetría</h2>
              <p className="text-[11px] text-st-muted">Consolidación de velocidad de transmisión y latencias de conexión.</p>
            </div>
            
            {/* Chart Type Toggles */}
            <div className="flex bg-st-bg p-1 rounded-lg border border-st-border self-start">
              <button
                onClick={() => setChartType('area')}
                className={`px-3 py-1 text-xs font-bold uppercase rounded-md cursor-pointer transition-colors ${chartType === 'area' ? 'bg-st-surface text-st-accent font-bold' : 'text-st-muted hover:text-white'}`}
              >
                Área
              </button>
              <button
                onClick={() => setChartType('bar')}
                className={`px-3 py-1 text-xs font-bold uppercase rounded-md cursor-pointer transition-colors ${chartType === 'bar' ? 'bg-st-surface text-st-accent font-bold' : 'text-st-muted hover:text-white'}`}
              >
                Barras
              </button>
              <button
                onClick={() => setChartType('line')}
                className={`px-3 py-1 text-xs font-bold uppercase rounded-md cursor-pointer transition-colors ${chartType === 'line' ? 'bg-st-surface text-st-accent font-bold' : 'text-st-muted hover:text-white'}`}
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
                className="accent-st-accent"
              />
              <span className="w-2.5 h-2.5 rounded-full bg-st-accent block" />
              <span className={activeSeries.downlink ? 'text-white' : 'text-st-muted'}>Downlink (Mbps)</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={activeSeries.uplink}
                onChange={() => setActiveSeries(p => ({ ...p, uplink: !p.uplink }))}
                className="accent-emerald-500"
              />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block" />
              <span className={activeSeries.uplink ? 'text-white' : 'text-st-muted'}>Uplink (Mbps)</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={activeSeries.latency}
                onChange={() => setActiveSeries(p => ({ ...p, latency: !p.latency }))}
                className="accent-amber-500"
              />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 block" />
              <span className={activeSeries.latency ? 'text-white' : 'text-st-muted'}>Latencia (ms)</span>
            </label>
          </div>

          {/* Recharts Container */}
          <div className="h-80 w-full bg-st-bg/40 rounded-xl p-3 border border-st-border/50">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-st-muted text-sm">
                Sin registros en el rango seleccionado
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'area' ? (
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222222" />
                    <XAxis dataKey="timestamp" stroke="#9CA3AF" fontSize={10} />
                    <YAxis stroke="#9CA3AF" fontSize={10} />
                    <Tooltip contentStyle={{ backgroundColor: '#111111', borderColor: '#222222', borderRadius: '8px' }} />
                    {activeSeries.downlink && (
                      <Area type="monotone" dataKey="downlink_mbps" stroke="#00A8E8" fill="#00A8E8" fillOpacity={0.15} strokeWidth={2} />
                    )}
                    {activeSeries.uplink && (
                      <Area type="monotone" dataKey="uplink_mbps" stroke="#10B981" fill="#10B981" fillOpacity={0.15} strokeWidth={2} />
                    )}
                    {activeSeries.latency && (
                      <Area type="monotone" dataKey="latency_ms" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.15} strokeWidth={2} />
                    )}
                  </AreaChart>
                ) : chartType === 'bar' ? (
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222222" />
                    <XAxis dataKey="timestamp" stroke="#9CA3AF" fontSize={10} />
                    <YAxis stroke="#9CA3AF" fontSize={10} />
                    <Tooltip contentStyle={{ backgroundColor: '#111111', borderColor: '#222222', borderRadius: '8px' }} />
                    {activeSeries.downlink && <Bar dataKey="downlink_mbps" fill="#00A8E8" radius={[4, 4, 0, 0]} />}
                    {activeSeries.uplink && <Bar dataKey="uplink_mbps" fill="#10B981" radius={[4, 4, 0, 0]} />}
                    {activeSeries.latency && <Bar dataKey="latency_ms" fill="#F59E0B" radius={[4, 4, 0, 0]} />}
                  </BarChart>
                ) : (
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222222" />
                    <XAxis dataKey="timestamp" stroke="#9CA3AF" fontSize={10} />
                    <YAxis stroke="#9CA3AF" fontSize={10} />
                    <Tooltip contentStyle={{ backgroundColor: '#111111', borderColor: '#222222', borderRadius: '8px' }} />
                    {activeSeries.downlink && <Line type="monotone" dataKey="downlink_mbps" stroke="#00A8E8" strokeWidth={2.5} dot={{ r: 2 }} />}
                    {activeSeries.uplink && <Line type="monotone" dataKey="uplink_mbps" stroke="#10B981" strokeWidth={2.5} dot={{ r: 2 }} />}
                    {activeSeries.latency && <Line type="monotone" dataKey="latency_ms" stroke="#F59E0B" strokeWidth={2.5} dot={{ r: 2 }} />}
                  </LineChart>
                )}
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Satellite Map/Radar Preview */}
        <div className="bg-st-surface border border-st-border rounded-xl p-5 flex flex-col space-y-4">
          <div>
            <h2 className="text-base font-bold text-white leading-tight">Radar de Geolocalización</h2>
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
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 ${pt.estado === 'Online' ? 'bg-st-online' : 'bg-st-offline'}`} />
                    <span className={`relative inline-flex rounded-full h-3 w-3 border border-white/20 ${pt.estado === 'Online' ? 'bg-st-online' : 'bg-st-offline'}`} />
                  </span>
                  
                  {/* Tooltip on hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-5 left-1/2 -translate-x-1/2 w-36 bg-st-surface border border-st-border rounded p-2 text-[9px] shadow-2xl z-10 pointer-events-none">
                    <p className="font-bold text-white truncate">{pt.nombre}</p>
                    <p className="text-st-muted font-mono">{pt.device_id}</p>
                    <p className="text-st-muted">Lat: {pt.latitud.toFixed(4)}</p>
                    <p className="text-st-muted">Lon: {pt.longitud.toFixed(4)}</p>
                    <p className={`font-semibold ${pt.estado === 'Online' ? 'text-st-online' : 'text-st-offline'}`}>{pt.estado}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-between text-[10px] text-st-muted border-t border-st-border/50 pt-3">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-st-online block" /> Online</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-st-offline block" /> Offline</span>
            <span className="flex items-center gap-1 font-mono uppercase"><Navigation className="w-3 h-3 text-st-accent animate-pulse" /> Radar Activo</span>
          </div>
        </div>
      </div>
      )}

      {/* Dense Data Grid (Table) */}
      {!isGlobal && (
        <div className="bg-st-surface border border-st-border rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white leading-tight">Terminales de la Flota</h2>
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
              className="w-full pl-9 pr-4 py-2 bg-st-bg border border-st-border rounded-lg text-sm text-white placeholder-st-muted/50 focus:outline-none focus:ring-1 focus:ring-st-accent focus:border-st-accent"
            />
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-st-border text-[10px] font-bold text-st-muted uppercase tracking-wider">
                <th className="py-3 px-4">Dispositivo ID</th>
                <th className="py-3 px-4">Nombre</th>
                <th className="py-3 px-4">Línea de Servicio</th>
                <th className="py-3 px-4">Cuenta</th>
                <th className="py-3 px-4">Plan / Suscripción</th>
                <th className="py-3 px-4">Kit Starlink</th>
                <th className="py-3 px-4 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-st-border/30 text-sm">
              {pagedDevices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-st-muted text-sm">
                    No se encontraron terminales con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                pagedDevices.map(d => (
                  <tr key={d.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="py-3 px-4 font-mono font-bold text-st-accent select-all">{d.device_id}</td>
                    <td className="py-3 px-4 font-semibold text-white">{d.nombre}</td>
                    <td className="py-3 px-4 font-mono text-st-muted">{d.numero_linea}</td>
                    <td className="py-3 px-4 text-st-muted max-w-[150px] truncate">{d.cuenta_nombre}</td>
                    <td className="py-3 px-4 text-xs font-semibold text-white">{d.plan_contratado}</td>
                    <td className="py-3 px-4 text-xs text-st-muted">{d.kit_starlink}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className={`w-2.5 h-2.5 rounded-full ${d.estado === 'Online' ? 'bg-st-online animate-pulse' : 'bg-st-offline'}`} />
                        <span className={`text-xs font-bold uppercase ${d.estado === 'Online' ? 'text-st-online' : 'text-st-offline'}`}>{d.estado}</span>
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
                className="p-1.5 rounded-lg border border-st-border bg-st-bg hover:text-white disabled:opacity-30 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-st-border bg-st-bg hover:text-white disabled:opacity-30 cursor-pointer"
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
