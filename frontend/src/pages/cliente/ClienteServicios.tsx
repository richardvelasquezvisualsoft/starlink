import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Radio, Search, Activity } from 'lucide-react';
import client from '../../api/client';
import { useTableSort } from '../../hooks/useTableSort';
import { SortableHeader } from '../../components/ui/SortableHeader';
import Pagination from '../../components/Pagination';

export const ClienteServicios: React.FC = () => {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState(location.state?.searchQuery || '');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const handleExportCSV = () => {
    const headers = ['Cuenta', 'Servicio', 'Nombre Servicio', 'Estado', 'Plan', 'Ubicación'];
    const rows = sortedData.map(item => {
      const dir = item.direcciones_servicio?.[0];
      const ubicacion = dir ? `${dir.direccion_formateada?.split(',')[0]} - ${dir.localidad}` : 'Sin dirección';
      return [
        item.cuenta?.numero_cuenta || item.cuenta_id || '',
        item.numero_linea || '',
        item.nombre || 'Sin nombre',
        item.estado_provisionamiento || 'active',
        item.plan_contratado || '',
        ubicacion
      ];
    });
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

  const { sortedData, sortColumn, sortDirection, handleSort } = useTableSort(filteredData);

  // Reset pagination to page 1 on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  // Paginated items
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-bold tracking-tight text-client-text-primary uppercase">Mis Servicios</h1>
          <p className="text-[13px] text-client-text-secondary mt-0.5">Gestión y estado de servicios asociados a tu cuenta.</p>
        </div>
        <button onClick={handleExportCSV} className="px-4 py-2 bg-client-bg-surface border border-client-border rounded-[8px] text-[13px] text-client-text-secondary hover:text-client-text-primary hover:bg-client-bg-subtle transition-all cursor-pointer font-medium shadow-sm">
          Exportar a CSV
        </button>
      </div>

      <div className="bg-client-bg-surface border border-client-border rounded-[12px] flex flex-col flex-1 min-h-[500px] shadow-sm overflow-hidden">
        {/* Toolbar Estandarizada */}
        <div className="px-5 py-3 border-b border-[#222222] flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-[#111111]">
          <div className="relative flex-1 max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Buscar por cuenta, servicio, plan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-black border border-[#222222] rounded-lg text-sm text-white placeholder-[#94A3B8]/50 focus:border-[#00A8E8] outline-none transition-colors"
            />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-black border border-[#222222] rounded-lg px-3 py-2 text-sm text-white focus:border-[#00A8E8] outline-none cursor-pointer appearance-none min-w-[160px]">
            <option value="ALL">Todos los Estados</option>
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
          </select>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto custom-scrollbar relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-[#111111]/50 backdrop-blur-sm z-10">
              <Activity className="w-8 h-8 animate-spin text-[#00A8E8]" />
            </div>
          ) : error ? (
            <div className="flex flex-col h-full items-center justify-center p-8 text-center space-y-4">
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-full text-red-400">
                <Activity className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-[16px] font-semibold text-white">Error al cargar servicios</h3>
                <p className="text-[13px] text-[#94A3B8] mt-1 max-w-md">{error}</p>
              </div>
              <button 
                onClick={fetchData}
                className="px-4 py-2 bg-black border border-[#222222] hover:bg-white/5 text-white text-[13px] font-semibold rounded-lg transition-colors"
              >
                Reintentar
              </button>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#1E293B] border-b border-[#222222] sticky top-0 z-10 shadow-sm">
                <tr>
                  <SortableHeader label="Cuenta" column="cuenta_id" currentSortColumn={sortColumn as string} currentSortDirection={sortDirection} onSort={handleSort as any} />
                  <SortableHeader label="Servicio" column="numero_linea" currentSortColumn={sortColumn as string} currentSortDirection={sortDirection} onSort={handleSort as any} />
                  <SortableHeader label="Alias / Nombre" column="nombre" currentSortColumn={sortColumn as string} currentSortDirection={sortDirection} onSort={handleSort as any} />
                  <SortableHeader label="Plan" column="plan_contratado" currentSortColumn={sortColumn as string} currentSortDirection={sortDirection} onSort={handleSort as any} />
                  <SortableHeader label="Ubicación" column="direcciones_servicio" currentSortColumn={sortColumn as string} currentSortDirection={sortDirection} onSort={handleSort as any} />
                  <SortableHeader label="Estado" column="estado_provisionamiento" currentSortColumn={sortColumn as string} currentSortDirection={sortDirection} onSort={handleSort as any} />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222222]/40 bg-[#111111]">
                {paginatedData.map((item) => {
                  const dir = item.direcciones_servicio?.[0];
                  const ubicacionStr = dir 
                    ? [dir.direccion_formateada?.split(',')[0], dir.localidad].filter(Boolean).join(' • ')
                    : 'Sin dirección';

                  return (
                    <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                      <td className="px-5 py-3 text-[13px] text-[#94A3B8] font-medium whitespace-nowrap">
                        {item.cuenta?.numero_cuenta || item.cuenta_id}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 bg-black rounded-[6px] border border-[#222222] shadow-xs group-hover:border-[#00A8E8]/40 transition-colors">
                            <Radio className="w-3.5 h-3.5 text-[#00A8E8]" />
                          </div>
                          <span className="font-mono font-bold text-[13px] text-[#00A8E8] group-hover:text-[#38BDF8] transition-colors">
                            {item.numero_linea}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-[13px] text-white font-semibold whitespace-nowrap">
                        {item.nombre || 'Sin nombre'}
                      </td>
                      <td className="px-5 py-3 text-[13px] text-[#94A3B8] font-medium whitespace-nowrap">
                        {item.plan_contratado}
                      </td>
                      <td className="px-5 py-3 text-[13px] text-white font-medium whitespace-nowrap">
                        {ubicacionStr}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-[6px] text-xs font-bold uppercase tracking-wide ${
                          item.estado_provisionamiento === 'active' || !item.estado_provisionamiento 
                            ? 'bg-emerald-500/10 text-[#4ADE80] border border-emerald-500/20' 
                            : 'bg-red-500/10 text-[#F87171] border border-red-500/20'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            item.estado_provisionamiento === 'active' || !item.estado_provisionamiento 
                              ? 'bg-[#22C55E]' 
                              : 'bg-[#EF4444]'
                          }`} />
                          {item.estado_provisionamiento || 'active'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {paginatedData.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-client-text-secondary text-[13px] font-medium bg-client-bg-subtle">
                      No se encontraron registros.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer Pagination */}
        <Pagination
          currentPage={currentPage}
          totalItems={sortedData.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>
    </div>
  );
};
export default ClienteServicios;

