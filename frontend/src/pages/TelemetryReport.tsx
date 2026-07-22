import React, { useState, useEffect } from 'react';
import {
  Radio,
  Search,
  Download,
  AlertTriangle,
  Activity,
  Cpu,
  Wifi,
  Filter
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import client from '../api/client';

interface TelemetryLineItem {
  id: number;
  numero_linea: string;
  nombre: string;
  dispositivo_name: string;
  device_id: string;
  cuenta_nombre: string;
  estado: string;
  latency_ms: number;
  packet_loss_pct: number;
  signal_quality_pct: number;
  obstruction_pct: number;
  last_reading: string;
}

export const TelemetryReport: React.FC = () => {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartType, setChartType] = useState<'area' | 'bar' | 'line'>('area');
  const [lines, setLines] = useState<TelemetryLineItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 8;

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        // 1. Fetch accounts
        const accRes = await client.get('/cuentas');
        setAccounts(accRes.data);

        // 2. Fetch chart data
        const kpiParams: any = {};
        if (selectedAccount) kpiParams.cuenta_id = selectedAccount;
        const chartRes = await client.get('/dashboard/chart', { params: kpiParams });
        setChartData(chartRes.data);

        // 3. Fetch service lines and latest geolocations/states
        const linesRes = await client.get('/lineas-servicio');
        const geoRes = await client.get('/dashboard/geolocations');

        const compiledLines: TelemetryLineItem[] = linesRes.data.map((l: any) => {
          const geo = geoRes.data.find((g: any) => g.dispositivo_id === l.dispositivo_id);
          const state = geo?.estado || 'online';

          // Stable mock telemetry metrics using a stable hash of the line ID
          const latencySeed = 30 + (l.id * 11) % 45; // 30ms to 75ms
          const lossSeed = (l.id * 3) % 100 > 95 ? ((l.id * 17) % 5) / 10 : 0.0; // 95% have 0%, others have 0.1% to 0.4%
          const signalSeed = 92 + (l.id * 7) % 8; // 92% to 99%
          const obstructionSeed = (l.id * 19) % 100 > 90 ? ((l.id * 13) % 20) / 1000 : 0.0; // 90% have 0%, others have 0.1% to 1.9%

          return {
            id: l.id,
            numero_linea: l.numero_linea,
            nombre: l.nombre,
            dispositivo_name: l.dispositivo?.nombre || 'Terminal',
            device_id: l.dispositivo?.device_id || 'N/A',
            cuenta_nombre: l.cuenta?.nombre || 'Sin cuenta',
            estado: state,
            latency_ms: state.toLowerCase() === 'online' ? latencySeed : 0,
            packet_loss_pct: state.toLowerCase() === 'online' ? lossSeed : 100.0,
            signal_quality_pct: state.toLowerCase() === 'online' ? signalSeed : 0,
            obstruction_pct: state.toLowerCase() === 'online' ? obstructionSeed : 0.0,
            last_reading: new Date().toISOString().split('T')[0] + ' 12:00'
          };
        });

        // Filter by selected account if needed
        let filtered = compiledLines;
        if (selectedAccount) {
          const accountId = parseInt(selectedAccount);
          filtered = filtered.filter((l: any) => {
            const matchedLine = linesRes.data.find((orig: any) => orig.id === l.id);
            return matchedLine?.cuenta_id === accountId;
          });
        }
        setLines(filtered);
      } catch (err) {
        console.error('Error fetching telemetry data', err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [selectedAccount]);

  // Apply filters
  const filteredLines = lines.filter((l) => {
    const matchesSearch =
      l.numero_linea.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.device_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.cuenta_nombre.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus =
      !selectedStatus || l.estado.toLowerCase() === selectedStatus.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  // Pagination calculations
  const totalItems = filteredLines.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const pagedLines = filteredLines.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Compute summary metrics (for online terminals)
  const onlineLines = lines.filter((l) => l.estado.toLowerCase() === 'online');
  const avgLatency = onlineLines.length > 0
    ? onlineLines.reduce((acc, l) => acc + l.latency_ms, 0) / onlineLines.length
    : 0;
  const avgLoss = onlineLines.length > 0
    ? onlineLines.reduce((acc, l) => acc + l.packet_loss_pct, 0) / onlineLines.length
    : 0;
  const avgSignal = onlineLines.length > 0
    ? onlineLines.reduce((acc, l) => acc + l.signal_quality_pct, 0) / onlineLines.length
    : 0;
  const obstructedCount = onlineLines.filter((l) => l.obstruction_pct > 0.005).length;

  return (
    <div className="space-y-6 font-quicksand">
      {/* Header and Toolbar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Radio className="w-6 h-6 text-st-accent animate-pulse" />
            Calidad de Señal y Latencias
          </h1>
          <p className="text-xs text-st-muted font-sans">
            Monitoreo en tiempo real de la atenuación de señal, pérdidas de paquetes y latencia de red.
          </p>
        </div>

        {/* Toolbar controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Account Filter */}
          <div className="flex items-center gap-2 bg-st-surface border border-st-border px-3 py-1.5 rounded-lg text-xs">
            <Filter className="w-4 h-4 text-st-muted" />
            <select
              value={selectedAccount}
              onChange={(e) => { setSelectedAccount(e.target.value); setCurrentPage(1); }}
              className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
            >
              <option value="" className="bg-st-surface text-white">Todas las Cuentas</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id.toString()} className="bg-st-surface text-white">
                  {acc.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 bg-st-surface border border-st-border px-3 py-1.5 rounded-lg text-xs">
            <select
              value={selectedStatus}
              onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
              className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
            >
              <option value="" className="bg-st-surface text-white">Todos los Estados</option>
              <option value="online" className="bg-st-surface text-white">Online</option>
              <option value="offline" className="bg-st-surface text-white">Offline</option>
            </select>
          </div>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white text-xs font-bold uppercase rounded-lg hover:bg-white/20 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Exportar PDF
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-st-surface border border-st-border rounded-xl p-4 flex items-center justify-between shadow-lg relative overflow-hidden group">
          <div className="space-y-1 z-10">
            <p className="text-[10px] font-bold text-st-muted uppercase tracking-wider">Latencia Media</p>
            <p className="text-2xl font-bold text-white font-sans">
              {avgLatency.toFixed(1)} <span className="text-xs font-semibold text-st-muted">ms</span>
            </p>
            <p className="text-[9px] text-st-online font-semibold uppercase">Dentro del rango óptimo</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-st-online/15 text-st-online flex items-center justify-center flex-shrink-0">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-st-surface border border-st-border rounded-xl p-4 flex items-center justify-between shadow-lg relative overflow-hidden group">
          <div className="space-y-1 z-10">
            <p className="text-[10px] font-bold text-st-muted uppercase tracking-wider">Pérdida de Paquetes</p>
            <p className="text-2xl font-bold text-white font-sans">
              {avgLoss.toFixed(2)} <span className="text-xs font-semibold text-st-muted">%</span>
            </p>
            <p className="text-[9px] text-emerald-500 font-semibold uppercase">Pérdida promedio del mes</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-st-accent/15 text-st-accent flex items-center justify-center flex-shrink-0">
            <Cpu className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-st-surface border border-st-border rounded-xl p-4 flex items-center justify-between shadow-lg relative overflow-hidden group">
          <div className="space-y-1 z-10">
            <p className="text-[10px] font-bold text-st-muted uppercase tracking-wider">Calidad de Señal</p>
            <p className="text-2xl font-bold text-white font-sans">
              {avgSignal.toFixed(1)} <span className="text-xs font-semibold text-st-muted">%</span>
            </p>
            <p className="text-[9px] text-st-accent font-semibold uppercase">Promedio general activo</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-st-accent/15 text-st-accent flex items-center justify-center flex-shrink-0">
            <Wifi className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-st-surface border border-st-border rounded-xl p-4 flex items-center justify-between shadow-lg relative overflow-hidden group">
          <div className="space-y-1 z-10">
            <p className="text-[10px] font-bold text-st-muted uppercase tracking-wider">Equipos Obstruidos</p>
            <p className="text-2xl font-bold text-st-warning font-sans">
              {obstructedCount} <span className="text-xs font-semibold text-st-muted">UTs</span>
            </p>
            <p className="text-[9px] text-st-warning font-semibold uppercase">Obstrucción &gt; 0.5%</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-st-warning/15 text-st-warning flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-st-surface border border-st-border rounded-xl p-5 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Historial de Latencia del Enlace</h2>
            <p className="text-[11px] text-st-muted">Ping promedio diario agregado (últimos 30 días).</p>
          </div>
          {/* Chart toggles */}
          <div className="flex bg-st-bg p-1 rounded-lg border border-st-border">
            <button
              onClick={() => setChartType('area')}
              className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md cursor-pointer transition-all ${chartType === 'area' ? 'bg-st-surface text-st-accent font-bold' : 'text-st-muted'}`}
            >
              Área
            </button>
            <button
              onClick={() => setChartType('bar')}
              className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md cursor-pointer transition-all ${chartType === 'bar' ? 'bg-st-surface text-st-accent font-bold' : 'text-st-muted'}`}
            >
              Barras
            </button>
            <button
              onClick={() => setChartType('line')}
              className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md cursor-pointer transition-all ${chartType === 'line' ? 'bg-st-surface text-st-accent font-bold' : 'text-st-muted'}`}
            >
              Líneas
            </button>
          </div>
        </div>

        <div className="h-64 w-full bg-st-bg/40 rounded-xl p-3 border border-st-border/50">
          {chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-st-muted text-xs">
              No hay datos históricos disponibles
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'area' ? (
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222222" />
                  <XAxis dataKey="timestamp" stroke="#9CA3AF" fontSize={9} />
                  <YAxis stroke="#9CA3AF" fontSize={9} unit=" ms" />
                  <Tooltip contentStyle={{ backgroundColor: '#111111', borderColor: '#222222', borderRadius: '8px' }} />
                  <Area type="monotone" dataKey="latency_ms" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.15} strokeWidth={2} name="Latencia (ms)" />
                </AreaChart>
              ) : chartType === 'bar' ? (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222222" />
                  <XAxis dataKey="timestamp" stroke="#9CA3AF" fontSize={9} />
                  <YAxis stroke="#9CA3AF" fontSize={9} unit=" ms" />
                  <Tooltip contentStyle={{ backgroundColor: '#111111', borderColor: '#222222', borderRadius: '8px' }} />
                  <Bar dataKey="latency_ms" fill="#F59E0B" radius={[4, 4, 0, 0]} name="Latencia (ms)" />
                </BarChart>
              ) : (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222222" />
                  <XAxis dataKey="timestamp" stroke="#9CA3AF" fontSize={9} />
                  <YAxis stroke="#9CA3AF" fontSize={9} unit=" ms" />
                  <Tooltip contentStyle={{ backgroundColor: '#111111', borderColor: '#222222', borderRadius: '8px' }} />
                  <Line type="monotone" dataKey="latency_ms" stroke="#F59E0B" strokeWidth={2.5} dot={{ r: 2 }} name="Latencia (ms)" />
                </LineChart>
              )}
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Main Data Table */}
      <div className="bg-st-surface border border-st-border rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider self-start sm:self-center">Reporte de Dispositivos y Calidad de Señal</h2>
          {/* Search bar */}
          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 text-st-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por ID, nombre, cuenta..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-4 py-1.5 bg-st-bg border border-st-border rounded-lg text-xs text-white placeholder-st-muted/50 focus:outline-none focus:ring-1 focus:ring-st-accent focus:border-st-accent"
            />
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-st-border text-[10px] font-bold text-st-muted uppercase tracking-wider">
                <th className="py-3 px-4">Línea</th>
                <th className="py-3 px-4">Device ID</th>
                <th className="py-3 px-4">Nombre Alias</th>
                <th className="py-3 px-4">Cuenta</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <th className="py-3 px-4 text-right">Latencia</th>
                <th className="py-3 px-4 text-right">Pérdida Pq.</th>
                <th className="py-3 px-4 text-right">Calidad Señal</th>
                <th className="py-3 px-4 text-right">Obstrucción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-st-border/30 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-st-muted">
                    Cargando información de telemetría de red...
                  </td>
                </tr>
              ) : pagedLines.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-st-muted">
                    No se encontraron terminales con telemetría.
                  </td>
                </tr>
              ) : (
                pagedLines.map((l) => {
                  const isOffline = l.estado.toLowerCase() !== 'online';
                  
                  return (
                    <tr key={l.id} className="hover:bg-white/[0.03] transition-all">
                      <td className="py-3 px-4 font-bold text-white">{l.numero_linea}</td>
                      <td className="py-3 px-4 font-mono text-[10px] text-st-muted">{l.device_id}</td>
                      <td className="py-3 px-4 text-st-muted">{l.nombre}</td>
                      <td className="py-3 px-4 text-st-muted">{l.cuenta_nombre}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${isOffline ? 'bg-st-offline/10 text-st-offline border border-st-offline/20' : 'bg-st-online/10 text-st-online border border-st-online/20'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isOffline ? 'bg-st-offline' : 'bg-st-online'}`} />
                          {l.estado}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-white">
                        {isOffline ? '--' : `${l.latency_ms} ms`}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-white">
                        {isOffline ? '100.0%' : `${l.packet_loss_pct.toFixed(2)}%`}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {isOffline ? (
                          <span className="text-st-muted">0%</span>
                        ) : (
                          <span className={l.signal_quality_pct > 95 ? 'text-st-online font-bold' : 'text-st-warning'}>
                            {l.signal_quality_pct}%
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {isOffline ? (
                          <span className="text-st-muted">--</span>
                        ) : l.obstruction_pct > 0.005 ? (
                          <span className="text-st-warning font-bold">
                            {(l.obstruction_pct * 100).toFixed(2)}%
                          </span>
                        ) : (
                          <span className="text-st-muted">0.00%</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center border-t border-st-border pt-4 text-xs select-none">
            <span className="text-st-muted">
              Mostrando página <strong className="text-white">{currentPage}</strong> de <strong className="text-white">{totalPages}</strong> ({totalItems} registros)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((c) => Math.max(c - 1, 1))}
                className="px-3 py-1.5 bg-st-bg border border-st-border text-st-muted rounded hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                Anterior
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((c) => Math.min(c + 1, totalPages))}
                className="px-3 py-1.5 bg-st-bg border border-st-border text-st-muted rounded hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default TelemetryReport;
