import React, { useState, useEffect } from 'react';
import { Search, ShieldAlert, Activity, Save } from 'lucide-react';
import client from '../../api/client';
import { useTableSort } from '../../hooks/useTableSort';
import { SortableHeader } from '../../components/ui/SortableHeader';

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

  const { sortedData, sortColumn, sortDirection, handleSort } = useTableSort(filteredData, {
    initialSortColumn: 'nombre',
    initialSortDirection: 'asc'
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-st-primary font-sans leading-tight">Control de Datos</h1>
          <p className="text-[14px] font-medium text-client-text-secondary mt-0.5">Gestión de alertas de consumo, límites y opt-in para excedentes por línea.</p>
        </div>
        <button className="flex items-center gap-2 px-5 py-2.5 bg-[#00A8E8] hover:bg-[#38BDF8] text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-[#00A8E8]/20 transition-all cursor-pointer">
          <Save className="w-4 h-4" /> Guardar Cambios
        </button>
      </div>

      <div className="bg-[#111111] border border-[#222222] rounded-[16px] p-5 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow">
        <div className="p-3 bg-amber-500/10 rounded-[12px] text-[#F59E0B] mt-1">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-white font-bold text-sm uppercase tracking-wider">Políticas de Excedentes (Opt-In)</h3>
          <p className="text-[#94A3B8] text-[13px] mt-1 max-w-2xl leading-relaxed">
            De forma predeterminada, los servicios con un límite estricto de GB se suspenderán una vez consumidos. 
            Active el "Opt-In de Excedentes" para autorizar el consumo de GB adicionales a $0.25 USD por GB.
          </p>
        </div>
      </div>

      <div className="bg-[#111111] border border-[#222222] rounded-[16px] flex flex-col min-h-[400px] shadow-sm">
        <div className="p-4 border-b border-[#222222] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Buscar línea o terminal..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-black border border-[#222222] rounded-lg text-sm text-white placeholder-[#94A3B8]/50 focus:border-[#00A8E8] outline-none transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
             <div className="flex h-full min-h-[300px] items-center justify-center">
               <Activity className="w-8 h-8 animate-spin text-[#00A8E8]" />
             </div>
          ) : (
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-[#1E293B] border-b border-[#222222]">
                  <SortableHeader label="Línea / Terminal" column="nombre" currentSortColumn={sortColumn as string} currentSortDirection={sortDirection} onSort={handleSort as any} className="!py-3 !px-4 !text-xs !text-[#94A3B8] !border-none !bg-transparent" />
                  <SortableHeader label="Plan Actual" column="plan_contratado" currentSortColumn={sortColumn as string} currentSortDirection={sortDirection} onSort={handleSort as any} className="!py-3 !px-4 !text-xs !text-[#94A3B8] !border-none !bg-transparent" />
                  <SortableHeader label="Umbral de Alerta (%)" column="umbral_alerta" currentSortColumn={sortColumn as string} currentSortDirection={sortDirection} onSort={handleSort as any} className="!py-3 !px-4 !text-xs !text-[#94A3B8] !border-none !bg-transparent" />
                  <SortableHeader label="Permitir Excedentes" column="permitir_excedentes_opt_in" currentSortColumn={sortColumn as string} currentSortDirection={sortDirection} onSort={handleSort as any} align="center" className="!py-3 !px-4 !text-xs !text-[#94A3B8] !border-none !bg-transparent" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222222]/40">
                {sortedData.map((item) => (
                  <tr key={item.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-4 px-4 text-white">
                      <div className="font-bold text-sm">{item.nombre || item.dispositivo?.device_id || 'Sin Nombre'}</div>
                      <div className="text-xs text-[#00A8E8] font-mono font-bold">{item.numero_linea}</div>
                    </td>
                    <td className="py-4 px-4 text-[#94A3B8] text-xs">
                      {item.plan_contratado || 'Starlink Standard'}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <input 
                          type="range" 
                          min="50" max="100" step="5"
                          value={item.umbral_alerta}
                          onChange={(e) => handleUmbralChange(item.id, parseInt(e.target.value))}
                          className="w-32 accent-client-primary"
                        />
                        <span className="text-client-text-secondary font-mono text-sm w-8 text-right font-medium">{item.umbral_alerta}%</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex justify-center">
                        <button 
                          onClick={() => handleToggleExcedentes(item.id)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${item.permitir_excedentes_opt_in ? 'bg-client-primary' : 'bg-client-bg-subtle border border-client-border'}`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${item.permitir_excedentes_opt_in ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {sortedData.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-client-text-secondary text-sm">
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
