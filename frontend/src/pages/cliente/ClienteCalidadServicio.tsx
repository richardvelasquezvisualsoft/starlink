import React, { useState, useEffect } from 'react';
import { 
  Activity, 
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
import { useTableSort } from '../../hooks/useTableSort';
import { SortableHeader } from '../../components/ui/SortableHeader';

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

  const { sortedData: sortedTerminals, sortColumn, sortDirection, handleSort } = useTableSort(filteredTerminals, {
    initialSortColumn: 'latency_ms',
    initialSortDirection: 'desc'
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
          <h1 className="text-[20px] font-bold tracking-tight text-client-text-primary uppercase">CALIDAD DE SERVICIO</h1>
          <p className="text-[13px] text-client-text-secondary mt-0.5">
            Monitoreo histórico de disponibilidad, latencia, pérdida de paquetes y estabilidad de señal.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            disabled={terminals.length === 0}
            className="flex items-center gap-2 px-3 py-1.5 bg-client-bg-surface border border-client-border hover:bg-client-bg-subtle text-[13px] font-semibold text-client-text-primary rounded-[8px] transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 bg-client-bg-surface border border-client-border hover:bg-client-bg-subtle text-[13px] font-semibold text-client-text-primary rounded-[8px] transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && terminals.length === 0 && (
        <div className="flex h-64 items-center justify-center bg-client-bg-surface border border-client-border rounded-xl">
          <Activity className="w-8 h-8 animate-spin text-client-primary" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex flex-col items-center justify-center p-8 bg-client-bg-surface border border-client-danger rounded-xl text-center space-y-4">
          <div className="p-3 bg-client-danger-soft border border-client-danger rounded-full text-red-500">
            <Activity className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-client-text-primary">No se pudo cargar la analítica de calidad</h3>
            <p className="text-sm text-client-text-secondary mt-1 max-w-md">{error}</p>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-[#111111] border border-[#222222] rounded-[16px] p-5 flex flex-col justify-between shadow-sm min-h-[140px] hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-[#22C55E]">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
              <div>
                <p className="text-[13px] font-bold tracking-wide uppercase text-[#94A3B8]">Disponibilidad Promedio</p>
                <p className="text-[32px] font-bold text-[#4ADE80] font-sans leading-none mt-1.5">{avgAvailability}%</p>
                <p className="text-[13px] font-medium text-[#94A3B8] mt-1.5">Disponibilidad de red Starlink</p>
              </div>
            </div>

            <div className="bg-[#111111] border border-[#222222] rounded-[16px] p-5 flex flex-col justify-between shadow-sm min-h-[140px] hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <div className="w-10 h-10 rounded-xl bg-[#00A8E8]/10 flex items-center justify-center text-[#00A8E8]">
                  <Zap className="w-5 h-5" />
                </div>
              </div>
              <div>
                <p className="text-[13px] font-bold tracking-wide uppercase text-[#94A3B8]">Latencia Promedio</p>
                <p className="text-[32px] font-bold text-white font-sans leading-none mt-1.5">{avgLatency} <span className="text-[14px] font-semibold text-[#94A3B8]">ms</span></p>
                <p className="text-[13px] font-medium text-[#38BDF8] mt-1.5">Saludable (&lt; 50ms)</p>
              </div>
            </div>

            <div className="bg-[#111111] border border-[#222222] rounded-[16px] p-5 flex flex-col justify-between shadow-sm min-h-[140px] hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-[#F59E0B]">
                  <Wifi className="w-5 h-5" />
                </div>
              </div>
              <div>
                <p className="text-[13px] font-bold tracking-wide uppercase text-[#94A3B8]">Pérdida de Paquetes</p>
                <p className="text-[32px] font-bold text-white font-sans leading-none mt-1.5">{avgLoss}%</p>
                <p className="text-[13px] font-medium text-[#94A3B8] mt-1.5">Packet loss acumulado</p>
              </div>
            </div>

            <div className="bg-[#111111] border border-[#222222] rounded-[16px] p-5 flex flex-col justify-between shadow-sm min-h-[140px] hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <div className="w-10 h-10 rounded-xl bg-[#00A8E8]/10 flex items-center justify-center text-[#00A8E8]">
                  <Activity className="w-5 h-5" />
                </div>
              </div>
              <div>
                <p className="text-[13px] font-bold tracking-wide uppercase text-[#94A3B8]">Equipos Operativos</p>
                <p className="text-[32px] font-bold text-white font-sans leading-none mt-1.5">{onlineCount} <span className="text-[14px] font-semibold text-[#94A3B8]">/ {totalEquipos}</span></p>
                <p className="text-[13px] font-medium text-[#94A3B8] mt-1.5">Terminales en línea</p>
              </div>
            </div>
          </div>

          {/* Historical Trend Chart Section */}
          {chartData.length > 0 && (
            <div className="bg-[#111111] border border-[#222222] rounded-xl p-5 sm:p-6 space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#222222]">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#00A8E8]" />
                  <h3 className="text-[16px] font-bold text-white uppercase tracking-tight">
                    Evolución Histórica de Calidad
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-medium text-[#94A3B8]">Métrica:</span>
                  <select
                    value={chartMetric}
                    onChange={(e) => setChartMetric(e.target.value as any)}
                    className="bg-black border border-[#222222] rounded-lg px-3 py-1.5 text-[12px] font-semibold text-white outline-none focus:border-[#00A8E8] cursor-pointer transition-colors"
                  >
                    <option value="latency">Latencia (ms)</option>
                    <option value="bandwidth">Velocidad (Mbps)</option>
                    <option value="usage">Consumo Diario (GB)</option>
                  </select>
                </div>
              </div>

              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  {chartMetric === 'latency' ? (
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="latencyGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#00A8E8" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="#00A8E8" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="4 4" stroke="#222222" vertical={false} />
                      <XAxis dataKey="timestamp" stroke="#94A3B8" fontSize={12} fontWeight={500} axisLine={false} tickLine={false} />
                      <YAxis stroke="#94A3B8" fontSize={12} fontWeight={500} axisLine={false} tickLine={false} unit=" ms" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#111111', 
                          borderColor: '#222222', 
                          borderRadius: '12px', 
                          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.6)', 
                          color: '#FFFFFF' 
                        }}
                        itemStyle={{ color: '#00A8E8', fontWeight: 700, fontSize: '13px' }}
                        labelStyle={{ color: '#94A3B8', fontSize: '12px' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="latency_ms" 
                        name="Latencia" 
                        stroke="#00A8E8" 
                        strokeWidth={2.5} 
                        fillOpacity={1} 
                        fill="url(#latencyGrad)"
                        activeDot={{ r: 6, fill: "#00A8E8", stroke: "#FFFFFF", strokeWidth: 2 }}
                      />
                    </AreaChart>
                  ) : chartMetric === 'bandwidth' ? (
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="downGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22C55E" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="#22C55E" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="4 4" stroke="#222222" vertical={false} />
                      <XAxis dataKey="timestamp" stroke="#94A3B8" fontSize={12} fontWeight={500} axisLine={false} tickLine={false} />
                      <YAxis stroke="#94A3B8" fontSize={12} fontWeight={500} axisLine={false} tickLine={false} unit=" Mbps" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#111111', 
                          borderColor: '#222222', 
                          borderRadius: '12px', 
                          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.6)', 
                          color: '#FFFFFF' 
                        }}
                        itemStyle={{ color: '#22C55E', fontWeight: 700, fontSize: '13px' }}
                        labelStyle={{ color: '#94A3B8', fontSize: '12px' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="downlink_mbps" 
                        name="Downlink" 
                        stroke="#22C55E" 
                        strokeWidth={2.5} 
                        fillOpacity={1} 
                        fill="url(#downGrad)"
                        activeDot={{ r: 6, fill: "#22C55E", stroke: "#FFFFFF", strokeWidth: 2 }}
                      />
                    </AreaChart>
                  ) : (
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="4 4" stroke="#222222" vertical={false} />
                      <XAxis dataKey="timestamp" stroke="#94A3B8" fontSize={12} fontWeight={500} axisLine={false} tickLine={false} />
                      <YAxis stroke="#94A3B8" fontSize={12} fontWeight={500} axisLine={false} tickLine={false} unit=" GB" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#111111', 
                          borderColor: '#222222', 
                          borderRadius: '12px', 
                          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.6)', 
                          color: '#FFFFFF' 
                        }}
                        itemStyle={{ color: '#00A8E8', fontWeight: 700, fontSize: '13px' }}
                        labelStyle={{ color: '#94A3B8', fontSize: '12px' }}
                      />
                      <Bar dataKey="data_usage_gb" name="Consumo (GB)" fill="#00A8E8" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Quality Matrix Table Container */}
          <div className="bg-[#111111] border border-[#222222] rounded-xl flex flex-col shadow-sm overflow-hidden">
            {/* Toolbar */}
            <div className="px-5 py-3 border-b border-[#222222] flex flex-col sm:flex-row gap-4 justify-between items-center bg-[#111111]">
              <div className="relative flex-1 max-w-xs w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                <input
                  type="text"
                  placeholder="Buscar por servicio, ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-black border border-[#222222] rounded-lg text-sm text-white placeholder-[#94A3B8]/50 focus:border-[#00A8E8] outline-none transition-colors"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-max">
                <thead className="bg-[#1E293B] border-b border-[#222222] sticky top-0 z-10 shadow-sm">
                  <tr>
                    <SortableHeader label="Servicio / Terminal" column="dispositivo_nombre" currentSortColumn={sortColumn as string} currentSortDirection={sortDirection} onSort={handleSort as any} />
                    <SortableHeader label="Plan Contratado" column="plan_contratado" currentSortColumn={sortColumn as string} currentSortDirection={sortDirection} onSort={handleSort as any} />
                    <SortableHeader label="Latencia" column="latency_ms" currentSortColumn={sortColumn as string} currentSortDirection={sortDirection} onSort={handleSort as any} align="center" />
                    <SortableHeader label="Packet Loss" column="packet_loss_pct" currentSortColumn={sortColumn as string} currentSortDirection={sortDirection} onSort={handleSort as any} align="center" />
                    <SortableHeader label="Disponibilidad" column="disponibilidad_pct" currentSortColumn={sortColumn as string} currentSortDirection={sortDirection} onSort={handleSort as any} align="center" />
                    <SortableHeader label="Estado" column="estado" currentSortColumn={sortColumn as string} currentSortDirection={sortDirection} onSort={handleSort as any} align="center" />
                    <SortableHeader label="Calidad" column="calidad_rating" currentSortColumn={sortColumn as string} currentSortDirection={sortDirection} onSort={handleSort as any} align="center" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222222]/40 bg-[#111111]">
                  {sortedTerminals.map((item) => (
                    <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-white text-[13px]">{item.dispositivo_nombre}</div>
                        <div className="text-sm text-[#94A3B8] font-medium flex items-center gap-2">
                          <span className="font-mono">{item.numero_linea}</span>
                          <span>•</span>
                          <span className="font-mono font-bold text-[#00A8E8]">{item.device_id}</span>
                        </div>
                      </td>

                      <td className="px-5 py-3.5 text-[13px] text-[#94A3B8] font-medium">
                        {item.plan_contratado}
                      </td>

                      <td className="px-5 py-3.5 text-center font-mono font-bold text-white text-[13px]">
                        {item.latency_ms} ms
                      </td>

                      <td className="px-5 py-3.5 text-center font-mono text-[#94A3B8] text-[13px]">
                        {item.packet_loss_pct}%
                      </td>

                      <td className="px-5 py-3.5 text-center font-mono font-bold text-[#4ADE80] text-[13px]">
                        {item.disponibilidad_pct}%
                      </td>

                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-[6px] text-xs font-bold uppercase tracking-wide ${
                          item.estado === 'OPERATIVO' ? 'bg-emerald-500/10 text-[#4ADE80] border border-emerald-500/20' :
                          item.estado === 'INCIDENCIA' ? 'bg-amber-500/10 text-[#FBBF24] border border-amber-500/20' :
                          'bg-red-500/10 text-[#F87171] border border-red-500/20'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            item.estado === 'OPERATIVO' ? 'bg-[#22C55E]' :
                            item.estado === 'INCIDENCIA' ? 'bg-[#F59E0B]' :
                            'bg-[#EF4444]'
                          }`} />
                          {item.estado}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-[6px] text-xs font-bold uppercase tracking-wide ${
                          item.calidad_rating === 'Excelente' ? 'bg-[#00A8E8]/10 text-[#38BDF8] border border-[#00A8E8]/20' :
                          item.calidad_rating === 'Saludable' ? 'bg-emerald-500/10 text-[#4ADE80] border border-emerald-500/20' :
                          'bg-amber-500/10 text-[#FBBF24] border border-amber-500/20'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            item.calidad_rating === 'Excelente' ? 'bg-[#00A8E8]' :
                            item.calidad_rating === 'Saludable' ? 'bg-[#22C55E]' :
                            'bg-[#F59E0B]'
                          }`} />
                          {item.calidad_rating}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {sortedTerminals.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-[13px] font-medium text-client-text-secondary bg-client-bg-subtle">
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
