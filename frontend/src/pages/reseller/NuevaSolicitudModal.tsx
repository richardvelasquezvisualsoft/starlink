import React, { useState, useEffect, useRef } from 'react';
import client from '../../api/client';
import { 
  X, Plus, Upload, Bold, Italic, Underline, 
  List, ListOrdered, AlertTriangle, RefreshCw, Paperclip, FileText 
} from 'lucide-react';
import { SearchableSelect } from '../../components/SearchableSelect';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (createdSolicitudId: number) => void;
}

interface AttachmentFile {
  id: string;
  file: File;
  name: string;
  sizeFormatted: string;
  mime: string;
  status: 'pending' | 'uploading' | 'done' | 'error';
  errorMsg?: string;
}

export default function NuevaSolicitudModal({ isOpen, onClose, onSuccess }: Props) {
  const [tiposSolicitud, setTiposSolicitud] = useState<any[]>([]);
  const [selectedTipoId, setSelectedTipoId] = useState<number | null>(null);
  const [lineasServicio, setLineasServicio] = useState<any[]>([]);
  const [planesElegibles, setPlanesElegibles] = useState<string[]>([]);
  
  const [loadingTipos, setLoadingTipos] = useState(true);
  const [errorLoading, setErrorLoading] = useState<string | null>(null);

  // Common Form Fields
  const [lineaServicioId, setLineaServicioId] = useState<number | null>(null);
  const [prioridad, setPrioridad] = useState<string>('NORMAL');
  const [motivo, setMotivo] = useState<string>('');
  const [fechaRequerida, setFechaRequerida] = useState<string>('');
  const [confirmacionBaja, setConfirmacionBaja] = useState<boolean>(false);

  // Dynamic Type-Specific Extra Fields
  const [planActual, setPlanActual] = useState<string>('');
  const [planSolicitado, setPlanSolicitado] = useState<string>('');
  const [direccionActual, setDireccionActual] = useState<string>('');
  const [nuevaDireccion, setNuevaDireccion] = useState<string>('');
  const [direccionRequerida, setDireccionRequerida] = useState<string>('');
  const [ubicacion, setUbicacion] = useState<string>('');
  const [serialEquipo, setSerialEquipo] = useState<string>('');

  // Rich Text Editor State
  const editorRef = useRef<HTMLDivElement>(null);
  const [richTextHtml, setRichTextHtml] = useState<string>('');
  const [presetSize, setPresetSize] = useState<string>('normal');

  // Attachments State
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
    }
  }, [isOpen]);

  const loadInitialData = async () => {
    setLoadingTipos(true);
    setErrorLoading(null);
    try {
      const [resTipos, resLineas, resPlanes] = await Promise.all([
        client.get('/solicitudes/tipos'),
        client.get('/lineas-servicio'),
        client.get('/solicitudes/planes-elegibles')
      ]);

      setTiposSolicitud(resTipos.data || []);
      if (resTipos.data && resTipos.data.length > 0) {
        setSelectedTipoId(resTipos.data[0].id);
      }
      setLineasServicio(resLineas.data || []);
      setPlanesElegibles(resPlanes.data || []);
    } catch (err: any) {
      console.error(err);
      setErrorLoading('No se pudieron cargar los catálogos requeridos.');
    } finally {
      setLoadingTipos(false);
    }
  };

  const selectedTipo = tiposSolicitud.find(t => t.id === selectedTipoId);

  // When selected LineaServicio changes, update planActual and direccionActual
  useEffect(() => {
    if (lineaServicioId) {
      const selectedLine = lineasServicio.find(l => l.id === lineaServicioId);
      if (selectedLine) {
        setPlanActual(selectedLine.plan_contratado || selectedLine.id_producto || 'Plan Actual Activo');
        setDireccionActual(selectedLine.direccion_servicio || selectedLine.ubicacion || 'Dirección Actual de Servicio');
      }
    } else {
      setPlanActual('');
      setDireccionActual('');
    }
  }, [lineaServicioId, lineasServicio]);

  // Rich Text Editor Commands
  const execEditorCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      setRichTextHtml(editorRef.current.innerHTML);
    }
  };

  const handleApplyPresetSize = (size: string) => {
    setPresetSize(size);
    if (size === 'titulo') {
      execEditorCommand('formatBlock', '<h1>');
    } else if (size === 'destacado') {
      execEditorCommand('formatBlock', '<h2>');
    } else {
      execEditorCommand('formatBlock', '<p>');
    }
  };

  const handleEditorInput = () => {
    if (editorRef.current) {
      setRichTextHtml(editorRef.current.innerHTML);
    }
  };

  // Attachment Management
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const filesArray = Array.from(e.target.files);
    const newAttachments: AttachmentFile[] = filesArray.map(file => ({
      id: Math.random().toString(36).substring(2, 9),
      file,
      name: file.name,
      sizeFormatted: formatFileSize(file.size),
      mime: file.type || 'application/octet-stream',
      status: 'pending'
    }));
    setAttachments(prev => [...prev, ...newAttachments]);
    e.target.value = '';
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments(prev => prev.filter(att => att.id !== id));
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!selectedTipoId) {
      setSubmitError('Debe seleccionar un tipo de solicitud.');
      return;
    }
    if (!motivo.trim()) {
      setSubmitError('El motivo o asunto de la solicitud es obligatorio.');
      return;
    }

    if (selectedTipo?.requiere_linea_servicio && !lineaServicioId) {
      setSubmitError(`El tipo '${selectedTipo.nombre}' requiere seleccionar una Línea de Servicio.`);
      return;
    }

    if (selectedTipo?.codigo === 'BAJA_SERVICIO' && !confirmacionBaja) {
      setSubmitError('Debe confirmar explícitamente la solicitud de baja.');
      return;
    }

    setSubmitting(true);

    // Build datos_solicitud JSON
    const datosSolicitud: Record<string, any> = {};
    if (selectedTipo?.codigo === 'CAMBIO_PLAN') {
      datosSolicitud.plan_actual = planActual;
      datosSolicitud.plan_solicitado = planSolicitado;
    } else if (selectedTipo?.codigo === 'TRASLADO_SERVICIO') {
      datosSolicitud.direccion_actual = direccionActual;
      datosSolicitud.nueva_direccion = nuevaDireccion;
    } else if (selectedTipo?.codigo === 'NUEVO_SERVICIO') {
      datosSolicitud.direccion_requerida = direccionRequerida;
      datosSolicitud.ubicacion = ubicacion;
      datosSolicitud.producto_deseado = planSolicitado;
    } else if (selectedTipo?.codigo === 'INCORPORAR_EQUIPO_EXISTENTE') {
      datosSolicitud.serial_equipo = serialEquipo;
      datosSolicitud.ubicacion = ubicacion;
    }

    const payload = {
      tipo_solicitud_id: selectedTipoId,
      linea_servicio_id: lineaServicioId,
      prioridad,
      motivo: motivo.trim(),
      descripcion: richTextHtml,
      datos_solicitud: datosSolicitud,
      fecha_requerida: fechaRequerida || null
    };

    try {
      // Step 1: Create request
      const resCreate = await client.post('/solicitudes', payload);
      const createdSol = resCreate.data;
      const createdId = createdSol.id;

      // Step 2: Upload Attachments if any
      let attachmentFailures: string[] = [];
      for (const att of attachments) {
        const formData = new FormData();
        formData.append('file', att.file);
        try {
          await client.post(`/solicitudes/${createdId}/documentos?visibilidad=PUBLICO`, formData);
        } catch (uploadErr) {
          console.error(`Error uploading ${att.name}:`, uploadErr);
          attachmentFailures.push(att.name);
        }
      }

      if (attachmentFailures.length > 0) {
        alert(`Solicitud creada (${createdSol.codigo_solicitud}), pero falló la subida de: ${attachmentFailures.join(', ')}`);
      }

      // Step 3: Immediately open created detail view
      onSuccess(createdId);
      onClose();
    } catch (err: any) {
      console.error(err);
      setSubmitError(err.response?.data?.detail || 'No se pudo crear la solicitud. Intente nuevamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-st-surface border border-st-border rounded-2xl max-w-2xl w-full my-8 p-6 shadow-2xl space-y-6 relative max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-st-border pb-4 shrink-0">
          <div>
            <h3 className="text-xl font-bold text-white uppercase tracking-wider flex items-center gap-2 font-sans">
              <Plus className="w-5 h-5 text-st-accent" />
              NUEVA SOLICITUD
            </h3>
            <p className="text-xs text-st-muted mt-0.5">Complete el formulario dinámico para registrar su requerimiento.</p>
          </div>
          <button 
            onClick={onClose}
            className="text-st-muted hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto pr-1 space-y-5 flex-1">
          {loadingTipos ? (
            <div className="py-12 text-center text-st-muted flex flex-col items-center gap-3 animate-pulse">
              <RefreshCw className="w-6 h-6 animate-spin text-st-accent" />
              <span>Cargando tipos de solicitud...</span>
            </div>
          ) : errorLoading ? (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center justify-between">
              <span>{errorLoading}</span>
              <button onClick={loadInitialData} className="px-3 py-1 bg-red-500/20 text-white rounded text-xs font-bold hover:bg-red-500/30">
                Reintentar
              </button>
            </div>
          ) : (
            <form id="nueva-solicitud-form" onSubmit={handleSubmit} className="space-y-5">

              {/* 1. Tipo de Solicitud Dropdown */}
              <div>
                <label className="block text-xs font-bold text-st-muted uppercase tracking-wider mb-2">
                  Tipo de Solicitud <span className="text-st-accent">*</span>
                </label>
                <SearchableSelect
                  options={tiposSolicitud.map(t => ({
                    value: t.id,
                    label: t.nombre,
                    sublabel: t.descripcion
                  }))}
                  value={selectedTipoId}
                  onChange={(val) => {
                    const numVal = typeof val === 'number' ? val : (val ? parseInt(val.toString()) : null);
                    setSelectedTipoId(numVal);
                    setLineaServicioId(null);
                    setConfirmacionBaja(false);
                  }}
                  placeholder="Seleccionar tipo de solicitud..."
                  searchPlaceholder="Buscar por nombre o descripción..."
                  required
                />
                {selectedTipo?.descripcion && (
                  <p className="text-xs text-st-muted mt-1.5 italic">{selectedTipo.descripcion}</p>
                )}
              </div>

              {/* DYNAMIC FIELDS PER TYPE */}

              {/* Service Line Selector (if required or allowed) */}
              {(selectedTipo?.requiere_linea_servicio || ['CAMBIO_PLAN', 'BAJA_SERVICIO', 'TRASLADO_SERVICIO', 'REACTIVACION_SERVICIO'].includes(selectedTipo?.codigo)) && (
                <div>
                  <label className="block text-xs font-bold text-st-muted uppercase tracking-wider mb-2">
                    Línea de Servicio {selectedTipo?.requiere_linea_servicio && <span className="text-st-accent">*</span>}
                  </label>
                  <SearchableSelect
                    options={lineasServicio.map(l => ({
                      value: l.id,
                      label: l.numero_linea,
                      sublabel: [l.plan_contratado, l.direccion_servicio].filter(Boolean).join(' • ')
                    }))}
                    value={lineaServicioId}
                    onChange={(val) => {
                      const numVal = typeof val === 'number' ? val : (val ? parseInt(val.toString()) : null);
                      setLineaServicioId(numVal);
                    }}
                    placeholder="Seleccionar Línea de Servicio..."
                    searchPlaceholder="Escriba para buscar por serie, plan o dirección..."
                    required={selectedTipo?.requiere_linea_servicio}
                  />
                </div>
              )}

              {/* CAMBIO_PLAN Specific Fields */}
              {selectedTipo?.codigo === 'CAMBIO_PLAN' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-black/20 rounded-xl border border-st-border">
                  <div>
                    <label className="block text-xs font-bold text-st-muted uppercase tracking-wider mb-1.5">
                      Plan Actual (Solo lectura)
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={planActual || 'Seleccione una línea para ver el plan'}
                      className="w-full px-3.5 py-2.5 bg-white/5 border border-st-border/50 rounded-xl text-sm text-st-muted font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-st-muted uppercase tracking-wider mb-1.5">
                      Plan Solicitado (Elegibles) <span className="text-st-accent">*</span>
                    </label>
                    <SearchableSelect
                      options={planesElegibles.map(p => ({
                        value: p,
                        label: p
                      }))}
                      value={planSolicitado}
                      onChange={(val) => setPlanSolicitado(val ? val.toString() : '')}
                      placeholder="Seleccionar plan solicitado..."
                      searchPlaceholder="Escriba para buscar plan..."
                      required
                    />
                  </div>
                </div>
              )}

              {/* BAJA_SERVICIO Specific Fields */}
              {selectedTipo?.codigo === 'BAJA_SERVICIO' && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl space-y-3">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-red-400 uppercase tracking-wider">Solicitud de Baja de Servicio</h4>
                      <p className="text-xs text-st-muted mt-1">
                        Esta acción registrará la solicitud para evaluación. No cancela de inmediato la línea.
                      </p>
                    </div>
                  </div>
                  <label className="flex items-center gap-3 pt-2 cursor-pointer border-t border-red-500/20">
                    <input
                      type="checkbox"
                      checked={confirmacionBaja}
                      onChange={(e) => setConfirmacionBaja(e.target.checked)}
                      className="w-4 h-4 rounded bg-black border-red-500 text-st-accent focus:ring-st-accent cursor-pointer"
                    />
                    <span className="text-xs font-bold text-white">
                      Confirmo que estoy solicitando la baja de este servicio.
                    </span>
                  </label>
                </div>
              )}

              {/* TRASLADO_SERVICIO Specific Fields */}
              {selectedTipo?.codigo === 'TRASLADO_SERVICIO' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-black/20 rounded-xl border border-st-border">
                  <div>
                    <label className="block text-xs font-bold text-st-muted uppercase tracking-wider mb-1.5">
                      Dirección Actual
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={direccionActual || 'Seleccione una línea'}
                      className="w-full px-3.5 py-2.5 bg-white/5 border border-st-border/50 rounded-xl text-sm text-st-muted"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-st-muted uppercase tracking-wider mb-1.5">
                      Nueva Dirección Requerida <span className="text-st-accent">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Av. Javier Prado 450, San Isidro..."
                      value={nuevaDireccion}
                      onChange={(e) => setNuevaDireccion(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-black/40 border border-st-border rounded-xl text-sm text-white focus:outline-none focus:border-st-accent"
                      required
                    />
                  </div>
                </div>
              )}

              {/* NUEVO_SERVICIO Specific Fields */}
              {selectedTipo?.codigo === 'NUEVO_SERVICIO' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-black/20 rounded-xl border border-st-border">
                  <div>
                    <label className="block text-xs font-bold text-st-muted uppercase tracking-wider mb-1.5">
                      Dirección Requerida <span className="text-st-accent">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Campus Minero Sechura, Piura"
                      value={direccionRequerida}
                      onChange={(e) => setDireccionRequerida(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-black/40 border border-st-border rounded-xl text-sm text-white focus:outline-none focus:border-st-accent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-st-muted uppercase tracking-wider mb-1.5">
                      Ubicación / Coordenadas
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: -12.04637, -77.04279"
                      value={ubicacion}
                      onChange={(e) => setUbicacion(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-black/40 border border-st-border rounded-xl text-sm text-white focus:outline-none focus:border-st-accent"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-st-muted uppercase tracking-wider mb-1.5">
                      Producto / Plan Deseado
                    </label>
                    <SearchableSelect
                      options={planesElegibles.map((plan) => ({
                        value: plan,
                        label: plan
                      }))}
                      value={planSolicitado}
                      onChange={(val) => setPlanSolicitado(val ? val.toString() : '')}
                      placeholder="Seleccionar plan (opcional)..."
                      searchPlaceholder="Escriba para buscar plan..."
                    />
                  </div>
                </div>
              )}

              {/* INCORPORAR_EQUIPO_EXISTENTE Specific Fields */}
              {selectedTipo?.codigo === 'INCORPORAR_EQUIPO_EXISTENTE' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-black/20 rounded-xl border border-st-border">
                  <div>
                    <label className="block text-xs font-bold text-st-muted uppercase tracking-wider mb-1.5">
                      Kit / Serial / Device ID <span className="text-st-accent">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: KIT00948271 / ut000099..."
                      value={serialEquipo}
                      onChange={(e) => setSerialEquipo(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-black/40 border border-st-border rounded-xl text-sm text-white focus:outline-none focus:border-st-accent font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-st-muted uppercase tracking-wider mb-1.5">
                      Ubicación de Instalación
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Almacén Principal San Borja"
                      value={ubicacion}
                      onChange={(e) => setUbicacion(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-black/40 border border-st-border rounded-xl text-sm text-white focus:outline-none focus:border-st-accent"
                    />
                  </div>
                </div>
              )}

              {/* Prioridad y Fecha Requerida Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-st-muted uppercase tracking-wider mb-1.5">
                    Prioridad
                  </label>
                  <select
                    value={prioridad}
                    onChange={(e) => setPrioridad(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-black/40 border border-st-border rounded-xl text-sm text-white focus:outline-none focus:border-st-accent cursor-pointer"
                  >
                    <option value="BAJA" className="bg-st-surface text-white">BAJA</option>
                    <option value="NORMAL" className="bg-st-surface text-white">NORMAL</option>
                    <option value="ALTA" className="bg-st-surface text-white">ALTA</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-st-muted uppercase tracking-wider mb-1.5">
                    Fecha Requerida
                  </label>
                  <input
                    type="date"
                    value={fechaRequerida}
                    onChange={(e) => setFechaRequerida(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-black/40 border border-st-border rounded-xl text-sm text-white focus:outline-none focus:border-st-accent"
                  />
                </div>
              </div>

              {/* Motivo / Asunto (Short Subject) */}
              <div>
                <label className="block text-xs font-bold text-st-muted uppercase tracking-wider mb-1.5">
                  Motivo / Asunto <span className="text-st-accent">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ej: Cambio de plan por incremento de consumo"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  className="w-full px-4 py-3 bg-black/40 border border-st-border rounded-xl text-sm text-white focus:outline-none focus:border-st-accent transition-colors font-medium"
                  maxLength={150}
                  required
                />
              </div>

              {/* Rich Text Editor for Detalle */}
              <div>
                <label className="block text-xs font-bold text-st-muted uppercase tracking-wider mb-1.5">
                  Detalle de la solicitud
                </label>

                {/* Toolbar */}
                <div className="flex flex-wrap items-center gap-1.5 p-2 bg-black/60 border border-st-border rounded-t-xl border-b-0">
                  <button
                    type="button"
                    onClick={() => execEditorCommand('bold')}
                    title="Negrita"
                    className="p-1.5 bg-white/5 hover:bg-white/15 text-white rounded font-bold text-xs cursor-pointer flex items-center justify-center w-7 h-7"
                  >
                    <Bold className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => execEditorCommand('italic')}
                    title="Cursiva"
                    className="p-1.5 bg-white/5 hover:bg-white/15 text-white rounded italic text-xs cursor-pointer flex items-center justify-center w-7 h-7"
                  >
                    <Italic className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => execEditorCommand('underline')}
                    title="Subrayado"
                    className="p-1.5 bg-white/5 hover:bg-white/15 text-white rounded underline text-xs cursor-pointer flex items-center justify-center w-7 h-7"
                  >
                    <Underline className="w-3.5 h-3.5" />
                  </button>

                  <div className="h-4 w-px bg-st-border mx-1" />

                  {/* Preset Format Dropdown */}
                  <select
                    value={presetSize}
                    onChange={(e) => handleApplyPresetSize(e.target.value)}
                    className="px-2 py-1 bg-black/40 border border-st-border rounded text-xs text-white focus:outline-none cursor-pointer"
                  >
                    <option value="normal" className="bg-st-surface text-white">Normal</option>
                    <option value="destacado" className="bg-st-surface text-white">Destacado</option>
                    <option value="titulo" className="bg-st-surface text-white">Título</option>
                  </select>

                  <div className="h-4 w-px bg-st-border mx-1" />

                  <button
                    type="button"
                    onClick={() => execEditorCommand('insertUnorderedList')}
                    title="Lista con viñetas"
                    className="p-1.5 bg-white/5 hover:bg-white/15 text-white rounded text-xs cursor-pointer flex items-center justify-center w-7 h-7"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => execEditorCommand('insertOrderedList')}
                    title="Lista numerada"
                    className="p-1.5 bg-white/5 hover:bg-white/15 text-white rounded text-xs cursor-pointer flex items-center justify-center w-7 h-7"
                  >
                    <ListOrdered className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Editable Container */}
                <div
                  ref={editorRef}
                  contentEditable
                  onInput={handleEditorInput}
                  className="w-full min-h-[130px] p-3.5 bg-black/40 border border-st-border rounded-b-xl text-sm text-white focus:outline-none focus:border-st-accent transition-colors overflow-y-auto prose prose-invert max-w-none"
                  style={{ minHeight: '130px' }}
                />
              </div>

              {/* Attachments Section */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-st-muted uppercase tracking-wider flex items-center gap-1.5">
                    <Paperclip className="w-4 h-4 text-st-accent" />
                    Documentos adjuntos
                  </label>
                  <label className="px-3 py-1.5 bg-st-accent/10 border border-st-accent/30 text-st-accent hover:bg-st-accent hover:text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5" />
                    + Adjuntar archivos
                    <input
                      type="file"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                </div>

                {attachments.length > 0 && (
                  <div className="space-y-2 p-3 bg-black/30 rounded-xl border border-st-border">
                    {attachments.map((att) => (
                      <div key={att.id} className="flex items-center justify-between p-2.5 bg-white/5 rounded-lg border border-white/5 text-xs">
                        <div className="flex items-center gap-2.5 truncate">
                          <FileText className="w-4 h-4 text-st-accent shrink-0" />
                          <span className="text-white font-medium truncate">{att.name}</span>
                          <span className="text-st-muted shrink-0">({att.sizeFormatted})</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(att.id)}
                          className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-500/10 cursor-pointer shrink-0"
                          title="Quitar archivo"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Error Display */}
              {submitError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}
            </form>
          )}
        </div>

        {/* Modal Footer Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-st-border shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-5 py-2.5 bg-st-surface border border-st-border text-st-muted hover:text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50"
          >
            CANCELAR
          </button>
          <button
            type="submit"
            form="nueva-solicitud-form"
            disabled={submitting || loadingTipos || !selectedTipoId || !motivo.trim()}
            className="px-5 py-2.5 bg-st-accent text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-st-accent/80 transition-colors flex items-center gap-2 cursor-pointer shadow-lg shadow-st-accent/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {submitting ? 'GUARDANDO...' : '+ CREAR SOLICITUD'}
          </button>
        </div>

      </div>
    </div>
  );
}
