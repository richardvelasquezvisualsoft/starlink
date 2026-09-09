import React, { useState, useEffect } from 'react';
import client from '../../api/client';
import { ArrowLeft, Clock, AlertTriangle, XCircle, CheckCircle, StopCircle, FileText, MessageSquare, History, Settings, Paperclip, Send, User } from 'lucide-react';
import AlertPopup from '../../components/AlertPopup';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  solicitudId: number;
  onBack: () => void;
}

export default function SolicitudDetail({ solicitudId, onBack }: Props) {
  const [solicitud, setSolicitud] = useState<any>(null);
  const [historial, setHistorial] = useState<any[]>([]);
  const [comentarios, setComentarios] = useState<any[]>([]);
  const [documentos, setDocumentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'DETALLE' | 'DOCUMENTOS' | 'COMENTARIOS' | 'HISTORIAL' | 'GESTION'>('DETALLE');
  
  const [alert, setAlert] = useState<{isOpen: boolean, title: string, message: string, type: "info" | "warning" | "error" | "success"}>({
    isOpen: false, title: "", message: "", type: "info"
  });

  const [newComment, setNewComment] = useState("");
  const [commentVisibility, setCommentVisibility] = useState("PUBLICO");
  const [newFile, setNewFile] = useState<File | null>(null);
  const [nuevoEstado, setNuevoEstado] = useState("");

  useEffect(() => {
    fetchData();
  }, [solicitudId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resSol, resHist, resCom, resDoc] = await Promise.all([
        client.get(`/solicitudes/${solicitudId}`),
        client.get(`/solicitudes/${solicitudId}/historial`),
        client.get(`/solicitudes/${solicitudId}/comentarios`),
        client.get(`/solicitudes/${solicitudId}/documentos`)
      ]);
      setSolicitud(resSol.data);
      setNuevoEstado(resSol.data.estado);
      setHistorial(resHist.data);
      setComentarios(resCom.data);
      setDocumentos(resDoc.data);
    } catch (error) {
      console.error(error);
      setAlert({ isOpen: true, title: "Error", message: "Error al cargar la solicitud", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEstado = async () => {
    if (nuevoEstado === solicitud?.estado) return;
    try {
      await client.put(`/solicitudes/${solicitudId}`, { estado: nuevoEstado });
      setAlert({ isOpen: true, title: "Éxito", message: "Estado actualizado", type: "success" });
      fetchData();
    } catch (error) {
      console.error(error);
      setAlert({ isOpen: true, title: "Error", message: "No se pudo actualizar el estado", type: "error" });
    }
  };

  const handleAddComentario = async () => {
    if (!newComment.trim()) return;
    try {
      await client.post(`/solicitudes/${solicitudId}/comentarios`, {
        comentario: newComment,
        visibilidad: commentVisibility
      });
      setNewComment("");
      fetchData();
    } catch (error) {
      console.error(error);
      setAlert({ isOpen: true, title: "Error", message: "No se pudo agregar el comentario", type: "error" });
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFile) return;
    const formData = new FormData();
    formData.append("file", newFile);
    try {
      await client.post(`/solicitudes/${solicitudId}/documentos?visibilidad=PUBLICO`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setNewFile(null);
      fetchData();
    } catch (error) {
      console.error(error);
      setAlert({ isOpen: true, title: "Error", message: "No se pudo subir el archivo", type: "error" });
    }
  };

  if (loading || !solicitud) {
    return <div className="text-center text-st-muted p-10 animate-pulse">Cargando detalle...</div>;
  }

  const getSemaforoIcon = (semaforo: string) => {
    switch (semaforo) {
      case 'VERDE': return <span className="flex items-center gap-1 text-green-500 font-bold"><CheckCircle className="w-4 h-4" /> Dentro de plazo</span>;
      case 'AMARILLO': return <span className="flex items-center gap-1 text-yellow-500 font-bold"><AlertTriangle className="w-4 h-4" /> Próxima a vencer</span>;
      case 'ROJO': return <span className="flex items-center gap-1 text-red-500 font-bold"><XCircle className="w-4 h-4" /> Vencida</span>;
      case 'AZUL': return <span className="flex items-center gap-1 text-blue-500 font-bold"><StopCircle className="w-4 h-4" /> SLA Pausado</span>;
      case 'GRIS': return <span className="flex items-center gap-1 text-gray-400 font-bold"><CheckCircle className="w-4 h-4" /> Cerrada</span>;
      default: return <span className="text-gray-500">SLA no configurado</span>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <AlertPopup isOpen={alert.isOpen} title={alert.title} message={alert.message} type={alert.type} onClose={() => setAlert(prev => ({...prev, isOpen: false}))} />
      
      <button onClick={onBack} className="flex items-center gap-2 text-st-muted hover:text-white transition-colors text-sm font-medium">
        <ArrowLeft className="w-4 h-4" /> Volver a Bandeja
      </button>

      <div className="bg-st-surface border border-st-border rounded-xl p-6 shadow-lg">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white font-sans">{solicitud.codigo_solicitud}</h1>
            <p className="text-lg text-st-accent mt-1">{solicitud.tipo_solicitud_nombre}</p>
          </div>
          <div className="flex flex-col items-end gap-2 text-sm">
            <div className="flex gap-4">
              <span className="text-st-muted">Estado:</span>
              <span className="font-bold text-white uppercase">{solicitud.estado.replace('_', ' ')}</span>
            </div>
            <div className="flex gap-4">
              <span className="text-st-muted">Prioridad:</span>
              <span className="font-bold text-white uppercase">{solicitud.prioridad}</span>
            </div>
            <div className="flex gap-4">
              <span className="text-st-muted">SLA:</span>
              {getSemaforoIcon(solicitud.sla_semaforo)}
            </div>
          </div>
        </div>
      </div>

      <div className="flex space-x-1 border-b border-st-border overflow-x-auto scrollbar-hide">
        {[
          { id: 'DETALLE', label: 'Detalle', icon: <FileText className="w-4 h-4" /> },
          { id: 'DOCUMENTOS', label: 'Documentos', icon: <Paperclip className="w-4 h-4" /> },
          { id: 'COMENTARIOS', label: 'Comentarios', icon: <MessageSquare className="w-4 h-4" /> },
          { id: 'HISTORIAL', label: 'Historial', icon: <History className="w-4 h-4" /> },
          { id: 'GESTION', label: 'Gestión', icon: <Settings className="w-4 h-4" /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
              activeTab === tab.id ? 'border-st-accent text-white' : 'border-transparent text-st-muted hover:text-white hover:border-white/20'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-st-surface border border-st-border rounded-xl p-6 shadow-lg">
        {activeTab === 'DETALLE' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
            <div className="space-y-4">
              <h3 className="text-white font-bold uppercase tracking-wider mb-4 border-b border-st-border pb-2">Información General</h3>
              <div className="grid grid-cols-2 gap-2"><span className="text-st-muted">Cliente / Tenant ID:</span><span className="text-white">{solicitud.tenant_id}</span></div>
              <div className="grid grid-cols-2 gap-2"><span className="text-st-muted">Canal Origen:</span><span className="text-white">{solicitud.canal_origen}</span></div>
              <div className="grid grid-cols-2 gap-2"><span className="text-st-muted">Fecha Solicitud:</span><span className="text-white">{format(new Date(solicitud.fecha_solicitud), "dd/MM/yyyy HH:mm", { locale: es })}</span></div>
              <div className="grid grid-cols-2 gap-2"><span className="text-st-muted">Solicitado por:</span><span className="text-white">{solicitud.solicitado_por_nombre || 'N/A'}</span></div>
              <div className="grid grid-cols-2 gap-2"><span className="text-st-muted">Asignado a:</span><span className="text-white">{solicitud.asignado_a_nombre || 'Sin asignar'}</span></div>
              <div className="mt-4">
                <span className="text-st-muted block mb-1">Motivo:</span>
                <p className="text-white bg-black/20 p-3 rounded">{solicitud.motivo || 'Sin motivo especificado'}</p>
              </div>
              <div className="mt-4">
                <span className="text-st-muted block mb-1">Descripción:</span>
                <p className="text-white bg-black/20 p-3 rounded">{solicitud.descripcion || 'Sin descripción'}</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-white font-bold uppercase tracking-wider mb-4 border-b border-st-border pb-2">Seguimiento SLA</h3>
              {solicitud.sla_semaforo ? (
                <div className="bg-black/20 p-4 rounded-xl border border-st-border space-y-3">
                  <div className="flex justify-between items-center pb-3 border-b border-white/5">
                    <span className="text-st-muted">Tiempo consumido:</span>
                    <span className="text-white font-bold">{Math.round((solicitud.sla_minutos_consumidos || 0) / 60)} horas</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-white/5">
                    <span className="text-st-muted">Tiempo restante:</span>
                    <span className={`font-bold ${solicitud.sla_minutos_restantes && solicitud.sla_minutos_restantes < 0 ? 'text-red-500' : 'text-white'}`}>
                      {solicitud.sla_minutos_restantes ? `${Math.round(solicitud.sla_minutos_restantes / 60)} horas` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-st-muted">Uso SLA:</span>
                    <span className="text-white font-bold">{solicitud.sla_porcentaje_consumido}%</span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-white/5 rounded-full h-2 mt-2">
                    <div 
                      className={`h-2 rounded-full ${solicitud.sla_semaforo === 'VERDE' ? 'bg-green-500' : solicitud.sla_semaforo === 'AMARILLO' ? 'bg-yellow-500' : 'bg-red-500'}`} 
                      style={{ width: `${Math.min(solicitud.sla_porcentaje_consumido || 0, 100)}%` }}
                    ></div>
                  </div>
                </div>
              ) : (
                <p className="text-st-muted">No hay política SLA aplicable para este tipo de solicitud y prioridad.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'COMENTARIOS' && (
          <div className="space-y-6">
            <div className="bg-black/20 p-4 rounded-xl border border-st-border">
              <textarea 
                className="w-full bg-black/40 border border-st-border rounded-lg p-3 text-white text-sm focus:outline-none focus:border-st-accent mb-3 min-h-[100px]"
                placeholder="Escribe un comentario..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
              />
              <div className="flex justify-between items-center">
                <select 
                  className="bg-black/40 border border-st-border rounded p-2 text-white text-sm"
                  value={commentVisibility}
                  onChange={(e) => setCommentVisibility(e.target.value)}
                >
                  <option value="PUBLICO">Público (Visible para cliente)</option>
                  <option value="INTERNO_RESELLER">Nota Interna (Solo Reseller)</option>
                </select>
                <button onClick={handleAddComentario} className="flex items-center gap-2 bg-st-accent text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-st-accent/90 transition-colors">
                  <Send className="w-4 h-4" /> Enviar
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {comentarios.map(c => (
                <div key={c.id} className={`p-4 rounded-xl border ${c.visibilidad === 'INTERNO_RESELLER' ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-white/5 border-st-border'}`}>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-st-accent/20 flex items-center justify-center border border-st-accent/30 text-st-accent text-xs font-bold">
                        {c.usuario_id ? 'U' : 'C'}
                      </div>
                      <span className="text-sm font-bold text-white">Usuario {c.usuario_id}</span>
                      {c.visibilidad === 'INTERNO_RESELLER' && (
                        <span className="text-[10px] bg-yellow-500 text-black px-1.5 py-0.5 rounded font-bold ml-2 uppercase">Nota Interna</span>
                      )}
                    </div>
                    <span className="text-xs text-st-muted">{format(new Date(c.fecha_comentario), "dd MMM HH:mm", { locale: es })}</span>
                  </div>
                  <p className="text-sm text-st-muted whitespace-pre-wrap">{c.comentario}</p>
                </div>
              ))}
              {comentarios.length === 0 && <p className="text-center text-st-muted text-sm py-8">No hay comentarios en esta solicitud.</p>}
            </div>
          </div>
        )}

        {activeTab === 'DOCUMENTOS' && (
          <div className="space-y-6">
            <form onSubmit={handleFileUpload} className="bg-black/20 p-4 rounded-xl border border-st-border flex items-center gap-4">
              <input type="file" onChange={(e) => setNewFile(e.target.files?.[0] || null)} className="text-sm text-st-muted file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-bold file:bg-st-accent file:text-white hover:file:bg-st-accent/90 cursor-pointer" />
              <button type="submit" disabled={!newFile} className="bg-st-surface border border-st-border text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-white/10 transition-colors disabled:opacity-50">Subir</button>
            </form>
            <div className="grid grid-cols-1 gap-3">
              {documentos.map(d => (
                <div key={d.id} className="flex justify-between items-center p-3 bg-white/5 border border-st-border rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="text-st-accent w-5 h-5" />
                    <div className="flex flex-col">
                      <a href={d.archivo_uri} target="_blank" rel="noreferrer" className="text-sm text-white hover:underline">{d.archivo_nombre}</a>
                      <span className="text-[10px] text-st-muted">{format(new Date(d.fecha_subida), "dd MMM yyyy", { locale: es })} • {d.visibilidad}</span>
                    </div>
                  </div>
                </div>
              ))}
              {documentos.length === 0 && <p className="text-center text-st-muted text-sm py-8">No hay documentos adjuntos.</p>}
            </div>
          </div>
        )}

        {activeTab === 'HISTORIAL' && (
          <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-st-border before:to-transparent">
            {historial.map((h, idx) => (
              <div key={h.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white/10 bg-st-surface shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                  {h.tipo_evento === 'CAMBIO_ESTADO' ? <RefreshCw className="w-4 h-4 text-blue-500" /> : 
                   h.tipo_evento === 'DOCUMENTO_ADJUNTO' ? <Paperclip className="w-4 h-4 text-green-500" /> :
                   <Clock className="w-4 h-4 text-st-muted" />}
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white/5 p-4 rounded border border-white/10 shadow">
                  <div className="flex items-center justify-between space-x-2 mb-1">
                    <div className="font-bold text-white text-sm">{h.tipo_evento.replace('_', ' ')}</div>
                    <time className="font-mono text-xs text-st-muted">{format(new Date(h.fecha_evento), "dd/MM/yy HH:mm")}</time>
                  </div>
                  <div className="text-st-muted text-xs">
                    {h.estado_anterior && h.estado_nuevo ? (
                      <span>De <span className="font-bold text-white">{h.estado_anterior}</span> a <span className="font-bold text-white">{h.estado_nuevo}</span></span>
                    ) : (
                      <span>{h.comentario || 'Acción de sistema'}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {historial.length === 0 && <p className="text-center text-st-muted text-sm py-8 relative z-10 bg-st-surface">No hay registros en el historial.</p>}
          </div>
        )}

        {activeTab === 'GESTION' && (
          <div className="space-y-8 max-w-xl">
            <div className="space-y-4">
              <h3 className="text-white font-bold uppercase tracking-wider border-b border-st-border pb-2">Cambiar Estado</h3>
              <div className="flex items-center gap-4">
                <select 
                  className="bg-black/40 border border-st-border rounded-lg p-2 text-white text-sm flex-1"
                  value={nuevoEstado}
                  onChange={(e) => setNuevoEstado(e.target.value)}
                >
                  <option value="PENDIENTE">PENDIENTE</option>
                  <option value="EN_REVISION">EN REVISION</option>
                  <option value="REQUIERE_INFORMACION">REQUIERE INFORMACION</option>
                  <option value="APROBADA">APROBADA</option>
                  <option value="EN_PROCESO">EN PROCESO</option>
                  <option value="ATENDIDA">ATENDIDA</option>
                  <option value="RECHAZADA">RECHAZADA</option>
                  <option value="CANCELADA">CANCELADA</option>
                </select>
                <button 
                  onClick={handleUpdateEstado}
                  disabled={nuevoEstado === solicitud.estado}
                  className="bg-st-accent text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-st-accent/90 transition-colors disabled:opacity-50"
                >
                  Actualizar
                </button>
              </div>
              {nuevoEstado === 'REQUIERE_INFORMACION' && solicitud.estado !== 'REQUIERE_INFORMACION' && (
                <p className="text-xs text-blue-400 bg-blue-500/10 p-2 rounded border border-blue-500/20">
                  <AlertCircle className="w-3 h-3 inline mr-1" />
                  Pasar a este estado iniciará una pausa en el SLA (si la política lo permite).
                </p>
              )}
            </div>

            <div className="space-y-4 opacity-50 pointer-events-none">
              <h3 className="text-white font-bold uppercase tracking-wider border-b border-st-border pb-2">Asignar Responsable (Mock UI)</h3>
              <div className="flex items-center gap-4">
                <select className="bg-black/40 border border-st-border rounded-lg p-2 text-white text-sm flex-1">
                  <option>Seleccionar usuario...</option>
                </select>
                <button className="bg-st-surface border border-st-border text-white px-4 py-2 rounded-lg text-sm font-bold">Asignar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
