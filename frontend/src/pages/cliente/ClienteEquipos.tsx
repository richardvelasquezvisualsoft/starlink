import React, { useState, useEffect, useMemo } from 'react';
import { Satellite, Router, Search, Activity } from 'lucide-react';
import client from '../../api/client';
import { useTableSort } from '../../hooks/useTableSort';
import { SortableHeader } from '../../components/ui/SortableHeader';
import Pagination from '../../components/Pagination';

export const ClienteEquipos: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'terminales' | 'routers'>('terminales');
  const [terminales, setTerminales] = useState<any[]>([]);
  const [routers, setRouters] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab]);

  const handleExportCSV = () => {
    if (activeTab === 'terminales') {
      const headers = ['Cuenta', 'Dispositivo', 'Nickname', 'N.º Serie Kit', 'N.º Serie Antena', 'Servicio', 'Última Ubicación', 'H3CellId', 'Fecha Última Telemetría', 'Versión Firmware', 'Estado'];
      const rows = sortedTerminales.map(item => {
        const linea = item.lineas_servicio?.[0];
        const hasTelemetry = !!item.ultima_telemetria;
        const parseDate = (d: any) => {
          if (!d) return null;
          const str = typeof d === 'string' ? d : d.toString();
          return new Date(str.endsWith('Z') || str.includes('+') ? str : str + 'Z');
        };
        const dateObj = parseDate(item.ultima_telemetria);
        const mins = dateObj ? Math.max(0, Math.round((new Date().getTime() - dateObj.getTime()) / 60000)) : 0;
        const isOnline = hasTelemetry && mins < 15;
        const estado = hasTelemetry ? (isOnline ? 'Online' : 'Offline') : 'Sin telemetría';
        const ubicacionFormat = item.h3_cell_id_actual ? `H3: ${item.h3_cell_id_actual} · hace ${mins} min` : 'Sin telemetría';
        return [
          linea?.cuenta?.numero_cuenta || linea?.cuenta_id || '',
          item.device_id || '',
          item.nombre || '',
          item.kit_starlink || 'N/A',
          item.dish_serial_number || 'N/A',
          linea?.numero_linea || '',
          ubicacionFormat,
          item.h3_cell_id_actual || 'N/A',
          item.ultima_telemetria ? new Date(item.ultima_telemetria).toLocaleString() : 'N/A',
          item.software_version_actual || 'No disponible',
          estado
        ];
      });
      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "terminales_export.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

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

  const filteredTerminales = terminales.filter(t => {
    const linea = t.lineas_servicio?.[0];
    const searchTerm = searchQuery.toLowerCase();
    return (
      t.device_id?.toLowerCase().includes(searchTerm) ||
      t.kit_starlink?.toLowerCase().includes(searchTerm) ||
      t.dish_serial_number?.toLowerCase().includes(searchTerm) ||
      t.software_version_actual?.toLowerCase().includes(searchTerm) ||
      linea?.numero_linea?.toLowerCase().includes(searchTerm) ||
      linea?.nombre?.toLowerCase().includes(searchTerm)
    );
  });

  const filteredRouters = routers.filter(r => 
    r.router_id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const { sortedData: sortedTerminales, sortColumn: sortColT, sortDirection: sortDirT, handleSort: handleSortT } = useTableSort(filteredTerminales);
  const { sortedData: sortedRouters, sortColumn: sortColR, sortDirection: sortDirR, handleSort: handleSortR } = useTableSort(filteredRouters);

  // Paginated items
  const paginatedTerminales = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedTerminales.slice(start, start + pageSize);
  }, [sortedTerminales, currentPage, pageSize]);

  const paginatedRouters = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedRouters.slice(start, start + pageSize);
  }, [sortedRouters, currentPage, pageSize]);

  const totalCurrentItems = activeTab === 'terminales' ? sortedTerminales.length : sortedRouters.length;

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-bold tracking-tight text-client-text-primary uppercase">Mis Equipos</h1>
          <p className="text-[13px] text-client-text-secondary mt-0.5">Gestión de terminales Starlink y Routers asociados a tu cuenta.</p>
        </div>
        {activeTab === 'terminales' && (
          <button onClick={handleExportCSV} className="px-4 py-2 bg-client-bg-surface border border-client-border rounded-[8px] text-[13px] text-client-text-secondary hover:text-client-text-primary hover:bg-client-bg-subtle transition-all cursor-pointer font-medium shadow-sm">
            Exportar a CSV
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-client-border">
        <button
          onClick={() => setActiveTab('terminales')}
          className={`flex items-center gap-2 px-6 py-3 text-[13px] font-bold uppercase tracking-wider transition-colors border-b-2 ${activeTab === 'terminales' ? 'border-client-primary text-client-primary bg-client-primary/5' : 'border-transparent text-client-text-secondary hover:text-client-text-primary hover:bg-client-bg-subtle'}`}
        >
          <Satellite className="w-4 h-4" />
          Terminales Starlink
        </button>
        <button
          onClick={() => setActiveTab('routers')}
          className={`flex items-center gap-2 px-6 py-3 text-[13px] font-bold uppercase tracking-wider transition-colors border-b-2 ${activeTab === 'routers' ? 'border-client-primary text-client-primary bg-client-primary/5' : 'border-transparent text-client-text-secondary hover:text-client-text-primary hover:bg-client-bg-subtle'}`}
        >
          <Router className="w-4 h-4" />
          Routers Starlink
        </button>
      </div>

      <div className="bg-client-bg-surface border border-client-border rounded-[12px] flex flex-col flex-1 min-h-[500px] shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="px-5 py-3 border-b border-[#222222] flex flex-col sm:flex-row gap-4 justify-between items-center bg-[#111111]">
          <div className="relative flex-1 max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Buscar por dispositivo, serie, servicio..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-black border border-[#222222] rounded-lg text-sm text-white placeholder-[#94A3B8]/50 focus:border-[#00A8E8] outline-none transition-colors"
            />
          </div>
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
                <h3 className="text-[16px] font-semibold text-white">Error al cargar equipos</h3>
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
                {activeTab === 'terminales' ? (
                  <tr>
                    <SortableHeader label="Cuenta" column="cuenta" currentSortColumn={sortColT as string} currentSortDirection={sortDirT} onSort={handleSortT as any} />
                    <SortableHeader label="Dispositivo" column="device_id" currentSortColumn={sortColT as string} currentSortDirection={sortDirT} onSort={handleSortT as any} />
                    <SortableHeader label="N.º Serie Kit" column="kit_starlink" currentSortColumn={sortColT as string} currentSortDirection={sortDirT} onSort={handleSortT as any} />
                    <SortableHeader label="N.º Serie Antena" column="dish_serial_number" currentSortColumn={sortColT as string} currentSortDirection={sortDirT} onSort={handleSortT as any} />
                    <SortableHeader label="Servicio" column="servicio" currentSortColumn={sortColT as string} currentSortDirection={sortDirT} onSort={handleSortT as any} />
                    <SortableHeader label="Asignación Org." column="asignacion" currentSortColumn={sortColT as string} currentSortDirection={sortDirT} onSort={handleSortT as any} />
                    <SortableHeader label="Última ubicación" column="h3_cell_id_actual" currentSortColumn={sortColT as string} currentSortDirection={sortDirT} onSort={handleSortT as any} />
                    <SortableHeader label="Versión Firmware" column="software_version_actual" currentSortColumn={sortColT as string} currentSortDirection={sortDirT} onSort={handleSortT as any} />
                    <SortableHeader label="Estado" column="estado" currentSortColumn={sortColT as string} currentSortDirection={sortDirT} onSort={handleSortT as any} />
                  </tr>
                ) : (
                  <tr>
                    <SortableHeader label="Router ID" column="router_id" currentSortColumn={sortColR as string} currentSortDirection={sortDirR} onSort={handleSortR as any} />
                    <SortableHeader label="Serial Router" column="serial_number" currentSortColumn={sortColR as string} currentSortDirection={sortDirR} onSort={handleSortR as any} />
                    <SortableHeader label="Terminal Asignado" column="terminal_asignado" currentSortColumn={sortColR as string} currentSortDirection={sortDirR} onSort={handleSortR as any} />
                    <SortableHeader label="Firmware" column="firmware_version" currentSortColumn={sortColR as string} currentSortDirection={sortDirR} onSort={handleSortR as any} />
                    <SortableHeader label="Estado" column="estado" currentSortColumn={sortColR as string} currentSortDirection={sortDirR} onSort={handleSortR as any} />
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-[#222222]/40 bg-[#111111]">
                {activeTab === 'terminales' && paginatedTerminales.map(item => {
                  const linea = item.lineas_servicio?.[0];
                  const hasTelemetry = !!item.ultima_telemetria;
                  const parseDate = (d: any) => {
                    if (!d) return null;
                    const str = typeof d === 'string' ? d : d.toString();
                    return new Date(str.endsWith('Z') || str.includes('+') ? str : str + 'Z');
                  };
                  const dateObj = parseDate(item.ultima_telemetria);
                  const minutesAgo = dateObj ? Math.max(0, Math.round((new Date().getTime() - dateObj.getTime()) / 60000)) : 0;
                  const isOnline = hasTelemetry && minutesAgo < 15;
                  
                  return (
                    <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                      <td className="px-5 py-3.5 text-[13px] text-[#94A3B8] font-medium">
                        {linea?.cuenta?.numero_cuenta || linea?.cuenta_id || 'Sin cuenta'}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-mono font-bold text-[13px] text-[#00A8E8] block group-hover:text-[#38BDF8] transition-colors">{item.device_id}</span>
                        {item.nombre && <span className="text-[12px] text-[#94A3B8] mt-0.5 font-medium block">{item.nombre}</span>}
                      </td>
                      <td className="px-5 py-3.5 text-[13px] text-[#94A3B8] font-mono font-medium">{item.kit_starlink || 'N/A'}</td>
                      <td className="px-5 py-3.5 text-[13px] text-[#94A3B8] font-mono font-medium">{item.dish_serial_number || 'N/A'}</td>
                      <td className="px-5 py-3.5">
                        {linea ? (
                          <div>
                            <span className="font-bold text-[13px] text-white block">{linea.numero_linea}</span>
                            <span className="text-[12px] text-[#94A3B8] mt-0.5 font-medium block">{linea.nombre}</span>
                          </div>
                        ) : (
                          <span className="text-[13px] text-[#94A3B8] font-medium">Sin asignar</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {item.asignacionOrganizacional ? (
                          <div>
                            <span className="font-bold text-[13px] text-white block">{item.asignacionOrganizacional.centroCostoNombre || 'Sin CC'}</span>
                            <span className="text-[12px] text-[#94A3B8] mt-0.5 font-medium block">
                              {item.asignacionOrganizacional.nivel3Nombre || item.asignacionOrganizacional.nivel2Nombre || item.asignacionOrganizacional.nivel1Nombre || ''}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[13px] text-[#94A3B8] font-medium">Sin asignación / —</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {item.h3_cell_id_actual ? (
                          <div>
                            {item.h3_cell_id_actual.includes('demo') ? (
                              <span className="font-bold text-[13px] text-white block">
                                {item.h3_cell_id_actual.endsWith('1') ? 'San Isidro (Lima)' :
                                 item.h3_cell_id_actual.endsWith('2') ? 'Miraflores (Lima)' :
                                 item.h3_cell_id_actual.endsWith('3') ? 'San Borja (Lima)' :
                                 item.h3_cell_id_actual.endsWith('4') ? 'San Miguel (Lima)' : 'Magdalena (Lima)'}
                              </span>
                            ) : (
                              <span className="font-bold text-[13px] text-white block font-mono">
                                Celda H3
                              </span>
                            )}
                            <span className="text-[12px] text-[#94A3B8] mt-0.5 block font-mono font-medium">
                              H3: {item.h3_cell_id_actual} {hasTelemetry ? `· hace ${minutesAgo} min` : ''}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[13px] text-[#94A3B8] font-medium">Sin telemetría</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-[13px] text-[#94A3B8] font-mono font-medium">
                        {item.software_version_actual || 'No disponible'}
                      </td>
                      <td className="px-5 py-3.5">
                        {hasTelemetry ? (
                          <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-[6px] text-xs font-bold uppercase tracking-wide ${isOnline ? 'bg-emerald-500/10 text-[#4ADE80] border border-emerald-500/20' : 'bg-red-500/10 text-[#F87171] border border-red-500/20'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-[#22C55E]' : 'bg-[#EF4444]'}`} />
                            {isOnline ? 'Online' : 'Offline'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-[6px] text-xs font-bold uppercase tracking-wide bg-white/5 text-[#94A3B8] border border-white/10">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#94A3B8]" />
                            Sin telemetría
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {activeTab === 'terminales' && sortedTerminales.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-[13px] font-medium text-[#94A3B8] bg-[#111111]">No se encontraron terminales.</td>
                  </tr>
                )}

                {activeTab === 'routers' && paginatedRouters.map(item => (
                  <tr key={item.id || item.router_id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-5 py-3.5">
                      <span className="font-mono font-bold text-[13px] text-[#00A8E8] group-hover:text-[#38BDF8] transition-colors">{item.router_id}</span>
                    </td>
                    <td className="px-5 py-3.5 text-[13px] text-[#94A3B8] font-medium">{item.serial_number || 'N/A'}</td>
                    <td className="px-5 py-3.5 text-[13px] text-[#94A3B8] font-medium">{item.terminal_asignado || 'N/A'}</td>
                    <td className="px-5 py-3.5 text-[13px] text-[#94A3B8] font-medium">{item.firmware_version || 'N/A'}</td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-[6px] text-xs font-bold uppercase tracking-wide bg-emerald-500/10 text-[#4ADE80] border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
                        ONLINE
                      </span>
                    </td>
                  </tr>
                ))}
                {((activeTab === 'terminales' && paginatedTerminales.length === 0) || (activeTab === 'routers' && paginatedRouters.length === 0)) && (
                  <tr>
                    <td colSpan={activeTab === 'terminales' ? 8 : 5} className="p-8 text-center text-[13px] font-medium text-client-text-secondary bg-client-bg-subtle">
                      No se encontraron equipos.
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
          totalItems={totalCurrentItems}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>
    </div>
  );
};

