import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  RefreshCw, 
  Download, 
  Edit2, 
  ToggleLeft, 
  ToggleRight, 
  X, 
  ChevronLeft, 
  ChevronRight,
  Building2,
  AlertCircle
} from 'lucide-react';
import client from '../../api/client';
import { useTableSort } from '../../hooks/useTableSort';
import { SortableHeader } from '../../components/ui/SortableHeader';

interface NivelConfig {
  numero_nivel: number;
  nombre_nivel: string;
  nombre_nivel_plural: string;
  activo: boolean;
}

interface UnidadItem {
  id: number;
  tenant_id: number;
  numero_nivel: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
  parent_id?: number;
  parent_nombre?: string;
  fecha_creacion?: string;
}

export const ClienteUnidadOrganizacional: React.FC<{ levelNumProp?: number }> = ({ levelNumProp }) => {
  const { levelNum: levelParam } = useParams<{ levelNum?: string }>();

  const levelNum = levelNumProp || Number(levelParam) || 1;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [levelsConfig, setLevelsConfig] = useState<NivelConfig[]>([]);
  const [units, setUnits] = useState<UnidadItem[]>([]);
  const [parentUnits, setParentUnits] = useState<UnidadItem[]>([]);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<UnidadItem | null>(null);
  
  // Form State
  const [formCodigo, setFormCodigo] = useState('');
  const [formNombre, setFormNombre] = useState('');
  const [formDescripcion, setFormDescripcion] = useState('');
  const [formParentId, setFormParentId] = useState<number | ''>('');
  const [formActivo, setFormActivo] = useState(true);
  const [formError, setFormError] = useState('');

  const currentLevelConfig = levelsConfig.find(l => l.numero_nivel === levelNum) || {
    numero_nivel: levelNum,
    nombre_nivel: `Nivel ${levelNum}`,
    nombre_nivel_plural: `Nivel ${levelNum}`,
    activo: true
  };

  const parentLevelConfig = levelsConfig.find(l => l.numero_nivel === levelNum - 1);

  const fetchConfig = async () => {
    try {
      const res = await client.get('/niveles-organizacion-config');
      setLevelsConfig(res.data || []);
    } catch (err) {
      console.error('Error fetching niveles config:', err);
    }
  };

  const fetchUnits = async () => {
    setLoading(true);
    try {
      const res = await client.get('/unidades-organizacionales', {
        params: { numero_nivel: levelNum }
      });
      setUnits(res.data || []);

      if (levelNum > 1) {
        const parentRes = await client.get('/unidades-organizacionales', {
          params: { numero_nivel: levelNum - 1, activo: true }
        });
        setParentUnits(parentRes.data || []);
      }
    } catch (err) {
      console.error('Error fetching unidades:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchUnits();
  }, [levelNum]);

  const handleRefresh = () => {
    fetchConfig();
    fetchUnits();
  };

  const handleOpenCreateModal = () => {
    setEditingItem(null);
    setFormCodigo('');
    setFormNombre('');
    setFormDescripcion('');
    setFormParentId('');
    setFormActivo(true);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: UnidadItem) => {
    setEditingItem(item);
    setFormCodigo(item.codigo || '');
    setFormNombre(item.nombre || '');
    setFormDescripcion(item.descripcion || '');
    setFormParentId(item.parent_id || '');
    setFormActivo(item.activo);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleToggleActive = async (item: UnidadItem) => {
    try {
      await client.put(`/unidades-organizacionales/${item.id}`, {
        activo: !item.activo
      });
      fetchUnits();
    } catch (err) {
      console.error('Error toggling status:', err);
    }
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCodigo.trim() || !formNombre.trim()) {
      setFormError('Por favor complete el Código y Nombre.');
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      const payload: any = {
        numero_nivel: levelNum,
        codigo: formCodigo.trim(),
        nombre: formNombre.trim(),
        descripcion: formDescripcion.trim(),
        parent_id: formParentId ? Number(formParentId) : null,
        activo: formActivo
      };

      if (editingItem) {
        await client.put(`/unidades-organizacionales/${editingItem.id}`, payload);
      } else {
        await client.post('/unidades-organizacionales', payload);
      }

      setIsModalOpen(false);
      fetchUnits();
    } catch (err: any) {
      console.error('Error saving unit:', err);
      setFormError(err.response?.data?.detail || 'Error al guardar el registro.');
    } finally {
      setSaving(false);
    }
  };

  const handleExportCSV = () => {
    const headers = levelNum > 1 
      ? 'Codigo,Nombre,Unidad Padre,Descripcion,Estado\n'
      : 'Codigo,Nombre,Descripcion,Estado\n';

    const csvRows = filteredUnits.map(item => {
      const parentStr = item.parent_nombre ? `"${item.parent_nombre}"` : '""';
      const statusStr = item.activo ? 'Activo' : 'Inactivo';
      if (levelNum > 1) {
        return `"${item.codigo}","${item.nombre}",${parentStr},"${item.descripcion || ''}",${statusStr}`;
      } else {
        return `"${item.codigo}","${item.nombre}","${item.descripcion || ''}",${statusStr}`;
      }
    }).join('\n');

    const blob = new Blob([headers + csvRows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `catalogo_${currentLevelConfig.nombre_nivel_plural.toLowerCase().replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered list
  const filteredUnits = units.filter(item => {
    const matchesSearch = 
      item.codigo.toLowerCase().includes(search.toLowerCase()) ||
      item.nombre.toLowerCase().includes(search.toLowerCase()) ||
      (item.descripcion && item.descripcion.toLowerCase().includes(search.toLowerCase())) ||
      (item.parent_nombre && item.parent_nombre.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = 
      statusFilter === 'all' ? true :
      statusFilter === 'active' ? item.activo : !item.activo;

    return matchesSearch && matchesStatus;
  });

  const { sortedData, sortColumn, sortDirection, handleSort } = useTableSort(filteredUnits);

  // Pagination calculations
  const totalItems = sortedData.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedUnits = sortedData.slice(startIndex, startIndex + pageSize);

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-bold tracking-tight text-client-text-primary uppercase">
            Catálogo de {currentLevelConfig.nombre_nivel_plural || `Nivel ${levelNum}`}
          </h1>
          <p className="text-[13px] text-client-text-secondary mt-0.5">
            Gestión de unidades organizacionales del Nivel {levelNum} ({currentLevelConfig.nombre_nivel}).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-3.5 py-2 bg-client-bg-surface border border-client-border rounded-[8px] text-[13px] font-semibold text-client-text-secondary hover:text-client-primary hover:border-client-primary transition-all active:scale-[0.98] cursor-pointer shadow-sm"
            title="Refrescar tabla"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-client-primary' : ''}`} />
          </button>

          <button
            onClick={handleExportCSV}
            disabled={filteredUnits.length === 0}
            className="flex items-center gap-2 px-3.5 py-2 bg-client-bg-surface border border-client-border rounded-[8px] text-[13px] font-semibold text-client-text-secondary hover:text-client-primary hover:border-client-primary transition-all active:scale-[0.98] cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#00A8E8] text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-[#38BDF8] transition-all shadow-lg shadow-[#00A8E8]/20 active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Registro</span>
          </button>
        </div>
      </div>

      {/* Toolbar / Search & Filter */}
      <div className="bg-client-bg-surface border border-client-border rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-client-text-secondary" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
            placeholder="Buscar en todos los registros..."
            className="w-full bg-client-bg-subtle border border-client-border rounded-lg pl-10 pr-4 py-2 text-sm text-client-text-primary placeholder-client-text-secondary focus:border-st-accent outline-none"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <span className="text-xs text-client-text-secondary font-medium">Estado:</span>
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value as any); setCurrentPage(1); }}
            className="bg-client-bg-subtle border border-client-border rounded-lg px-3 py-2 text-sm text-client-text-primary focus:border-st-accent outline-none cursor-pointer"
          >
            <option value="active">Activos</option>
            <option value="all">Todos</option>
            <option value="inactive">Inactivos</option>
          </select>
        </div>
      </div>

      {/* Main Grid / Data Table */}
      <div className="bg-client-bg-surface border border-client-border rounded-xl overflow-hidden min-h-[400px] flex flex-col justify-between">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#1E293B] border-b border-[#222222]">
              <tr>
                <th className="p-4 text-xs font-bold text-[#94A3B8] uppercase tracking-wider w-24">
                  Acciones
                </th>
                <SortableHeader 
                  label="Código" 
                  column="codigo" 
                  currentSortColumn={sortColumn as string} 
                  currentSortDirection={sortDirection} 
                  onSort={handleSort as any} 
                  className="!px-4 !py-4 !text-xs !text-client-text-secondary !border-none !bg-transparent hover:!bg-white/5" 
                />
                <SortableHeader 
                  label={currentLevelConfig.nombre_nivel || 'Nombre'} 
                  column="nombre" 
                  currentSortColumn={sortColumn as string} 
                  currentSortDirection={sortDirection} 
                  onSort={handleSort as any} 
                  className="!px-4 !py-4 !text-xs !text-client-text-secondary !border-none !bg-transparent hover:!bg-white/5" 
                />
                {levelNum > 1 && (
                  <SortableHeader 
                    label={`${parentLevelConfig?.nombre_nivel || `Nivel ${levelNum - 1}`} Padre`}
                    column="parent_nombre" 
                    currentSortColumn={sortColumn as string} 
                    currentSortDirection={sortDirection} 
                    onSort={handleSort as any} 
                    className="!px-4 !py-4 !text-xs !text-client-text-secondary !border-none !bg-transparent hover:!bg-white/5" 
                  />
                )}
                <SortableHeader 
                  label="Descripción" 
                  column="descripcion" 
                  currentSortColumn={sortColumn as string} 
                  currentSortDirection={sortDirection} 
                  onSort={handleSort as any} 
                  className="!px-4 !py-4 !text-xs !text-client-text-secondary !border-none !bg-transparent hover:!bg-white/5" 
                />
                <SortableHeader 
                  label="Estado" 
                  column="activo" 
                  currentSortColumn={sortColumn as string} 
                  currentSortDirection={sortDirection} 
                  onSort={handleSort as any} 
                  align="center"
                  className="!px-4 !py-4 !text-xs !text-client-text-secondary !border-none !bg-transparent hover:!bg-white/5 !w-28" 
                />
              </tr>
            </thead>
            <tbody className="divide-y divide-st-border/40">
              {paginatedUnits.map(item => (
                <tr key={item.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEditModal(item)}
                        className="p-1.5 rounded-lg text-[#00A8E8] hover:bg-[#00A8E8]/10 transition-colors cursor-pointer"
                        title="Editar registro"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(item)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          item.activo ? 'text-amber-500 hover:bg-client-warning-soft' : 'text-emerald-500 hover:bg-client-success-soft'
                        }`}
                        title={item.activo ? 'Deshabilitar registro' : 'Habilitar registro'}
                      >
                        {item.activo ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                      </button>
                    </div>
                  </td>
                  <td className="p-4 font-mono font-bold text-[#00A8E8] text-xs">
                    {item.codigo}
                  </td>
                  <td className="p-4 text-white font-medium text-sm">
                    {item.nombre}
                  </td>
                  {levelNum > 1 && (
                    <td className="p-4 text-[#94A3B8] text-sm">
                      {item.parent_nombre || '-'}
                    </td>
                  )}
                  <td className="p-4 text-[#94A3B8] text-xs max-w-xs truncate">
                    {item.descripcion || '-'}
                  </td>
                  <td className="p-4 text-center">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-[6px] text-xs font-bold uppercase tracking-wide ${
                      item.activo ? 'bg-emerald-500/10 text-[#4ADE80] border border-emerald-500/20' : 'bg-red-500/10 text-[#F87171] border border-red-500/20'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${item.activo ? 'bg-[#22C55E]' : 'bg-[#EF4444]'}`} />
                      {item.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                </tr>
              ))}
              {paginatedUnits.length === 0 && (
                <tr>
                  <td colSpan={levelNum > 1 ? 6 : 5} className="p-8 text-center text-[#94A3B8] text-sm">
                    No se encontraron registros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-[#222222] flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#111111]">
          <div className="text-xs text-[#94A3B8]">
            Mostrando {totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, totalItems)} de {totalItems} registros
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-[#222222] bg-black text-[#94A3B8] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-white px-2">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-[#222222] bg-black text-[#94A3B8] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#111111] border border-[#222222] rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#222222] pb-3">
              <h3 className="text-base font-bold text-white font-sans uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#00A8E8]" />
                {editingItem ? `Editar ${currentLevelConfig.nombre_nivel}` : `Nuevo ${currentLevelConfig.nombre_nivel}`}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#94A3B8] hover:text-white p-1 rounded-lg hover:bg-white/5 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-client-danger-soft border border-client-danger rounded-lg text-client-danger text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveModal} className="space-y-4">
              <div>
                <label className="block text-xs text-client-text-secondary font-bold uppercase tracking-wider mb-1">
                  Código *
                </label>
                <input
                  type="text"
                  value={formCodigo}
                  onChange={e => setFormCodigo(e.target.value)}
                  placeholder="ej. GER-OPS, SEDE-MINA"
                  className="w-full bg-client-bg-subtle border border-client-border rounded-lg px-3 py-2 text-sm text-client-text-primary placeholder-client-text-secondary focus:border-st-accent outline-none font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-client-text-secondary font-bold uppercase tracking-wider mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={formNombre}
                  onChange={e => setFormNombre(e.target.value)}
                  placeholder={`Nombre de la unidad (${currentLevelConfig.nombre_nivel})`}
                  className="w-full bg-client-bg-subtle border border-client-border rounded-lg px-3 py-2 text-sm text-client-text-primary placeholder-client-text-secondary focus:border-st-accent outline-none"
                  required
                />
              </div>

              {levelNum > 1 && (
                <div>
                  <label className="block text-xs text-client-text-secondary font-bold uppercase tracking-wider mb-1">
                    Unidad Padre ({parentLevelConfig?.nombre_nivel || `Nivel ${levelNum - 1}`})
                  </label>
                  <select
                    value={formParentId}
                    onChange={e => setFormParentId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full bg-client-bg-subtle border border-client-border rounded-lg px-3 py-2 text-sm text-client-text-primary focus:border-st-accent outline-none cursor-pointer"
                  >
                    <option value="">-- Sin Unidad Padre --</option>
                    {parentUnits.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.codigo} - {p.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs text-client-text-secondary font-bold uppercase tracking-wider mb-1">
                  Descripción
                </label>
                <textarea
                  value={formDescripcion}
                  onChange={e => setFormDescripcion(e.target.value)}
                  placeholder="Descripción referencial..."
                  rows={3}
                  className="w-full bg-client-bg-subtle border border-client-border rounded-lg px-3 py-2 text-sm text-client-text-primary placeholder-client-text-secondary focus:border-st-accent outline-none resize-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="formActivoCheck"
                  checked={formActivo}
                  onChange={e => setFormActivo(e.target.checked)}
                  className="w-4 h-4 accent-[#00A8E8] rounded cursor-pointer"
                />
                <label htmlFor="formActivoCheck" className="text-sm text-white cursor-pointer select-none">
                  Unidad Activa
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#222222]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-black border border-[#222222] rounded-lg text-sm text-[#94A3B8] hover:text-white transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-[#00A8E8] hover:bg-[#38BDF8] text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-[#00A8E8]/20 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClienteUnidadOrganizacional;
