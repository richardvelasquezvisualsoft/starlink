import React, { useState, useEffect, useMemo } from 'react';
import {
  Database,
  Search,
  Download,
  AlertCircle,
  TrendingUp,
  FileText,
  ChevronUp,
  ChevronDown,
  ArrowUpDown
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import client from '../api/client';
import { AccountSearchSelect } from '../components/AccountSearchSelect';

interface ConsumptionLineItem {
  id: number;
  numero_linea: string;
  nombre: string;
  dispositivo_name: string;
  device_id: string;
  cuenta_nombre: string;
  plan_contratado: string;
  limite_gb: number;
  consumido_gb: number;
  exceso_gb: number;
  costo_adicional: number;
  permitir_excedentes_opt_in?: boolean;
}

export const ConsumptionReport: React.FC = () => {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartType, setChartType] = useState<'bar' | 'area' | 'line'>('bar');
  const [lines, setLines] = useState<ConsumptionLineItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Year and Month Filters
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 8;

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const kpiParams: any = {};
        if (selectedAccount) kpiParams.cuenta_id = selectedAccount;
        if (selectedYear) kpiParams.year = selectedYear;
        if (selectedMonth) kpiParams.month = selectedMonth;

        const [accRes, chartRes, linesRes] = await Promise.all([
          client.get('/cuentas'),
          client.get('/dashboard/chart', { params: kpiParams }),
          client.get('/dashboard/consumption/lines', { params: kpiParams })
        ]);

        setAccounts(accRes.data || []);

        const rawData = chartRes.data;
        const dataArray = Array.isArray(rawData)
          ? rawData
          : (rawData?.legacyData || rawData?.trafficSeries || []);
        setChartData(dataArray);

        setLines(linesRes.data || []);
      } catch (err) {
        console.error('Error fetching consumption data', err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [selectedAccount, selectedYear, selectedMonth]);

  // Apply search query filter
  const filteredLines = lines.filter((l) =>
    l.numero_linea.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.device_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.cuenta_nombre.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const [sortBy, setSortBy] = useState<string>('numero_linea');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('asc');
    }
  };

  const sortedLines = useMemo(() => {
    const list = [...filteredLines];
    list.sort((a: any, b: any) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      if (sortBy === 'uso_pct') {
        aVal = a.limite_gb ? (a.consumido_gb / a.limite_gb) * 100 : 0;
        bVal = b.limite_gb ? (b.consumido_gb / b.limite_gb) * 100 : 0;
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
  }, [filteredLines, sortBy, sortDirection]);

  // Pagination calculations
  const totalItems = sortedLines.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const pagedLines = sortedLines.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const renderSortIcon = (field: string) => {
    if (sortBy === field) {
      return sortDirection === 'asc' ? (
        <ChevronUp className="w-3 h-3 text-st-accent flex-shrink-0" />
      ) : (
        <ChevronDown className="w-3 h-3 text-st-accent flex-shrink-0" />
      );
    }
    return <ArrowUpDown className="w-2.5 h-2.5 text-st-muted/40 group-hover:text-st-muted flex-shrink-0 transition-colors" />;
  };

  // Compute summary metrics
  const totalConsumed = lines.reduce((acc, l) => acc + l.consumido_gb, 0);
  const totalExcess = lines.reduce((acc, l) => acc + l.exceso_gb, 0);
  const totalCost = lines.reduce((acc, l) => acc + l.costo_adicional, 0);
  const linesOverLimit = lines.filter((l) => l.consumido_gb > l.limite_gb).length;

  const formatDayLabel = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = parts[2].substring(0, 2);
        const m = parseInt(parts[1], 10);
        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        return `${parseInt(d, 10)} ${months[m - 1] || ''}`;
      }
    } catch {}
    return dateStr;
  };

  return (
    <div className="space-y-6 font-quicksand">
      {/* Header and Toolbar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Database className="w-6 h-6 text-st-accent" />
            Consumo de Datos
          </h1>
          <p className="text-xs text-st-muted font-sans">
            Auditoría de transferencia y cargos adicionales por exceso de datos en la flota.
          </p>
        </div>

        {/* Toolbar controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Account Filter with Search */}
          <AccountSearchSelect
            accounts={accounts}
            selectedAccount={selectedAccount}
            onSelectAccount={(accId) => {
              setSelectedAccount(accId);
              setCurrentPage(1);
            }}
          />
          
          {/* Year Filter */}
          <div className="flex items-center gap-2 bg-st-surface border border-st-border px-3 py-1.5 rounded-lg text-xs">
            <select
              value={selectedYear}
              onChange={(e) => { setSelectedYear(parseInt(e.target.value)); setCurrentPage(1); }}
              className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
            >
              {[currentYear, currentYear - 1, currentYear - 2].map(year => (
                <option key={year} value={year} className="bg-st-surface text-white">{year}</option>
              ))}
            </select>
          </div>

          {/* Month Filter */}
          <div className="flex items-center gap-2 bg-st-surface border border-st-border px-3 py-1.5 rounded-lg text-xs">
            <select
              value={selectedMonth}
              onChange={(e) => { setSelectedMonth(parseInt(e.target.value)); setCurrentPage(1); }}
              className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
            >
              {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map((m, i) => (
                <option key={i+1} value={i+1} className="bg-st-surface text-white">
                  {m}
                </option>
              ))}

            </select>
          </div>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white text-xs font-bold uppercase rounded-lg hover:bg-white/20 transition-all cursor-pointer animate-none"
          >
            <Download className="w-4 h-4" />
            Exportar PDF
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-st-surface border border-st-border rounded-xl p-4 flex items-center justify-between shadow-lg relative overflow-hidden group">
          <div className="space-y-1 z-10">
            <p className="text-[10px] font-bold text-st-muted uppercase tracking-wider">Consumo Total Flota</p>
            <p className="text-2xl font-bold text-white font-sans">
              {totalConsumed.toLocaleString('es-CL', { maximumFractionDigits: 1 })} <span className="text-xs font-semibold text-st-muted">GB</span>
            </p>
            <p className="text-[9px] text-st-accent font-semibold uppercase">Acumulado mes seleccionado</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-st-accent/15 text-st-accent flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-st-surface border border-st-border rounded-xl p-4 flex items-center justify-between shadow-lg relative overflow-hidden group">
          <div className="space-y-1 z-10">
            <p className="text-[10px] font-bold text-st-muted uppercase tracking-wider">Líneas en Exceso</p>
            <p className="text-2xl font-bold text-st-warning font-sans">
              {linesOverLimit} <span className="text-xs font-semibold text-st-muted">Líneas</span>
            </p>
            <p className="text-[9px] text-st-warning font-semibold uppercase">Tráfico superior al límite</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-st-warning/15 text-st-warning flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-st-surface border border-st-border rounded-xl p-4 flex items-center justify-between shadow-lg relative overflow-hidden group">
          <div className="space-y-1 z-10">
            <p className="text-[10px] font-bold text-st-muted uppercase tracking-wider">Transferencia Excedente</p>
            <p className="text-2xl font-bold text-white font-sans">
              {totalExcess.toLocaleString('es-CL', { maximumFractionDigits: 1 })} <span className="text-xs font-semibold text-st-muted">GB</span>
            </p>
            <p className="text-[9px] text-st-muted font-semibold uppercase">Suma de GB sobre límite</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-white/10 text-white flex items-center justify-center flex-shrink-0">
            <Database className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-st-surface border border-st-border rounded-xl p-4 flex items-center justify-between shadow-lg relative overflow-hidden group">
          <div className="space-y-1 z-10">
            <p className="text-[10px] font-bold text-st-muted uppercase tracking-wider">Cargos Adicionales Est.</p>
            <p className="text-2xl font-bold text-emerald-500 font-sans">
              ${totalCost.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-semibold text-st-muted">USD</span>
            </p>
            <p className="text-[9px] text-st-online font-semibold uppercase">Tarifa excedente $0.25/GB</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-500/15 text-emerald-500 flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-st-surface border border-st-border rounded-xl p-5 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Tendencia de Tráfico de Datos</h2>
            <p className="text-[11px] text-st-muted">Consumo diario agregado en la flota.</p>
          </div>
          {/* Chart toggles */}
          <div className="flex bg-st-bg p-1 rounded-lg border border-st-border">
            <button
              onClick={() => setChartType('area')}
              className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md cursor-pointer transition-all ${chartType === 'area' ? 'bg-st-surface text-st-accent font-bold' : 'text-st-muted'}`}
            >
              Área
            </button>
            <button
              onClick={() => setChartType('bar')}
              className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md cursor-pointer transition-all ${chartType === 'bar' ? 'bg-st-surface text-st-accent font-bold' : 'text-st-muted'}`}
            >
              Barras
            </button>
            <button
              onClick={() => setChartType('line')}
              className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md cursor-pointer transition-all ${chartType === 'line' ? 'bg-st-surface text-st-accent font-bold' : 'text-st-muted'}`}
            >
              Líneas
            </button>
          </div>
        </div>

        <div className="h-64 w-full bg-st-bg/40 rounded-xl p-3 border border-st-border/50">
          {chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-st-muted text-xs">
              No hay datos históricos disponibles
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'area' ? (
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222222" />
                  <XAxis dataKey="timestamp" stroke="#9CA3AF" fontSize={9} tickFormatter={formatDayLabel} />
                  <YAxis stroke="#9CA3AF" fontSize={9} unit=" GB" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111111', borderColor: '#222222', borderRadius: '8px', color: '#fff' }}
                    formatter={(val: any) => [`${Number(val || 0).toLocaleString('es-CL', { maximumFractionDigits: 1 })} GB`, 'Consumo']}
                    labelFormatter={(label: any) => `Fecha: ${label}`}
                  />
                  <Area type="monotone" dataKey="data_usage_gb" stroke="#00A8E8" fill="#00A8E8" fillOpacity={0.15} strokeWidth={2} name="Datos (GB)" />
                </AreaChart>
              ) : chartType === 'bar' ? (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222222" />
                  <XAxis dataKey="timestamp" stroke="#9CA3AF" fontSize={9} tickFormatter={formatDayLabel} />
                  <YAxis stroke="#9CA3AF" fontSize={9} unit=" GB" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111111', borderColor: '#222222', borderRadius: '8px', color: '#fff' }}
                    formatter={(val: any) => [`${Number(val || 0).toLocaleString('es-CL', { maximumFractionDigits: 1 })} GB`, 'Consumo']}
                    labelFormatter={(label: any) => `Fecha: ${label}`}
                  />
                  <Bar dataKey="data_usage_gb" fill="#00A8E8" radius={[4, 4, 0, 0]} name="Datos (GB)" />
                </BarChart>
              ) : (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222222" />
                  <XAxis dataKey="timestamp" stroke="#9CA3AF" fontSize={9} tickFormatter={formatDayLabel} />
                  <YAxis stroke="#9CA3AF" fontSize={9} unit=" GB" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111111', borderColor: '#222222', borderRadius: '8px', color: '#fff' }}
                    formatter={(val: any) => [`${Number(val || 0).toLocaleString('es-CL', { maximumFractionDigits: 1 })} GB`, 'Consumo']}
                    labelFormatter={(label: any) => `Fecha: ${label}`}
                  />
                  <Line type="monotone" dataKey="data_usage_gb" stroke="#00A8E8" strokeWidth={2.5} dot={{ r: 2 }} name="Datos (GB)" />
                </LineChart>
              )}
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Main Data Table */}
      <div className="bg-st-surface border border-st-border rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider self-start sm:self-center">Detalle de Consumos por Línea</h2>
          {/* Search bar */}
          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 text-st-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por ID, línea, nombre..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-4 py-1.5 bg-st-bg border border-st-border rounded-lg text-xs text-white placeholder-st-muted/50 focus:outline-none focus:ring-1 focus:ring-st-accent focus:border-st-accent"
            />
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="border-b border-st-border text-[10px] font-bold text-st-muted uppercase tracking-wider select-none bg-st-bg/50">
              <tr>
                <th onClick={() => handleSort('numero_linea')} className="py-3 px-4 cursor-pointer hover:text-white transition-colors group">
                  <div className="flex items-center gap-1">
                    <span>Línea</span>
                    {renderSortIcon('numero_linea')}
                  </div>
                </th>
                <th onClick={() => handleSort('nombre')} className="py-3 px-4 cursor-pointer hover:text-white transition-colors group">
                  <div className="flex items-center gap-1">
                    <span>Nombre Alías</span>
                    {renderSortIcon('nombre')}
                  </div>
                </th>
                <th onClick={() => handleSort('device_id')} className="py-3 px-4 cursor-pointer hover:text-white transition-colors group">
                  <div className="flex items-center gap-1">
                    <span>Device ID</span>
                    {renderSortIcon('device_id')}
                  </div>
                </th>
                <th onClick={() => handleSort('cuenta_nombre')} className="py-3 px-4 cursor-pointer hover:text-white transition-colors group">
                  <div className="flex items-center gap-1">
                    <span>Cuenta</span>
                    {renderSortIcon('cuenta_nombre')}
                  </div>
                </th>
                <th onClick={() => handleSort('plan_contratado')} className="py-3 px-4 cursor-pointer hover:text-white transition-colors group">
                  <div className="flex items-center gap-1">
                    <span>Plan Starlink</span>
                    {renderSortIcon('plan_contratado')}
                  </div>
                </th>
                <th onClick={() => handleSort('limite_gb')} className="py-3 px-4 text-right cursor-pointer hover:text-white transition-colors group">
                  <div className="flex items-center justify-end gap-1">
                    <span>Límite</span>
                    {renderSortIcon('limite_gb')}
                  </div>
                </th>
                <th onClick={() => handleSort('consumido_gb')} className="py-3 px-4 text-right cursor-pointer hover:text-white transition-colors group">
                  <div className="flex items-center justify-end gap-1">
                    <span>Consumido</span>
                    {renderSortIcon('consumido_gb')}
                  </div>
                </th>
                <th onClick={() => handleSort('uso_pct')} className="py-3 px-4 text-center cursor-pointer hover:text-white transition-colors group">
                  <div className="flex items-center justify-center gap-1">
                    <span>Uso %</span>
                    {renderSortIcon('uso_pct')}
                  </div>
                </th>
                <th onClick={() => handleSort('permitir_excedentes_opt_in')} className="py-3 px-4 text-center cursor-pointer hover:text-white transition-colors group">
                  <div className="flex items-center justify-center gap-1">
                    <span>Excedentes</span>
                    {renderSortIcon('permitir_excedentes_opt_in')}
                  </div>
                </th>
                <th onClick={() => handleSort('costo_adicional')} className="py-3 px-4 text-right cursor-pointer hover:text-white transition-colors group">
                  <div className="flex items-center justify-end gap-1">
                    <span>Cargos Extra</span>
                    {renderSortIcon('costo_adicional')}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-st-border/30 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-st-muted">
                    Cargando información de consumos...
                  </td>
                </tr>
              ) : pagedLines.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-st-muted">
                    No se encontraron registros de consumos.
                  </td>
                </tr>
              ) : (
                pagedLines.map((l) => {
                  const usagePct = (l.consumido_gb / l.limite_gb) * 100;
                  const isOver = l.consumido_gb > l.limite_gb;
                  
                  return (
                    <tr key={l.id} className="hover:bg-white/[0.03] transition-all">
                      <td className="py-3 px-4 font-bold text-white">{l.numero_linea}</td>
                      <td className="py-3 px-4 text-st-muted">{l.nombre}</td>
                      <td className="py-3 px-4 font-mono text-[10px] text-st-muted">{l.device_id}</td>
                      <td className="py-3 px-4 text-st-muted">{l.cuenta_nombre}</td>
                      <td className="py-3 px-4 font-medium text-white">{l.plan_contratado}</td>
                      <td className="py-3 px-4 text-right text-st-muted font-mono">{l.limite_gb} GB</td>
                      <td className="py-3 px-4 text-right text-white font-mono">{l.consumido_gb} GB</td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 bg-st-bg border border-st-border h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${isOver ? 'bg-st-offline' : usagePct > 80 ? 'bg-st-warning' : 'bg-st-online'}`}
                              style={{ width: `${Math.min(usagePct, 100)}%` }}
                            />
                          </div>
                          <span className={`font-mono font-bold text-[10px] ${isOver ? 'text-st-offline' : usagePct > 80 ? 'text-st-warning' : 'text-st-online'}`}>
                            {usagePct.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {l.permitir_excedentes_opt_in ? (
                          <span className="px-2 py-0.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded text-[10px] font-semibold">PERMITIDO</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-st-muted/15 text-st-muted border border-st-border rounded text-[10px] font-semibold">RESTRINGIDO</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        {l.costo_adicional > 0 ? (
                          <span className="text-st-offline">
                            +${l.costo_adicional.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-st-muted">--</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center border-t border-st-border pt-4 text-xs select-none">
            <span className="text-st-muted">
              Mostrando página <strong className="text-white">{currentPage}</strong> de <strong className="text-white">{totalPages}</strong> ({totalItems} registros)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((c) => Math.max(c - 1, 1))}
                className="px-3 py-1.5 bg-st-bg border border-st-border text-st-muted rounded hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                Anterior
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((c) => Math.min(c + 1, totalPages))}
                className="px-3 py-1.5 bg-st-bg border border-st-border text-st-muted rounded hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default ConsumptionReport;
