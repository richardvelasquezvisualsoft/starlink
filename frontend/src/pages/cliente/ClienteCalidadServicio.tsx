import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  ArrowUpDown, 
  RefreshCw, 
  Wifi, 
  CheckCircle2, 
  TrendingUp, 
  Download, 
  Search,
  Zap
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import client from '../../api/client';

interface TelemetryItem {
  dispositivo_id: number;
  device_id: string;
  nombre: string;
  latitud: number;
  longitud: number;
  estado: string;
  latency_ms: number;
  packet_loss_pct: number;
  last_reading?: string;
}

interface ServiceLineItem {
  id: number;
  numero_linea: string;
  nombre: string;
  plan_contratado?: string;
  dispositivo?: {
    id: number;
    device_id: string;
    nombre: string;
  };
}

export const ClienteCalidadServicio: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [terminals, setTerminals] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'latency' | 'loss' | 'name'>('latency');
  const [chartMetric, setChartMetric] = useState<'latency' | 'bandwidth' | 'usage'>('latency');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch trend chart data from /dashboard/chart
      const chartRes = await client.get('/dashboard/chart');
      setChartData(chartRes.data || []);

      // 2. Fetch service lines and telemetry
      const [linesRes, geoRes] = await Promise.all([
        client.get('/lineas-servicio'),
        client.get('/dashboard/geolocations')
      ]);

      const geoList: TelemetryItem[] = geoRes.data || [];
      const linesList: ServiceLineItem[] = linesRes.data || [];

      const compiled = linesList.map((line) => {
        const geo = geoList.find((g) => g.dispositivo_id === line.dispositivo?.id);
        const status = (geo?.estado || 'OPERATIVO').toUpperCase();
        const latency = geo?.latency_ms ?? 34.0;
        const loss = geo?.packet_loss_pct ?? 0.4;
        const availability = status === 'OPERATIVO' ? 99.5 : (status === 'INCIDENCIA' ? 94.0 : 0.0);

        return {
          id: line.id,
          numero_linea: line.numero_linea,
          nombre: line.nombre,
          plan_contratado: line.plan_contratado || 'Local Priority 1TB',
          device_id: line.dispositivo?.device_id || 'N/A',
          dispositivo_nombre: line.dispositivo?.nombre || 'Terminal Starlink',
          estado: status,
          latency_ms: latency,
          packet_loss_pct: loss,
          disponibilidad_pct: availability,
          calidad_rating: availability > 98 ? 'Excelente' : (availability > 90 ? 'Saludable' : 'Atención')
        };
      });

      setTerminals(compiled);
    } catch (err: any) {
      console.error('Error fetching calidad de servicio:', err);
      setError(err.response?.data?.detail || 'No se pudo cargar la analítica de calidad de servicio.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute summary metrics
  const totalEquipos = terminals.length;
  const onlineCount = terminals.filter(t => t.estado === 'OPERATIVO').length;
  const avgLatency = terminals.length > 0 
    ? (terminals.reduce((acc, curr) => acc + curr.latency_ms, 0) / terminals.length).toFixed(1)
    : '0.0';
  const avgLoss = terminals.length > 0
    ? (terminals.reduce((acc, curr) => acc + curr.packet_loss_pct, 0) / terminals.length).toFixed(2)
    : '0.00';
  const avgAvailability = terminals.length > 0
    ? (terminals.reduce((acc, curr) => acc + curr.disponibilidad_pct, 0) / terminals.length).toFixed(1)
    : '100.0';

  // Filter & Sort
  const filteredTerminals = terminals.filter(t => 
    t.numero_linea.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.dispositivo_nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.device_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedTerminals = [...filteredTerminals].sort((a, b) => {
    if (sortBy === 'latency') return b.latency_ms - a.latency_ms;
    if (sortBy === 'loss') return b.packet_loss_pct - a.packet_loss_pct;
    return a.dispositivo_nombre.localeCompare(b.dispositivo_nombre);
  });

  const handleExportCSV = () => {
    const headers = 'Línea de Servicio,ID Dispositivo,Nombre Dispositivo,Plan,Estado,Latencia (ms),Packet Loss (%),Disponibilidad (%)\n';
    const rows = sortedTerminals.map(t => 
      `"${t.numero_linea}","${t.device_id}","${t.dispositivo_nombre}","${t.plan_contratado}","${t.estado}",${t.latency_ms},${t.packet_loss_pct},${t.disponibilidad_pct}`
    ).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `calidad_servicio_reporte.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans uppercase">CALIDAD DE SERVICIO</h1>
          <p className="text-xs text-st-muted mt-0.5">
            Monitoreo histórico de disponibilidad, latencia, pérdida de paquetes y estabilidad de señal.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            disabled={terminals.length === 0}
            className="flex items-center gap-2 px-3 py-1.5 bg-st-surface border border-st-border hover:bg-white/5 text-xs text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV</span>
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 bg-st-surface border border-st-border hover:bg-white/5 text-xs text-white rounded-lg transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && terminals.length === 0 && (
        <div className="flex h-64 items-center justify-center bg-st-surface border border-st-border rounded-xl">
          <Activity className="w-8 h-8 animate-spin text-st-accent" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex flex-col items-center justify-center p-8 bg-st-surface border border-red-500/20 rounded-xl text-center space-y-4">
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-full text-red-500">
            <Activity className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">No se pudo cargar la analítica de calidad</h3>
            <p className="text-sm text-st-muted mt-1 max-w-md">{error}</p>
          </div>
          <button 
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 bg-st-accent text-st-bg font-medium text-sm rounded-lg hover:bg-st-accent/90 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reintentar</span>
          </button>
        </div>
      )}

      {/* Main Content */}
      {!loading && !error && (
        <>
          {/* Top KPIs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-st-surface border border-st-border rounded-xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-st-muted mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Disponibilidad Promedio</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-emerald-400">{avgAvailability}%</div>
              <div className="text-[11px] text-st-muted mt-1">Disponibilidad de red Starlink</div>
            </div>

            <div className="bg-st-surface border border-st-border rounded-xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-st-muted mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Latencia Promedio</span>
                <Zap className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-bold text-white">{avgLatency} <span className="text-xs text-st-muted font-normal">ms</span></div>
              <div className="text-[11px] text-st-accent font-semibold mt-1">Saludable (&lt; 50ms)</div>
            </div>

            <div className="bg-st-surface border border-st-border rounded-xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-st-muted mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Pérdida de Paquetes</span>
                <Wifi className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-2xl font-bold text-white">{avgLoss}%</div>
              <div className="text-[11px] text-st-muted mt-1">Packet loss acumulado</div>
            </div>

            <div className="bg-st-surface border border-st-border rounded-xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-st-muted mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Equipos Operativos</span>
                <Activity className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-2xl font-bold text-white">{onlineCount} <span className="text-xs text-st-muted font-normal">/ {totalEquipos}</span></div>
              <div className="text-[11px] text-st-muted mt-1">Terminales en línea</div>
            </div>
          </div>

          {/* Historical Trend Chart Section */}
          {chartData.length > 0 && (
            <div className="bg-st-surface border border-st-border rounded-xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-st-border">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-st-accent" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Evolución Histórica de Calidad
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-st-muted">Métrica:</span>
                  <select
                    value={chartMetric}
                    onChange={(e) => setChartMetric(e.target.value as any)}
                    className="bg-st-bg border border-st-border rounded-lg px-3 py-1 text-xs text-white outline-none focus:border-st-accent cursor-pointer"
                  >
                    <option value="latency">Latencia (ms)</option>
                    <option value="bandwidth">Velocidad (Mbps)</option>
                    <option value="usage">Consumo Diario (GB)</option>
                  </select>
                </div>
              </div>

              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  {chartMetric === 'latency' ? (
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="latencyGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#00A8E8" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#00A8E8" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                      <XAxis dataKey="timestamp" stroke="#737373" fontSize={11} />
                      <YAxis stroke="#737373" fontSize={11} unit=" ms" />
                      <Tooltip contentStyle={{ backgroundColor: '#171717', borderColor: '#262626', color: '#fff', fontSize: '12px' }} />
                      <Area type="monotone" dataKey="latency_ms" name="Latencia" stroke="#00A8E8" fillOpacity={1} fill="url(#latencyGrad)" />
                    </AreaChart>
                  ) : chartMetric === 'bandwidth' ? (
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="downGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                      <XAxis dataKey="timestamp" stroke="#737373" fontSize={11} />
                      <YAxis stroke="#737373" fontSize={11} unit=" Mbps" />
                      <Tooltip contentStyle={{ backgroundColor: '#171717', borderColor: '#262626', color: '#fff', fontSize: '12px' }} />
                      <Area type="monotone" dataKey="downlink_mbps" name="Downlink" stroke="#10B981" fillOpacity={1} fill="url(#downGrad)" />
                    </AreaChart>
                  ) : (
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                      <XAxis dataKey="timestamp" stroke="#737373" fontSize={11} />
                      <YAxis stroke="#737373" fontSize={11} unit=" GB" />
                      <Tooltip contentStyle={{ backgroundColor: '#171717', borderColor: '#262626', color: '#fff', fontSize: '12px' }} />
                      <Bar dataKey="data_usage_gb" name="Consumo (GB)" fill="#A855F7" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Quality Matrix Table Container */}
          <div className="bg-st-surface border border-st-border rounded-xl flex flex-col">
            {/* Toolbar */}
            <div className="p-4 border-b border-st-border flex flex-col sm:flex-row gap-4 justify-between items-center">
              <div className="relative flex-1 max-w-md w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-st-muted" />
                <input
                  type="text"
                  placeholder="Buscar por servicio, dispositivo o ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-st-bg border border-st-border rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:border-st-accent outline-none"
                />
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-st-muted flex items-center gap-1">
                  <ArrowUpDown className="w-3.5 h-3.5" /> Ordenar por:
                </span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-st-bg border border-st-border rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-st-accent cursor-pointer"
                >
                  <option value="latency">Mayor Latencia</option>
                  <option value="loss">Mayor Packet Loss</option>
                  <option value="name">Nombre Terminal</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-max">
                <thead className="bg-st-bg sticky top-0 z-10">
                  <tr>
                    <th className="p-4 text-xs font-bold text-st-muted uppercase tracking-wider border-b border-st-border">Servicio / Terminal</th>
                    <th className="p-4 text-xs font-bold text-st-muted uppercase tracking-wider border-b border-st-border">Plan Contratado</th>
                    <th className="p-4 text-xs font-bold text-st-muted uppercase tracking-wider border-b border-st-border text-center">Latencia</th>
                    <th className="p-4 text-xs font-bold text-st-muted uppercase tracking-wider border-b border-st-border text-center">Packet Loss</th>
                    <th className="p-4 text-xs font-bold text-st-muted uppercase tracking-wider border-b border-st-border text-center">Disponibilidad</th>
                    <th className="p-4 text-xs font-bold text-st-muted uppercase tracking-wider border-b border-st-border text-center">Estado</th>
                    <th className="p-4 text-xs font-bold text-st-muted uppercase tracking-wider border-b border-st-border text-center">Calidad</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTerminals.map((item) => (
                    <tr key={item.id} className="border-b border-st-border/50 hover:bg-white/5 transition-colors">
                      <td className="p-4">
                        <div className="font-semibold text-white text-sm">{item.dispositivo_nombre}</div>
                        <div className="text-[11px] text-st-muted flex items-center gap-2">
                          <span>{item.numero_linea}</span>
                          <span>•</span>
                          <span>{item.device_id}</span>
                        </div>
                      </td>

                      <td className="p-4 text-sm text-st-muted font-medium">
                        {item.plan_contratado}
                      </td>

                      <td className="p-4 text-center font-mono font-bold text-white text-sm">
                        {item.latency_ms} ms
                      </td>

                      <td className="p-4 text-center font-mono text-st-muted text-sm">
                        {item.packet_loss_pct}%
                      </td>

                      <td className="p-4 text-center font-mono font-bold text-emerald-400 text-sm">
                        {item.disponibilidad_pct}%
                      </td>

                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          item.estado === 'OPERATIVO' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          item.estado === 'INCIDENCIA' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          {item.estado}
                        </span>
                      </td>

                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold ${
                          item.calidad_rating === 'Excelente' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' :
                          item.calidad_rating === 'Saludable' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {item.calidad_rating}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {sortedTerminals.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-st-muted">
                        No se encontraron registros de calidad.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ClienteCalidadServicio;
