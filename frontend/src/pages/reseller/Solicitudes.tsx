import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import client from '../../api/client';
import { Filter, Plus, Search, RefreshCw, Briefcase, CheckCircle, AlertTriangle, XCircle, StopCircle, User, ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react';
import AlertPopup from '../../components/AlertPopup';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import SolicitudDetail from './SolicitudDetail';
import NuevaSolicitudModal from './NuevaSolicitudModal';
import Pagination from '../../components/Pagination';

export default function Solicitudes() {
  const location = useLocation();
  const isCliente = location.pathname.startsWith('/cliente');

  const [selectedSolicitudId, setSelectedSolicitudId] = useState<number | null>(null);
  
  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{isOpen: boolean, title: string, message: string, type: "info" | "error" | "success"}>({
    isOpen: false, title: "", message: "", type: "info"
  });
  
  // Filters
  const [filterEstado, setFilterEstado] = useState<string>("TODOS");
  const [filterPrioridad, setFilterPrioridad] = useState<string>("TODOS");
  const [filterSemaforo, setFilterSemaforo] = useState<string>("TODOS");
  const [filterSearch, setFilterSearch] = useState<string>("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [sortBy, setSortBy] = useState<string>('fecha_solicitud');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('asc');
    }
  };

  // Create Solicitud Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [initialAlertData, setInitialAlertData] = useState<any>(null);

  useEffect(() => {
    if (location.state?.openModal) {
      setIsCreateModalOpen(true);
      if (location.state?.alertData) {
        setInitialAlertData(location.state.alertData);
      }
    }
  }, [location.state]);

  useEffect(() => {
    if (!selectedSolicitudId) {
      fetchSolicitudes();
    }
  }, [selectedSolicitudId]);

  const fetchSolicitudes = async () => {
    setLoading(true);
    try {
      const response = await client.get('/solicitudes');
      setSolicitudes(response.data);
    } catch (error) {
      console.error(error);
      setAlert({
        isOpen: true,
        title: "Error",
        message: "No se pudieron cargar las solicitudes.",
        type: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setIsCreateModalOpen(true);
  };

  const filteredSolicitudes = solicitudes.filter(s => {
    if (filterEstado !== "TODOS" && s.estado !== filterEstado) return false;
    if (filterPrioridad !== "TODOS" && s.prioridad !== filterPrioridad) return false;
    if (filterSemaforo !== "TODOS" && s.sla_semaforo !== filterSemaforo) return false;
    if (filterSearch && !s.codigo_solicitud.toLowerCase().includes(filterSearch.toLowerCase()) && !(s.tipo_solicitud_nombre || "").toLowerCase().includes(filterSearch.toLowerCase()) && !(s.motivo || "").toLowerCase().includes(filterSearch.toLowerCase())) return false;
    return true;
  });

  const sortedSolicitudes = useMemo(() => {
    const list = [...filteredSolicitudes];
    list.sort((a: any, b: any) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      if (sortBy === 'fecha_solicitud') {
        aVal = a.fecha_solicitud ? new Date(a.fecha_solicitud).getTime() : 0;
        bVal = b.fecha_solicitud ? new Date(b.fecha_solicitud).getTime() : 0;
      } else if (sortBy === 'sla') {
        aVal = a.sla_minutos_restantes !== null && a.sla_minutos_restantes !== undefined ? Number(a.sla_minutos_restantes) : 999999;
        bVal = b.sla_minutos_restantes !== null && b.sla_minutos_restantes !== undefined ? Number(b.sla_minutos_restantes) : 999999;
      } else if (sortBy === 'responsable') {
        aVal = a.responsable_nombre || '';
        bVal = b.responsable_nombre || '';
      }

      if (aVal === undefined || aVal === null) aVal = '';
      if (bVal === undefined || bVal === null) bVal = '';

      if (typeof aVal === 'string') {
        const comp = aVal.localeCompare(String(bVal));
        return sortDirection === 'asc' ? comp : -comp;
      }
      return sortDirection === 'asc' ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);
    });
    return list;
  }, [filteredSolicitudes, sortBy, sortDirection]);

  // Reset pagination on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterEstado, filterPrioridad, filterSemaforo, filterSearch]);

  const paginatedSolicitudes = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedSolicitudes.slice(start, start + pageSize);
  }, [sortedSolicitudes, currentPage, pageSize]);

  if (selectedSolicitudId) {
    return (
      <SolicitudDetail 
        solicitudId={selectedSolicitudId} 
        onBack={() => {
          setSelectedSolicitudId(null);
          fetchSolicitudes();
        }} 
      />
    );
  }

  const renderSortIcon = (field: string) => {
    if (sortBy === field) {
      return sortDirection === 'asc' ? (
        <ChevronUp className="w-3.5 h-3.5 text-st-accent flex-shrink-0" />
      ) : (
        <ChevronDown className="w-3.5 h-3.5 text-st-accent flex-shrink-0" />
      );
    }
    return <ArrowUpDown className="w-3 h-3 flex-shrink-0 transition-colors text-st-muted group-hover:text-white" />;
  };

  const getSemaforoIcon = (semaforo: string) => {
    switch (semaforo) {
      case 'VERDE': return <span className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-lg text-[11px] font-bold"><CheckCircle className="w-3 h-3 text-emerald-400" /> EN PLAZO</span>;
      case 'AMARILLO': return <span className="flex items-center gap-1 text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-lg text-[11px] font-bold"><AlertTriangle className="w-3 h-3 text-amber-400" /> PRÓXIMA</span>;
      case 'ROJO': return <span className="flex items-center gap-1 text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded-lg text-[11px] font-bold"><XCircle className="w-3 h-3 text-rose-400" /> VENCIDA</span>;
      case 'AZUL': return <span className="flex items-center gap-1 text-sky-400 bg-sky-500/10 border border-sky-500/30 px-2 py-0.5 rounded-lg text-[11px] font-bold"><StopCircle className="w-3 h-3 text-sky-400" /> PAUSADA</span>;
      case 'GRIS': return <span className="flex items-center gap-1 text-st-muted bg-white/5 border border-st-border px-2 py-0.5 rounded-lg text-[11px] font-bold"><CheckCircle className="w-3 h-3 text-st-muted" /> CERRADA</span>;
      default: return <span className="text-st-muted font-bold text-[11px]">SIN SLA</span>;
    }
  };

  const getStatusColor = (estado: string) => {
    switch(estado) {
      case 'PENDIENTE': return 'bg-amber-500/10 text-amber-400 border-amber-500/30 font-bold';
      case 'EN_REVISION': return 'bg-purple-500/10 text-purple-400 border-purple-500/30 font-bold';
      case 'REQUIERE_INFORMACION': return 'bg-sky-500/10 text-sky-400 border-sky-500/30 font-bold';
      case 'APROBADA': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-bold';
      case 'EN_PROCESO': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30 font-bold';
      case 'ATENDIDA': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-bold';
      case 'RECHAZADA': return 'bg-rose-500/10 text-rose-400 border-rose-500/30 font-bold';
      case 'CANCELADA': return 'bg-white/5 text-st-muted border-st-border font-bold';
      default: return 'bg-white/5 border-st-border text-st-muted font-bold';
    }
  };

  // KPIs
  const abiertas = solicitudes.filter(s => !['ATENDIDA', 'RECHAZADA', 'CANCELADA'].includes(s.estado)).length;
  const slaVencidas = solicitudes.filter(s => s.sla_semaforo === 'ROJO').length;
  const proximasVencer = solicitudes.filter(s => s.sla_semaforo === 'AMARILLO').length;
  const mesActual = new Date().getMonth();
  const atendidasEsteMes = solicitudes.filter(s => s.estado === 'ATENDIDA' && new Date(s.fecha_atendida).getMonth() === mesActual).length;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <AlertPopup 
        isOpen={alert.isOpen} 
        message={alert.message} 
        type={alert.type} 
        onClose={() => setAlert(prev => ({...prev, isOpen: false}))} 
      />

      {/* Top Title & CTA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight font-sans uppercase text-white">
            SOLICITUDES
          </h1>
          <p className="text-xs mt-0.5 text-st-muted font-medium">
            Gestión de solicitudes, tiempos de atención y seguimiento.
          </p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 px-5 py-2.5 bg-st-accent text-white font-extrabold text-xs uppercase tracking-wider rounded-xl hover:bg-st-accent/90 transition-all shadow-md cursor-pointer self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          Crear Solicitud
        </button>
      </div>

      <div className="space-y-5">
          
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-xl p-5 flex items-center justify-between transition-colors bg-st-surface border border-st-border shadow-lg">
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-wider font-bold text-st-muted">Abiertas</p>
                <p className="text-3xl font-black font-sans text-white">{abiertas}</p>
              </div>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center border bg-st-bg text-st-accent border-st-border">
                <Briefcase className="w-5 h-5" />
              </div>
            </div>

            <div className="rounded-xl p-5 flex items-center justify-between transition-colors bg-st-surface border border-st-border shadow-lg">
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-wider font-bold text-rose-400">SLA Vencidas</p>
                <p className="text-3xl font-black font-sans text-rose-400">{slaVencidas}</p>
              </div>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center border bg-st-bg text-rose-400 border-rose-500/30">
                <XCircle className="w-5 h-5" />
              </div>
            </div>

            <div className="rounded-xl p-5 flex items-center justify-between transition-colors bg-st-surface border border-st-border shadow-lg">
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-wider font-bold text-amber-400">Próximas a vencer</p>
                <p className="text-3xl font-black font-sans text-amber-400">{proximasVencer}</p>
              </div>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center border bg-st-bg text-amber-400 border-amber-500/30">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>

            <div className="rounded-xl p-5 flex items-center justify-between transition-colors bg-st-surface border border-st-border shadow-lg">
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-wider font-bold text-emerald-400">Atendidas este mes</p>
                <p className="text-3xl font-black font-sans text-emerald-400">{atendidasEsteMes}</p>
              </div>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center border bg-st-bg text-emerald-400 border-emerald-500/30">
                <CheckCircle className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Filters Toolbar */}
          <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl bg-st-surface border border-st-border shadow-lg">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider border-r pr-3 text-st-muted font-bold border-st-border">
              <Filter className="w-4 h-4 text-st-accent" />
              <span className="hidden sm:inline">Filtros</span>
            </div>
            
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-st-muted" />
              <input
                type="text"
                placeholder="Buscar código o tipo..."
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                className="pl-9 pr-4 py-2 rounded-xl text-xs font-bold transition-all w-56 focus:outline-none focus:border-st-accent bg-st-bg border border-st-border text-white placeholder-st-muted/60"
              />
            </div>

            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer focus:outline-none focus:border-st-accent bg-st-bg border border-st-border text-white"
            >
              <option value="TODOS" className="bg-st-surface text-white">Todos los Estados</option>
              <option value="PENDIENTE" className="bg-st-surface text-white">PENDIENTE</option>
              <option value="EN_REVISION" className="bg-st-surface text-white">EN REVISIÓN</option>
              <option value="REQUIERE_INFORMACION" className="bg-st-surface text-white">REQUIERE INFO</option>
              <option value="APROBADA" className="bg-st-surface text-white">APROBADA</option>
              <option value="EN_PROCESO" className="bg-st-surface text-white">EN PROCESO</option>
              <option value="ATENDIDA" className="bg-st-surface text-white">ATENDIDA</option>
              <option value="RECHAZADA" className="bg-st-surface text-white">RECHAZADA</option>
            </select>

            <select
              value={filterPrioridad}
              onChange={(e) => setFilterPrioridad(e.target.value)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer focus:outline-none focus:border-st-accent bg-st-bg border border-st-border text-white"
            >
              <option value="TODOS" className="bg-st-surface text-white">Todas las Prioridades</option>
              <option value="BAJA" className="bg-st-surface text-white">BAJA</option>
              <option value="NORMAL" className="bg-st-surface text-white">NORMAL</option>
              <option value="ALTA" className="bg-st-surface text-white">ALTA</option>
              <option value="URGENTE" className="bg-st-surface text-white">URGENTE</option>
            </select>

            <select
              value={filterSemaforo}
              onChange={(e) => setFilterSemaforo(e.target.value)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer focus:outline-none focus:border-st-accent bg-st-bg border border-st-border text-white"
            >
              <option value="TODOS" className="bg-st-surface text-white">Cualquier SLA</option>
              <option value="VERDE" className="bg-st-surface text-white">SLA EN PLAZO (Verde)</option>
              <option value="AMARILLO" className="bg-st-surface text-white">SLA PRÓXIMO (Amarillo)</option>
              <option value="ROJO" className="bg-st-surface text-white">SLA VENCIDO (Rojo)</option>
              <option value="AZUL" className="bg-st-surface text-white">SLA PAUSADO (Azul)</option>
            </select>

            <button
              onClick={fetchSolicitudes}
              className="ml-auto flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer bg-st-bg border border-st-border text-st-muted hover:text-white hover:bg-white/5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refrescar
            </button>
          </div>

          {/* Table */}
          <div className="rounded-xl overflow-hidden bg-st-surface border border-st-border shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b text-xs uppercase tracking-wider border-st-border bg-st-bg font-bold text-gray-300">
                    <th
                      className="p-4 cursor-pointer select-none transition-colors group hover:text-white"
                      onClick={() => handleSort('codigo_solicitud')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Código / Asunto</span>
                        {renderSortIcon('codigo_solicitud')}
                      </div>
                    </th>
                    <th
                      className="p-4 cursor-pointer select-none transition-colors group hover:text-white"
                      onClick={() => handleSort('fecha_solicitud')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Fecha</span>
                        {renderSortIcon('fecha_solicitud')}
                      </div>
                    </th>
                    <th
                      className={`p-4 cursor-pointer select-none transition-colors group ${isCliente ? 'hover:text-black' : 'hover:text-white'}`}
                      onClick={() => handleSort('tipo_solicitud_nombre')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Tipo / Prioridad</span>
                        {renderSortIcon('tipo_solicitud_nombre')}
                      </div>
                    </th>
                    <th
                      className={`p-4 cursor-pointer select-none transition-colors group ${isCliente ? 'hover:text-black' : 'hover:text-white'}`}
                      onClick={() => handleSort('sla')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>SLA</span>
                        {renderSortIcon('sla')}
                      </div>
                    </th>
                    <th
                      className={`p-4 cursor-pointer select-none transition-colors group ${isCliente ? 'hover:text-black' : 'hover:text-white'}`}
                      onClick={() => handleSort('estado')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Estado</span>
                        {renderSortIcon('estado')}
                      </div>
                    </th>
                    <th
                      className={`p-4 cursor-pointer select-none transition-colors group ${isCliente ? 'hover:text-black' : 'hover:text-white'}`}
                      onClick={() => handleSort('responsable')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Responsable</span>
                        {renderSortIcon('responsable')}
                      </div>
                    </th>
                    <th className="p-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isCliente ? 'divide-gray-100' : 'divide-st-border/50'}`}>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className={`p-12 text-center text-sm ${isCliente ? 'text-gray-600' : 'text-st-muted'}`}>
                        <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-3 text-st-accent" />
                        <span className="font-bold">Cargando solicitudes...</span>
                      </td>
                    </tr>
                  ) : sortedSolicitudes.length === 0 ? (
                    <tr>
                      <td colSpan={7} className={`p-12 text-center text-sm ${isCliente ? 'text-gray-600' : 'text-st-muted'}`}>
                        <Filter className="w-8 h-8 mx-auto mb-3 text-gray-400" />
                        <span className={`font-bold ${isCliente ? 'text-gray-700' : 'text-st-muted'}`}>No hay solicitudes que coincidan con los filtros</span>
                      </td>
                    </tr>
                  ) : (
                    paginatedSolicitudes.map((s) => (
                      <tr key={s.id} className={`transition-colors ${isCliente ? 'hover:bg-white/[0.03]' : 'hover:bg-white/[0.03]'}`}>
                        <td className="p-4">
                          <div className={`font-mono font-bold text-sm ${isCliente ? 'text-white' : 'text-white'}`}>{s.codigo_solicitud}</div>
                          <div className={`text-xs font-medium line-clamp-1 mt-0.5 ${isCliente ? 'text-gray-300' : 'text-st-muted'}`}>{s.motivo || 'Sin motivo especificado'}</div>
                        </td>
                        <td className={`p-4 text-xs font-mono font-bold whitespace-nowrap ${isCliente ? 'text-gray-300' : 'text-st-muted'}`}>
                          {s.fecha_solicitud ? format(new Date(s.fecha_solicitud), 'dd/MM/yyyy HH:mm', { locale: es }) : '-'}
                        </td>
                        <td className="p-4">
                          <div className="text-xs font-bold text-white">{s.tipo_solicitud_nombre || 'General'}</div>
                          <span className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full mt-1 ${
                            s.prioridad === 'URGENTE' || s.prioridad === 'CRITICA' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' :
                            s.prioridad === 'ALTA' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                            s.prioridad === 'NORMAL' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30' :
                            'bg-white/5 text-st-muted border border-st-border'
                          }`}>
                            {s.prioridad}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col gap-1">
                            {getSemaforoIcon(s.sla_semaforo)}
                            {s.sla_minutos_restantes !== null && (
                              <span className="text-[10px] font-mono text-gray-400">Restan {Math.round(s.sla_minutos_restantes / 60)}h</span>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold uppercase border ${getStatusColor(s.estado)}`}>
                            {s.estado ? s.estado.replace('_', ' ') : 'PENDIENTE'}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {s.asignado_a_nombre ? (
                              <>
                                <div className="w-6 h-6 rounded-full bg-st-accent/10 border border-st-accent/30 text-st-accent text-xs font-bold flex items-center justify-center">
                                  {s.asignado_a_nombre.charAt(0).toUpperCase()}
                                </div>
                                <span className="text-sm font-medium text-white">{s.asignado_a_nombre}</span>
                              </>
                            ) : (
                              <span className="text-xs italic flex items-center gap-1 text-st-muted">
                                <User className="w-3.5 h-3.5 text-st-muted" /> Sin asignar
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => setSelectedSolicitudId(s.id)}
                            className="px-3.5 py-1.5 rounded-xl transition-all text-xs font-bold uppercase tracking-wider cursor-pointer bg-st-bg text-st-accent border border-st-border hover:bg-st-accent hover:text-black shadow-sm"
                          >
                            Ver Detalle
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={currentPage}
              totalItems={sortedSolicitudes.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        </div>

      {/* Modal Crear Solicitud */}
      <NuevaSolicitudModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setInitialAlertData(null);
        }}
        onSuccess={(createdId) => {
          setSelectedSolicitudId(createdId);
          fetchSolicitudes();
          setInitialAlertData(null);
        }}
        initialAlert={initialAlertData}
      />
    </div>
  );
}

