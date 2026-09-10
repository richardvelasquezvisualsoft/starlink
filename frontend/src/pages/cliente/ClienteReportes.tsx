import React, { useState, useEffect } from 'react';
import { BarChart3, Download, Filter, Activity, Layers, Calendar, DollarSign, Database, AlertCircle } from 'lucide-react';
import client from '../../api/client';

const MONTHS = [
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' }
];

const YEARS = [2024, 2025, 2026];

export const ClienteReportes: React.FC = () => {
  const now = new Date();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [periodInfo, setPeriodInfo] = useState<any>(null);

  // Controls
  const [grouping, setGrouping] = useState('centro_costo');
  const [metric, setMetric] = useState('consumo');
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth() + 1);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await client.get('/dashboard/reportes-interactivos', {
        params: {
          metric,
          grouping,
          year,
          month
        }
      });
      setData(res.data.data || []);
      setTotal(res.data.total || 0);
      setPeriodInfo(res.data);
    } catch (err) {
      console.error('Error fetching reportes interactivos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleGenerate();
  }, [grouping, metric, year, month]);

  const handleExportCSV = () => {
    const headers = 'Agrupacion,Valor,Porcentaje\n';
    const csvContent = data.map(row => `"${row.agrupacion}",${row.valor},${row.porcentaje || 0}%`).join('\n');
    const blob = new Blob([headers + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_${metric}_${grouping}_${year}_${month}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getGroupingLabel = (key: string) => {
    switch (key) {
      case 'centro_costo': return 'Centro de Costo';
      case 'nivel1': return 'Nivel Org. 1';
      case 'nivel2': return 'Nivel Org. 2';
      case 'nivel3': return 'Nivel Org. 3';
      case 'colaborador': return 'Colaborador';
      default: return key;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans uppercase">Reportes Interactivos</h1>
          <p className="text-xs text-st-muted mt-0.5">Consumo y facturación agrupados dinámicamente por período.</p>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={data.length === 0}
          className="flex items-center gap-2 px-3.5 py-2 bg-st-surface border border-st-border rounded-lg text-sm text-st-muted hover:text-white hover:border-white/20 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          <span>Exportar a CSV</span>
        </button>
      </div>

      {/* Toolbar / Filters */}
      <div className="bg-st-surface border border-st-border rounded-xl p-4 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2 text-st-muted text-xs font-bold uppercase tracking-wider pr-2 border-r border-st-border/50">
          <Filter className="w-4 h-4 text-st-accent" />
          <span>Filtros del Reporte</span>
        </div>

        {/* Metric selection */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-st-muted">Métrica:</span>
          <select 
            value={metric} 
            onChange={e => setMetric(e.target.value)} 
            className="bg-st-bg border border-st-border rounded-lg px-3 py-1.5 text-sm text-white focus:border-st-accent outline-none cursor-pointer"
          >
            <option value="consumo">Consumo (GB)</option>
            <option value="monto">Monto Facturado ($)</option>
          </select>
        </div>

        {/* Grouping selection */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-st-muted">Agrupar por:</span>
          <select 
            value={grouping} 
            onChange={e => setGrouping(e.target.value)} 
            className="bg-st-bg border border-st-border rounded-lg px-3 py-1.5 text-sm text-white focus:border-st-accent outline-none cursor-pointer"
          >
            <option value="centro_costo">Centro de Costo</option>
            <option value="nivel1">Nivel Org. 1</option>
            <option value="nivel2">Nivel Org. 2</option>
            <option value="nivel3">Nivel Org. 3</option>
            <option value="colaborador">Colaborador</option>
          </select>
        </div>

        {/* Year selection */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-st-muted">Año:</span>
          <select 
            value={year} 
            onChange={e => setYear(Number(e.target.value))} 
            className="bg-st-bg border border-st-border rounded-lg px-3 py-1.5 text-sm text-white focus:border-st-accent outline-none cursor-pointer"
          >
            {YEARS.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {/* Month selection */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-st-muted">Mes:</span>
          <select 
            value={month} 
            onChange={e => setMonth(Number(e.target.value))} 
            className="bg-st-bg border border-st-border rounded-lg px-3 py-1.5 text-sm text-white focus:border-st-accent outline-none cursor-pointer"
          >
            {MONTHS.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        <button
          onClick={handleGenerate}
          className="flex items-center gap-2 px-4 py-1.5 bg-st-accent/10 border border-st-accent/20 rounded-lg text-sm text-st-accent hover:bg-st-accent/20 transition-colors ml-auto cursor-pointer"
        >
          <BarChart3 className="w-4 h-4" />
          <span>Generar</span>
        </button>
      </div>

      {/* Fallback alert if requested month doesn't have records yet */}
      {periodInfo?.es_periodo_fallback && (
        <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>
            No se encontraron registros del período {year}-{month.toString().padStart(2, '0')}. Se están mostrando los datos agregados del período disponible más reciente: <strong>{periodInfo.periodo_consultado}</strong>.
          </span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-st-surface border border-st-border rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-st-accent/10 border border-st-accent/20 rounded-lg text-st-accent">
            {metric === 'consumo' ? <Database className="w-6 h-6" /> : <DollarSign className="w-6 h-6" />}
          </div>
          <div>
            <div className="text-xs text-st-muted uppercase tracking-wider font-semibold">
              Total {metric === 'consumo' ? 'Consumo' : 'Facturado'}
            </div>
            <div className="text-2xl font-bold text-white mt-0.5">
              {metric === 'consumo' ? `${total.toLocaleString('es-PE', { minimumFractionDigits: 2 })} GB` : `$ ${total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`}
            </div>
          </div>
        </div>

        <div className="bg-st-surface border border-st-border rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-st-muted uppercase tracking-wider font-semibold">Grupos Encontrados</div>
            <div className="text-2xl font-bold text-white mt-0.5">{data.length}</div>
          </div>
        </div>

        <div className="bg-st-surface border border-st-border rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg text-purple-400">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-st-muted uppercase tracking-wider font-semibold">Período</div>
            <div className="text-2xl font-bold text-white mt-0.5">
              {MONTHS.find(m => m.value === month)?.label} {year}
            </div>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-st-surface border border-st-border rounded-xl overflow-hidden min-h-[350px]">
        {loading ? (
          <div className="flex h-full min-h-[350px] items-center justify-center">
            <Activity className="w-8 h-8 animate-spin text-st-accent" />
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-st-bg">
              <tr>
                <th className="p-4 text-xs font-bold text-st-muted uppercase tracking-wider border-b border-st-border">
                  Agrupación ({getGroupingLabel(grouping)})
                </th>
                <th className="p-4 text-xs font-bold text-st-muted uppercase tracking-wider border-b border-st-border text-center w-48">
                  Distribución
                </th>
                <th className="p-4 text-xs font-bold text-st-muted uppercase tracking-wider border-b border-st-border text-right">
                  Valor ({metric === 'consumo' ? 'GB' : 'USD'})
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => (
                <tr key={idx} className="border-b border-st-border/50 hover:bg-white/5 transition-colors">
                  <td className="p-4 text-white font-medium">
                    {row.agrupacion}
                  </td>
                  <td className="p-4 align-middle">
                    <div className="flex items-center gap-2">
                      <div className="w-full bg-st-bg h-2 rounded-full overflow-hidden border border-st-border/50">
                        <div 
                          className="bg-st-accent h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, row.porcentaje || 0)}%` }}
                        />
                      </div>
                      <span className="text-xs text-st-muted min-w-[40px] text-right">
                        {row.porcentaje}%
                      </span>
                    </div>
                  </td>
                  <td className="p-4 text-white font-semibold text-right font-mono">
                    {metric === 'consumo' ? `${row.valor.toLocaleString('es-PE', { minimumFractionDigits: 2 })} GB` : `$ ${row.valor.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`}
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-st-muted">No hay datos para mostrar en este período.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ClienteReportes;

