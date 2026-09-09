import React, { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  RefreshCw,
  Search,
  Clock,
  ArrowRight,
  X,
  Check,
  Trash2
} from 'lucide-react';
import client from '../api/client';

interface ProvisioningSummary {
  en_proceso: number;
  con_error: number;
  completados: number;
  terminales_sin_service_line: number;
  service_lines_sin_terminal: number;
  cambios_pendientes: number;
}

interface ServiceLifecycleItem {
  linea_servicio_id: number;
  numero_linea: string;
  plan_contratado: string;
  estado_provisionamiento: string;
  fecha_activacion: string;
  dispositivo_id?: number;
  device_id?: string;
  dispositivo_nombre?: string;
  kit_starlink?: string;
  tenant_id: number;
  cliente: string;
  cuenta_starlink: string;
}

interface ProvisioningHistoryItem {
  id: number;
  codigo: string;
  estado: string;
  cliente: string;
  plan_nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  usuario: string;
  mensaje_error?: string;
}

const Provisioning: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'servicios' | 'historial'>('servicios');
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [summary, setSummary] = useState<ProvisioningSummary>({
    en_proceso: 0,
    con_error: 0,
    completados: 0,
    terminales_sin_service_line: 0,
    service_lines_sin_terminal: 0,
    cambios_pendientes: 0
  });

  const [serviciosList, setServiciosList] = useState<ServiceLifecycleItem[]>([]);
  const [historialList, setHistorialList] = useState<ProvisioningHistoryItem[]>([]);
  const [clientOptions, setClientOptions] = useState<{ tenant_id: number; cliente: string }[]>([]);

  // Modals & Wizard State
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [empresaMode, setEmpresaMode] = useState<'existente' | 'nueva'>('existente');
  const [newEmpresaData, setNewEmpresaData] = useState({
    razon_social: '',
    nombre_comercial: '',
    identificacion_fiscal: '',
    pais_iso2: 'PE'
  });
  const [isCreatingCompany, setIsCreatingCompany] = useState(false);

  const [wizardData, setWizardData] = useState({
    tenant_id: 1,
    cliente: 'Pesquera Huafan S.A.',
    cuenta_starlink: 'ACC-PE-001',
    direccion: 'Av. Marina 450, Callao, PE',
    plan_nombre: 'Priority 1TB',
    device_id: 'ut-new-001'
  });

  const [selectedDeactivateItem, setSelectedDeactivateItem] = useState<ServiceLifecycleItem | null>(null);
  const [deactivateReason, setDeactivateReason] = useState('');
  const [deactivateConfirmed, setDeactivateConfirmed] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const fetchClients = async () => {
    try {
      const res = await client.get('/reseller/clientes');
      const rawList = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      if (Array.isArray(rawList)) {
        const list = rawList.map((c: any) => ({
          tenant_id: c.tenant_id || c.id,
          cliente: c.cliente || c.nombre_comercial || c.razon_social
        }));
        setClientOptions(list);
        if (list.length > 0) {
          setWizardData(prev => ({
            ...prev,
            tenant_id: list[0].tenant_id,
            cliente: list[0].cliente
          }));
        }
      }
    } catch (err) {
      console.error('Error fetching clients:', err);
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await client.get('/reseller/aprovisionamiento/summary');
      setSummary(res.data);
    } catch (err) {
      console.error('Error fetching summary:', err);
    }
  };

  const fetchServicios = async () => {
    setIsLoading(true);
    try {
      const res = await client.get('/reseller/aprovisionamiento/servicios');
      setServiciosList(res.data || []);
    } catch (err) {
      console.error('Error fetching servicios:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHistorial = async () => {
    setIsLoading(true);
    try {
      const res = await client.get('/reseller/aprovisionamiento/historial');
      setHistorialList(res.data || []);
    } catch (err) {
      console.error('Error fetching historial:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
    fetchSummary();
    if (activeTab === 'servicios') fetchServicios();
    else fetchHistorial();
  }, [activeTab]);

  // Inline Company Creation Handler
  const handleCreateCompanyInline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpresaData.razon_social.trim()) return;
    setIsCreatingCompany(true);
    try {
      const res = await client.post('/reseller/clientes', newEmpresaData);
      if (res.data && res.data.tenant_id) {
        const newClientItem = {
          tenant_id: res.data.tenant_id,
          cliente: res.data.cliente
        };
        setClientOptions(prev => [newClientItem, ...prev]);
        setWizardData(prev => ({
          ...prev,
          tenant_id: res.data.tenant_id,
          cliente: res.data.cliente
        }));
        setEmpresaMode('existente');
        setWizardStep(2); // Automatically advance to Step 2!
      }
    } catch (err) {
      console.error('Error creando empresa inline:', err);
    } finally {
      setIsCreatingCompany(false);
    }
  };

  // Submit New Provisioning Wizard
  const handleCreateNewService = async () => {
    try {
      await client.post('/reseller/aprovisionamiento/nuevo', wizardData);
      setIsWizardOpen(false);
      setWizardStep(1);
      fetchSummary();
      fetchServicios();
    } catch (err) {
      console.error('Error al aprovisionar nuevo servicio:', err);
    }
  };

  // Submit Service Deactivation
  const handleDeactivateService = async () => {
    if (!selectedDeactivateItem || !deactivateConfirmed) return;
    setIsDeactivating(true);
    try {
      await client.post('/reseller/aprovisionamiento/desactivar', {
        linea_servicio_id: selectedDeactivateItem.linea_servicio_id,
        motivo: deactivateReason || 'Baja solicitada por el cliente',
        confirmado: true
      });
      setSelectedDeactivateItem(null);
      setDeactivateConfirmed(false);
      setDeactivateReason('');
      fetchSummary();
      fetchServicios();
    } catch (err) {
      console.error('Error al desactivar servicio:', err);
    } finally {
      setIsDeactivating(false);
    }
  };

  const filteredServicios = serviciosList.filter(
    s =>
      s.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.numero_linea.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.device_id && s.device_id.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-st-surface border border-st-border p-6 rounded-2xl shadow-lg relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-st-online/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-st-online/10 border border-st-online/20 rounded-xl text-st-online">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white font-sans flex items-center gap-2">
              Aprovisionamiento &amp; Ciclo de Vida
            </h1>
            <p className="text-xs text-st-muted mt-0.5">
              Gestión de altas, asignación de equipos, cambios de plan y baja de servicios Starlink
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setIsWizardOpen(true);
              setWizardStep(1);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-st-accent hover:bg-st-accent/90 text-white font-bold text-xs rounded-xl shadow-lg transition-all active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Servicio</span>
          </button>

          <button
            onClick={() => {
              fetchSummary();
              fetchServicios();
            }}
            disabled={isLoading}
            className="flex items-center gap-2 px-3.5 py-2 bg-st-surface border border-st-border rounded-xl text-xs font-semibold text-st-muted hover:text-white transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refrescar</span>
          </button>
        </div>
      </div>

      {/* DASHBOARD CARDS (4 CARDS) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-st-surface border border-st-border rounded-xl p-4 flex flex-col justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-st-muted">En Proceso</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-white font-mono">{summary.en_proceso}</span>
            <span className="text-[10px] text-st-accent font-semibold">API Workflows</span>
          </div>
        </div>

        <div className="bg-st-surface border border-st-border rounded-xl p-4 flex flex-col justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-st-muted">Con Error</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-white font-mono">{summary.con_error}</span>
            <span className="text-[10px] text-st-offline font-semibold">Requiere revisión</span>
          </div>
        </div>

        <div className="bg-st-surface border border-st-border rounded-xl p-4 flex flex-col justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-st-muted">Terminales sin Line</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-white font-mono">{summary.terminales_sin_service_line}</span>
            <span className="text-[10px] text-st-warning font-semibold">En inventario</span>
          </div>
        </div>

        <div className="bg-st-surface border border-st-border rounded-xl p-4 flex flex-col justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-st-muted">Lines sin Terminal</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-white font-mono">{summary.service_lines_sin_terminal}</span>
            <span className="text-[10px] text-purple-400 font-semibold">Pendientes asociar</span>
          </div>
        </div>
      </div>

      {/* TABS AND SEARCH */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-st-border pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('servicios')}
              className={`px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'servicios'
                  ? 'bg-st-accent/10 text-st-accent border border-st-accent/30 shadow-md'
                  : 'text-st-muted hover:text-white hover:bg-st-surface'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Servicios en Cartera ({serviciosList.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('historial')}
              className={`px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'historial'
                  ? 'bg-st-accent/10 text-st-accent border border-st-accent/30 shadow-md'
                  : 'text-st-muted hover:text-white hover:bg-st-surface'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Historial Aprovisionamientos</span>
            </button>
          </div>

          <div className="relative w-72">
            <Search className="w-3.5 h-3.5 text-st-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar por cliente o línea..."
              className="w-full bg-st-surface border border-st-border rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-st-muted focus:outline-none focus:border-st-accent"
            />
          </div>
        </div>
      </div>

      {/* SERVICIOS LIST TABLE */}
      {activeTab === 'servicios' && (
        <div className="bg-st-surface border border-st-border rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-st-bg/80 text-st-muted uppercase tracking-wider font-semibold border-b border-st-border">
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Cuenta Starlink</th>
                  <th className="py-3 px-4">Service Line</th>
                  <th className="py-3 px-4">Plan Actual</th>
                  <th className="py-3 px-4">Terminal Asignado</th>
                  <th className="py-3 px-4">Estado Aprovisionamiento</th>
                  <th className="py-3 px-4 text-right">Acción Ciclo de Vida</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-st-border/50">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-st-muted">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-st-accent" />
                      Cargando ciclo de vida de servicios...
                    </td>
                  </tr>
                ) : filteredServicios.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-st-muted">
                      No hay servicios registrados en la cartera.
                    </td>
                  </tr>
                ) : (
                  filteredServicios.map(item => (
                    <tr key={item.linea_servicio_id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="py-3 px-4 font-bold text-white">{item.cliente}</td>
                      <td className="py-3 px-4 font-mono text-st-muted text-[11px]">{item.cuenta_starlink}</td>
                      <td className="py-3 px-4 font-mono text-st-accent font-semibold">{item.numero_linea}</td>
                      <td className="py-3 px-4 text-white font-medium">{item.plan_contratado}</td>
                      <td className="py-3 px-4">
                        {item.dispositivo_id ? (
                          <div>
                            <div className="font-semibold text-white">{item.dispositivo_nombre}</div>
                            <div className="text-[10px] font-mono text-st-muted">{item.device_id}</div>
                          </div>
                        ) : (
                          <span className="text-[10px] text-st-warning italic">Sin terminal asignado</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {item.estado_provisionamiento === 'ACTIVE' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-st-online/10 text-st-online border border-st-online/30">
                            Activo
                          </span>
                        ) : item.estado_provisionamiento === 'DEACTIVATED' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-st-offline/10 text-st-offline border border-st-offline/30">
                            Desactivado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-st-warning/10 text-st-warning border border-st-warning/30">
                            {item.estado_provisionamiento}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        {item.estado_provisionamiento === 'ACTIVE' && (
                          <button
                            onClick={() => setSelectedDeactivateItem(item)}
                            className="px-2.5 py-1 bg-st-offline/10 hover:bg-st-offline/20 border border-st-offline/30 text-st-offline font-bold text-[11px] rounded transition-all cursor-pointer inline-flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Desactivar</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* HISTORIAL TAB */}
      {activeTab === 'historial' && (
        <div className="bg-st-surface border border-st-border rounded-xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-st-border bg-st-bg/40">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-st-accent" />
              Historial de Workflows de Aprovisionamiento
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-st-bg/80 text-st-muted uppercase tracking-wider font-semibold border-b border-st-border">
                  <th className="py-3 px-4">Código Workflow</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Producto / Plan</th>
                  <th className="py-3 px-4">Inicio</th>
                  <th className="py-3 px-4">Fin</th>
                  <th className="py-3 px-4">Usuario</th>
                  <th className="py-3 px-4 text-right">Estado Workflow</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-st-border/50">
                {historialList.map(item => (
                  <tr key={item.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="py-3 px-4 font-mono text-st-accent font-bold">{item.codigo}</td>
                    <td className="py-3 px-4 font-bold text-white">{item.cliente}</td>
                    <td className="py-3 px-4 text-white">{item.plan_nombre}</td>
                    <td className="py-3 px-4 text-st-muted font-mono text-[11px]">{item.fecha_inicio}</td>
                    <td className="py-3 px-4 text-st-muted font-mono text-[11px]">{item.fecha_fin}</td>
                    <td className="py-3 px-4 text-st-muted">{item.usuario}</td>
                    <td className="py-3 px-4 text-right">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-st-online/10 text-st-online border border-st-online/30">
                        {item.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* WIZARD MODAL FOR NUEVO SERVICIO */}
      {isWizardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-st-surface border border-st-border rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setIsWizardOpen(false)}
              className="absolute top-4 right-4 text-st-muted hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-st-accent" />
                Wizard de Nuevo Servicio Starlink
              </h3>
              <p className="text-xs text-st-muted">Paso {wizardStep} de 4 — Configuración del ciclo de vida</p>
            </div>

            {/* Steps indicator */}
            <div className="flex items-center justify-between border-b border-st-border pb-3 text-xs">
              <span className={wizardStep === 1 ? 'font-bold text-st-accent' : 'text-st-muted'}>1. Cliente</span>
              <ArrowRight className="w-3.5 h-3.5 text-st-muted" />
              <span className={wizardStep === 2 ? 'font-bold text-st-accent' : 'text-st-muted'}>2. Dirección</span>
              <ArrowRight className="w-3.5 h-3.5 text-st-muted" />
              <span className={wizardStep === 3 ? 'font-bold text-st-accent' : 'text-st-muted'}>3. Plan</span>
              <ArrowRight className="w-3.5 h-3.5 text-st-muted" />
              <span className={wizardStep === 4 ? 'font-bold text-st-accent' : 'text-st-muted'}>4. Confirmar</span>
            </div>

            {/* Step 1 */}
            {wizardStep === 1 && (
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between bg-st-bg/80 p-1.5 rounded-xl border border-st-border">
                  <button
                    type="button"
                    onClick={() => setEmpresaMode('existente')}
                    className={`flex-1 py-1.5 rounded-lg font-semibold text-center transition-all cursor-pointer ${
                      empresaMode === 'existente'
                        ? 'bg-st-surface text-white shadow border border-st-border'
                        : 'text-st-muted hover:text-white'
                    }`}
                  >
                    Empresa Existente
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmpresaMode('nueva')}
                    className={`flex-1 py-1.5 rounded-lg font-semibold text-center transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      empresaMode === 'nueva'
                        ? 'bg-st-accent text-white shadow'
                        : 'text-st-muted hover:text-white'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Crear Nueva Empresa</span>
                  </button>
                </div>

                {empresaMode === 'existente' ? (
                  <div className="space-y-3">
                    <label className="block text-st-muted font-medium">Seleccionar Empresa / Cliente B2B</label>
                    <select
                      value={wizardData.tenant_id}
                      onChange={e => {
                        const tid = Number(e.target.value);
                        const match = clientOptions.find(c => c.tenant_id === tid);
                        if (match) {
                          setWizardData(prev => ({ ...prev, tenant_id: match.tenant_id, cliente: match.cliente }));
                        }
                      }}
                      className="w-full bg-st-bg border border-st-border rounded-xl p-2.5 text-white font-medium focus:outline-none focus:border-st-accent"
                    >
                      {clientOptions.length === 0 ? (
                        <option value="">No hay empresas registradas</option>
                      ) : (
                        clientOptions.map(c => (
                          <option key={c.tenant_id} value={c.tenant_id}>
                            {c.cliente} (ID: {c.tenant_id})
                          </option>
                        ))
                      )}
                    </select>

                    <div className="pt-2 text-right">
                      <button
                        type="button"
                        onClick={() => setEmpresaMode('nueva')}
                        className="text-st-accent hover:underline font-semibold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        ¿No encuentras la empresa? Regístrala aquí
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleCreateCompanyInline} className="space-y-3 bg-st-bg/60 p-3.5 rounded-xl border border-st-border">
                    <div className="text-white font-bold text-xs mb-1 flex items-center justify-between">
                      <span>Datos de la Nueva Empresa</span>
                      <span className="text-[10px] text-st-accent">Alta Inmediata</span>
                    </div>

                    <div>
                      <label className="block text-[11px] text-st-muted mb-1">Razón Social *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. Logística Global S.A.C."
                        value={newEmpresaData.razon_social}
                        onChange={e => setNewEmpresaData(prev => ({ ...prev, razon_social: e.target.value }))}
                        className="w-full bg-st-surface border border-st-border rounded-lg p-2 text-white placeholder-st-muted/60 focus:outline-none focus:border-st-accent"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-st-muted mb-1">Nombre Comercial (opcional)</label>
                      <input
                        type="text"
                        placeholder="Ej. Logística Express"
                        value={newEmpresaData.nombre_comercial}
                        onChange={e => setNewEmpresaData(prev => ({ ...prev, nombre_comercial: e.target.value }))}
                        className="w-full bg-st-surface border border-st-border rounded-lg p-2 text-white placeholder-st-muted/60 focus:outline-none focus:border-st-accent"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] text-st-muted mb-1">RUC / Doc. Fiscal</label>
                        <input
                          type="text"
                          placeholder="20601234567"
                          value={newEmpresaData.identificacion_fiscal}
                          onChange={e => setNewEmpresaData(prev => ({ ...prev, identificacion_fiscal: e.target.value }))}
                          className="w-full bg-st-surface border border-st-border rounded-lg p-2 text-white placeholder-st-muted/60 focus:outline-none focus:border-st-accent"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-st-muted mb-1">País</label>
                        <select
                          value={newEmpresaData.pais_iso2}
                          onChange={e => setNewEmpresaData(prev => ({ ...prev, pais_iso2: e.target.value }))}
                          className="w-full bg-st-surface border border-st-border rounded-lg p-2 text-white focus:outline-none focus:border-st-accent"
                        >
                          <option value="PE">Perú (PE)</option>
                          <option value="CL">Chile (CL)</option>
                          <option value="CO">Colombia (CO)</option>
                          <option value="MX">México (MX)</option>
                          <option value="BR">Brasil (BR)</option>
                          <option value="AR">Argentina (AR)</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isCreatingCompany || !newEmpresaData.razon_social.trim()}
                      className="w-full py-2 mt-2 bg-st-accent hover:bg-st-accent/90 disabled:opacity-50 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                    >
                      {isCreatingCompany ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      <span>Crear Empresa y Continuar</span>
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* Step 2 */}
            {wizardStep === 2 && (
              <div className="space-y-3 text-xs">
                <label className="block text-st-muted">Dirección de Instalación de Servicio</label>
                <input
                  type="text"
                  value={wizardData.direccion}
                  onChange={e => setWizardData({ ...wizardData, direccion: e.target.value })}
                  className="w-full bg-st-bg border border-st-border rounded-lg p-2.5 text-white"
                />
              </div>
            )}

            {/* Step 3 */}
            {wizardStep === 3 && (
              <div className="space-y-3 text-xs">
                <label className="block text-st-muted">Seleccionar Producto / Plan Starlink</label>
                <select
                  value={wizardData.plan_nombre}
                  onChange={e => setWizardData({ ...wizardData, plan_nombre: e.target.value })}
                  className="w-full bg-st-bg border border-st-border rounded-lg p-2.5 text-white"
                >
                  <option value="Priority 1TB">Priority 1TB (Empresas Fijo)</option>
                  <option value="Priority 2TB">Priority 2TB (Empresas Fijo)</option>
                  <option value="Mobile Priority 50GB">Mobile Priority 50GB (Marítimo/Móvil)</option>
                  <option value="Mobile Priority 1TB">Mobile Priority 1TB (Marítimo/Móvil)</option>
                </select>
              </div>
            )}

            {/* Step 4 */}
            {wizardStep === 4 && (
              <div className="bg-st-bg/60 border border-st-border p-4 rounded-xl space-y-2 text-xs">
                <div className="font-bold text-white text-sm mb-2">Resumen de Alta</div>
                <div className="flex justify-between">
                  <span className="text-st-muted">Cliente:</span>
                  <span className="font-bold text-white">{wizardData.cliente}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-st-muted">Plan:</span>
                  <span className="font-bold text-st-accent">{wizardData.plan_nombre}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-st-muted">Dirección:</span>
                  <span className="text-white">{wizardData.direccion}</span>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              {wizardStep > 1 && (
                <button
                  type="button"
                  onClick={() => setWizardStep(s => s - 1)}
                  className="py-2.5 px-4 bg-st-bg border border-st-border text-st-muted hover:text-white font-semibold text-xs rounded-xl"
                >
                  Anterior
                </button>
              )}

              {wizardStep < 4 ? (
                <button
                  type="button"
                  onClick={() => setWizardStep(s => s + 1)}
                  className="flex-1 py-2.5 bg-st-accent hover:bg-st-accent/90 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Siguiente</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCreateNewService}
                  className="flex-1 py-2.5 bg-st-online hover:bg-st-online/90 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Aprovisionar Servicio</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DEACTIVATE DESTRUCTIVE MODAL */}
      {selectedDeactivateItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-st-surface border border-st-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setSelectedDeactivateItem(null)}
              className="absolute top-4 right-4 text-st-muted hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-st-offline/10 border border-st-offline/30 rounded-xl text-st-offline">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Desactivar Servicio Starlink</h3>
                <p className="text-xs text-st-muted">Acción crítica y destructiva</p>
              </div>
            </div>

            <div className="bg-st-bg/60 border border-st-border p-4 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-st-muted">Cliente:</span>
                <span className="font-bold text-white">{selectedDeactivateItem.cliente}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-st-muted">Service Line:</span>
                <span className="font-mono text-st-accent font-bold">{selectedDeactivateItem.numero_linea}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-st-muted">Plan:</span>
                <span className="text-white">{selectedDeactivateItem.plan_contratado}</span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <label className="block text-st-muted">Motivo de Baja / Cancelación (Obligatorio)</label>
              <input
                type="text"
                value={deactivateReason}
                onChange={e => setDeactivateReason(e.target.value)}
                placeholder="Ej. Solicitud expresa del cliente por fin de proyecto"
                className="w-full bg-st-bg border border-st-border rounded-lg p-2 text-white"
              />

              <label className="flex items-center gap-2 pt-2 cursor-pointer text-st-offline font-semibold">
                <input
                  type="checkbox"
                  checked={deactivateConfirmed}
                  onChange={e => setDeactivateConfirmed(e.target.checked)}
                />
                <span>Confirmo la desactivación permanente del servicio</span>
              </label>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedDeactivateItem(null)}
                className="flex-1 py-2.5 bg-st-bg border border-st-border text-st-muted hover:text-white font-semibold text-xs rounded-xl cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleDeactivateService}
                disabled={!deactivateConfirmed || isDeactivating}
                className="flex-1 py-2.5 bg-st-offline hover:bg-st-offline/90 text-white font-bold text-xs rounded-xl cursor-pointer flex items-center justify-center gap-2 shadow-lg disabled:opacity-40"
              >
                {isDeactivating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>Desactivar Línea</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Provisioning;
