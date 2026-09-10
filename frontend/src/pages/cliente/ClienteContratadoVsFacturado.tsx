import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { CreditCard, Calendar, Filter, DollarSign, Activity } from 'lucide-react';
import client from '../../api/client';

export const ClienteContratadoVsFacturado: React.FC = () => {
  const [selectedYear, setSelectedYear] = useState('2026');
  const [selectedMonth, setSelectedMonth] = useState('08');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const url = `/billing/details?year=${selectedYear}&month=${selectedMonth}`;
        const res = await client.get(url);
        
        const mappedData = res.data.map((item: any) => ({
          terminal: item.nombre || item.device_id,
          contratado: item.mrc_usd || 250,
          facturado: item.total_usd || 250,
          diferencia: (item.total_usd || 250) - (item.mrc_usd || 250)
        }));
        
        setData(mappedData);
      } catch (error) {
        console.error(error);
        setData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedYear, selectedMonth]);

  const totalContratado = data.reduce((acc, curr) => acc + curr.contratado, 0);
  const totalFacturado = data.reduce((acc, curr) => acc + curr.facturado, 0);
  const diferencia = totalFacturado - totalContratado;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans uppercase">Contratado vs Facturado</h1>
          <p className="text-xs text-st-muted mt-0.5">Comparativa detallada entre montos base y facturación real por terminal.</p>
        </div>
        
        <div className="flex items-center gap-2 bg-st-surface border border-st-border rounded-lg p-1.5">
          <div className="flex items-center pl-2 pr-1 border-r border-st-border">
            <Calendar className="w-4 h-4 text-st-accent" />
          </div>
          <select 
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="bg-transparent text-sm text-white focus:outline-none px-2"
          >
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
              <option key={m.val} value={m.val} className="bg-st-surface">{m.label}</option>
            ))}

          </select>
          <select 
            value={selectedYear}
            onChange={e => setSelectedYear(e.target.value)}
            className="bg-transparent text-sm text-white focus:outline-none px-2"
          >
            <option value="2025" className="bg-st-surface">2025</option>
            <option value="2026" className="bg-st-surface">2026</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-st-surface border border-st-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-st-muted uppercase tracking-wider">Total Contratado</span>
            <CreditCard className="w-5 h-5 text-st-accent" />
          </div>
          <div className="text-3xl font-bold text-white font-mono">${totalContratado.toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
          <p className="text-xs text-st-muted mt-2">Monto base según planes</p>
        </div>

        <div className="bg-st-surface border border-st-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-st-muted uppercase tracking-wider">Total Facturado</span>
            <DollarSign className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-3xl font-bold text-white font-mono">${totalFacturado.toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
          <p className="text-xs text-st-muted mt-2">Monto real facturado en el mes</p>
        </div>

        <div className="bg-st-surface border border-st-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-st-muted uppercase tracking-wider">Diferencia (Excedentes)</span>
            <Activity className="w-5 h-5 text-red-400" />
          </div>
          <div className="text-3xl font-bold text-white font-mono">${diferencia.toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
          <p className="text-xs text-st-muted mt-2">Consumo fuera de plan</p>
        </div>
      </div>

      <div className="bg-st-surface border border-st-border rounded-xl p-6">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-6 flex items-center gap-2">
          <Filter className="w-4 h-4 text-st-accent" /> Comparativa por Terminal
        </h2>
        <div className="h-80">
          {loading ? (
             <div className="flex h-full items-center justify-center">
               <Activity className="w-8 h-8 animate-spin text-st-accent" />
             </div>
          ) : data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="terminal" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="contratado" name="Monto Contratado ($)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="facturado" name="Monto Facturado ($)" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-st-muted text-sm">
              No hay datos para el periodo seleccionado.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClienteContratadoVsFacturado;
