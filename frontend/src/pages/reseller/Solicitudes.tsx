import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import client from '../../api/client';
import { Filter, Plus, Search, RefreshCw, Briefcase, CheckCircle, AlertTriangle, XCircle, StopCircle, User } from 'lucide-react';
import AlertPopup from '../../components/AlertPopup';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import ConfiguracionSLA from './ConfiguracionSLA';
import SolicitudDetail from './SolicitudDetail';
import NuevaSolicitudModal from './NuevaSolicitudModal';

export default function Solicitudes() {
  const location = useLocation();
  const isCliente = location.pathname.startsWith('/cliente');

  const [activeTab, setActiveTab] = useState<'SOLICITUDES' | 'CONFIG_SLA'>('SOLICITUDES');
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

  // Create Solicitud Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    if (activeTab === 'SOLICITUDES' && !selectedSolicitudId) {
      fetchSolicitudes();
    }
  }, [activeTab, selectedSolicitudId]);

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

  const filteredSolicitudes = solicitudes.filter(s => {
    if (filterEstado !== "TODOS" && s.estado !== filterEstado) return false;
    if (filterPrioridad !== "TODOS" && s.prioridad !== filterPrioridad) return false;
    if (filterSemaforo !== "TODOS" && s.sla_semaforo !== filterSemaforo) return false;
    if (filterSearch && !s.codigo_solicitud.toLowerCase().includes(filterSearch.toLowerCase()) && !(s.tipo_solicitud_nombre || "").toLowerCase().includes(filterSearch.toLowerCase())) return false;
    return true;
  });

  const getSemaforoIcon = (semaforo: string) => {
    switch (semaforo) {
      case 'VERDE': return <span className="flex items-center gap-1 text-green-500 bg-green-500/10 px-2 py-0.5 rounded text-[10px] font-bold"><CheckCircle className="w-3 h-3" /> EN PLAZO</span>;
      case 'AMARILLO': return <span className="flex items-center gap-1 text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded text-[10px] font-bold"><AlertTriangle className="w-3 h-3" /> PRÓXIMA</span>;
      case 'ROJO': return <span className="flex items-center gap-1 text-red-500 bg-red-500/10 px-2 py-0.5 rounded text-[10px] font-bold"><XCircle className="w-3 h-3" /> VENCIDA</span>;
      case 'AZUL': return <span className="flex items-center gap-1 text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded text-[10px] font-bold"><StopCircle className="w-3 h-3" /> PAUSADA</span>;
      case 'GRIS': return <span className="flex items-center gap-1 text-gray-400 bg-gray-500/10 px-2 py-0.5 rounded text-[10px] font-bold"><CheckCircle className="w-3 h-3" /> CERRADA</span>;
      default: return <span className="text-gray-500 text-[10px]">SIN SLA</span>;
    }
  };

  const getStatusColor = (estado: string) => {
    switch(estado) {
      case 'PENDIENTE': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
      case 'EN_REVISION': return 'bg-purple-500/20 text-purple-500 border-purple-500/30';
      case 'REQUIERE_INFORMACION': return 'bg-blue-500/20 text-blue-500 border-blue-500/30';
      case 'APROBADA': return 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30';
      case 'EN_PROCESO': return 'bg-indigo-500/20 text-indigo-500 border-indigo-500/30';
      case 'ATENDIDA': return 'bg-green-500/20 text-green-500 border-green-500/30';
      case 'RECHAZADA': return 'bg-red-500/20 text-red-500 border-red-500/30';
      case 'CANCELADA': return 'bg-gray-500/20 text-gray-500 border-gray-500/30';
      default: return 'bg-st-surface border-st-border text-st-muted';
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

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans uppercase">SOLICITUDES</h1>
          <p className="text-xs text-st-muted mt-0.5">Gestión de solicitudes, tiempos de atención y seguimiento.</p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-st-accent text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-st-accent/80 transition-all shadow-lg shadow-st-accent/20 cursor-pointer self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          Crear Solicitud
        </button>
      </div>

      {!isCliente && (
        <div className="flex space-x-1 border-b border-st-border">
          <button
            onClick={() => setActiveTab('SOLICITUDES')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'SOLICITUDES' ? 'border-st-accent text-white' : 'border-transparent text-st-muted hover:text-white hover:border-white/20'
            }`}
          >
            Solicitudes
          </button>
          <button
            onClick={() => setActiveTab('CONFIG_SLA')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'CONFIG_SLA' ? 'border-st-accent text-white' : 'border-transparent text-st-muted hover:text-white hover:border-white/20'
            }`}
          >
            Configuración SLA
          </button>
        </div>
      )}

      {activeTab === 'SOLICITUDES' && (
        <div className="space-y-4">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-st-surface border border-st-border rounded-xl p-4 flex items-center justify-between shadow-lg">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-st-muted uppercase tracking-wider">Abiertas</p>
                <p className="text-2xl font-bold text-white font-sans">{abiertas}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                <Briefcase className="w-5 h-5" />
              </div>
            </div>
            <div className="bg-st-surface border border-red-500/30 rounded-xl p-4 flex items-center justify-between shadow-lg">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider">SLA Vencidas</p>
                <p className="text-2xl font-bold text-red-500 font-sans">{slaVencidas}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center">
                <XCircle className="w-5 h-5" />
              </div>
            </div>
            <div className="bg-st-surface border border-yellow-500/30 rounded-xl p-4 flex items-center justify-between shadow-lg">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-yellow-500 uppercase tracking-wider">Próximas a vencer</p>
                <p className="text-2xl font-bold text-yellow-500 font-sans">{proximasVencer}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-yellow-500/10 text-yellow-500 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <div className="bg-st-surface border border-st-border rounded-xl p-4 flex items-center justify-between shadow-lg">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-st-muted uppercase tracking-wider">Atendidas este mes</p>
                <p className="text-2xl font-bold text-green-500 font-sans">{atendidasEsteMes}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-green-500/10 text-green-500 flex items-center justify-center">
                <CheckCircle className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 bg-st-surface border border-st-border p-3 rounded-xl">
            <div className="flex items-center gap-2 text-st-muted text-sm border-r border-st-border pr-3">
              <Filter className="w-4 h-4" />
              <span className="font-medium hidden sm:inline">Filtros</span>
            </div>
            
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-st-muted" />
              <input
                type="text"
                placeholder="Buscar código o tipo..."
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                className="pl-9 pr-4 py-1.5 bg-black/20 border border-st-border rounded-lg text-sm text-white focus:outline-none focus:border-st-accent transition-colors w-48"
              />
            </div>

            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="px-3 py-1.5 bg-black/20 border border-st-border rounded-lg text-sm text-white focus:outline-none focus:border-st-accent transition-colors"
            >
              <option value="TODOS" className="bg-st-surface">Todos los Estados</option>
              <option value="PENDIENTE" className="bg-st-surface">PENDIENTE</option>
              <option value="EN_REVISION" className="bg-st-surface">EN REVISIÓN</option>
              <option value="REQUIERE_INFORMACION" className="bg-st-surface">REQUIERE INFO</option>
              <option value="APROBADA" className="bg-st-surface">APROBADA</option>
              <option value="EN_PROCESO" className="bg-st-surface">EN PROCESO</option>
              <option value="ATENDIDA" className="bg-st-surface">ATENDIDA</option>
              <option value="RECHAZADA" className="bg-st-surface">RECHAZADA</option>
            </select>

            <select
              value={filterPrioridad}
              onChange={(e) => setFilterPrioridad(e.target.value)}
              className="px-3 py-1.5 bg-black/20 border border-st-border rounded-lg text-sm text-white focus:outline-none focus:border-st-accent transition-colors"
            >
              <option value="TODOS" className="bg-st-surface">Todas las Prioridades</option>
              <option value="BAJA" className="bg-st-surface">BAJA</option>
              <option value="NORMAL" className="bg-st-surface">NORMAL</option>
              <option value="ALTA" className="bg-st-surface">ALTA</option>
              <option value="URGENTE" className="bg-st-surface">URGENTE</option>
            </select>

            <select
              value={filterSemaforo}
              onChange={(e) => setFilterSemaforo(e.target.value)}
              className="px-3 py-1.5 bg-black/20 border border-st-border rounded-lg text-sm text-white focus:outline-none focus:border-st-accent transition-colors"
            >
              <option value="TODOS" className="bg-st-surface">Cualquier SLA</option>
              <option value="VERDE" className="bg-st-surface">SLA EN PLAZO (Verde)</option>
              <option value="AMARILLO" className="bg-st-surface">SLA PRÓXIMO (Amarillo)</option>
              <option value="ROJO" className="bg-st-surface">SLA VENCIDO (Rojo)</option>
              <option value="AZUL" className="bg-st-surface">SLA PAUSADO (Azul)</option>
            </select>

            <button
              onClick={fetchSolicitudes}
              className="ml-auto flex items-center gap-2 px-3 py-1.5 bg-st-surface border border-st-border text-white text-xs font-semibold rounded-lg hover:bg-white/5 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refrescar
            </button>
          </div>

          {/* Table */}
          <div className="bg-st-surface border border-st-border rounded-xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-st-border bg-black/20 text-[10px] font-bold text-st-muted uppercase tracking-wider">
                    <th className="p-4">Código</th>
                    <th className="p-4">Fecha</th>
                    <th className="p-4">Tipo / Prioridad</th>
                    <th className="p-4">SLA</th>
                    <th className="p-4">Estado</th>
                    <th className="p-4">Responsable</th>
                    <th className="p-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-st-border/50">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-st-muted text-sm">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-st-accent" />
                        Cargando solicitudes...
                      </td>
                    </tr>
                  ) : filteredSolicitudes.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-st-muted text-sm">
                        <Filter className="w-6 h-6 mx-auto mb-2 text-st-muted opacity-50" />
                        No hay solicitudes que coincidan con los filtros
                      </td>
                    </tr>
                  ) : (
                    filteredSolicitudes.map((s) => (
                      <tr key={s.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-white text-sm font-mono">{s.codigo_solicitud}</div>
                          <div className="text-[10px] text-st-muted">{s.motivo || 'Sin motivo especificado'}</div>
                        </td>
                        <td className="p-4 text-xs text-st-muted font-mono">
                          {s.fecha_solicitud ? format(new Date(s.fecha_solicitud), 'dd/MM/yyyy HH:mm', { locale: es }) : '-'}
                        </td>
                        <td className="p-4">
                          <div className="text-xs font-semibold text-white">{s.tipo_solicitud_nombre || 'General'}</div>
                          <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded mt-0.5 ${
                            s.prioridad === 'URGENTE' || s.prioridad === 'CRITICA' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                            s.prioridad === 'ALTA' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                            s.prioridad === 'NORMAL' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                            'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                          }`}>
                            {s.prioridad}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col gap-0.5">
                            {getSemaforoIcon(s.sla_semaforo)}
                            {s.sla_minutos_restantes !== null && (
                              <span className="text-[10px] text-st-muted">Restan {Math.round(s.sla_minutos_restantes / 60)}h</span>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border ${getStatusColor(s.estado)}`}>
                            {s.estado.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {s.asignado_a_nombre ? (
                              <>
                                <div className="w-6 h-6 rounded-full bg-st-accent/20 flex items-center justify-center border border-st-accent/30 text-st-accent text-xs font-bold">
                                  {s.asignado_a_nombre.charAt(0)}
                                </div>
                                <span className="text-sm text-st-muted">{s.asignado_a_nombre}</span>
                              </>
                            ) : (
                              <span className="text-xs text-st-muted italic flex items-center gap-1">
                                <User className="w-3 h-3" /> Sin asignar
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => setSelectedSolicitudId(s.id)}
                            className="px-3 py-1.5 bg-st-accent/10 text-st-accent border border-st-accent/20 rounded hover:bg-st-accent hover:text-white transition-colors text-xs font-bold uppercase tracking-wider"
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
          </div>
        </div>
      )}

      {activeTab === 'CONFIG_SLA' && !isCliente && (
        <ConfiguracionSLA />
      )}

      {/* Modal Crear Solicitud */}
      <NuevaSolicitudModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(createdId) => {
          setSelectedSolicitudId(createdId);
          fetchSolicitudes();
        }}
      />
    </div>
  );
}
