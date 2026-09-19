import React, { useState, useEffect } from 'react';
import {
  Search,
  RefreshCw,
  Download,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Shield,
  Briefcase,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  X,
  Layers,
  DollarSign
} from 'lucide-react';
import client from '../api/client';
import { AccountSearchSelect } from '../components/AccountSearchSelect';

interface ContractItem {
  id: number;
  tenant_id: number;
  cliente: string;
  razon_social: string;
  identificacion_fiscal: string;
  codigo_contrato: string;
  nombre: string;
  fecha_inicio: string;
  fecha_vencimiento: string;
  plazo_meses: number;
  dias_restantes: number;
  estado: string;
  semaforo: 'VERDE' | 'AMARILLO' | 'ROJO';
  renovacion_automatica: boolean;
  moneda: string;
  monto_mensual_referencial: number;
  servicios_asociados: number;
  servicios_actuales: number;
  diferencia_cobertura: number;
  cobertura_pct: number;
  planes: string;
  observaciones?: string;
  lineas_asociadas?: any[];
}

interface SummaryMetrics {
  contratos_totales: number;
  contratos_activos: number;
  vencen_30_dias: number;
  vencidos: number;
  total_servicios_asociados: number;
  monto_referencial_por_moneda: Record<string, number>;
}

export const ContratosComercialesPage: React.FC = () => {
  const [contracts, setContracts] = useState<ContractItem[]>([]);
  const [summary, setSummary] = useState<SummaryMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [estadoFilter, setEstadoFilter] = useState<string>('');
  const [vencimientoFilter, setVencimientoFilter] = useState<string>('');
  const [renovacionFilter, setRenovacionFilter] = useState<string>('');
  
  // Accounts for AccountSearchSelect
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  // Modals
  const [selectedContract, setSelectedContract] = useState<ContractItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);

  // New Contract Form State
  const [newContractForm, setNewContractForm] = useState({
    tenant_id: '',
    codigo_contrato: '',
    nombre: '',
    fecha_inicio: new Date().toISOString().split('T')[0],
    fecha_fin: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    plazo_meses: 12,
    moneda_iso3: 'USD',
    monto_mensual_referencial: 1000,
    renovacion_automatica: true,
    observaciones: ''
  });
  const [creating, setCreating] = useState<boolean>(false);

  const fetchContractsData = async () => {
    try {
      setLoading(true);
      const [contractsRes, summaryRes, accRes] = await Promise.all([
        client.get('/reseller/contracts'),
        client.get('/reseller/contracts/summary'),
        client.get('/cuentas')
      ]);

      setContracts(contractsRes.data || []);
      setSummary(summaryRes.data || null);
      setAccounts(accRes.data || []);
    } catch (err) {
      console.error('Error fetching contracts data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContractsData();
  }, []);

  // Filter contracts
  const filteredContracts = contracts.filter((c) => {
    if (selectedAccount) {
      const matchedAcc = accounts.find((a) => String(a.id) === selectedAccount);
      if (matchedAcc && !c.cliente.toLowerCase().includes(matchedAcc.nombre.toLowerCase())) {
        return false;
      }
    }
    if (search.trim()) {
      const term = search.toLowerCase();
      const m1 = c.cliente.toLowerCase().includes(term);
      const m2 = c.razon_social.toLowerCase().includes(term);
      const m3 = c.identificacion_fiscal.toLowerCase().includes(term);
      const m4 = c.codigo_contrato.toLowerCase().includes(term);
      const m5 = c.nombre.toLowerCase().includes(term);
      const m6 = c.planes.toLowerCase().includes(term);
      if (!m1 && !m2 && !m3 && !m4 && !m5 && !m6) return false;
    }
    if (estadoFilter) {
      if (estadoFilter === 'VERDE' && c.semaforo !== 'VERDE') return false;
      if (estadoFilter === 'AMARILLO' && c.semaforo !== 'AMARILLO') return false;
      if (estadoFilter === 'ROJO' && c.semaforo !== 'ROJO') return false;
    }
    if (vencimientoFilter) {
      if (vencimientoFilter === '30' && c.dias_restantes > 30) return false;
      if (vencimientoFilter === '60' && c.dias_restantes > 60) return false;
    }
    if (renovacionFilter) {
      const auto = renovacionFilter === 'true';
      if (c.renovacion_automatica !== auto) return false;
    }
    return true;
  });

  const [sortBy, setSortBy] = useState<string>('dias_restantes');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDirection('asc');
    }
  };

  const sortedContracts = React.useMemo(() => {
    const list = [...filteredContracts];
    list.sort((a, b) => {
      let aVal = (a as any)[sortBy];
      let bVal = (b as any)[sortBy];

      if (sortBy === 'semaforo') {
        const semaforoScore: Record<string, number> = { ROJO: 1, AMARILLO: 2, VERDE: 3 };
        aVal = semaforoScore[a.semaforo] || 99;
        bVal = semaforoScore[b.semaforo] || 99;
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
  }, [filteredContracts, sortBy, sortDirection]);

  // Pagination logic
  const totalPages = Math.ceil(sortedContracts.length / itemsPerPage);
  const pagedContracts = sortedContracts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const renderSortIcon = (field: string) => {
    if (sortBy === field) {
      return sortDirection === 'asc' ? (
        <ChevronUp className="w-3.5 h-3.5 text-st-accent flex-shrink-0" />
      ) : (
        <ChevronDown className="w-3.5 h-3.5 text-st-accent flex-shrink-0" />
      );
    }
    return <ArrowUpDown className="w-3 h-3 text-st-muted/40 group-hover:text-st-muted flex-shrink-0 transition-colors" />;
  };

  const handleOpenDetail = async (contract: ContractItem) => {
    try {
      const res = await client.get(`/reseller/contracts/${contract.id}`);
      setSelectedContract(res.data);
      setShowDetailModal(true);
    } catch (err) {
      console.error('Error loading contract detail:', err);
      setSelectedContract(contract);
      setShowDetailModal(true);
    }
  };

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContractForm.tenant_id || !newContractForm.codigo_contrato || !newContractForm.nombre) {
      alert('Por favor complete los campos obligatorios.');
      return;
    }
    try {
      setCreating(true);
      await client.post('/reseller/contracts', {
        ...newContractForm,
        tenant_id: parseInt(newContractForm.tenant_id)
      });
      setShowCreateModal(false);
      fetchContractsData();
      alert('Contrato creado exitosamente.');
    } catch (err: any) {
      console.error('Error creating contract:', err);
      alert('Error al guardar el contrato: ' + (err.response?.data?.detail || err.message));
    } finally {
      setCreating(false);
    }
  };

  const handleExportCSV = () => {
    if (filteredContracts.length === 0) return;
    const headers = [
      'ID', 'Cliente', 'RUT/RUC', 'Código Contrato', 'Nombre Contrato',
      'Fecha Inicio', 'Fecha Vencimiento', 'Días Restantes', 'Estado',
      'Semáforo', 'Servicios Asociados', 'Servicios Actuales', 'Diferencia Cobertura',
      'Cobertura %', 'Planes', 'Monto Mensual', 'Moneda', 'Renovación Auto'
    ];
    const rows = filteredContracts.map(c => [
      c.id, `"${c.cliente}"`, `"${c.identificacion_fiscal}"`, `"${c.codigo_contrato}"`,
      `"${c.nombre}"`, c.fecha_inicio, c.fecha_vencimiento, c.dias_restantes,
      c.estado, c.semaforo, c.servicios_asociados, c.servicios_actuales,
      c.diferencia_cobertura, `${c.cobertura_pct}%`, `"${c.planes}"`,
      c.monto_mensual_referencial, c.moneda, c.renovacion_automatica ? 'Sí' : 'No'
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Contratos_Comerciales_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 font-quicksand pb-10">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-st-accent" />
            Contratos Comerciales
          </h1>
          <p className="text-xs text-st-muted font-sans">
            Gestión de contratos vigentes, vencimientos y cobertura de servicios por cliente
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={fetchContractsData}
            className="flex items-center gap-2 px-3 py-1.5 bg-st-surface border border-st-border rounded-lg text-xs text-white hover:bg-white/10 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refrescar
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3 py-1.5 bg-st-surface border border-st-border rounded-lg text-xs text-white hover:bg-white/10 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar CSV
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-1.5 bg-st-accent text-st-bg font-bold rounded-lg text-xs hover:brightness-110 transition-all cursor-pointer shadow-lg shadow-st-accent/20"
          >
            <Plus className="w-4 h-4" />
            Nuevo Contrato
          </button>
        </div>
      </div>

      {/* KPI Cards Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Activos */}
        <div className="bg-st-surface border border-st-border rounded-xl p-4 flex items-center justify-between shadow-lg relative overflow-hidden group">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-st-muted uppercase tracking-wider">Contratos Activos</p>
            <p className="text-2xl font-bold text-emerald-400 font-sans">
              {summary ? summary.contratos_activos : 0}
            </p>
            <p className="text-[9px] text-st-muted font-semibold">Acuerdos vigentes</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Vencen <= 30 días */}
        <div className="bg-st-surface border border-st-border rounded-xl p-4 flex items-center justify-between shadow-lg relative overflow-hidden group">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-st-muted uppercase tracking-wider">Vencen en ≤ 30 días</p>
            <p className="text-2xl font-bold text-amber-400 font-sans">
              {summary ? summary.vencen_30_dias : 0}
            </p>
            <p className="text-[9px] text-amber-400/80 font-semibold">Requieren renovación</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Vencidos */}
        <div className="bg-st-surface border border-st-border rounded-xl p-4 flex items-center justify-between shadow-lg relative overflow-hidden group">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-st-muted uppercase tracking-wider">Vencidos</p>
            <p className="text-2xl font-bold text-rose-500 font-sans">
              {summary ? summary.vencidos : 0}
            </p>
            <p className="text-[9px] text-rose-400/80 font-semibold">Plazo expirado</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-rose-500/15 text-rose-500 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Servicios Asociados */}
        <div className="bg-st-surface border border-st-border rounded-xl p-4 flex items-center justify-between shadow-lg relative overflow-hidden group">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-st-muted uppercase tracking-wider">Servicios Asociados</p>
            <p className="text-2xl font-bold text-st-accent font-sans">
              {summary ? summary.total_servicios_asociados : 0}
            </p>
            <p className="text-[9px] text-st-muted font-semibold">Service Lines en contrato</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-st-accent/15 text-st-accent flex items-center justify-center flex-shrink-0">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        {/* Card 5: Monto Mensual Referencial */}
        <div className="bg-st-surface border border-st-border rounded-xl p-4 flex items-center justify-between shadow-lg relative overflow-hidden group">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-st-muted uppercase tracking-wider">Monto Referencial</p>
            <div className="font-sans font-bold">
              {summary && summary.monto_referencial_por_moneda ? (
                Object.entries(summary.monto_referencial_por_moneda).map(([m, val]) => (
                  <p key={m} className="text-lg text-emerald-400 leading-tight">
                    ${val.toLocaleString('es-CL', { minimumFractionDigits: 2 })} <span className="text-xs text-st-muted">{m}</span>
                  </p>
                ))
              ) : (
                <p className="text-lg text-emerald-400">$0.00 USD</p>
              )}
            </div>
            <p className="text-[9px] text-st-muted font-semibold uppercase">Suma mensual contratada</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center flex-shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search and Filters Toolbar */}
      <div className="bg-st-surface border border-st-border rounded-xl p-4 space-y-4 shadow-lg">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-st-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              placeholder="Buscar por cliente, contrato, RUC o servicio..."
              className="w-full bg-st-bg text-white text-xs pl-9 pr-8 py-2 rounded-lg border border-st-border focus:outline-none focus:border-st-accent placeholder-st-muted"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-st-muted hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Account Combobox Filter */}
            <AccountSearchSelect
              accounts={accounts}
              selectedAccount={selectedAccount}
              onSelectAccount={(accId) => { setSelectedAccount(accId); setCurrentPage(1); }}
              placeholder="Filtrar por cuenta/cliente..."
            />

            {/* Semáforo/Estado Filter */}
            <select
              value={estadoFilter}
              onChange={(e) => { setEstadoFilter(e.target.value); setCurrentPage(1); }}
              className="bg-st-bg border border-st-border text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-st-accent cursor-pointer"
            >
              <option value="">Todos los Estados</option>
              <option value="VERDE">Vigente (&gt; 60 días)</option>
              <option value="AMARILLO">Próximo (16 - 60 días)</option>
              <option value="ROJO">Urgente / Vencido (≤ 15 días)</option>
            </select>

            {/* Vencimiento Filter */}
            <select
              value={vencimientoFilter}
              onChange={(e) => { setVencimientoFilter(e.target.value); setCurrentPage(1); }}
              className="bg-st-bg border border-st-border text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-st-accent cursor-pointer"
            >
              <option value="">Cualquier Vencimiento</option>
              <option value="30">Vence en ≤ 30 días</option>
              <option value="60">Vence en ≤ 60 días</option>
            </select>

            {/* Renovación Filter */}
            <select
              value={renovacionFilter}
              onChange={(e) => { setRenovacionFilter(e.target.value); setCurrentPage(1); }}
              className="bg-st-bg border border-st-border text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-st-accent cursor-pointer"
            >
              <option value="">Renovación (Todas)</option>
              <option value="true">Renovación Automática</option>
              <option value="false">Renovación Manual</option>
            </select>

            {(search || estadoFilter || vencimientoFilter || renovacionFilter || selectedAccount) && (
              <button
                onClick={() => {
                  setSearch('');
                  setEstadoFilter('');
                  setVencimientoFilter('');
                  setRenovacionFilter('');
                  setSelectedAccount('');
                  setCurrentPage(1);
                }}
                className="text-xs text-st-accent hover:underline font-semibold cursor-pointer"
              >
                Limpiar Filtros
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Contracts Table */}
      <div className="bg-st-surface border border-st-border rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-st-muted">
            <thead className="bg-st-bg/70 border-b border-st-border text-xs font-bold text-white uppercase tracking-wider select-none">
              <tr>
                <th onClick={() => handleSort('semaforo')} className="py-3.5 px-4 text-center cursor-pointer hover:text-white transition-colors group">
                  <div className="flex items-center justify-center gap-1">
                    <span>Semáforo</span>
                    {renderSortIcon('semaforo')}
                  </div>
                </th>
                <th onClick={() => handleSort('cliente')} className="py-3.5 px-4 cursor-pointer hover:text-white transition-colors group">
                  <div className="flex items-center gap-1.5">
                    <span>Cliente / RUC</span>
                    {renderSortIcon('cliente')}
                  </div>
                </th>
                <th onClick={() => handleSort('codigo_contrato')} className="py-3.5 px-4 cursor-pointer hover:text-white transition-colors group">
                  <div className="flex items-center gap-1.5">
                    <span>Contrato</span>
                    {renderSortIcon('codigo_contrato')}
                  </div>
                </th>
                <th onClick={() => handleSort('fecha_vencimiento')} className="py-3.5 px-4 cursor-pointer hover:text-white transition-colors group">
                  <div className="flex items-center gap-1.5">
                    <span>Vencimiento</span>
                    {renderSortIcon('fecha_vencimiento')}
                  </div>
                </th>
                <th onClick={() => handleSort('dias_restantes')} className="py-3.5 px-4 text-center cursor-pointer hover:text-white transition-colors group">
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Días Restantes</span>
                    {renderSortIcon('dias_restantes')}
                  </div>
                </th>
                <th onClick={() => handleSort('cobertura_pct')} className="py-3.5 px-4 text-center cursor-pointer hover:text-white transition-colors group">
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Cobertura</span>
                    {renderSortIcon('cobertura_pct')}
                  </div>
                </th>
                <th onClick={() => handleSort('planes')} className="py-3.5 px-4 cursor-pointer hover:text-white transition-colors group">
                  <div className="flex items-center gap-1.5">
                    <span>Planes Contratados</span>
                    {renderSortIcon('planes')}
                  </div>
                </th>
                <th onClick={() => handleSort('monto_mensual_referencial')} className="py-3.5 px-4 text-right cursor-pointer hover:text-white transition-colors group">
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Monto Referencial</span>
                    {renderSortIcon('monto_mensual_referencial')}
                  </div>
                </th>
                <th onClick={() => handleSort('renovacion_automatica')} className="py-3.5 px-4 text-center cursor-pointer hover:text-white transition-colors group">
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Renovación</span>
                    {renderSortIcon('renovacion_automatica')}
                  </div>
                </th>
                <th className="py-3.5 px-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-st-border/50 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-st-muted text-sm">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-st-accent" />
                    Cargando contratos comerciales...
                  </td>
                </tr>
              ) : pagedContracts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-st-muted text-sm">
                    No se encontraron contratos con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                pagedContracts.map((c) => {
                  const isRed = c.semaforo === 'ROJO';
                  const isYellow = c.semaforo === 'AMARILLO';
                  const isGreen = c.semaforo === 'VERDE';

                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-white/[0.03] transition-colors cursor-pointer group"
                      onClick={() => handleOpenDetail(c)}
                    >
                      {/* Semáforo */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center justify-center w-3.5 h-3.5 rounded-full ${
                            isGreen
                              ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50'
                              : isYellow
                              ? 'bg-amber-400 shadow-sm shadow-amber-400/50 animate-pulse'
                              : 'bg-rose-500 shadow-sm shadow-rose-500/50 animate-pulse'
                          }`}
                          title={`Semáforo Comercial: ${c.semaforo}`}
                        />
                      </td>

                      {/* Cliente / RUC */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white text-sm group-hover:text-st-accent transition-colors">
                          {c.cliente}
                        </div>
                        <div className="text-xs text-st-muted font-mono">
                          RUT/RUC: {c.identificacion_fiscal}
                        </div>
                      </td>

                      {/* Contrato */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono text-st-accent text-xs font-bold">
                          {c.codigo_contrato}
                        </div>
                        <div className="text-xs text-white/90 font-medium truncate max-w-[220px]" title={c.nombre}>
                          {c.nombre}
                        </div>
                      </td>

                      {/* Vencimiento */}
                      <td className="py-3.5 px-4">
                        <div className="text-white font-semibold text-xs">{c.fecha_vencimiento}</div>
                        <div className="text-xs text-st-muted">Inicio: {c.fecha_inicio}</div>
                      </td>

                      {/* Días Restantes */}
                      <td className="py-3.5 px-4 text-center">
                        {c.dias_restantes < 0 ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                            Vencido hace {Math.abs(c.dias_restantes)}d
                          </span>
                        ) : isYellow || isRed ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            {c.dias_restantes} días
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                            {c.dias_restantes} días
                          </span>
                        )}
                      </td>

                      {/* Cobertura */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="font-bold text-white text-sm">
                          {c.servicios_asociados} / {c.servicios_actuales} <span className="text-xs font-normal text-st-muted">líneas</span>
                        </div>
                        <div className="text-xs text-st-muted">
                          Cobertura: <span className="font-bold text-st-accent">{c.cobertura_pct}%</span>
                          {c.diferencia_cobertura > 0 && (
                            <span className="text-amber-400 ml-1 font-semibold">(+{c.diferencia_cobertura})</span>
                          )}
                        </div>
                      </td>

                      {/* Planes */}
                      <td className="py-3.5 px-4">
                        <div className="text-xs text-white/90 truncate max-w-[200px]" title={c.planes}>
                          {c.planes}
                        </div>
                      </td>

                      {/* Monto Mensual Referencial */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="font-bold text-emerald-400 text-base">
                          ${c.monto_mensual_referencial.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-xs text-st-muted font-bold">{c.moneda} / mes</div>
                      </td>

                      {/* Renovación */}
                      <td className="py-3 px-4 text-center">
                        {c.renovacion_automatica ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            Automática
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-st-muted border border-st-border">
                            Manual
                          </span>
                        )}
                      </td>

                      {/* Acción */}
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleOpenDetail(c)}
                          className="px-3 py-1 bg-st-surface border border-st-border text-st-accent hover:bg-st-accent hover:text-st-bg rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                        >
                          Detalle
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Toolbar */}
        <div className="px-4 py-3 border-t border-st-border bg-st-bg/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-st-muted">
          <div className="flex items-center gap-2">
            <span>Mostrar</span>
            <select
              value={itemsPerPage}
              onChange={(e) => { setItemsPerPage(parseInt(e.target.value)); setCurrentPage(1); }}
              className="bg-st-surface border border-st-border text-white rounded px-2 py-1 focus:outline-none"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>registros por página (Total: {filteredContracts.length})</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="px-3 py-1 rounded bg-st-surface border border-st-border text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/10 cursor-pointer"
            >
              Anterior
            </button>
            <span>Página {currentPage} de {totalPages || 1}</span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="px-3 py-1 rounded bg-st-surface border border-st-border text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/10 cursor-pointer"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      {/* DETAIL MODAL */}
      {showDetailModal && selectedContract && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-st-surface border border-st-border rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-st-border flex items-center justify-between bg-st-bg/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-st-accent/15 text-st-accent flex items-center justify-center">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white uppercase tracking-wider">
                    {selectedContract.codigo_contrato} - {selectedContract.nombre}
                  </h2>
                  <p className="text-xs text-st-muted">
                    Cliente: <span className="text-white font-semibold">{selectedContract.cliente}</span> (RUT: {selectedContract.identificacion_fiscal})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-st-muted hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content Scrollable */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* Status Banner */}
              <div className="p-4 rounded-xl border flex flex-wrap items-center justify-between gap-4 bg-st-bg/50 border-st-border">
                <div>
                  <p className="text-[10px] text-st-muted uppercase font-bold tracking-wider">Estado Contractual</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`inline-block w-2.5 h-2.5 rounded-full ${
                        selectedContract.semaforo === 'VERDE'
                          ? 'bg-emerald-500'
                          : selectedContract.semaforo === 'AMARILLO'
                          ? 'bg-amber-400'
                          : 'bg-rose-500'
                      }`}
                    />
                    <span className="text-sm font-bold text-white">{selectedContract.estado}</span>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-st-muted uppercase font-bold tracking-wider">Días para Vencer</p>
                  <p className="text-sm font-bold text-amber-400 mt-1">{selectedContract.dias_restantes} días</p>
                </div>
                <div>
                  <p className="text-[10px] text-st-muted uppercase font-bold tracking-wider">Monto Mensual Referencial</p>
                  <p className="text-sm font-bold text-emerald-400 mt-1">
                    ${selectedContract.monto_mensual_referencial.toLocaleString('es-CL', { minimumFractionDigits: 2 })} {selectedContract.moneda}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-st-muted uppercase font-bold tracking-wider">Renovación</p>
                  <p className="text-sm font-bold text-white mt-1">
                    {selectedContract.renovacion_automatica ? 'Automática' : 'Manual'}
                  </p>
                </div>
              </div>

              {/* Cobertura Grid */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Shield className="w-4 h-4 text-st-accent" />
                  Cobertura Contractual de Servicios
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-3 rounded-lg bg-st-bg border border-st-border">
                    <p className="text-[10px] text-st-muted font-bold">Servicios en Contrato</p>
                    <p className="text-xl font-bold text-white mt-1">{selectedContract.servicios_asociados}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-st-bg border border-st-border">
                    <p className="text-[10px] text-st-muted font-bold">Servicios Activos Actuales</p>
                    <p className="text-xl font-bold text-white mt-1">{selectedContract.servicios_actuales}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-st-bg border border-st-border">
                    <p className="text-[10px] text-st-muted font-bold">Porcentaje de Cobertura</p>
                    <p className="text-xl font-bold text-st-accent mt-1">{selectedContract.cobertura_pct}%</p>
                  </div>
                </div>
              </div>

              {/* Associated Service Lines Table */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-st-accent" />
                  Service Lines Asociadas
                </h3>
                <div className="border border-st-border rounded-xl overflow-hidden bg-st-bg/40">
                  <table className="w-full text-left text-xs text-st-muted">
                    <thead className="bg-st-bg border-b border-st-border text-[10px] font-bold text-white uppercase">
                      <tr>
                        <th className="py-2.5 px-3">Número Línea</th>
                        <th className="py-2.5 px-3">Nombre</th>
                        <th className="py-2.5 px-3">Plan</th>
                        <th className="py-2.5 px-3">Device ID</th>
                        <th className="py-2.5 px-3 text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-st-border/40 font-sans">
                      {selectedContract.lineas_asociadas && selectedContract.lineas_asociadas.length > 0 ? (
                        selectedContract.lineas_asociadas.map((l: any, i: number) => (
                          <tr key={i} className="hover:bg-white/[0.02]">
                            <td className="py-2 px-3 font-mono text-st-accent font-semibold">{l.numero_linea}</td>
                            <td className="py-2 px-3 text-white">{l.nombre}</td>
                            <td className="py-2 px-3 text-white/80">{l.plan}</td>
                            <td className="py-2 px-3 font-mono text-xs">{l.device_id}</td>
                            <td className="py-2 px-3 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-400">
                                {l.estado}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-st-muted text-xs">
                            No hay Service Lines asociadas específicamente a este contrato.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Observaciones */}
              {selectedContract.observaciones && (
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-st-muted uppercase tracking-wider">Observaciones</p>
                  <div className="p-3 bg-st-bg border border-st-border rounded-lg text-white/90 text-xs">
                    {selectedContract.observaciones}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-st-border bg-st-bg/80 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 bg-st-surface border border-st-border text-white text-xs font-bold rounded-lg hover:bg-white/10 transition-all cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE NEW CONTRACT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-st-surface border border-st-border rounded-2xl w-full max-w-xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-st-border flex items-center justify-between bg-st-bg/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-st-accent/15 text-st-accent flex items-center justify-center">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white uppercase tracking-wider">
                    Registrar Nuevo Contrato Comercial
                  </h2>
                  <p className="text-xs text-st-muted">
                    Definir acuerdo comercial entre Reseller y Cliente
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-st-muted hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateContract} className="p-6 overflow-y-auto space-y-4 text-xs flex-1 font-sans">
              <div>
                <label className="block font-bold text-white mb-1">Cliente / Cuenta *</label>
                <select
                  required
                  value={newContractForm.tenant_id}
                  onChange={(e) => setNewContractForm({ ...newContractForm, tenant_id: e.target.value })}
                  className="w-full bg-st-bg border border-st-border text-white text-xs rounded-lg p-2.5 focus:outline-none focus:border-st-accent"
                >
                  <option value="">Seleccione una cuenta cliente...</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.tenant_id || acc.id}>
                      {acc.nombre} ({acc.numero_cuenta})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-white mb-1">Código Contrato *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: CTR-2026-099"
                    value={newContractForm.codigo_contrato}
                    onChange={(e) => setNewContractForm({ ...newContractForm, codigo_contrato: e.target.value })}
                    className="w-full bg-st-bg border border-st-border text-white text-xs rounded-lg p-2.5 focus:outline-none focus:border-st-accent font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-white mb-1">Nombre Contrato *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Contrato Anual Corporativo"
                    value={newContractForm.nombre}
                    onChange={(e) => setNewContractForm({ ...newContractForm, nombre: e.target.value })}
                    className="w-full bg-st-bg border border-st-border text-white text-xs rounded-lg p-2.5 focus:outline-none focus:border-st-accent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-white mb-1">Fecha Inicio *</label>
                  <input
                    type="date"
                    required
                    value={newContractForm.fecha_inicio}
                    onChange={(e) => setNewContractForm({ ...newContractForm, fecha_inicio: e.target.value })}
                    className="w-full bg-st-bg border border-st-border text-white text-xs rounded-lg p-2.5 focus:outline-none focus:border-st-accent"
                  />
                </div>

                <div>
                  <label className="block font-bold text-white mb-1">Fecha Fin / Vencimiento *</label>
                  <input
                    type="date"
                    required
                    value={newContractForm.fecha_fin}
                    onChange={(e) => setNewContractForm({ ...newContractForm, fecha_fin: e.target.value })}
                    className="w-full bg-st-bg border border-st-border text-white text-xs rounded-lg p-2.5 focus:outline-none focus:border-st-accent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-white mb-1">Moneda *</label>
                  <select
                    value={newContractForm.moneda_iso3}
                    onChange={(e) => setNewContractForm({ ...newContractForm, moneda_iso3: e.target.value })}
                    className="w-full bg-st-bg border border-st-border text-white text-xs rounded-lg p-2.5 focus:outline-none focus:border-st-accent"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="CLP">CLP ($)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-white mb-1">Monto Mensual Ref. *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newContractForm.monto_mensual_referencial}
                    onChange={(e) => setNewContractForm({ ...newContractForm, monto_mensual_referencial: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-st-bg border border-st-border text-white text-xs rounded-lg p-2.5 focus:outline-none focus:border-st-accent font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-white mb-1">Plazo (Meses)</label>
                  <input
                    type="number"
                    value={newContractForm.plazo_meses}
                    onChange={(e) => setNewContractForm({ ...newContractForm, plazo_meses: parseInt(e.target.value) || 12 })}
                    className="w-full bg-st-bg border border-st-border text-white text-xs rounded-lg p-2.5 focus:outline-none focus:border-st-accent"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="renov_check"
                  checked={newContractForm.renovacion_automatica}
                  onChange={(e) => setNewContractForm({ ...newContractForm, renovacion_automatica: e.target.checked })}
                  className="rounded border-st-border bg-st-bg text-st-accent focus:ring-st-accent"
                />
                <label htmlFor="renov_check" className="text-white text-xs cursor-pointer font-medium">
                  Renovación Automática al Vencimiento
                </label>
              </div>

              <div>
                <label className="block font-bold text-white mb-1">Observaciones</label>
                <textarea
                  rows={3}
                  placeholder="Detalles o términos comerciales acordados..."
                  value={newContractForm.observaciones}
                  onChange={(e) => setNewContractForm({ ...newContractForm, observaciones: e.target.value })}
                  className="w-full bg-st-bg border border-st-border text-white text-xs rounded-lg p-2.5 focus:outline-none focus:border-st-accent"
                />
              </div>

              <div className="pt-4 border-t border-st-border flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-st-surface border border-st-border text-white text-xs font-bold rounded-lg hover:bg-white/10 transition-all cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 bg-st-accent text-st-bg text-xs font-bold rounded-lg hover:brightness-110 transition-all cursor-pointer disabled:opacity-50"
                >
                  {creating ? 'Guardando...' : 'Guardar Contrato'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
