import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { 
  CreditCard, Calendar, Monitor, Filter, DollarSign, TrendingUp, AlertCircle, CheckCircle, XCircle, ShieldAlert,
  ChevronUp, ChevronDown, ArrowUpDown
} from 'lucide-react';
import client from '../api/client';

const availableDevices = [
  { id: 'all', name: 'Todos los dispositivos' },
];

const BillingReport: React.FC = () => {
  const [selectedYear, setSelectedYear] = useState('2026');
  const [selectedMonth, setSelectedMonth] = useState('08');
  const [selectedDevice, setSelectedDevice] = useState('all');
  
  const [validations, setValidations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [billingData, setBillingData] = useState<any[]>([]);
  const [sortBy, setSortBy] = useState<string>('fecha');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const isGlobal = window.location.pathname === '/reseller/facturacion';

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('desc');
    }
  };

  const sortedValidations = useMemo(() => {
    const list = [...validations];
    list.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      if (aVal === undefined || aVal === null) aVal = '';
      if (bVal === undefined || bVal === null) bVal = '';

      if (typeof aVal === 'string') {
        const comp = aVal.localeCompare(String(bVal));
        return sortDirection === 'asc' ? comp : -comp;
      }
      return sortDirection === 'asc' ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);
    });
    return list;
  }, [validations, sortBy, sortDirection]);

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

  useEffect(() => {
    if (isGlobal) {
      const fetchValidation = async () => {
        try {
          setLoading(true);
          const res = await client.get('/billing/validate-100-percent');
          setValidations(res.data);
        } catch (error) {
          console.error('Error fetching 100% rule validations:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchValidation();
    }
    const fetchBillingData = async () => {
      try {
        const url = `/billing/details?year=${selectedYear}&month=${selectedMonth}`;
        const res = await client.get(url);
        
        const mappedData = res.data.map((item: any) => ({
          mes: `${selectedYear}-${selectedMonth}`,
          contratado: item.mrc_usd || 250,
          pagado: item.total_usd || 250,
          excedentes: item.excedente_usd || 0,
          device: item.nombre || item.device_id
        }));
        setBillingData(mappedData);
      } catch (error) {
        setBillingData([]);
      }
    };
    fetchBillingData();
  }, [isGlobal, selectedYear, selectedMonth]);

  // Calculate totals
  const totalContratado = billingData.reduce((acc, curr) => acc + curr.contratado, 0);
  const totalPagado = billingData.reduce((acc, curr) => acc + curr.pagado, 0);
  const diferencia = totalPagado - totalContratado;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">{isGlobal ? 'Reporte de Facturación (Global)' : 'Reporte de Facturación'}</h1>
        <p className="text-sm text-st-muted">Análisis comparativo entre montos contratados y pagos reales.</p>
      </div>

      {isGlobal && (
        <div className="card border border-st-accent/30 shadow-lg shadow-st-accent/5">
          <div className="p-5 border-b border-white/10 bg-st-accent/5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-st-accent" /> Regla de Facturación al 100%
              </h2>
              <p className="text-xs text-st-muted mt-1">
                Valida que el monto facturado por Starlink coincida exactamente con la suma asignada a los clientes y consumo interno. Haz clic en las cabeceras para ordenar.
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-black/20 text-st-muted select-none">
                <tr>
                  <th onClick={() => handleSort('invoice_id_externo')} className="px-6 py-4 font-semibold tracking-wider cursor-pointer hover:text-white transition-colors group">
                    <div className="flex items-center gap-1.5">
                      <span>Factura Starlink</span>
                      {renderSortIcon('invoice_id_externo')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('fecha')} className="px-6 py-4 font-semibold tracking-wider cursor-pointer hover:text-white transition-colors group">
                    <div className="flex items-center gap-1.5">
                      <span>Fecha</span>
                      {renderSortIcon('fecha')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('monto_total_facturado')} className="px-6 py-4 font-semibold tracking-wider text-right cursor-pointer hover:text-white transition-colors group">
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Monto Starlink</span>
                      {renderSortIcon('monto_total_facturado')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('monto_total_asignado')} className="px-6 py-4 font-semibold tracking-wider text-right cursor-pointer hover:text-white transition-colors group">
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Monto Asignado (Clientes)</span>
                      {renderSortIcon('monto_total_asignado')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('diferencia')} className="px-6 py-4 font-semibold tracking-wider text-right cursor-pointer hover:text-white transition-colors group">
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Diferencia</span>
                      {renderSortIcon('diferencia')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('valido_100_porciento')} className="px-6 py-4 font-semibold tracking-wider text-center cursor-pointer hover:text-white transition-colors group">
                    <div className="flex items-center justify-center gap-1.5">
                      <span>Estado 100%</span>
                      {renderSortIcon('valido_100_porciento')}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-6 text-st-muted">Cargando...</td></tr>
                ) : sortedValidations.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-6 text-st-muted">No se encontraron facturas registradas.</td></tr>
                ) : (
                  sortedValidations.map((v) => (
                    <tr key={v.factura_id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 font-medium text-white">{v.invoice_id_externo}</td>
                      <td className="px-6 py-4 text-st-muted">{v.fecha}</td>
                      <td className="px-6 py-4 text-right font-medium text-white">${v.monto_total_facturado.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right text-st-muted">${v.monto_total_asignado.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right">
                        <span className={v.diferencia === 0 ? 'text-st-muted' : 'text-rose-500 font-bold'}>
                          ${v.diferencia.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {v.valido_100_porciento ? (
                          <span className="inline-flex items-center gap-1 text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full text-xs font-bold">
                            <CheckCircle className="w-3 h-3" /> CUADRADA
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-500 bg-rose-500/10 px-2 py-1 rounded-full text-xs font-bold">
                            <XCircle className="w-3 h-3" /> NO CUADRA
                          </span>
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

      {/* Filters */}
      <div className="bg-st-surface border border-st-border rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-2 text-st-accent font-semibold">
          <Filter className="w-5 h-5" />
          <span>Filtros:</span>
        </div>
        
        <div className="flex flex-wrap gap-4 flex-1 justify-end">
          {/* Year Filter */}
          <div className="flex items-center gap-2 bg-st-bg/50 border border-st-border rounded-lg px-3 py-1.5 focus-within:border-st-accent transition-colors">
            <Calendar className="w-4 h-4 text-st-muted" />
            <select 
              className="bg-transparent text-sm text-white outline-none cursor-pointer"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              <option value="2026" className="bg-st-surface text-white">2026</option>
              <option value="2025" className="bg-st-surface text-white">2025</option>
            </select>
          </div>

          {/* Month Filter */}
          <div className="flex items-center gap-2 bg-st-bg/50 border border-st-border rounded-lg px-3 py-1.5 focus-within:border-st-accent transition-colors">
            <Calendar className="w-4 h-4 text-st-muted" />
            <select 
              className="bg-transparent text-sm text-white outline-none cursor-pointer"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              <option value="all" className="bg-st-surface text-white">Todos los meses</option>
              {[
                { val: '01', label: 'Enero' },
                { val: '02', label: 'Febrero' },
                { val: '03', label: 'Marzo' },
                { val: '04', label: 'Abril' },
                { val: '05', label: 'Mayo' },
                { val: '06', label: 'Junio' },
                { val: '07', label: 'Julio' },
                { val: '08', label: 'Agosto' },
                { val: '09', label: 'Septiembre' },
                { val: '10', label: 'Octubre' },
                { val: '11', label: 'Noviembre' },
                { val: '12', label: 'Diciembre' },
              ].map(m => (
                <option key={m.val} value={m.val} className="bg-st-surface text-white">{m.label}</option>
              ))}

            </select>
          </div>

          {/* Device Filter */}
          <div className="flex items-center gap-2 bg-st-bg/50 border border-st-border rounded-lg px-3 py-1.5 focus-within:border-st-accent transition-colors">
            <Monitor className="w-4 h-4 text-st-muted" />
            <select 
              className="bg-transparent text-sm text-white outline-none cursor-pointer"
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
            >
              {availableDevices.map(device => (
                <option key={device.id} value={device.id} className="bg-st-surface text-white">
                  {device.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-st-surface border border-st-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-st-muted">Total Contratado (12m)</h3>
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <CreditCard className="w-5 h-5 text-blue-500" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white">${totalContratado.toLocaleString()}</p>
          <p className="text-xs text-st-muted mt-2">Suma de renta base de dispositivos</p>
        </div>

        <div className="bg-st-surface border border-st-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-st-muted">Total Pagado (12m)</h3>
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <DollarSign className="w-5 h-5 text-emerald-500" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white">${totalPagado.toLocaleString()}</p>
          <p className="text-xs text-st-muted mt-2">Incluye excesos y cargos adicionales</p>
        </div>

        <div className="bg-st-surface border border-st-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-st-muted">Diferencia por Excedentes</h3>
            <div className="p-2 bg-rose-500/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-rose-500" />
            </div>
          </div>
          <p className="text-3xl font-bold text-rose-500">+${diferencia.toLocaleString()}</p>
          <p className="text-xs text-st-muted mt-2 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {(diferencia / totalContratado * 100).toFixed(1)}% por encima del contrato
          </p>
        </div>
      </div>

      {/* Main Chart */}
      <div className="bg-st-surface border border-st-border rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-white mb-6">Comparativa Anual: Contratado vs Pagado</h2>
        {billingData.length === 0 ? (
          <div className="flex items-center justify-center h-[400px] text-st-muted text-sm border border-dashed border-st-border rounded-lg">
            No hay datos históricos registrados.
          </div>
        ) : (
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={billingData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis dataKey="month" stroke="#888" tickLine={false} axisLine={false} />
                <YAxis stroke="#888" tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1A1D24', borderColor: '#2A2E39', borderRadius: '8px' }}
                  itemStyle={{ color: '#E2E8F0' }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                />
                <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '12px', color: '#9CA3AF' }} />
                <Bar name="Monto Contratado" dataKey="contratado" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar name="Monto Pagado" dataKey="pagado" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

export default BillingReport;
