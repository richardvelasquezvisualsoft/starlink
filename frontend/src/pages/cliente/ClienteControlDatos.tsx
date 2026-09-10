import React, { useState, useEffect } from 'react';
import { Search, ShieldAlert, Activity, Save } from 'lucide-react';
import client from '../../api/client';

export const ClienteControlDatos: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await client.get('/lineas-servicio');
      const lines = res.data.map((item: any) => ({
        ...item,
        permitir_excedentes_opt_in: item.permitir_excedentes_opt_in || false,
        umbral_alerta: 80 // mock threshold
      }));
      setData(lines);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleExcedentes = (id: number) => {
    setData(prev => prev.map(item => 
      item.id === id ? { ...item, permitir_excedentes_opt_in: !item.permitir_excedentes_opt_in } : item
    ));
    // In a real app we would call a PUT endpoint
  };

  const handleUmbralChange = (id: number, val: number) => {
    setData(prev => prev.map(item => 
      item.id === id ? { ...item, umbral_alerta: val } : item
    ));
  };

  const filteredData = data.filter(item => 
    item.numero_linea.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.nombre?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans uppercase">Control de Datos</h1>
          <p className="text-xs text-st-muted mt-0.5">Gestión de alertas de consumo, límites y opt-in para excedentes por línea.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-st-accent text-white rounded-lg text-sm font-bold shadow-[0_0_15px_rgba(59,130,246,0.5)] hover:bg-blue-500 transition-colors">
          <Save className="w-4 h-4" /> Guardar Cambios
        </button>
      </div>

      <div className="bg-st-surface border border-st-border rounded-xl p-4 flex items-start gap-4 shadow-lg">
        <div className="p-3 bg-st-accent/10 rounded-full text-st-accent mt-1">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-white font-bold text-sm uppercase tracking-wider">Políticas de Excedentes (Opt-In)</h3>
          <p className="text-st-muted text-xs mt-1 max-w-2xl">
            De forma predeterminada, los servicios con un límite estricto de GB se suspenderán una vez consumidos. 
            Active el "Opt-In de Excedentes" para autorizar el consumo de GB adicionales a $0.25 USD por GB.
          </p>
        </div>
      </div>

      <div className="bg-st-surface border border-st-border rounded-xl flex flex-col min-h-[400px]">
        <div className="p-4 border-b border-st-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-st-muted" />
            <input
              type="text"
              placeholder="Buscar línea o terminal..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-st-bg border border-st-border rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:border-st-accent outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
             <div className="flex h-full min-h-[300px] items-center justify-center">
               <Activity className="w-8 h-8 animate-spin text-st-accent" />
             </div>
          ) : (
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-st-bg/80 text-st-muted uppercase tracking-wider font-semibold border-b border-st-border">
                  <th className="py-3 px-4">Línea / Terminal</th>
                  <th className="py-3 px-4">Plan Actual</th>
                  <th className="py-3 px-4">Umbral de Alerta (%)</th>
                  <th className="py-3 px-4 text-center">Permitir Excedentes</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item) => (
                  <tr key={item.id} className="border-b border-st-border/50 hover:bg-white/5 transition-colors">
                    <td className="py-4 px-4 text-white">
                      <div className="font-bold text-sm">{item.nombre || item.dispositivo?.device_id || 'Sin Nombre'}</div>
                      <div className="text-xs text-st-muted font-mono">{item.numero_linea}</div>
                    </td>
                    <td className="py-4 px-4 text-st-muted text-xs">
                      {item.plan_contratado || 'Starlink Standard'}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <input 
                          type="range" 
                          min="50" max="100" step="5"
                          value={item.umbral_alerta}
                          onChange={(e) => handleUmbralChange(item.id, parseInt(e.target.value))}
                          className="w-32 accent-st-accent"
                        />
                        <span className="text-white font-mono text-xs w-8 text-right">{item.umbral_alerta}%</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex justify-center">
                        <button 
                          onClick={() => handleToggleExcedentes(item.id)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${item.permitir_excedentes_opt_in ? 'bg-st-accent' : 'bg-st-bg border border-st-border'}`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${item.permitir_excedentes_opt_in ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-st-muted text-sm">
                      No se encontraron líneas de servicio.
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

export default ClienteControlDatos;
