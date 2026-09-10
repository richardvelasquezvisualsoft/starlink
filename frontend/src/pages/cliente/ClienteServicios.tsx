import React, { useState, useEffect } from 'react';
import { Radio, Search, Activity } from 'lucide-react';
import client from '../../api/client';

export const ClienteServicios: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [error, setError] = useState<string | null>(null);

  const handleExportCSV = () => {
    const headers = ['ID Cuenta', 'ID Servicio', 'Estado', 'Plan', 'Terminal', 'Última conexión'];
    const rows = filteredData.map(item => [
      item.cuenta?.numero_cuenta || item.cuenta_id || '',
      item.numero_linea || '',
      item.estado_provisionamiento || 'active',
      item.plan_contratado || '',
      item.dispositivo?.device_id || 'N/A',
      item.ultima_sincronizacion ? new Date(item.ultima_sincronizacion).toLocaleString() : 'N/A'
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "servicios_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await client.get('/lineas-servicio');
      setData(res.data || []);
    } catch (err: any) {
      console.error('Error fetching lineas-servicio:', err);
      setError(err.response?.data?.detail || 'No se pudo conectar con el servidor para cargar los servicios.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredData = data.filter(item => {
    const matchesSearch = item.numero_linea?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.plan_contratado?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.nombre?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || item.estado_provisionamiento === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans uppercase">Mis Servicios</h1>
          <p className="text-xs text-st-muted mt-0.5">Gestión y estado de servicios asociados a tu cuenta.</p>
        </div>
        <button onClick={handleExportCSV} className="px-4 py-2 bg-st-surface border border-st-border rounded-lg text-sm text-st-muted hover:text-white hover:border-white/20 transition-all cursor-pointer">
          Exportar a CSV
        </button>
      </div>

      <div className="bg-st-surface border border-st-border rounded-xl flex flex-col h-[calc(100vh-12rem)]">
        {/* Toolbar */}
        <div className="p-4 border-b border-st-border flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-st-muted" />
            <input
              type="text"
              placeholder="Buscar por identificador, nombre o plan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-st-bg border border-st-border rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:border-st-accent outline-none transition-colors"
            />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-st-bg border border-st-border rounded-lg px-3 py-2 text-sm text-white focus:border-st-accent outline-none cursor-pointer">
            <option value="ALL">Todos los Estados</option>
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
          </select>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <Activity className="w-8 h-8 animate-spin text-st-accent" />
            </div>
          ) : error ? (
            <div className="flex flex-col h-full items-center justify-center p-8 text-center space-y-4">
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-full text-red-500">
                <Activity className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Error al cargar servicios</h3>
                <p className="text-sm text-st-muted mt-1 max-w-md">{error}</p>
              </div>
              <button 
                onClick={fetchData}
                className="px-4 py-2 bg-st-surface border border-st-border hover:bg-white/5 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Reintentar
              </button>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-st-bg sticky top-0 z-10">
                <tr>
                  <th className="p-4 text-xs font-bold text-st-muted uppercase tracking-wider border-b border-st-border">ID Cuenta</th>
                  <th className="p-4 text-xs font-bold text-st-muted uppercase tracking-wider border-b border-st-border">ID Servicio</th>
                  <th className="p-4 text-xs font-bold text-st-muted uppercase tracking-wider border-b border-st-border">Estado</th>
                  <th className="p-4 text-xs font-bold text-st-muted uppercase tracking-wider border-b border-st-border">Plan</th>
                  <th className="p-4 text-xs font-bold text-st-muted uppercase tracking-wider border-b border-st-border">Terminal / Kit</th>
                  <th className="p-4 text-xs font-bold text-st-muted uppercase tracking-wider border-b border-st-border">Última Conexión</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item) => (
                  <tr key={item.id} className="border-b border-st-border/50 hover:bg-white/5 transition-colors">
                    <td className="p-4 text-sm text-st-muted">{item.cuenta?.numero_cuenta || item.cuenta_id}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-st-bg rounded-lg border border-st-border">
                          <Radio className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div>
                          <span className="font-medium text-st-accent">{item.numero_linea}</span>
                          <div className="text-xs text-st-muted mt-0.5">{item.nombre || 'Sin nombre'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${item.estado_provisionamiento === 'active' || !item.estado_provisionamiento ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                        {item.estado_provisionamiento || 'active'}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-st-muted">{item.plan_contratado}</td>
                    <td className="p-4 text-sm text-st-muted">
                      {item.dispositivo?.device_id || item.dispositivo?.kit_starlink || 'N/A'}
                    </td>
                    <td className="p-4 text-sm text-st-muted">{item.ultima_sincronizacion ? new Date(item.ultima_sincronizacion).toLocaleString() : 'N/A'}</td>
                  </tr>
                ))}
                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-st-muted">
                      No se encontraron registros.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
export default ClienteServicios;
