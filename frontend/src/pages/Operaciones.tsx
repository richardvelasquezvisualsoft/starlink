import React, { useState, useEffect } from 'react';
import {
  Sliders,
  RotateCw,
  Zap,
  ShieldAlert,
  MapPin,
  Clock,
  RefreshCw,
  Search,
  AlertTriangle,
  Check,
  X,
  Satellite,
  Edit3
} from 'lucide-react';
import client from '../api/client';

interface RemoteItem {
  dispositivo_id: number;
  device_id: string;
  dispositivo_nombre: string;
  kit_starlink: string;
  router_id?: number;
  linea_servicio_id?: number;
  numero_linea: string;
  plan_nombre: string;
  tenant_id: number;
  cliente: string;
  conectado: boolean;
  estado_operativo: string;
  latencia_ms: number;
  acciones_disponibles: string[];
}

interface ConsumoControlItem {
  linea_servicio_id: number;
  numero_linea: string;
  cliente: string;
  tenant_id: number;
  dispositivo_nombre: string;
  device_id: string;
  starlink: {
    plan_nombre: string;
    plan_limite_gb: number;
    consumo_actual_gb: number;
    priority_extra_permitido: boolean;
    ip_publica_habilitada: boolean;
    ultimo_top_up_gb: number;
    fecha_ultimo_top_up?: string;
  };
  starmonitor: {
    alerta_consumo_pct_1: number;
    alerta_consumo_pct_2: number;
    limite_adicional_gb_mes: number;
    limite_gasto_adicional: number;
    moneda_limite: string;
    accion_al_limite: string;
    cliente_puede_cambiar_overage: boolean;
    cliente_puede_hacer_topup: boolean;
  };
}

interface PoliticaItem {
  linea_servicio_id: number;
  numero_linea: string;
  cliente: string;
  tenant_id: number;
  dispositivo_nombre: string;
  device_id: string;
  plan_nombre: string;
  estado_servicio_actual: string;
  alerta_consumo_pct_1: number;
  alerta_consumo_pct_2: number;
  limite_adicional_gb_mes: number;
  limite_gasto_adicional: number;
  moneda_limite: string;
  accion_al_limite: string; // 'REQUIERE_APROBACION' | 'SOLO_ALERTAR' | 'SIN_LIMITE_INTERNO'
  cliente_puede_reiniciar_terminal: boolean;
  cliente_puede_reiniciar_router: boolean;
  cliente_puede_cambiar_overage: boolean;
  cliente_puede_hacer_topup: boolean;
}

interface GeozonaEventoItem {
  evento_id: number;
  tenant_id: number;
  cliente: string;
  dispositivo_id: number;
  device_id: string;
  dispositivo_nombre: string;
  geozona_id: number;
  nombre_geozona: string;
  primera_muestra_fuera: string;
  salida_confirmada?: string;
  estado_evento: string; // 'PENDIENTE_APROBACION' | 'APROBADO' | 'RECHAZADO'
  accion_configurada: string;
  accion_ejecutada?: string;
  requiere_aprobacion: boolean;
  aprobado_por?: number;
  fecha_aprobacion?: string;
  observacion?: string;
}

interface HistorialComandoItem {
  id: number;
  comando: string;
  estado: string;
  fecha_solicitud: string;
  duracion: string;
  http_status: number;
  id_correlacion: string;
  cliente: string;
  dispositivo_nombre: string;
  device_id: string;
  numero_linea: string;
  usuario: string;
  request_json?: any;
  response_json?: any;
  mensaje_error?: string;
}

const Operaciones: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'remotas' | 'consumo' | 'politicas' | 'geozonas' | 'historial'
  >('remotas');

  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Data states
  const [remotasList, setRemotasList] = useState<RemoteItem[]>([]);
  const [consumoList, setConsumoList] = useState<ConsumoControlItem[]>([]);
  const [politicasList, setPoliticasList] = useState<PoliticaItem[]>([]);
  const [geozonasList, setGeozonasList] = useState<GeozonaEventoItem[]>([]);
  const [historialList, setHistorialList] = useState<HistorialComandoItem[]>([]);

  // Remote Action Modal Confirmation
  const [selectedActionItem, setSelectedActionItem] = useState<RemoteItem | null>(null);
  const [actionType, setActionType] = useState<'REBOOT_TERMINAL' | 'REBOOT_ROUTER' | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<any | null>(null);

  // Policy Edit Modal State
  const [selectedPolitica, setSelectedPolitica] = useState<PoliticaItem | null>(null);
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [isSavingPolicy, setIsSavingPolicy] = useState(false);

  // Fetch functions
  const fetchRemotas = async () => {
    setIsLoading(true);
    try {
      const res = await client.get('/reseller/operaciones/remotas');
      setRemotasList(res.data || []);
    } catch (err) {
      console.error('Error fetching remotas:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchConsumo = async () => {
    setIsLoading(true);
    try {
      const res = await client.get('/reseller/operaciones/consumo');
      setConsumoList(res.data || []);
    } catch (err) {
      console.error('Error fetching consumo:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPoliticas = async () => {
    setIsLoading(true);
    try {
      const res = await client.get('/reseller/operaciones/politicas');
      setPoliticasList(res.data || []);
    } catch (err) {
      console.error('Error fetching politicas:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGeozonas = async () => {
    setIsLoading(true);
    try {
      const res = await client.get('/reseller/operaciones/geozonas');
      setGeozonasList(res.data || []);
    } catch (err) {
      console.error('Error fetching geozonas:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHistorial = async () => {
    setIsLoading(true);
    try {
      const res = await client.get('/reseller/operaciones/historial');
      setHistorialList(res.data || []);
    } catch (err) {
      console.error('Error fetching historial:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'remotas') fetchRemotas();
    else if (activeTab === 'consumo') fetchConsumo();
    else if (activeTab === 'politicas') fetchPoliticas();
    else if (activeTab === 'geozonas') fetchGeozonas();
    else if (activeTab === 'historial') fetchHistorial();
  }, [activeTab]);

  // Handle Remote Command Execution
  const handleExecuteRemoteAction = async () => {
    if (!selectedActionItem || !actionType) return;
    setIsExecuting(true);
    setExecutionResult(null);
    try {
      const res = await client.post('/reseller/operaciones/remotas/ejecutar', {
        comando: actionType,
        dispositivo_id: selectedActionItem.dispositivo_id,
        router_id: selectedActionItem.router_id,
        linea_servicio_id: selectedActionItem.linea_servicio_id,
        confirmado: true
      });
      setExecutionResult(res.data);
      fetchRemotas();
    } catch (err: any) {
      console.error('Error al ejecutar comando:', err);
      setExecutionResult({
        error: err.response?.data?.detail || 'Error al conectar con la API de Starlink'
      });
    } finally {
      setIsExecuting(false);
    }
  };

  // Handle Policy Save
  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPolitica) return;
    setIsSavingPolicy(true);
    try {
      await client.put(`/reseller/operaciones/politicas/${selectedPolitica.linea_servicio_id}`, selectedPolitica);
      setIsPolicyModalOpen(false);
      fetchPoliticas();
    } catch (err) {
      console.error('Error al guardar política:', err);
    } finally {
      setIsSavingPolicy(false);
    }
  };

  // Handle Geofence Approval
  const handleApproveGeofence = async (eventoId: number, accion: 'APROBAR' | 'RECHAZADO') => {
    try {
      await client.post(`/reseller/operaciones/geozonas/${eventoId}/aprobar`, {
        accion,
        observacion: accion === 'APROBAR' ? 'Aprobado por operador RESELLER' : 'Rechazado por política de perímetro'
      });
      fetchGeozonas();
    } catch (err) {
      console.error('Error al procesar geozona:', err);
    }
  };

  // Filtered lists by search term
  const filteredRemotas = remotasList.filter(
    item =>
      item.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.dispositivo_nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.device_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.numero_linea.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredConsumo = consumoList.filter(
    item =>
      item.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.dispositivo_nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.numero_linea.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPoliticas = politicasList.filter(
    item =>
      item.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.dispositivo_nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.numero_linea.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-st-surface border border-st-border p-6 rounded-2xl shadow-lg relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-st-accent/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-st-accent/10 border border-st-accent/20 rounded-xl text-st-accent">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white font-sans flex items-center gap-2">
              Operaciones Globales
            </h1>
            <p className="text-xs text-st-muted mt-0.5">
              Control, gobierno, acciones remotas y políticas sobre la cartera de servicios Starlink
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (activeTab === 'remotas') fetchRemotas();
              else if (activeTab === 'consumo') fetchConsumo();
              else if (activeTab === 'politicas') fetchPoliticas();
              else if (activeTab === 'geozonas') fetchGeozonas();
              else if (activeTab === 'historial') fetchHistorial();
            }}
            disabled={isLoading}
            className="flex items-center gap-2 px-3.5 py-2 bg-st-surface border border-st-border rounded-xl text-xs font-semibold text-st-muted hover:text-white hover:border-white/20 transition-all active:scale-[0.98] cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refrescar</span>
          </button>
        </div>
      </div>

      {/* SEARCH AND TABS BAR */}
      <div className="space-y-4">
        {/* Navigation Sub-Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-st-border pb-3">
          <button
            onClick={() => setActiveTab('remotas')}
            className={`px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'remotas'
                ? 'bg-st-accent/10 text-st-accent border border-st-accent/30 shadow-md'
                : 'text-st-muted hover:text-white hover:bg-st-surface'
            }`}
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Acciones remotas</span>
          </button>

          <button
            onClick={() => setActiveTab('consumo')}
            className={`px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'consumo'
                ? 'bg-st-accent/10 text-st-accent border border-st-accent/30 shadow-md'
                : 'text-st-muted hover:text-white hover:bg-st-surface'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Control de consumo</span>
          </button>

          <button
            onClick={() => setActiveTab('politicas')}
            className={`px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'politicas'
                ? 'bg-st-accent/10 text-st-accent border border-st-accent/30 shadow-md'
                : 'text-st-muted hover:text-white hover:bg-st-surface'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Políticas y límites</span>
          </button>

          <button
            onClick={() => setActiveTab('geozonas')}
            className={`px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'geozonas'
                ? 'bg-st-accent/10 text-st-accent border border-st-accent/30 shadow-md'
                : 'text-st-muted hover:text-white hover:bg-st-surface'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Geozonas / aprobaciones</span>
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
            <span>Historial</span>
          </button>
        </div>

        {/* Search Bar */}
        {activeTab !== 'historial' && (
          <div className="relative">
            <Search className="w-4 h-4 text-st-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Filtrar por cliente, servicio, terminal o device ID..."
              className="w-full bg-st-surface border border-st-border rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-st-muted focus:outline-none focus:border-st-accent transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-st-muted hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* SUBTAB 1: ACCIONES REMOTAS */}
      {activeTab === 'remotas' && (
        <div className="bg-st-surface border border-st-border rounded-xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-st-border bg-st-bg/40 flex justify-between items-center">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <RotateCw className="w-4 h-4 text-st-accent" />
                Acciones Remotas Disponibles
              </h2>
              <p className="text-[11px] text-st-muted">
                Reinicio controlado de terminales Starlink (antena) y routers de cliente.
              </p>
            </div>
            <span className="text-xs font-mono text-st-muted">
              {filteredRemotas.length} equipos
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-st-bg/80 text-st-muted uppercase tracking-wider font-semibold border-b border-st-border">
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Service Line</th>
                  <th className="py-3 px-4">Terminal / Equipo</th>
                  <th className="py-3 px-4">Kit Starlink</th>
                  <th className="py-3 px-4">Estado Conexión</th>
                  <th className="py-3 px-4 text-right">Acciones Ejecutables</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-st-border/50">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-st-muted">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-st-accent" />
                      Cargando lista de equipos para acciones remotas...
                    </td>
                  </tr>
                ) : filteredRemotas.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-st-muted">
                      No se encontraron equipos para el filtro especificado.
                    </td>
                  </tr>
                ) : (
                  filteredRemotas.map(item => (
                    <tr key={item.dispositivo_id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="py-3 px-4 font-bold text-white">{item.cliente}</td>
                      <td className="py-3 px-4 font-mono text-st-accent font-semibold">{item.numero_linea}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-white">{item.dispositivo_nombre}</div>
                        <div className="text-[10px] font-mono text-st-muted flex items-center gap-1">
                          <Satellite className="w-3 h-3 text-st-accent" />
                          {item.device_id}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-st-muted">{item.kit_starlink}</td>
                      <td className="py-3 px-4">
                        {item.conectado ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-st-online/10 text-st-online border border-st-online/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-st-online" />
                            CONECTADO
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-st-offline/10 text-st-offline border border-st-offline/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-st-offline" />
                            OFFLINE
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => {
                            setSelectedActionItem(item);
                            setActionType('REBOOT_TERMINAL');
                            setExecutionResult(null);
                            setIsConfirmModalOpen(true);
                          }}
                          className="px-3 py-1.5 bg-st-surface border border-st-border hover:border-st-offline/40 text-st-offline hover:bg-st-offline/10 font-bold text-[11px] rounded-lg transition-all active:scale-[0.98] cursor-pointer inline-flex items-center gap-1"
                        >
                          <RotateCw className="w-3 h-3" />
                          <span>Reiniciar Antena</span>
                        </button>

                        <button
                          onClick={() => {
                            setSelectedActionItem(item);
                            setActionType('REBOOT_ROUTER');
                            setExecutionResult(null);
                            setIsConfirmModalOpen(true);
                          }}
                          className="px-3 py-1.5 bg-st-surface border border-st-border hover:border-st-warning/40 text-st-warning hover:bg-st-warning/10 font-bold text-[11px] rounded-lg transition-all active:scale-[0.98] cursor-pointer inline-flex items-center gap-1"
                        >
                          <RotateCw className="w-3 h-3" />
                          <span>Reiniciar Router</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 2: CONTROL DE CONSUMO */}
      {activeTab === 'consumo' && (
        <div className="bg-st-surface border border-st-border rounded-xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-st-border bg-st-bg/40 flex justify-between items-center">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Zap className="w-4 h-4 text-st-accent" />
                Control de Consumo &amp; Priority Data
              </h2>
              <p className="text-[11px] text-st-muted">
                Diferenciación clara entre datos Starlink y políticas adicionales de STARMONITOR.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-st-bg/80 text-st-muted uppercase tracking-wider font-semibold border-b border-st-border">
                  <th className="py-3 px-4">Cliente / Servicio</th>
                  <th className="py-3 px-4">Plan Starlink</th>
                  <th className="py-3 px-4">Consumo Ciclo</th>
                  <th className="py-3 px-4">Priority Data Extra (Starlink)</th>
                  <th className="py-3 px-4">IP Pública (Starlink)</th>
                  <th className="py-3 px-4">Límite Adicional (STARMONITOR)</th>
                  <th className="py-3 px-4">Acción al Límite</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-st-border/50">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-st-muted">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-st-accent" />
                      Cargando datos de consumo...
                    </td>
                  </tr>
                ) : filteredConsumo.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-st-muted">
                      No hay datos de consumo registrados.
                    </td>
                  </tr>
                ) : (
                  filteredConsumo.map(item => (
                    <tr key={item.linea_servicio_id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-white">{item.cliente}</div>
                        <div className="text-[10px] font-mono text-st-accent">{item.numero_linea}</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{item.starlink.plan_nombre}</div>
                        <div className="text-[10px] text-st-muted">{item.starlink.plan_limite_gb} GB de cupo base</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-mono text-sm font-bold text-white">
                          {item.starlink.consumo_actual_gb} GB
                        </div>
                        <div className="w-24 bg-st-bg rounded-full h-1.5 mt-1 border border-st-border overflow-hidden">
                          <div
                            className="bg-st-accent h-1.5 rounded-full"
                            style={{
                              width: `${Math.min(
                                100,
                                (item.starlink.consumo_actual_gb / item.starlink.plan_limite_gb) * 100
                              )}%`
                            }}
                          />
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {item.starlink.priority_extra_permitido ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-st-online/10 text-st-online border border-st-online/30">
                            Habilitado (Opt-in)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-st-warning/10 text-st-warning border border-st-warning/30">
                            Bloqueado (Opt-out)
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {item.starlink.ip_publica_habilitada ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-st-accent/10 text-st-accent border border-st-accent/30">
                            Activa
                          </span>
                        ) : (
                          <span className="text-[10px] text-st-muted">No habilitada</span>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono font-semibold text-white">
                        {item.starmonitor.limite_adicional_gb_mes} GB / {item.starmonitor.moneda_limite} ${item.starmonitor.limite_gasto_adicional}
                      </td>

                      <td className="py-3 px-4">
                        <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/30">
                          {item.starmonitor.accion_al_limite}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 3: POLÍTICAS Y LÍMITES */}
      {activeTab === 'politicas' && (
        <div className="bg-st-surface border border-st-border rounded-xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-st-border bg-st-bg/40 flex justify-between items-center">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-st-accent" />
                Políticas de Gobernanza STARMONITOR
              </h2>
              <p className="text-[11px] text-st-muted">
                Umbrales de alerta preventiva/crítica, límites adicionales y permisos de cliente.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-st-bg/80 text-st-muted uppercase tracking-wider font-semibold border-b border-st-border">
                  <th className="py-3 px-4">Cliente / Servicio</th>
                  <th className="py-3 px-4">Alertas (%)</th>
                  <th className="py-3 px-4">Máx. Datos Adicionales</th>
                  <th className="py-3 px-4">Máx. Gasto Adicional</th>
                  <th className="py-3 px-4">Modo de Política</th>
                  <th className="py-3 px-4">Permisos Cliente</th>
                  <th className="py-3 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-st-border/50">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-st-muted">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-st-accent" />
                      Cargando políticas de gobernanza...
                    </td>
                  </tr>
                ) : filteredPoliticas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-st-muted">
                      No hay políticas configuradas.
                    </td>
                  </tr>
                ) : (
                  filteredPoliticas.map(item => (
                    <tr key={item.linea_servicio_id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-white">{item.cliente}</div>
                        <div className="text-[10px] font-mono text-st-accent">{item.numero_linea}</div>
                      </td>

                      <td className="py-3 px-4 font-mono text-xs">
                        <span className="text-st-warning font-bold">{item.alerta_consumo_pct_1}%</span> /{' '}
                        <span className="text-st-offline font-bold">{item.alerta_consumo_pct_2}%</span>
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-white">
                        {item.limite_adicional_gb_mes} GB
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-st-online">
                        {item.moneda_limite} ${item.limite_gasto_adicional}
                      </td>

                      <td className="py-3 px-4">
                        <span className="text-[10px] font-bold uppercase font-mono px-2 py-0.5 rounded bg-st-bg border border-st-border text-white">
                          {item.accion_al_limite}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-[10px] space-y-0.5">
                        <div className={item.cliente_puede_reiniciar_router ? 'text-st-online font-semibold' : 'text-st-muted'}>
                          • Router Reboot: {item.cliente_puede_reiniciar_router ? 'Sí' : 'No'}
                        </div>
                        <div className={item.cliente_puede_reiniciar_terminal ? 'text-st-online font-semibold' : 'text-st-muted'}>
                          • Antena Reboot: {item.cliente_puede_reiniciar_terminal ? 'Sí' : 'No'}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedPolitica(item);
                            setIsPolicyModalOpen(true);
                          }}
                          className="px-3 py-1.5 bg-st-surface border border-st-border hover:border-st-accent/40 text-st-accent font-bold text-[11px] rounded-lg transition-all active:scale-[0.98] cursor-pointer inline-flex items-center gap-1"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Editar Política</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 4: GEOZONAS / APROBACIONES */}
      {activeTab === 'geozonas' && (
        <div className="bg-st-surface border border-st-border rounded-xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-st-border bg-st-bg/40 flex justify-between items-center">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <MapPin className="w-4 h-4 text-st-accent" />
                Aprobaciones de Perímetro Geográfico
              </h2>
              <p className="text-[11px] text-st-muted">
                Revisión y autorización de eventos por salidas de geozona asignada.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-st-bg/80 text-st-muted uppercase tracking-wider font-semibold border-b border-st-border">
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Equipo / Terminal</th>
                  <th className="py-3 px-4">Geozona Configurada</th>
                  <th className="py-3 px-4">Fecha Salida</th>
                  <th className="py-3 px-4">Estado Evento</th>
                  <th className="py-3 px-4">Observación</th>
                  <th className="py-3 px-4 text-right">Decisión Operador</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-st-border/50">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-st-muted">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-st-accent" />
                      Cargando eventos de geozona...
                    </td>
                  </tr>
                ) : geozonasList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-st-muted">
                      No hay solicitudes o eventos de geozonas registrados.
                    </td>
                  </tr>
                ) : (
                  geozonasList.map(item => (
                    <tr key={item.evento_id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="py-3 px-4 font-bold text-white">{item.cliente}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{item.dispositivo_nombre}</div>
                        <div className="text-[10px] text-st-muted font-mono">{item.device_id}</div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-st-accent">{item.nombre_geozona}</td>
                      <td className="py-3 px-4 text-st-muted font-mono text-[11px]">
                        {new Date(item.primera_muestra_fuera).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        {item.estado_evento === 'APROBADO' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-st-online/10 text-st-online border border-st-online/30">
                            Aprobado
                          </span>
                        ) : item.estado_evento === 'RECHAZADO' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-st-offline/10 text-st-offline border border-st-offline/30">
                            Rechazado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-st-warning/10 text-st-warning border border-st-warning/30">
                            Pendiente Aprobación
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-st-muted text-[11px]">{item.observacion}</td>
                      <td className="py-3 px-4 text-right space-x-2">
                        {item.estado_evento !== 'APROBADO' && (
                          <button
                            onClick={() => handleApproveGeofence(item.evento_id, 'APROBAR')}
                            className="px-2.5 py-1 bg-st-online/10 border border-st-online/30 text-st-online hover:bg-st-online/20 font-bold text-[11px] rounded transition-all cursor-pointer"
                          >
                            Aprobar
                          </button>
                        )}
                        {item.estado_evento !== 'RECHAZADO' && (
                          <button
                            onClick={() => handleApproveGeofence(item.evento_id, 'RECHAZADO')}
                            className="px-2.5 py-1 bg-st-offline/10 border border-st-offline/30 text-st-offline hover:bg-st-offline/20 font-bold text-[11px] rounded transition-all cursor-pointer"
                          >
                            Rechazar
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

      {/* SUBTAB 5: HISTORIAL */}
      {activeTab === 'historial' && (
        <div className="bg-st-surface border border-st-border rounded-xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-st-border bg-st-bg/40 flex justify-between items-center">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-st-accent" />
                Historial Auditado de Comandos Remotos
              </h2>
              <p className="text-[11px] text-st-muted">
                Registro persistido en `comandos_remotos_log` con correlación y respuesta HTTP.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-st-bg/80 text-st-muted uppercase tracking-wider font-semibold border-b border-st-border">
                  <th className="py-3 px-4">Fecha / Hora</th>
                  <th className="py-3 px-4">Comando</th>
                  <th className="py-3 px-4">Cliente / Equipo</th>
                  <th className="py-3 px-4">Usuario</th>
                  <th className="py-3 px-4">ID Correlación</th>
                  <th className="py-3 px-4">Status HTTP</th>
                  <th className="py-3 px-4 text-right">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-st-border/50">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-st-muted">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-st-accent" />
                      Cargando historial de comandos...
                    </td>
                  </tr>
                ) : historialList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-st-muted">
                      No se registraron ejecuciones previas de comandos remotas.
                    </td>
                  </tr>
                ) : (
                  historialList.map(item => (
                    <tr key={item.id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="py-3 px-4 font-mono text-[11px] text-st-muted">
                        {new Date(item.fecha_solicitud).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-bold text-white font-mono">{item.comando}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-white">{item.cliente}</div>
                        <div className="text-[10px] font-mono text-st-muted">{item.dispositivo_nombre}</div>
                      </td>
                      <td className="py-3 px-4 text-st-muted">{item.usuario}</td>
                      <td className="py-3 px-4 font-mono text-[10px] text-st-accent">{item.id_correlacion}</td>
                      <td className="py-3 px-4 font-mono font-bold text-st-online">{item.http_status}</td>
                      <td className="py-3 px-4 text-right">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-st-online/10 text-st-online border border-st-online/30">
                          {item.estado}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REMOTE ACTION CONFIRMATION MODAL */}
      {isConfirmModalOpen && selectedActionItem && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-st-surface border border-st-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setIsConfirmModalOpen(false)}
              className="absolute top-4 right-4 text-st-muted hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-st-offline/10 border border-st-offline/30 rounded-xl text-st-offline">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Confirmar Acción Remota</h3>
                <p className="text-xs text-st-muted">Esta acción interactúa con la API de Starlink.</p>
              </div>
            </div>

            <div className="bg-st-bg/60 border border-st-border p-4 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-st-muted">Comando:</span>
                <span className="font-mono font-bold text-white">{actionType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-st-muted">Cliente:</span>
                <span className="font-bold text-white">{selectedActionItem.cliente}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-st-muted">Equipo:</span>
                <span className="font-mono text-st-accent">{selectedActionItem.dispositivo_nombre}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-st-muted">Device ID:</span>
                <span className="font-mono text-st-muted">{selectedActionItem.device_id}</span>
              </div>
            </div>

            {executionResult && (
              <div className={`p-3 rounded-xl border text-xs font-mono space-y-1 ${
                executionResult.error ? 'bg-st-offline/10 border-st-offline/30 text-st-offline' : 'bg-st-online/10 border-st-online/30 text-st-online'
              }`}>
                <div className="font-bold">
                  {executionResult.error ? 'Falló la ejecución' : '¡Comando Enviado Exitosamente!'}
                </div>
                <div className="text-[10px] text-white">
                  {executionResult.error || `Correlación: ${executionResult.id_correlacion}`}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="flex-1 py-2.5 bg-st-bg border border-st-border text-st-muted hover:text-white font-semibold text-xs rounded-xl cursor-pointer"
              >
                Cerrar
              </button>

              {!executionResult?.success && (
                <button
                  type="button"
                  onClick={handleExecuteRemoteAction}
                  disabled={isExecuting}
                  className="flex-1 py-2.5 bg-st-offline hover:bg-st-offline/90 text-white font-bold text-xs rounded-xl cursor-pointer flex items-center justify-center gap-2 shadow-lg"
                >
                  {isExecuting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4" />}
                  <span>Confirmar Reinicio</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* EDIT POLICY MODAL */}
      {isPolicyModalOpen && selectedPolitica && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <form onSubmit={handleSavePolicy} className="bg-st-surface border border-st-border rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setIsPolicyModalOpen(false)}
              className="absolute top-4 right-4 text-st-muted hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-st-accent/10 border border-st-accent/30 rounded-xl text-st-accent">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Editar Política STARMONITOR</h3>
                <p className="text-xs text-st-muted">Configuración para {selectedPolitica.cliente} ({selectedPolitica.numero_linea})</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-st-muted mb-1">Alerta Preventiva (%)</label>
                <input
                  type="number"
                  value={selectedPolitica.alerta_consumo_pct_1}
                  onChange={e => setSelectedPolitica({ ...selectedPolitica, alerta_consumo_pct_1: Number(e.target.value) })}
                  className="w-full bg-st-bg border border-st-border rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-st-muted mb-1">Alerta Crítica (%)</label>
                <input
                  type="number"
                  value={selectedPolitica.alerta_consumo_pct_2}
                  onChange={e => setSelectedPolitica({ ...selectedPolitica, alerta_consumo_pct_2: Number(e.target.value) })}
                  className="w-full bg-st-bg border border-st-border rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-st-muted mb-1">Límite Adicional (GB/mes)</label>
                <input
                  type="number"
                  value={selectedPolitica.limite_adicional_gb_mes}
                  onChange={e => setSelectedPolitica({ ...selectedPolitica, limite_adicional_gb_mes: Number(e.target.value) })}
                  className="w-full bg-st-bg border border-st-border rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-st-muted mb-1">Límite Gasto Adicional ({selectedPolitica.moneda_limite})</label>
                <input
                  type="number"
                  value={selectedPolitica.limite_gasto_adicional}
                  onChange={e => setSelectedPolitica({ ...selectedPolitica, limite_gasto_adicional: Number(e.target.value) })}
                  className="w-full bg-st-bg border border-st-border rounded-lg p-2 text-white"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-st-muted mb-1">Acción al Alcanzar Límite</label>
                <select
                  value={selectedPolitica.accion_al_limite}
                  onChange={e => setSelectedPolitica({ ...selectedPolitica, accion_al_limite: e.target.value })}
                  className="w-full bg-st-bg border border-st-border rounded-lg p-2 text-white font-mono"
                >
                  <option value="REQUIERE_APROBACION">REQUIERE_APROBACION (Al llegar al límite, solicitar autorización)</option>
                  <option value="SOLO_ALERTAR">SOLO_ALERTAR (Notificar sin modificar Starlink)</option>
                  <option value="SIN_LIMITE_INTERNO">SIN_LIMITE_INTERNO (STARMONITOR no bloquea)</option>
                </select>
              </div>

              <div className="col-span-2 space-y-2 border-t border-st-border/60 pt-3">
                <span className="font-bold text-white block">Permisos Otorgados al Cliente:</span>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedPolitica.cliente_puede_reiniciar_router}
                    onChange={e => setSelectedPolitica({ ...selectedPolitica, cliente_puede_reiniciar_router: e.target.checked })}
                  />
                  <span>Cliente puede reiniciar Router Starlink</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedPolitica.cliente_puede_reiniciar_terminal}
                    onChange={e => setSelectedPolitica({ ...selectedPolitica, cliente_puede_reiniciar_terminal: e.target.checked })}
                  />
                  <span>Cliente puede reiniciar Antena/Terminal</span>
                </label>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsPolicyModalOpen(false)}
                className="flex-1 py-2.5 bg-st-bg border border-st-border text-st-muted hover:text-white font-semibold text-xs rounded-xl cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={isSavingPolicy}
                className="flex-1 py-2.5 bg-st-accent hover:bg-st-accent/90 text-white font-bold text-xs rounded-xl cursor-pointer flex items-center justify-center gap-2 shadow-lg"
              >
                {isSavingPolicy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>Guardar Política</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Operaciones;
