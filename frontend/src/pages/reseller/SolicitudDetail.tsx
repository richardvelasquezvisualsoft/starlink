import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import client from '../../api/client';
import { 
  ArrowLeft, Clock, AlertTriangle, XCircle, CheckCircle, StopCircle, 
  FileText, MessageSquare, History, Settings, Paperclip, Send, 
  RefreshCw, AlertCircle, User
} from 'lucide-react';
import AlertPopup from '../../components/AlertPopup';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  solicitudId: number;
  onBack: () => void;
}

export default function SolicitudDetail({ solicitudId, onBack }: Props) {
  const location = useLocation();
  const isCliente = location.pathname.startsWith('/cliente');

  const [solicitud, setSolicitud] = useState<any>(null);
  const [historial, setHistorial] = useState<any[]>([]);
  const [comentarios, setComentarios] = useState<any[]>([]);
  const [documentos, setDocumentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'DETALLE' | 'DOCUMENTOS' | 'COMENTARIOS' | 'HISTORIAL' | 'GESTION'>('DETALLE');
  
  const [alert, setAlert] = useState<{isOpen: boolean, message: string, type: "info" | "error" | "success"}>({
    isOpen: false, message: "", type: "info"
  });

  const [newComment, setNewComment] = useState("");
  const [commentVisibility, setCommentVisibility] = useState("PUBLICO");
  const [newFile, setNewFile] = useState<File | null>(null);
  const [nuevoEstado, setNuevoEstado] = useState("");
  const [savingEstado, setSavingEstado] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  useEffect(() => {
    fetchData();
  }, [solicitudId]);

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [resSol, resHist, resCom, resDoc] = await Promise.allSettled([
        client.get(`/solicitudes/${solicitudId}`),
        client.get(`/solicitudes/${solicitudId}/historial`),
        client.get(`/solicitudes/${solicitudId}/comentarios`),
        client.get(`/solicitudes/${solicitudId}/documentos`)
      ]);

      if (resSol.status === 'fulfilled') {
        setSolicitud(resSol.value.data);
        setNuevoEstado(resSol.value.data.estado);
      } else {
        const err = resSol.reason;
        const msg = err.response?.data?.detail || "No se pudo cargar la información de la solicitud";
        setErrorMsg(msg);
        setAlert({ isOpen: true, message: msg, type: "error" });
      }

      if (resHist.status === 'fulfilled') {
        setHistorial(resHist.value.data || []);
      }
      if (resCom.status === 'fulfilled') {
        setComentarios(resCom.value.data || []);
      }
      if (resDoc.status === 'fulfilled') {
        setDocumentos(resDoc.value.data || []);
      }
    } catch (error: any) {
      console.error("Error fetching solicitud details:", error);
      const msg = error.response?.data?.detail || "No se pudo cargar la información de la solicitud";
      setErrorMsg(msg);
      setAlert({ isOpen: true, message: msg, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEstado = async () => {
    if (nuevoEstado === solicitud?.estado) return;
    setSavingEstado(true);
    try {
      const res = await client.put(`/solicitudes/${solicitudId}`, { estado: nuevoEstado });
      setSolicitud(res.data);
      setAlert({ isOpen: true, message: "Estado actualizado exitosamente", type: "success" });
      // Refresh historial
      const resHist = await client.get(`/solicitudes/${solicitudId}/historial`);
      setHistorial(resHist.data || []);
    } catch (error: any) {
      console.error(error);
      setAlert({ isOpen: true, message: error.response?.data?.detail || "No se pudo actualizar el estado", type: "error" });
    } finally {
      setSavingEstado(false);
    }
  };

  const handleAddComentario = async () => {
    if (!newComment.trim()) return;
    setSendingComment(true);
    try {
      await client.post(`/solicitudes/${solicitudId}/comentarios`, {
        comentario: newComment,
        visibilidad: isCliente ? "PUBLICO" : commentVisibility
      });
      setNewComment("");
      setAlert({ isOpen: true, message: "Comentario registrado con éxito", type: "success" });
      const [resCom, resHist] = await Promise.all([
        client.get(`/solicitudes/${solicitudId}/comentarios`),
        client.get(`/solicitudes/${solicitudId}/historial`)
      ]);
      setComentarios(resCom.data || []);
      setHistorial(resHist.data || []);
    } catch (error: any) {
      console.error(error);
      setAlert({ isOpen: true, message: error.response?.data?.detail || "No se pudo agregar el comentario", type: "error" });
    } finally {
      setSendingComment(false);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFile) return;
    setUploadingDoc(true);
    const formData = new FormData();
    formData.append("file", newFile);
    try {
      await client.post(`/solicitudes/${solicitudId}/documentos?visibilidad=PUBLICO`, formData);
      setNewFile(null);
      setAlert({ isOpen: true, message: "Documento adjuntado con éxito", type: "success" });
      const [resDoc, resHist] = await Promise.all([
        client.get(`/solicitudes/${solicitudId}/documentos`),
        client.get(`/solicitudes/${solicitudId}/historial`)
      ]);
      setDocumentos(resDoc.data || []);
      setHistorial(resHist.data || []);
    } catch (error: any) {
      console.error(error);
      setAlert({ isOpen: true, message: error.response?.data?.detail || "No se pudo subir el archivo", type: "error" });
    } finally {
      setUploadingDoc(false);
    }
  };

  const formatDuration = (mins: number | null | undefined) => {
    if (mins === null || mins === undefined) return "N/A";
    const isNegative = mins < 0;
    const absMins = Math.abs(mins);
    const hours = Math.floor(absMins / 60);
    const remMins = absMins % 60;
    const formatted = hours > 0 ? `${hours}h ${remMins}m` : `${remMins}m`;
    return isNegative ? `-${formatted}` : formatted;
  };

  const getSemaforoIcon = (semaforo: string) => {
    switch (semaforo) {
      case 'VERDE': return <span className="flex items-center gap-1.5 text-emerald-400 font-bold"><CheckCircle className="w-4 h-4 text-emerald-400" /> Dentro de plazo</span>;
      case 'AMARILLO': return <span className="flex items-center gap-1.5 text-amber-400 font-bold"><AlertTriangle className="w-4 h-4 text-amber-400" /> Próxima a vencer</span>;
      case 'ROJO': return <span className="flex items-center gap-1.5 text-rose-400 font-bold"><XCircle className="w-4 h-4 text-rose-400" /> Vencida</span>;
      case 'AZUL': return <span className="flex items-center gap-1.5 text-sky-400 font-bold"><StopCircle className="w-4 h-4 text-sky-400" /> SLA Pausado</span>;
      case 'GRIS': return <span className="flex items-center gap-1.5 text-st-muted font-bold"><CheckCircle className="w-4 h-4 text-st-muted" /> Cerrada</span>;
      default: return <span className="text-st-muted font-bold">SLA no configurado</span>;
    }
  };

  if (loading && !solicitud) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <button onClick={onBack} className="flex items-center gap-2 text-sm font-bold transition-colors text-st-muted hover:text-white">
          <ArrowLeft className="w-4 h-4" /> Volver a Bandeja
        </button>
        <div className="rounded-xl p-16 text-center bg-st-surface border border-st-border text-st-muted shadow-lg">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-st-accent" />
          <p className="text-base font-extrabold text-white">Cargando detalle de la solicitud...</p>
          <p className="text-xs mt-1 font-medium text-st-muted">Obteniendo datos de seguimiento, comentarios y SLA</p>
        </div>
      </div>
    );
  }

  if (!solicitud) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <AlertPopup isOpen={alert.isOpen} message={alert.message} type={alert.type} onClose={() => setAlert(prev => ({...prev, isOpen: false}))} />
        <button onClick={onBack} className="flex items-center gap-2 text-sm font-bold transition-colors text-st-muted hover:text-white">
          <ArrowLeft className="w-4 h-4" /> Volver a Bandeja
        </button>
        <div className="rounded-xl p-12 text-center bg-st-surface border border-st-border text-st-muted shadow-lg">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-rose-500" />
          <h3 className="text-lg font-bold mb-2 text-white">No se pudo cargar la información de la solicitud</h3>
          <p className="text-sm mb-6 max-w-md mx-auto text-st-muted">{errorMsg || "La solicitud no fue encontrada o no se cuenta con los privilegios de acceso requeridos."}</p>
          <div className="flex justify-center gap-3">
            <button onClick={onBack} className="px-4 py-2 rounded-lg text-sm font-bold transition-colors bg-st-bg border border-st-border text-st-muted hover:text-white">
              Volver a Bandeja
            </button>
            <button onClick={fetchData} className="px-4 py-2 bg-st-accent text-white rounded-lg text-sm font-bold hover:bg-st-accent/90 transition-colors flex items-center gap-2 shadow-sm">
              <RefreshCw className="w-4 h-4" /> Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'DETALLE', label: 'Detalle', icon: <FileText className="w-4 h-4" /> },
    { id: 'DOCUMENTOS', label: `Documentos (${documentos.length})`, icon: <Paperclip className="w-4 h-4" /> },
    { id: 'COMENTARIOS', label: `Comentarios (${comentarios.length})`, icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'HISTORIAL', label: `Historial (${historial.length})`, icon: <History className="w-4 h-4" /> },
    ...(!isCliente ? [{ id: 'GESTION', label: 'Gestión', icon: <Settings className="w-4 h-4" /> }] : [])
  ];

  const parsedDatos = typeof solicitud.datos_solicitud === 'string'
    ? (() => { try { return JSON.parse(solicitud.datos_solicitud); } catch { return {}; } })()
    : (solicitud.datos_solicitud || {});

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <AlertPopup isOpen={alert.isOpen} message={alert.message} type={alert.type} onClose={() => setAlert(prev => ({...prev, isOpen: false}))} />
      
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-sm font-bold transition-colors text-st-muted hover:text-white">
          <ArrowLeft className="w-4 h-4 text-st-accent" /> Volver a Bandeja
        </button>
        <button onClick={fetchData} className="flex items-center gap-1.5 text-xs text-st-accent hover:text-st-accent/80 transition-colors font-bold bg-st-accent/10 px-3 py-1.5 rounded-lg border border-st-accent/20">
          <RefreshCw className="w-3.5 h-3.5" /> Actualizar Datos
        </button>
      </div>

      {/* Main Solicitud Header Card */}
      <div className="rounded-xl p-6 bg-st-surface border border-st-border shadow-lg">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black font-mono tracking-tight text-white">{solicitud.codigo_solicitud}</h1>
              <span className={`inline-block text-xs font-bold uppercase px-2.5 py-0.5 rounded-full ${
                solicitud.prioridad === 'URGENTE' || solicitud.prioridad === 'CRITICA' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' :
                solicitud.prioridad === 'ALTA' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                solicitud.prioridad === 'NORMAL' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30' :
                'bg-white/5 text-st-muted border border-st-border'
              }`}>
                {solicitud.prioridad}
              </span>
            </div>
            <p className="text-base text-st-accent font-extrabold mt-1">{solicitud.tipo_solicitud_nombre || 'Solicitud General'}</p>
          </div>
          <div className="flex flex-col items-start md:items-end gap-2 text-sm">
            <div className="flex items-center gap-3">
              <span className="text-xs uppercase tracking-wider font-extrabold text-st-muted">ESTADO:</span>
              <span className="font-extrabold uppercase px-3 py-1 rounded-lg text-xs text-white bg-st-bg border border-st-border">
                {solicitud.estado ? solicitud.estado.replace('_', ' ') : 'PENDIENTE'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs uppercase tracking-wider font-extrabold text-st-muted">SLA:</span>
              {getSemaforoIcon(solicitud.sla_semaforo)}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b overflow-x-auto scrollbar-hide pb-1 border-st-border">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold transition-all rounded-t-lg whitespace-nowrap ${
              activeTab === tab.id 
                ? 'bg-st-accent/10 text-st-accent border-b-2 border-st-accent font-extrabold' 
                : 'text-st-muted hover:text-white hover:bg-white/5'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content Box */}
      <div className="rounded-xl p-6 bg-st-surface border border-st-border shadow-lg">
        {activeTab === 'DETALLE' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
            
            {/* Left Column: General Info */}
            <div className="space-y-5">
              <h3 className="font-extrabold uppercase tracking-wider mb-4 border-b pb-2.5 text-sm flex items-center gap-2 text-white border-st-border">
                <FileText className="w-4 h-4 text-st-accent" /> Información General
              </h3>
              
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <span className="font-bold text-xs uppercase tracking-wider text-st-muted">Fecha Solicitud:</span>
                  <span className="font-mono font-bold text-white">{solicitud.fecha_solicitud ? format(new Date(solicitud.fecha_solicitud), "dd/MM/yyyy HH:mm", { locale: es }) : '-'}</span>
                </div>
                {solicitud.fecha_requerida && (
                  <div className="grid grid-cols-2 gap-2">
                    <span className="font-bold text-xs uppercase tracking-wider text-st-muted">Fecha Requerida:</span>
                    <span className="font-mono font-bold text-white">{format(new Date(solicitud.fecha_requerida), "dd/MM/yyyy", { locale: es })}</span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <span className="font-bold text-xs uppercase tracking-wider text-st-muted">Solicitado por:</span>
                  <span className="font-extrabold flex items-center gap-1.5 text-white">
                    <User className="w-4 h-4 text-st-accent" />
                    {solicitud.solicitado_por_nombre || 'N/A'}
                  </span>
                </div>
                {solicitud.linea_servicio_nombre && (
                  <div className="grid grid-cols-2 gap-2">
                    <span className="font-bold text-xs uppercase tracking-wider text-st-muted">Línea de Servicio:</span>
                    <span className="text-st-accent font-mono font-extrabold">{solicitud.linea_servicio_nombre}</span>
                  </div>
                )}
                {!isCliente && (
                  <div className="grid grid-cols-2 gap-2">
                    <span className="font-bold text-xs uppercase tracking-wider text-st-muted">Asignado a:</span>
                    <span className="text-white font-bold">{solicitud.asignado_a_nombre || 'Sin asignar'}</span>
                  </div>
                )}
              </div>

              {/* Specific fields from datos_solicitud */}
              {parsedDatos && Object.keys(parsedDatos).length > 0 && (
                <div className={`mt-5 p-4 rounded-xl border space-y-2.5 ${
                  isCliente 
                    ? 'bg-slate-50 border-slate-200 shadow-sm' 
                    : 'bg-st-bg border-st-border shadow-inner'
                }`}>
                  <span className="text-st-accent font-black text-xs uppercase tracking-wider block mb-2">Datos Específicos</span>
                  {Object.entries(parsedDatos).map(([k, v]) => (
                    <div key={k} className="grid grid-cols-2 gap-2 items-center text-xs">
                      <span className={`font-bold capitalize ${isCliente ? 'text-slate-700' : 'text-st-muted'}`}>{k.replace(/_/g, ' ')}:</span>
                      <span className={`font-bold px-3 py-1.5 rounded-lg border truncate ${
                        isCliente 
                          ? 'text-gray-900 bg-white border-slate-200' 
                          : 'text-white bg-st-surface border-st-border'
                      }`}>{String(v || 'N/A')}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-5">
                <span className="block mb-1.5 font-bold text-xs uppercase tracking-wider text-st-muted">Motivo / Asunto:</span>
                <div className="p-4 rounded-xl border font-bold text-sm leading-relaxed text-white bg-st-bg border-st-border">
                  {solicitud.motivo || 'Sin motivo especificado'}
                </div>
              </div>

              <div className="mt-5">
                <span className="block mb-1.5 font-bold text-xs uppercase tracking-wider text-st-muted">Detalle de la solicitud:</span>
                <div 
                  className="p-4 rounded-xl border text-sm leading-relaxed prose max-w-none font-medium text-white bg-st-bg border-st-border"
                  dangerouslySetInnerHTML={{ __html: solicitud.descripcion || '<em class="text-st-muted">Sin detalle</em>' }}
                />
              </div>
            </div>
            
            {/* Right Column: SLA Tracker */}
            <div className="space-y-5">
              <h3 className="font-extrabold uppercase tracking-wider mb-4 border-b pb-2.5 text-sm flex items-center gap-2 text-white border-st-border">
                <Clock className="w-4 h-4 text-st-accent" /> Seguimiento SLA
              </h3>
              {solicitud.sla_semaforo && solicitud.sla_semaforo !== 'SIN_SLA' ? (
                <div className="p-5 rounded-xl border space-y-3.5 bg-st-bg border-st-border shadow-inner">
                  <div className="flex justify-between items-center pb-3 border-b border-st-border/50">
                    <span className="font-bold text-xs uppercase tracking-wider text-st-muted">Tiempo consumido:</span>
                    <span className="font-extrabold font-mono text-sm text-white">{formatDuration(solicitud.sla_minutos_consumidos || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-st-border/50">
                    <span className="font-bold text-xs uppercase tracking-wider text-st-muted">Tiempo restante:</span>
                    <span className={`font-extrabold font-mono text-sm ${solicitud.sla_minutos_restantes && solicitud.sla_minutos_restantes < 0 ? 'text-rose-500' : 'text-white'}`}>
                      {formatDuration(solicitud.sla_minutos_restantes)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xs uppercase tracking-wider text-st-muted">Uso SLA:</span>
                    <span className="font-extrabold font-mono text-sm text-white">{solicitud.sla_porcentaje_consumido !== null && solicitud.sla_porcentaje_consumido !== undefined ? `${solicitud.sla_porcentaje_consumido}%` : 'N/A'}</span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full rounded-full h-3 mt-3 overflow-hidden border bg-black/40 border-st-border">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        solicitud.sla_semaforo === 'VERDE' ? 'bg-emerald-500' : 
                        solicitud.sla_semaforo === 'AMARILLO' ? 'bg-amber-500' : 
                        solicitud.sla_semaforo === 'AZUL' ? 'bg-sky-500' : 'bg-rose-500'
                      }`} 
                      style={{ width: `${Math.min(Number(solicitud.sla_porcentaje_consumido) || 0, 100)}%` }}
                    ></div>
                  </div>
                  {solicitud.tiene_pausa_abierta && (
                    <div className="p-3 rounded-xl text-xs font-bold flex items-center gap-2 mt-3 bg-sky-500/10 border border-sky-500/30 text-sky-400">
                      <StopCircle className="w-4 h-4 shrink-0 text-sky-500" />
                      <span>El temporizador de SLA se encuentra actualmente pausado.</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 rounded-xl border text-center text-sm bg-st-bg border-st-border text-st-muted">
                  <Clock className="w-8 h-8 mx-auto mb-2 text-st-muted opacity-50" />
                  <p className="font-bold text-white">No hay política SLA aplicable para este tipo de solicitud y prioridad.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'COMENTARIOS' && (
          <div className="space-y-6">
            <div className="p-5 rounded-xl border bg-st-bg border-st-border">
              <label className="block text-xs font-extrabold uppercase tracking-wider mb-2 text-st-muted">
                Agregar Comentario
              </label>
              <textarea 
                className="w-full rounded-xl p-3.5 text-sm font-medium focus:outline-none focus:border-st-accent focus:ring-1 focus:ring-st-accent mb-3 min-h-[100px] bg-st-surface border border-st-border text-white placeholder-st-muted/60"
                placeholder="Escribe un comentario..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
              />
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                {!isCliente ? (
                  <select 
                    className="bg-st-surface border border-st-border rounded-lg p-2.5 text-white text-sm font-bold focus:outline-none focus:border-st-accent"
                    value={commentVisibility}
                    onChange={(e) => setCommentVisibility(e.target.value)}
                  >
                    <option value="PUBLICO" className="bg-st-surface text-white">Público (Visible para cliente)</option>
                    <option value="INTERNO_RESELLER" className="bg-st-surface text-white">Nota Interna (Solo Reseller)</option>
                  </select>
                ) : <div />}
                <button 
                  onClick={handleAddComentario} 
                  disabled={sendingComment || !newComment.trim()}
                  className="flex items-center gap-2 bg-st-accent text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-st-accent/90 transition-colors disabled:opacity-50 shadow-sm cursor-pointer"
                >
                  {sendingComment ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {sendingComment ? "Enviando..." : "Enviar Comentario"}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {comentarios.map(c => (
                <div key={c.id} className={`p-4 rounded-xl border transition-colors ${
                  c.visibilidad === 'INTERNO_RESELLER' ? 'bg-amber-500/10 border-amber-500/30' : 'bg-st-bg border-st-border'
                }`}>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-st-accent/10 flex items-center justify-center border border-st-accent/30 text-st-accent text-xs font-black">
                        {c.usuario_nombre ? c.usuario_nombre.charAt(0).toUpperCase() : (c.usuario_id ? 'U' : 'C')}
                      </div>
                      <span className={`text-sm font-extrabold ${isCliente ? 'text-gray-900' : 'text-white'}`}>{c.usuario_nombre || `Usuario ${c.usuario_id || ''}`}</span>
                      {c.visibilidad === 'INTERNO_RESELLER' && (
                        <span className="text-[10px] bg-amber-500 text-white px-2 py-0.5 rounded-full font-extrabold ml-2 uppercase">Nota Interna</span>
                      )}
                    </div>
                    <span className={`text-xs font-mono font-bold ${isCliente ? 'text-gray-500' : 'text-st-muted'}`}>{format(new Date(c.fecha_comentario), "dd/MM/yyyy HH:mm", { locale: es })}</span>
                  </div>
                  <p className={`text-sm font-medium whitespace-pre-wrap pl-10 leading-relaxed ${isCliente ? 'text-gray-800' : 'text-gray-200'}`}>{c.comentario}</p>
                </div>
              ))}
              {comentarios.length === 0 && <p className={`text-center text-sm py-8 font-medium ${isCliente ? 'text-gray-500' : 'text-st-muted'}`}>No hay comentarios en esta solicitud.</p>}
            </div>
          </div>
        )}

        {activeTab === 'DOCUMENTOS' && (
          <div className="space-y-6">
            <form onSubmit={handleFileUpload} className={`p-5 rounded-xl border flex flex-col sm:flex-row items-stretch sm:items-center gap-4 ${
              isCliente ? 'bg-gray-50 border-gray-200 shadow-sm' : 'bg-st-bg border-st-border'
            }`}>
              <input 
                type="file" 
                onChange={(e) => setNewFile(e.target.files?.[0] || null)} 
                className={`text-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-st-accent file:text-white hover:file:bg-st-accent/90 cursor-pointer ${
                  isCliente ? 'text-gray-700' : 'text-st-muted'
                }`} 
              />
              <button 
                type="submit" 
                disabled={!newFile || uploadingDoc} 
                className="bg-st-accent text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-st-accent/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                {uploadingDoc && <RefreshCw className="w-4 h-4 animate-spin" />}
                {uploadingDoc ? "Subiendo..." : "Subir Archivo"}
              </button>
            </form>
            <div className="grid grid-cols-1 gap-3">
              {documentos.map(d => (
                <div key={d.id} className={`flex justify-between items-center p-4 rounded-xl border hover:border-st-accent transition-colors ${
                  isCliente ? 'bg-white border-gray-200 shadow-sm' : 'bg-st-bg border-st-border'
                }`}>
                  <div className="flex items-center gap-3">
                    <FileText className="text-st-accent w-5 h-5 shrink-0" />
                    <div className="flex flex-col">
                      <a href={d.archivo_uri} target="_blank" rel="noreferrer" className={`text-sm font-bold hover:text-st-accent hover:underline ${isCliente ? 'text-gray-900' : 'text-white'}`}>{d.archivo_nombre}</a>
                      <span className={`text-xs font-medium ${isCliente ? 'text-gray-500' : 'text-st-muted'}`}>{format(new Date(d.fecha_subida), "dd/MM/yyyy HH:mm", { locale: es })} • Subido por: {d.usuario_nombre || 'Usuario'}</span>
                    </div>
                  </div>
                  <span className={`text-xs font-mono font-bold ${isCliente ? 'text-gray-600' : 'text-st-muted'}`}>{d.archivo_tamano_bytes ? `${Math.round(d.archivo_tamano_bytes / 1024)} KB` : ''}</span>
                </div>
              ))}
              {documentos.length === 0 && <p className={`text-center text-sm py-8 font-medium ${isCliente ? 'text-gray-500' : 'text-st-muted'}`}>No hay documentos adjuntos en esta solicitud.</p>}
            </div>
          </div>
        )}

        {activeTab === 'HISTORIAL' && (
          <div className={`space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent ${
            isCliente ? 'before:via-gray-300 before:to-transparent' : 'before:via-st-border before:to-transparent'
          }`}>
            {historial.map((h) => (
              <div key={h.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 ${
                  isCliente ? 'border-gray-300 bg-white' : 'border-st-border bg-st-surface'
                }`}>
                  {h.tipo_evento === 'CAMBIO_ESTADO' ? <RefreshCw className="w-4 h-4 text-sky-500" /> : 
                   h.tipo_evento === 'DOCUMENTO_ADJUNTO' ? <Paperclip className="w-4 h-4 text-emerald-500" /> :
                   h.tipo_evento === 'COMENTARIO_AGREGADO' ? <MessageSquare className="w-4 h-4 text-amber-500" /> :
                   <Clock className="w-4 h-4 text-st-accent" />}
                </div>
                <div className={`w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border ${
                  isCliente ? 'bg-white border-gray-200 shadow-sm' : 'bg-st-bg border-st-border shadow-lg'
                }`}>
                  <div className="flex items-center justify-between space-x-2 mb-1">
                    <div className={`font-extrabold text-sm ${isCliente ? 'text-gray-900' : 'text-white'}`}>{h.tipo_evento ? h.tipo_evento.replace(/_/g, ' ') : 'EVENTO'}</div>
                    <time className={`font-mono text-xs font-bold ${isCliente ? 'text-gray-500' : 'text-st-muted'}`}>{h.fecha_evento ? format(new Date(h.fecha_evento), "dd/MM/yy HH:mm") : ''}</time>
                  </div>
                  <div className={`text-xs font-medium ${isCliente ? 'text-gray-700' : 'text-gray-300'}`}>
                    {h.estado_anterior && h.estado_nuevo ? (
                      <span>De <span className={`font-bold ${isCliente ? 'text-gray-900' : 'text-white'}`}>{h.estado_anterior}</span> a <span className={`font-bold ${isCliente ? 'text-gray-900' : 'text-white'}`}>{h.estado_nuevo}</span></span>
                    ) : (
                      <span>{h.comentario || 'Acción de sistema'}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {historial.length === 0 && <p className={`text-center text-sm py-8 relative z-10 font-medium ${isCliente ? 'bg-white text-gray-500' : 'bg-st-surface text-st-muted'}`}>No hay registros en el historial.</p>}
          </div>
        )}

        {activeTab === 'GESTION' && !isCliente && (
          <div className="space-y-8 max-w-xl">
            <div className="space-y-4">
              <h3 className="text-white font-extrabold uppercase tracking-wider border-b border-st-border pb-2">Cambiar Estado de la Solicitud</h3>
              <div className="flex items-center gap-4">
                <select 
                  className="bg-st-bg border border-st-border rounded-xl p-3 text-white text-sm flex-1 focus:outline-none focus:border-st-accent font-bold shadow-sm"
                  value={nuevoEstado}
                  onChange={(e) => setNuevoEstado(e.target.value)}
                >
                  <option value="PENDIENTE" className="bg-st-surface text-white">PENDIENTE</option>
                  <option value="EN_REVISION" className="bg-st-surface text-white">EN REVISION</option>
                  <option value="REQUIERE_INFORMACION" className="bg-st-surface text-white">REQUIERE INFORMACION</option>
                  <option value="APROBADA" className="bg-st-surface text-white">APROBADA</option>
                  <option value="EN_PROCESO" className="bg-st-surface text-white">EN PROCESO</option>
                  <option value="ATENDIDA" className="bg-st-surface text-white">ATENDIDA</option>
                  <option value="RECHAZADA" className="bg-st-surface text-white">RECHAZADA</option>
                  <option value="CANCELADA" className="bg-st-surface text-white">CANCELADA</option>
                </select>
                <button 
                  onClick={handleUpdateEstado}
                  disabled={savingEstado || nuevoEstado === solicitud.estado}
                  className="bg-st-accent text-white px-5 py-3 rounded-xl text-sm font-bold hover:bg-st-accent/90 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm cursor-pointer"
                >
                  {savingEstado && <RefreshCw className="w-4 h-4 animate-spin" />}
                  {savingEstado ? "Guardando..." : "Actualizar"}
                </button>
              </div>
              {nuevoEstado === 'REQUIERE_INFORMACION' && solicitud.estado !== 'REQUIERE_INFORMACION' && (
                <p className="text-xs text-sky-400 bg-sky-500/10 p-3 rounded-xl border border-sky-500/30 font-bold">
                  <AlertCircle className="w-4 h-4 inline mr-1 text-sky-400" />
                  Pasar a este estado iniciará una pausa en el SLA (si la política lo permite).
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

