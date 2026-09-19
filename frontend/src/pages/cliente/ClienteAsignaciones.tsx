import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  RefreshCw, 
  Download, 
  Edit2, 
  X, 
  ChevronLeft, 
  ChevronRight,
  Building2,
  Database,
  Satellite,
  Link as LinkIcon,
  Unlink,
  History,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  ArrowRight,
  Info
} from 'lucide-react';
import client from '../../api/client';
import { useTableSort } from '../../hooks/useTableSort';
import { SortableHeader } from '../../components/ui/SortableHeader';

interface UnidadJerarquia {
  id: number;
  codigo: string;
  nombre: string;
}

interface AsignacionItem {
  dispositivo_id: number;
  device_id: string;
  dispositivo_nombre?: string;
  kit_starlink?: string;
  kit_serial_number?: string;
  dish_serial_number?: string;
  cuenta_id?: number;
  numero_cuenta?: string;
  cuenta_nombre?: string;
  linea_servicio_id?: number;
  numero_linea?: string;
  linea_nombre?: string;
  asignacion_id?: number;
  unidad_organizacional_id?: number;
  unidad_codigo?: string;
  unidad_nombre?: string;
  numero_nivel?: number;
  unidad_nivel1?: UnidadJerarquia;
  unidad_nivel2?: UnidadJerarquia;
  unidad_nivel3?: UnidadJerarquia;
  centro_costo_id?: number;
  centro_costo_codigo?: string;
  centro_costo_nombre?: string;
  vigente_desde?: string;
  asignacion_motivo?: string;
  asignacion_origen?: string;
  asignado: boolean;
}

interface AsignacionKPIs {
  total_equipos: number;
  equipos_asignados: number;
  equipos_sin_asignar: number;
  total_centros_costo: number;
  total_unidades: number;
}

interface OpcionUnidad {
  id: number;
  codigo: string;
  nombre: string;
  numero_nivel: number;
  parent_id?: number;
  centro_costo_sugerido_id?: number;
}

interface OpcionCentroCosto {
  id: number;
  codigo: string;
  nombre: string;
  moneda_referencia?: string;
}

interface HistorialItem {
  id: number;
  dispositivo_id: number;
  unidad_organizacional_id: number;
  unidad_codigo: string;
  unidad_nombre: string;
  numero_nivel: number;
  centro_costo_id: number;
  centro_costo_codigo: string;
  centro_costo_nombre: string;
  vigente_desde: string;
  vigente_hasta?: string;
  motivo?: string;
  origen: string;
  fecha_registro_bd: string;
  registrado_por_nombre?: string;
}

