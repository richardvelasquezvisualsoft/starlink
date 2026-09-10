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

  // Pagination calculations
  const totalItems = filteredUnits.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedUnits = filteredUnits.slice(startIndex, startIndex + pageSize);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans uppercase">
            Catálogo de {currentLevelConfig.nombre_nivel_plural || `Nivel ${levelNum}`}
          </h1>
          <p className="text-xs text-st-muted mt-0.5">
            Gestión de unidades organizacionales del Nivel {levelNum} ({currentLevelConfig.nombre_nivel}).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-3.5 py-2 bg-st-surface border border-st-border rounded-lg text-sm text-st-muted hover:text-white hover:border-white/20 transition-all active:scale-[0.98] cursor-pointer"
            title="Refrescar tabla"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-st-accent' : ''}`} />
            <span>Refrescar</span>
          </button>

          <button
            onClick={handleExportCSV}
            disabled={filteredUnits.length === 0}
            className="flex items-center gap-2 px-3.5 py-2 bg-st-surface border border-st-border rounded-lg text-sm text-st-muted hover:text-white hover:border-white/20 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            <span>Exportar</span>
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-bold hover:bg-amber-500 transition-all shadow-md active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nuevo</span>
          </button>
        </div>
      </div>

      {/* Toolbar / Search & Filter */}
      <div className="bg-st-surface border border-st-border rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-st-muted" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
            placeholder="Buscar en todos los registros..."
            className="w-full bg-st-bg border border-st-border rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-st-muted focus:border-st-accent outline-none"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <span className="text-xs text-st-muted font-medium">Estado:</span>
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value as any); setCurrentPage(1); }}
            className="bg-st-bg border border-st-border rounded-lg px-3 py-2 text-sm text-white focus:border-st-accent outline-none cursor-pointer"
          >
            <option value="active">Activos</option>
            <option value="all">Todos</option>
            <option value="inactive">Inactivos</option>
          </select>
        </div>
      </div>

      {/* Main Grid / Data Table */}
      <div className="bg-st-surface border border-st-border rounded-xl overflow-hidden min-h-[400px] flex flex-col justify-between">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#0D1424] border-b border-st-border">
              <tr>
                <th className="p-4 text-xs font-bold text-st-muted uppercase tracking-wider w-24">
                  Acciones
                </th>
                <th className="p-4 text-xs font-bold text-st-muted uppercase tracking-wider">
                  Código
                </th>
                <th className="p-4 text-xs font-bold text-st-muted uppercase tracking-wider">
                  {currentLevelConfig.nombre_nivel || 'Nombre'}
                </th>
                {levelNum > 1 && (
                  <th className="p-4 text-xs font-bold text-st-muted uppercase tracking-wider">
                    {parentLevelConfig?.nombre_nivel || `Nivel ${levelNum - 1}`} Padre
                  </th>
                )}
                <th className="p-4 text-xs font-bold text-st-muted uppercase tracking-wider">
                  Descripción
                </th>
                <th className="p-4 text-xs font-bold text-st-muted uppercase tracking-wider text-center w-28">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-st-border/40">
              {paginatedUnits.map(item => (
                <tr key={item.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEditModal(item)}
                        className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-400/10 transition-colors cursor-pointer"
                        title="Editar registro"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(item)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          item.activo ? 'text-amber-500 hover:bg-amber-500/10' : 'text-emerald-500 hover:bg-emerald-500/10'
                        }`}
                        title={item.activo ? 'Deshabilitar registro' : 'Habilitar registro'}
                      >
                        {item.activo ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                      </button>
                    </div>
                  </td>
                  <td className="p-4 text-st-accent font-mono text-sm font-semibold">
                    {item.codigo}
                  </td>
                  <td className="p-4 text-white font-medium">
                    {item.nombre}
                  </td>
                  {levelNum > 1 && (
                    <td className="p-4 text-st-muted text-sm">
                      {item.parent_nombre || <span className="italic text-st-muted/60">Sin Asignar</span>}
                    </td>
                  )}
                  <td className="p-4 text-st-muted text-sm max-w-xs truncate">
                    {item.descripcion || '-'}
                  </td>
                  <td className="p-4 text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                      item.activo 
                        ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' 
                        : 'bg-red-500/10 border border-red-500/20 text-red-400'
                    }`}>
                      {item.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                </tr>
              ))}

              {paginatedUnits.length === 0 && !loading && (
                <tr>
                  <td colSpan={levelNum > 1 ? 6 : 5} className="p-12 text-center text-st-muted">
                    No se encontraron registros de {currentLevelConfig.nombre_nivel_plural.toLowerCase()}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination */}
        <div className="bg-[#0D1424] border-t border-st-border p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-st-muted">
            Mostrando {totalItems === 0 ? 0 : startIndex + 1}-{Math.min(startIndex + pageSize, totalItems)} de {totalItems} registros
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-st-border text-st-muted hover:text-white hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 py-1 bg-amber-600 text-white rounded text-xs font-bold">
              {currentPage}
            </span>

            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-st-border text-st-muted hover:text-white hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <span className="text-xs text-st-muted ml-2">
              {pageSize} por página
            </span>
          </div>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-st-surface border border-st-border rounded-xl max-w-md w-full p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-st-border/60 pb-3">
              <h3 className="text-lg font-bold text-white font-sans uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-500" />
                {editingItem ? `Editar ${currentLevelConfig.nombre_nivel}` : `Nuevo ${currentLevelConfig.nombre_nivel}`}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-st-muted hover:text-white p-1 rounded-lg hover:bg-white/5 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveModal} className="space-y-4">
              <div>
                <label className="block text-xs text-st-muted font-bold uppercase tracking-wider mb-1">
                  Código *
                </label>
                <input
                  type="text"
                  value={formCodigo}
                  onChange={e => setFormCodigo(e.target.value)}
                  placeholder="ej. GER-OPS, SEDE-MINA"
                  className="w-full bg-st-bg border border-st-border rounded-lg px-3 py-2 text-sm text-white placeholder-st-muted focus:border-st-accent outline-none font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-st-muted font-bold uppercase tracking-wider mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={formNombre}
                  onChange={e => setFormNombre(e.target.value)}
                  placeholder={`Nombre de la unidad (${currentLevelConfig.nombre_nivel})`}
                  className="w-full bg-st-bg border border-st-border rounded-lg px-3 py-2 text-sm text-white placeholder-st-muted focus:border-st-accent outline-none"
                  required
                />
              </div>

              {levelNum > 1 && (
                <div>
                  <label className="block text-xs text-st-muted font-bold uppercase tracking-wider mb-1">
                    Unidad Padre ({parentLevelConfig?.nombre_nivel || `Nivel ${levelNum - 1}`})
                  </label>
                  <select
                    value={formParentId}
                    onChange={e => setFormParentId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full bg-st-bg border border-st-border rounded-lg px-3 py-2 text-sm text-white focus:border-st-accent outline-none cursor-pointer"
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
                <label className="block text-xs text-st-muted font-bold uppercase tracking-wider mb-1">
                  Descripción
                </label>
                <textarea
                  value={formDescripcion}
                  onChange={e => setFormDescripcion(e.target.value)}
                  placeholder="Descripción referencial..."
                  rows={3}
                  className="w-full bg-st-bg border border-st-border rounded-lg px-3 py-2 text-sm text-white placeholder-st-muted focus:border-st-accent outline-none resize-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="formActivoCheck"
                  checked={formActivo}
                  onChange={e => setFormActivo(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
                <label htmlFor="formActivoCheck" className="text-sm text-white cursor-pointer select-none">
                  Unidad Activa
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-st-border/60">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-st-bg border border-st-border rounded-lg text-sm text-st-muted hover:text-white transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-amber-600 text-white rounded-lg text-sm font-bold hover:bg-amber-500 transition-colors shadow-md active:scale-[0.98] cursor-pointer disabled:opacity-50"
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
