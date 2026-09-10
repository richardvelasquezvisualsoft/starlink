import React, { useState, useEffect } from 'react';
import { Satellite, Router, Search, Activity } from 'lucide-react';
import client from '../../api/client';

export const ClienteEquipos: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'terminales' | 'routers'>('terminales');
  const [terminales, setTerminales] = useState<any[]>([]);
  const [routers, setRouters] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [devRes, routerRes] = await Promise.all([
        client.get('/dispositivos'),
        client.get('/routers').catch(() => ({ data: [] }))
      ]);
      setTerminales(devRes.data || []);
      setRouters(routerRes.data || []);
    } catch (err: any) {
      console.error('Error fetching equipos:', err);
      setError(err.response?.data?.detail || 'No se pudo conectar con el servidor para cargar los equipos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredTerminales = terminales.filter(t => 
    t.device_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.kit_starlink?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRouters = routers.filter(r => 
    r.router_id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans uppercase">Mis Equipos</h1>
          <p className="text-xs text-st-muted mt-0.5">Gestión de terminales Starlink y Routers asociados a tu cuenta.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-st-border">
        <button
          onClick={() => setActiveTab('terminales')}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 ${activeTab === 'terminales' ? 'border-st-accent text-st-accent bg-st-accent/5' : 'border-transparent text-st-muted hover:text-white hover:bg-white/5'}`}
        >
          <Satellite className="w-4 h-4" />
          Terminales Starlink
        </button>
        <button
          onClick={() => setActiveTab('routers')}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 ${activeTab === 'routers' ? 'border-st-accent text-st-accent bg-st-accent/5' : 'border-transparent text-st-muted hover:text-white hover:bg-white/5'}`}
        >
          <Router className="w-4 h-4" />
          Routers
        </button>
      </div>

      <div className="bg-st-surface border border-st-border rounded-xl flex flex-col h-[calc(100vh-16rem)]">
        {/* Toolbar */}
        <div className="p-4 border-b border-st-border flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative flex-1 max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-st-muted" />
            <input
              type="text"
              placeholder="Buscar por identificador..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-st-bg border border-st-border rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:border-st-accent outline-none transition-colors"
            />
          </div>
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
                <h3 className="text-lg font-semibold text-white">Error al cargar equipos</h3>
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
                {activeTab === 'terminales' ? (
                  <tr>
                    <th className="p-4 text-xs font-bold text-st-muted uppercase tracking-wider border-b border-st-border">Device ID</th>
                    <th className="p-4 text-xs font-bold text-st-muted uppercase tracking-wider border-b border-st-border">Serial Dish</th>
                    <th className="p-4 text-xs font-bold text-st-muted uppercase tracking-wider border-b border-st-border">Tipo Kit</th>
                    <th className="p-4 text-xs font-bold text-st-muted uppercase tracking-wider border-b border-st-border">Ubicación Actual</th>
                    <th className="p-4 text-xs font-bold text-st-muted uppercase tracking-wider border-b border-st-border">SW Version</th>
                    <th className="p-4 text-xs font-bold text-st-muted uppercase tracking-wider border-b border-st-border">Estado</th>
                  </tr>
                ) : (
                  <tr>
                    <th className="p-4 text-xs font-bold text-st-muted uppercase tracking-wider border-b border-st-border">Router ID</th>
                    <th className="p-4 text-xs font-bold text-st-muted uppercase tracking-wider border-b border-st-border">Serial Router</th>
                    <th className="p-4 text-xs font-bold text-st-muted uppercase tracking-wider border-b border-st-border">Terminal Asignado</th>
                    <th className="p-4 text-xs font-bold text-st-muted uppercase tracking-wider border-b border-st-border">Firmware</th>
                    <th className="p-4 text-xs font-bold text-st-muted uppercase tracking-wider border-b border-st-border">Estado</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {activeTab === 'terminales' && filteredTerminales.map(item => (
                  <tr key={item.id} className="border-b border-st-border/50 hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <a href="#" className="font-medium text-st-accent hover:underline">{item.device_id}</a>
                    </td>
                    <td className="p-4 text-sm text-st-muted">{item.dish_serial_number || 'N/A'}</td>
                    <td className="p-4 text-sm text-st-muted">{item.kit_starlink || 'N/A'}</td>
                    <td className="p-4 text-sm text-st-muted">{item.h3_cell_id_actual || 'Desconocida'}</td>
                    <td className="p-4 text-sm text-st-muted">{item.software_version_actual || 'N/A'}</td>
                    <td className="p-4">
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        ONLINE
                      </span>
                    </td>
                  </tr>
                ))}
                {activeTab === 'terminales' && filteredTerminales.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-st-muted">No se encontraron terminales.</td>
                  </tr>
                )}

                {activeTab === 'routers' && filteredRouters.map(item => (
                  <tr key={item.id} className="border-b border-st-border/50 hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <a href="#" className="font-medium text-st-accent hover:underline">{item.router_id}</a>
                    </td>
                    <td className="p-4 text-sm text-st-muted">{item.serial_number || 'N/A'}</td>
                    <td className="p-4 text-sm text-st-muted">{item.terminal_asignado || 'N/A'}</td>
                    <td className="p-4 text-sm text-st-muted">{item.firmware_version || 'N/A'}</td>
                    <td className="p-4">
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        ONLINE
                      </span>
                    </td>
                  </tr>
                ))}
                {activeTab === 'routers' && filteredRouters.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-st-muted">No se encontraron routers.</td>
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