export const ClienteAsignaciones: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [items, setItems] = useState<AsignacionItem[]>([]);
  const [kpis, setKpis] = useState<AsignacionKPIs>({
    total_equipos: 0,
    equipos_asignados: 0,
    equipos_sin_asignar: 0,
    total_centros_costo: 0,
    total_unidades: 0
  });

  // Dropdown options
  const [opcionesUnidades, setOpcionesUnidades] = useState<OpcionUnidad[]>([]);
  const [opcionesCentrosCostos, setOpcionesCentrosCostos] = useState<OpcionCentroCosto[]>([]);

  // Filter & Search states
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'asignados' | 'sin_asignar'>('all');
  const [selectedUnidadFilter, setSelectedUnidadFilter] = useState<number | 'all'>('all');
  const [selectedCCFilter, setSelectedCCFilter] = useState<number | 'all'>('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Modal Asignar / Reasignar
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<AsignacionItem | null>(null);
  const [formDeviceId, setFormDeviceId] = useState<number | ''>('');
  const [formNivel1Id, setFormNivel1Id] = useState<number | ''>('');
  const [formNivel2Id, setFormNivel2Id] = useState<number | ''>('');
  const [formNivel3Id, setFormNivel3Id] = useState<number | ''>('');
  const [formCentroCostoId, setFormCentroCostoId] = useState<number | ''>('');
  const [formMotivo, setFormMotivo] = useState('');
  const [formModalError, setFormModalError] = useState('');

  // Modal Historial
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyItems, setHistoryItems] = useState<HistorialItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyDevice, setHistoryDevice] = useState<AsignacionItem | null>(null);

  // Modal Desasignar
  const [isUnassignModalOpen, setIsUnassignModalOpen] = useState(false);
  const [deviceToUnassign, setDeviceToUnassign] = useState<AsignacionItem | null>(null);
  const [unassignMotivo, setUnassignMotivo] = useState('');

  // Fetch data
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [asigRes, opcRes] = await Promise.all([
        client.get('/asignaciones'),
        client.get('/asignaciones/opciones')
      ]);

      setItems(asigRes.data.items || []);
      setKpis(asigRes.data.kpis || {
        total_equipos: 0,
        equipos_asignados: 0,
        equipos_sin_asignar: 0,
        total_centros_costo: 0,
        total_unidades: 0
      });

      setOpcionesUnidades(opcRes.data.unidades || []);
      setOpcionesCentrosCostos(opcRes.data.centros_costos || []);
    } catch (err: any) {
      console.error('Error fetching asignaciones:', err);
      setError(err.response?.data?.detail || 'Error al conectar con el servidor para cargar las asignaciones.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered Options for Hierarchy Levels
  const niveles1 = useMemo(() => opcionesUnidades.filter(u => u.numero_nivel === 1), [opcionesUnidades]);
  
  const niveles2 = useMemo(() => {
    if (!formNivel1Id) return opcionesUnidades.filter(u => u.numero_nivel === 2);
    return opcionesUnidades.filter(u => u.numero_nivel === 2 && u.parent_id === Number(formNivel1Id));
  }, [opcionesUnidades, formNivel1Id]);

  const niveles3 = useMemo(() => {
    if (!formNivel2Id) {
      if (!formNivel1Id) return opcionesUnidades.filter(u => u.numero_nivel === 3);
      const childNivel2Ids = niveles2.map(n => n.id);
      return opcionesUnidades.filter(u => u.numero_nivel === 3 && u.parent_id && childNivel2Ids.includes(u.parent_id));
    }
    return opcionesUnidades.filter(u => u.numero_nivel === 3 && u.parent_id === Number(formNivel2Id));
  }, [opcionesUnidades, formNivel2Id, formNivel1Id, niveles2]);

  // Open assign modal for a specific device or new
  const handleOpenAssignModal = (device?: AsignacionItem) => {
    setFormModalError('');
    setFormMotivo('');
    if (device) {
      setSelectedDevice(device);
      setFormDeviceId(device.dispositivo_id);
      setFormNivel1Id(device.unidad_nivel1?.id || '');
      setFormNivel2Id(device.unidad_nivel2?.id || '');
      setFormNivel3Id(device.unidad_nivel3?.id || (device.numero_nivel === 3 ? device.unidad_organizacional_id || '' : ''));
      setFormCentroCostoId(device.centro_costo_id || '');
    } else {
      setSelectedDevice(null);
      setFormDeviceId('');
      setFormNivel1Id('');
      setFormNivel2Id('');
      setFormNivel3Id('');
      setFormCentroCostoId('');
    }
    setIsAssignModalOpen(true);
  };

  // When device selector changes in modal
  const handleDeviceSelectChange = (devId: number) => {
    setFormDeviceId(devId);
    const found = items.find(it => it.dispositivo_id === devId);
    if (found) {
      setSelectedDevice(found);
      setFormNivel1Id(found.unidad_nivel1?.id || '');
      setFormNivel2Id(found.unidad_nivel2?.id || '');
      setFormNivel3Id(found.unidad_nivel3?.id || '');
      setFormCentroCostoId(found.centro_costo_id || '');
    }
  };

  // When unit level 3 is selected, auto-fill suggested cost center if available
  const handleNivel3Change = (n3Id: number | '') => {
    setFormNivel3Id(n3Id);
    if (n3Id) {
      const u = opcionesUnidades.find(op => op.id === Number(n3Id));
      if (u && u.centro_costo_sugerido_id && !formCentroCostoId) {
        setFormCentroCostoId(u.centro_costo_sugerido_id);
      }
    }
  };

  const handleNivel2Change = (n2Id: number | '') => {
    setFormNivel2Id(n2Id);
    setFormNivel3Id('');
    if (n2Id) {
      const u = opcionesUnidades.find(op => op.id === Number(n2Id));
      if (u && u.centro_costo_sugerido_id && !formCentroCostoId) {
        setFormCentroCostoId(u.centro_costo_sugerido_id);
      }
    }
  };

  const handleNivel1Change = (n1Id: number | '') => {
    setFormNivel1Id(n1Id);
    setFormNivel2Id('');
    setFormNivel3Id('');
    if (n1Id) {
      const u = opcionesUnidades.find(op => op.id === Number(n1Id));
      if (u && u.centro_costo_sugerido_id && !formCentroCostoId) {
        setFormCentroCostoId(u.centro_costo_sugerido_id);
      }
    }
  };

  // Save Assignment
  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDeviceId) {
      setFormModalError('Debe seleccionar un equipo.');
      return;
    }

    // Determine target organizational unit (prefer deepest selected level: 3 -> 2 -> 1)
    const targetUnitId = formNivel3Id || formNivel2Id || formNivel1Id;
    if (!targetUnitId) {
      setFormModalError('Debe seleccionar al menos una Unidad Organizacional (Gerencia, Área o Sede).');
      return;
    }

    if (!formCentroCostoId) {
      setFormModalError('Debe seleccionar un Centro de Costos.');
      return;
    }

    setSaving(true);
    setFormModalError('');
    try {
      await client.post('/asignaciones', {
        dispositivo_id: Number(formDeviceId),
        unidad_organizacional_id: Number(targetUnitId),
        centro_costo_id: Number(formCentroCostoId),
        motivo: formMotivo.trim() || 'Asignación desde portal de cliente'
      });

      setIsAssignModalOpen(false);
      fetchData();
    } catch (err: any) {
      console.error('Error saving assignment:', err);
      setFormModalError(err.response?.data?.detail || 'Error al procesar la asignación.');
    } finally {
      setSaving(false);
    }
  };

  // Open History Modal
  const handleOpenHistoryModal = async (device: AsignacionItem) => {
    setHistoryDevice(device);
    setIsHistoryModalOpen(true);
    setLoadingHistory(true);
    try {
      const res = await client.get(`/asignaciones/historial/${device.dispositivo_id}`);
      setHistoryItems(res.data || []);
    } catch (err) {
      console.error('Error loading history:', err);
      setHistoryItems([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Open Unassign Modal
  const handleOpenUnassignModal = (device: AsignacionItem) => {
    setDeviceToUnassign(device);
    setUnassignMotivo('');
    setIsUnassignModalOpen(true);
  };

  // Execute Unassign
  const handleExecuteUnassign = async () => {
    if (!deviceToUnassign) return;
    setSaving(true);
    try {
      await client.post('/asignaciones/desasignar', {
        dispositivo_id: deviceToUnassign.dispositivo_id,
        motivo: unassignMotivo.trim() || 'Desasignación desde portal de cliente'
      });
      setIsUnassignModalOpen(false);
      fetchData();
    } catch (err: any) {
      console.error('Error unassigning device:', err);
      alert(err.response?.data?.detail || 'Error al desasignar el equipo.');
    } finally {
      setSaving(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = 'ID Dispositivo,Nombre/Nickname,Kit Starlink,Serial Antena,Cuenta,Linea Servicio,Gerencia (Nivel 1),Area (Nivel 2),Sede (Nivel 3),Centro Costos Codigo,Centro Costos Nombre,Estado Asignacion,Vigente Desde,Motivo\n';
    const csvRows = filteredItems.map(it => {
      const devId = `"${it.device_id || ''}"`;
      const devNom = `"${it.dispositivo_nombre || ''}"`;
      const kit = `"${it.kit_starlink || it.kit_serial_number || ''}"`;
      const dish = `"${it.dish_serial_number || ''}"`;
      const cuenta = `"${it.numero_cuenta || it.cuenta_nombre || ''}"`;
      const linea = `"${it.numero_linea || it.linea_nombre || ''}"`;
      const g1 = `"${it.unidad_nivel1?.nombre || ''}"`;
      const a2 = `"${it.unidad_nivel2?.nombre || ''}"`;
      const s3 = `"${it.unidad_nivel3?.nombre || ''}"`;
      const ccCod = `"${it.centro_costo_codigo || ''}"`;
      const ccNom = `"${it.centro_costo_nombre || ''}"`;
      const est = it.asignado ? '"Asignado"' : '"Sin Asignar"';
      const vig = it.vigente_desde ? `"${new Date(it.vigente_desde).toLocaleDateString()}"` : '""';
      const mot = `"${it.asignacion_motivo || ''}"`;
      return [devId, devNom, kit, dish, cuenta, linea, g1, a2, s3, ccCod, ccNom, est, vig, mot].join(',');
    }).join('\n');

    const blob = new Blob([headers + csvRows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `asignaciones_equipos_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter Items
  const filteredItems = useMemo(() => {
    return items.filter(it => {
      const term = search.toLowerCase().trim();
      const matchesSearch = !term || (
        it.device_id.toLowerCase().includes(term) ||
        (it.dispositivo_nombre && it.dispositivo_nombre.toLowerCase().includes(term)) ||
        (it.kit_starlink && it.kit_starlink.toLowerCase().includes(term)) ||
        (it.kit_serial_number && it.kit_serial_number.toLowerCase().includes(term)) ||
        (it.dish_serial_number && it.dish_serial_number.toLowerCase().includes(term)) ||
        (it.numero_linea && it.numero_linea.toLowerCase().includes(term)) ||
        (it.numero_cuenta && it.numero_cuenta.toLowerCase().includes(term)) ||
        (it.unidad_nombre && it.unidad_nombre.toLowerCase().includes(term)) ||
        (it.unidad_codigo && it.unidad_codigo.toLowerCase().includes(term)) ||
        (it.centro_costo_nombre && it.centro_costo_nombre.toLowerCase().includes(term)) ||
        (it.centro_costo_codigo && it.centro_costo_codigo.toLowerCase().includes(term))
      );

      const matchesStatus = 
        statusFilter === 'all' ? true :
        statusFilter === 'asignados' ? it.asignado : !it.asignado;

      const matchesUnidad = selectedUnidadFilter === 'all' ? true : (
        it.unidad_organizacional_id === selectedUnidadFilter ||
        it.unidad_nivel1?.id === selectedUnidadFilter ||
        it.unidad_nivel2?.id === selectedUnidadFilter ||
        it.unidad_nivel3?.id === selectedUnidadFilter
      );

      const matchesCC = selectedCCFilter === 'all' ? true : (
        it.centro_costo_id === selectedCCFilter
      );

      return matchesSearch && matchesStatus && matchesUnidad && matchesCC;
    });
  }, [items, search, statusFilter, selectedUnidadFilter, selectedCCFilter]);

  const { sortedData, sortColumn, sortDirection, handleSort } = useTableSort(filteredItems);

  // Pagination calculations
  const totalItems = sortedData.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedItems = sortedData.slice(startIndex, startIndex + pageSize);

  const pctAsignados = kpis.total_equipos > 0 
    ? Math.round((kpis.equipos_asignados / kpis.total_equipos) * 100) 
    : 0;

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-bold tracking-tight text-client-text-primary uppercase flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-[#00A8E8]" />
            Asignaciones de Equipos
          </h1>
          <p className="text-[13px] text-client-text-secondary mt-0.5">
            Vinculación de equipos/terminales Starlink a la estructura organizacional (Gerencias, Áreas, Sedes) y Centros de Costos.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-3.5 py-2 bg-client-bg-surface border border-client-border rounded-[8px] text-[13px] font-semibold text-client-text-secondary hover:text-client-primary hover:border-client-primary transition-all active:scale-[0.98] cursor-pointer shadow-sm"
            title="Refrescar datos"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-client-primary' : ''}`} />
          </button>

          <button
            onClick={handleExportCSV}
            disabled={filteredItems.length === 0}
            className="flex items-center gap-2 px-3.5 py-2 bg-client-bg-surface border border-client-border rounded-[8px] text-[13px] font-semibold text-client-text-secondary hover:text-client-primary hover:border-client-primary transition-all active:scale-[0.98] cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>

          <button
            onClick={() => handleOpenAssignModal()}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#00A8E8] text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-[#38BDF8] transition-all shadow-lg shadow-[#00A8E8]/20 active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Asignar Equipo</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={fetchData} className="text-xs underline font-semibold hover:text-white">
            Reintentar
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-client-bg-surface border border-client-border rounded-xl p-4 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-[#00A8E8]/10 rounded-xl text-[#00A8E8]">
            <Satellite className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-client-text-secondary uppercase tracking-wider">Total Terminales</p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-bold text-white">{kpis.total_equipos}</span>
              <span className="text-xs text-client-text-secondary">equipos</span>
            </div>
          </div>
        </div>

        <div className="bg-client-bg-surface border border-client-border rounded-xl p-4 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="text-[11px] font-bold text-client-text-secondary uppercase tracking-wider">Equipos Asignados</p>
            <div className="flex items-baseline justify-between mt-0.5">
              <span className="text-2xl font-bold text-emerald-400">{kpis.equipos_asignados}</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {pctAsignados}%
              </span>
            </div>
          </div>
        </div>

        <div className="bg-client-bg-surface border border-client-border rounded-xl p-4 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="text-[11px] font-bold text-client-text-secondary uppercase tracking-wider">Sin Asignar</p>
            <div className="flex items-baseline justify-between mt-0.5">
              <span className="text-2xl font-bold text-amber-400">{kpis.equipos_sin_asignar}</span>
              {kpis.equipos_sin_asignar > 0 && (
                <button
                  onClick={() => { setStatusFilter('sin_asignar'); setCurrentPage(1); }}
                  className="text-xs text-amber-400 hover:underline font-semibold"
                >
                  Ver pendientes
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="bg-client-bg-surface border border-client-border rounded-xl p-4 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-client-text-secondary uppercase tracking-wider">Centros con Equipos</p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-bold text-white">{kpis.total_centros_costo}</span>
              <span className="text-xs text-client-text-secondary">centros activos</span>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="bg-client-bg-surface border border-client-border rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-client-text-secondary" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
            placeholder="Buscar por equipo, serie, línea, área..."
            className="w-full bg-client-bg-subtle border border-client-border rounded-lg pl-10 pr-4 py-2 text-sm text-client-text-primary placeholder-client-text-secondary focus:border-[#00A8E8] outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-client-text-secondary font-medium">Estado:</span>
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value as any); setCurrentPage(1); }}
              className="bg-client-bg-subtle border border-client-border rounded-lg px-3 py-2 text-sm text-client-text-primary focus:border-[#00A8E8] outline-none cursor-pointer"
            >
              <option value="all">Todos ({kpis.total_equipos})</option>
              <option value="asignados">Asignados ({kpis.equipos_asignados})</option>
              <option value="sin_asignar">Sin Asignar ({kpis.equipos_sin_asignar})</option>
            </select>
          </div>

          {/* Unit Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-client-text-secondary font-medium">Área / Sede:</span>
            <select
              value={selectedUnidadFilter}
              onChange={e => { setSelectedUnidadFilter(e.target.value === 'all' ? 'all' : Number(e.target.value)); setCurrentPage(1); }}
              className="bg-client-bg-subtle border border-client-border rounded-lg px-3 py-2 text-sm text-client-text-primary focus:border-[#00A8E8] outline-none cursor-pointer max-w-[180px] truncate"
            >
              <option value="all">Todas las Unidades</option>
              {opcionesUnidades.map(u => (
                <option key={u.id} value={u.id}>
                  {u.numero_nivel === 1 ? '🏢 ' : u.numero_nivel === 2 ? '📁 ' : '📍 '}{u.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Cost Center Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-client-text-secondary font-medium">C. Costos:</span>
            <select
              value={selectedCCFilter}
              onChange={e => { setSelectedCCFilter(e.target.value === 'all' ? 'all' : Number(e.target.value)); setCurrentPage(1); }}
              className="bg-client-bg-subtle border border-client-border rounded-lg px-3 py-2 text-sm text-client-text-primary focus:border-[#00A8E8] outline-none cursor-pointer max-w-[180px] truncate"
            >
              <option value="all">Todos los C. Costos</option>
              {opcionesCentrosCostos.map(cc => (
                <option key={cc.id} value={cc.id}>
                  {cc.codigo} - {cc.nombre}
                </option>
              ))}
            </select>
          </div>

          {(search || statusFilter !== 'all' || selectedUnidadFilter !== 'all' || selectedCCFilter !== 'all') && (
            <button
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
                setSelectedUnidadFilter('all');
                setSelectedCCFilter('all');
                setCurrentPage(1);
              }}
              className="text-xs text-[#00A8E8] hover:underline px-2 py-1 font-semibold"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Main Grid / Data Table */}
      <div className="bg-client-bg-surface border border-client-border rounded-xl overflow-hidden min-h-[400px] flex flex-col justify-between shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#1E293B] border-b border-[#222222]">
              <tr>
                <th className="p-4 text-xs font-bold text-[#94A3B8] uppercase tracking-wider w-28">
                  Acciones
                </th>
                <SortableHeader 
                  label="Equipo / Terminal" 
                  column="device_id" 
                  currentSortColumn={sortColumn as string} 
                  currentSortDirection={sortDirection} 
                  onSort={handleSort as any} 
                  className="!px-4 !py-4 !text-xs !text-client-text-secondary !border-none !bg-transparent hover:!bg-white/5" 
                />
                <SortableHeader 
                  label="Línea / Cuenta" 
                  column="numero_linea" 
                  currentSortColumn={sortColumn as string} 
                  currentSortDirection={sortDirection} 
                  onSort={handleSort as any} 
                  className="!px-4 !py-4 !text-xs !text-client-text-secondary !border-none !bg-transparent hover:!bg-white/5" 
                />
                <SortableHeader 
                  label="Estructura Organizacional" 
                  column="unidad_nombre" 
                  currentSortColumn={sortColumn as string} 
                  currentSortDirection={sortDirection} 
                  onSort={handleSort as any} 
                  className="!px-4 !py-4 !text-xs !text-client-text-secondary !border-none !bg-transparent hover:!bg-white/5" 
                />
                <SortableHeader 
                  label="Centro de Costos" 
                  column="centro_costo_nombre" 
                  currentSortColumn={sortColumn as string} 
                  currentSortDirection={sortDirection} 
                  onSort={handleSort as any} 
                  className="!px-4 !py-4 !text-xs !text-client-text-secondary !border-none !bg-transparent hover:!bg-white/5" 
                />
                <SortableHeader 
                  label="Estado" 
                  column="asignado" 
                  currentSortColumn={sortColumn as string} 
                  currentSortDirection={sortDirection} 
                  onSort={handleSort as any} 
                  className="!px-4 !py-4 !text-xs !text-client-text-secondary !border-none !bg-transparent hover:!bg-white/5" 
                />
                <SortableHeader 
                  label="Vigencia" 
                  column="vigente_desde" 
                  currentSortColumn={sortColumn as string} 
                  currentSortDirection={sortDirection} 
                  onSort={handleSort as any} 
                  className="!px-4 !py-4 !text-xs !text-client-text-secondary !border-none !bg-transparent hover:!bg-white/5" 
                />
              </tr>
            </thead>
            <tbody className="divide-y divide-client-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-client-text-secondary">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-2 border-[#00A8E8] border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-sm">Cargando asignaciones de equipos...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-client-text-secondary">
                    <div className="flex flex-col items-center gap-2 max-w-sm mx-auto">
                      <AlertTriangle className="w-8 h-8 text-amber-400 mb-1" />
                      <p className="text-sm font-semibold text-white">No se encontraron equipos</p>
                      <p className="text-xs text-client-text-secondary">
                        {search || statusFilter !== 'all' 
                          ? 'No hay registros que coincidan con los filtros aplicados.' 
                          : 'No se encontraron equipos registrados para este cliente.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item) => (
                  <tr 
                    key={item.dispositivo_id} 
                    className="hover:bg-white/[0.02] transition-colors group"
                  >
                    {/* Actions */}
                    <td className="p-4 align-middle">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenAssignModal(item)}
                          className="p-1.5 rounded-lg text-client-text-secondary hover:text-[#00A8E8] hover:bg-[#00A8E8]/10 transition-colors"
                          title={item.asignado ? "Reasignar equipo" : "Asignar equipo"}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenHistoryModal(item)}
                          className="p-1.5 rounded-lg text-client-text-secondary hover:text-purple-400 hover:bg-purple-500/10 transition-colors"
                          title="Ver historial de asignaciones"
                        >
                          <History className="w-4 h-4" />
                        </button>
                        {item.asignado && (
                          <button
                            onClick={() => handleOpenUnassignModal(item)}
                            className="p-1.5 rounded-lg text-client-text-secondary hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Desasignar equipo"
                          >
                            <Unlink className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Equipo / Terminal */}
                    <td className="p-4 align-middle">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-white text-sm">
                            {item.device_id}
                          </span>
                          {item.dispositivo_nombre && (
                            <span className="text-xs px-2 py-0.5 rounded bg-white/5 border border-white/10 text-client-text-secondary">
                              {item.dispositivo_nombre}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-client-text-secondary">
                          {item.dish_serial_number && (
                            <span>Antena: <span className="font-mono text-white/80">{item.dish_serial_number}</span></span>
                          )}
                          {item.kit_starlink && (
                            <span>· Kit: <span className="text-white/80">{item.kit_starlink}</span></span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Línea / Cuenta */}
                    <td className="p-4 align-middle">
                      {item.numero_linea ? (
                        <div>
                          <p className="text-xs font-semibold text-white">{item.numero_linea}</p>
                          <p className="text-[11px] text-client-text-secondary mt-0.5">
                            {item.numero_cuenta || item.cuenta_nombre || 'Cuenta principal'}
                          </p>
                        </div>
                      ) : (
                        <span className="text-xs text-client-text-disabled">Sin línea vinculada</span>
                      )}
                    </td>

                    {/* Estructura Organizacional (Jerarquía) */}
                    <td className="p-4 align-middle">
                      {item.asignado ? (
                        <div className="space-y-1">
                          {/* Breadcrumb Hierarchy */}
                          <div className="flex flex-wrap items-center gap-1.5 text-xs">
                            {item.unidad_nivel1 && (
                              <span className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 font-medium text-[11px]">
                                🏢 {item.unidad_nivel1.nombre}
                              </span>
                            )}
                            {item.unidad_nivel2 && (
                              <>
                                <ArrowRight className="w-3 h-3 text-client-text-disabled" />
                                <span className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-medium text-[11px]">
                                  📁 {item.unidad_nivel2.nombre}
                                </span>
                              </>
                            )}
                            {item.unidad_nivel3 && (
                              <>
                                <ArrowRight className="w-3 h-3 text-client-text-disabled" />
                                <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-[11px]">
                                  📍 {item.unidad_nivel3.nombre}
                                </span>
                              </>
                            )}
                          </div>
                          {!item.unidad_nivel1 && !item.unidad_nivel2 && !item.unidad_nivel3 && (
                            <span className="text-xs text-white font-medium">
                              {item.unidad_nombre || item.unidad_codigo}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-client-text-disabled italic">
                          No asignado a ninguna unidad
                        </span>
                      )}
                    </td>

                    {/* Centro de Costos */}
                    <td className="p-4 align-middle">
                      {item.centro_costo_id ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-medium">
                          <Database className="w-3.5 h-3.5 text-purple-400" />
                          <span>{item.centro_costo_codigo} · {item.centro_costo_nombre}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-client-text-disabled italic">
                          Sin centro de costos
                        </span>
                      )}
                    </td>

                    {/* Estado */}
                    <td className="p-4 align-middle">
                      {item.asignado ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
                          <CheckCircle2 className="w-3 h-3" /> Asignado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold">
                          <AlertTriangle className="w-3 h-3" /> Sin Asignar
                        </span>
                      )}
                    </td>

                    {/* Vigencia */}
                    <td className="p-4 align-middle text-xs text-client-text-secondary whitespace-nowrap">
                      {item.vigente_desde ? (
                        <div>
                          <p className="text-white font-medium">
                            {new Date(item.vigente_desde).toLocaleDateString()}
                          </p>
                          <p className="text-[10px] text-client-text-secondary">
                            {new Date(item.vigente_desde).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      ) : (
                        <span className="text-client-text-disabled">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-client-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-client-text-secondary bg-[#1E293B]/40">
          <div>
            Mostrando <span className="font-semibold text-white">{totalItems > 0 ? startIndex + 1 : 0}</span> a{' '}
            <span className="font-semibold text-white">{Math.min(startIndex + pageSize, totalItems)}</span> de{' '}
            <span className="font-semibold text-white">{totalItems}</span> equipos
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1 || loading}
              className="p-1.5 rounded-lg border border-client-border hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-white"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-medium text-white">
              Página {currentPage} de {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || loading}
              className="p-1.5 rounded-lg border border-client-border hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-white"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: ASIGNAR / REASIGNAR EQUIPO                                       */}
      {/* ========================================================================= */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0F172A] border border-client-border rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-client-border bg-[#1E293B]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#00A8E8]/10 text-[#00A8E8] rounded-xl border border-[#00A8E8]/20">
                  <LinkIcon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white uppercase tracking-wider">
                    {selectedDevice?.asignado ? 'Reasignar Equipo' : 'Asignar Equipo a Estructura'}
                  </h2>
                  <p className="text-xs text-client-text-secondary mt-0.5">
                    Asocie el equipo a un área organizacional y a un centro de costos
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="p-1.5 rounded-lg text-client-text-secondary hover:text-white hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveAssignment} className="p-6 overflow-y-auto space-y-5 flex-1">
              {formModalError && (
                <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{formModalError}</span>
                </div>
              )}

              {/* 1. Device Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-client-text-secondary mb-1.5">
                  1. Seleccionar Equipo / Terminal *
                </label>
                <select
                  value={formDeviceId}
                  onChange={e => handleDeviceSelectChange(Number(e.target.value))}
                  disabled={!!selectedDevice && items.some(it => it.dispositivo_id === selectedDevice.dispositivo_id)}
                  className="w-full bg-[#1E293B] border border-client-border rounded-xl px-4 py-2.5 text-sm text-white focus:border-[#00A8E8] outline-none cursor-pointer"
                  required
                >
                  <option value="">-- Seleccionar Terminal Starlink --</option>
                  {items.map(it => (
                    <option key={it.dispositivo_id} value={it.dispositivo_id}>
                      {it.device_id} {it.dispositivo_nombre ? `(${it.dispositivo_nombre})` : ''} - {it.asignado ? '✓ Asignado' : '⚠ Sin Asignar'}
                    </option>
                  ))}
                </select>
                {selectedDevice && (
                  <div className="mt-2 p-3 bg-white/[0.02] border border-client-border rounded-xl text-xs space-y-1 text-client-text-secondary">
                    <p><strong className="text-white">ID:</strong> {selectedDevice.device_id} {selectedDevice.dispositivo_nombre && `· ${selectedDevice.dispositivo_nombre}`}</p>
                    {selectedDevice.dish_serial_number && <p><strong className="text-white">Antena Dish:</strong> {selectedDevice.dish_serial_number}</p>}
                    {selectedDevice.numero_linea && <p><strong className="text-white">Línea:</strong> {selectedDevice.numero_linea}</p>}
                    {selectedDevice.asignado && (
                      <p className="text-amber-400 text-[11px] pt-1">
                        ⚠ Actualmente asignado a: <strong>{selectedDevice.unidad_nombre}</strong> ({selectedDevice.centro_costo_nombre}). Al guardar, se cerrará la asignación previa.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* 2. Organizational Hierarchy Selection (Cascading Levels) */}
              <div className="space-y-3 pt-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-client-text-secondary">
                  2. Estructura Organizacional *
                </label>

                {/* Level 1: Gerencia */}
                <div>
                  <label className="block text-[11px] text-client-text-secondary mb-1">
                    Nivel 1 · Gerencia / Dirección
                  </label>
                  <select
                    value={formNivel1Id}
                    onChange={e => handleNivel1Change(e.target.value ? Number(e.target.value) : '')}
                    className="w-full bg-[#1E293B] border border-client-border rounded-xl px-3.5 py-2 text-sm text-white focus:border-[#00A8E8] outline-none cursor-pointer"
                  >
                    <option value="">-- Seleccionar Gerencia --</option>
                    {niveles1.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.codigo} - {u.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Level 2: Área */}
                <div>
                  <label className="block text-[11px] text-client-text-secondary mb-1">
                    Nivel 2 · Área / Departamento
                  </label>
                  <select
                    value={formNivel2Id}
                    onChange={e => handleNivel2Change(e.target.value ? Number(e.target.value) : '')}
                    disabled={!formNivel1Id && niveles2.length === 0}
                    className="w-full bg-[#1E293B] border border-client-border rounded-xl px-3.5 py-2 text-sm text-white focus:border-[#00A8E8] outline-none cursor-pointer disabled:opacity-50"
                  >
                    <option value="">-- Seleccionar Área --</option>
                    {niveles2.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.codigo} - {u.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Level 3: Sede / Operación */}
                <div>
                  <label className="block text-[11px] text-client-text-secondary mb-1">
                    Nivel 3 · Sede / Campamento / Unidad Operativa
                  </label>
                  <select
                    value={formNivel3Id}
                    onChange={e => handleNivel3Change(e.target.value ? Number(e.target.value) : '')}
                    disabled={niveles3.length === 0}
                    className="w-full bg-[#1E293B] border border-client-border rounded-xl px-3.5 py-2 text-sm text-white focus:border-[#00A8E8] outline-none cursor-pointer disabled:opacity-50"
                  >
                    <option value="">-- Seleccionar Sede / Unidad --</option>
                    {niveles3.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.codigo} - {u.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 3. Cost Center Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-client-text-secondary mb-1.5">
                  3. Centro de Costos *
                </label>
                <select
                  value={formCentroCostoId}
                  onChange={e => setFormCentroCostoId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full bg-[#1E293B] border border-client-border rounded-xl px-4 py-2.5 text-sm text-white focus:border-[#00A8E8] outline-none cursor-pointer"
                  required
                >
                  <option value="">-- Seleccionar Centro de Costos --</option>
                  {opcionesCentrosCostos.map(cc => (
                    <option key={cc.id} value={cc.id}>
                      {cc.codigo} - {cc.nombre} {cc.moneda_referencia ? `(${cc.moneda_referencia})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* 4. Reason / Observation */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-client-text-secondary mb-1.5">
                  4. Motivo / Observaciones (Opcional)
                </label>
                <input
                  type="text"
                  value={formMotivo}
                  onChange={e => setFormMotivo(e.target.value)}
                  placeholder="Ej: Asignación operativa para campaña Mina Norte 2026"
                  className="w-full bg-[#1E293B] border border-client-border rounded-xl px-4 py-2.5 text-sm text-white placeholder-client-text-secondary focus:border-[#00A8E8] outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-client-border flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-client-text-secondary hover:text-white hover:bg-white/5 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-[#00A8E8] text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-[#38BDF8] transition-all shadow-lg shadow-[#00A8E8]/20 disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <span>Guardar Asignación</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: HISTORIAL DE ASIGNACIONES                                        */}
      {/* ========================================================================= */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0F172A] border border-client-border rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-6 border-b border-client-border bg-[#1E293B]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white uppercase tracking-wider">
                    Historial de Asignaciones
                  </h2>
                  <p className="text-xs text-client-text-secondary mt-0.5">
                    Terminal <span className="font-mono text-white font-semibold">{historyDevice?.device_id}</span>
                    {historyDevice?.dispositivo_nombre ? ` (${historyDevice.dispositivo_nombre})` : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="p-1.5 rounded-lg text-client-text-secondary hover:text-white hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {loadingHistory ? (
                <div className="py-12 text-center text-client-text-secondary">
                  <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <span className="text-xs">Cargando historial...</span>
                </div>
              ) : historyItems.length === 0 ? (
                <div className="py-12 text-center text-client-text-secondary">
                  <Info className="w-8 h-8 mx-auto mb-2 text-client-text-disabled" />
                  <p className="text-sm font-semibold text-white">Sin historial de reasignaciones</p>
                  <p className="text-xs mt-1">Este equipo no cuenta con registros históricos previos.</p>
                </div>
              ) : (
                <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-client-border">
                  {historyItems.map((h) => {
                    const isCurrent = !h.vigente_hasta;
                    return (
                      <div key={h.id} className="relative">
                        {/* Timeline dot */}
                        <div className={`absolute -left-6 top-1 w-4 h-4 rounded-full border-2 ${
                          isCurrent 
                            ? 'bg-emerald-400 border-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' 
                            : 'bg-[#1E293B] border-client-text-disabled'
                        }`} />

                        <div className="bg-[#1E293B]/60 border border-client-border rounded-xl p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              isCurrent 
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                : 'bg-white/5 text-client-text-secondary'
                            }`}>
                              {isCurrent ? 'Asignación Actual' : 'Histórico'}
                            </span>
                            <div className="text-[11px] text-client-text-secondary flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5" />
                              <span>
                                {new Date(h.vigente_desde).toLocaleDateString()} {new Date(h.vigente_desde).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                {' → '}
                                {h.vigente_hasta ? `${new Date(h.vigente_hasta).toLocaleDateString()} ${new Date(h.vigente_hasta).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Presente'}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                            <div className="p-2.5 bg-black/20 rounded-lg">
                              <p className="text-[10px] uppercase font-bold text-client-text-secondary">Unidad Organizacional</p>
                              <p className="text-white font-semibold mt-0.5 flex items-center gap-1.5">
                                <Building2 className="w-3.5 h-3.5 text-[#00A8E8]" />
                                {h.unidad_codigo} - {h.unidad_nombre}
                              </p>
                            </div>
                            <div className="p-2.5 bg-black/20 rounded-lg">
                              <p className="text-[10px] uppercase font-bold text-client-text-secondary">Centro de Costos</p>
                              <p className="text-white font-semibold mt-0.5 flex items-center gap-1.5">
                                <Database className="w-3.5 h-3.5 text-purple-400" />
                                {h.centro_costo_codigo} - {h.centro_costo_nombre}
                              </p>
                            </div>
                          </div>

                          {h.motivo && (
                            <p className="text-xs text-client-text-secondary italic pt-1">
                              "{h.motivo}"
                            </p>
                          )}

                          <div className="text-[10px] text-client-text-disabled flex items-center justify-between pt-1 border-t border-white/5">
                            <span>Origen: {h.origen}</span>
                            <span>Registrado por: {h.registrado_por_nombre || 'Sistema'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-client-border bg-[#1E293B] flex justify-end">
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="px-5 py-2 bg-client-bg-surface border border-client-border rounded-xl text-xs font-semibold text-white hover:bg-white/5 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CONFIRMACIÓN DE DESASIGNACIÓN                                    */}
      {/* ========================================================================= */}
      {isUnassignModalOpen && deviceToUnassign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0F172A] border border-red-500/30 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mx-auto">
                <Unlink className="w-6 h-6" />
              </div>

              <div className="text-center space-y-1.5">
                <h3 className="text-lg font-bold text-white">¿Desasignar Equipo?</h3>
                <p className="text-xs text-client-text-secondary">
                  El terminal <strong className="text-white font-mono">{deviceToUnassign.device_id}</strong> se desvinculará de la unidad{' '}
                  <strong className="text-white">{deviceToUnassign.unidad_nombre}</strong> y del centro de costos actual. Pasará a estado <span className="text-amber-400 font-semibold">Sin Asignar</span>.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-client-text-secondary mb-1">
                  Motivo de Desasignación (Opcional)
                </label>
                <input
                  type="text"
                  value={unassignMotivo}
                  onChange={e => setUnassignMotivo(e.target.value)}
                  placeholder="Ej: Mantenimiento, fin de ciclo operativo, etc."
                  className="w-full bg-[#1E293B] border border-client-border rounded-xl px-3.5 py-2 text-sm text-white placeholder-client-text-secondary focus:border-red-400 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUnassignModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-client-text-secondary hover:text-white hover:bg-white/5 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleExecuteUnassign}
                  disabled={saving}
                  className="px-5 py-2 bg-red-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-red-600 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? 'Desasignando...' : 'Confirmar Desasignación'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
