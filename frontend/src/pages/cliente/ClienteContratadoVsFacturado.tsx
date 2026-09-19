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
          <h1 className="text-2xl font-bold tracking-tight text-client-text-primary font-sans uppercase">Contratado vs Facturado</h1>
          <p className="text-xs text-client-text-secondary mt-0.5">Comparativa detallada entre montos base y facturación real por terminal.</p>
        </div>
        
        <div className="flex items-center gap-2 bg-client-bg-surface border border-client-border rounded-lg p-1.5">
          <div className="flex items-center pl-2 pr-1 border-r border-client-border">
            <Calendar className="w-4 h-4 text-client-primary" />
          </div>
          <select 
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="bg-transparent text-sm text-client-text-primary focus:outline-none px-2"
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
              <option key={m.val} value={m.val} className="bg-client-bg-surface">{m.label}</option>
            ))}

          </select>
          <select 
            value={selectedYear}
            onChange={e => setSelectedYear(e.target.value)}
            className="bg-transparent text-sm text-client-text-primary focus:outline-none px-2"
          >
            <option value="2025" className="bg-client-bg-surface">2025</option>
            <option value="2026" className="bg-client-bg-surface">2026</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-[#111111] border border-[#222222] rounded-[16px] p-5 min-h-[140px] shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div className="flex items-start justify-between mb-2">
            <div className="w-10 h-10 rounded-xl bg-[#00A8E8]/10 flex items-center justify-center text-[#00A8E8]">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-[13px] font-bold tracking-wide uppercase text-[#94A3B8]">Total Contratado</p>
            <p className="text-[32px] font-bold text-white font-mono leading-none mt-1.5">${totalContratado.toLocaleString('en-US', {minimumFractionDigits: 2})}</p>
            <p className="text-[13px] font-medium text-[#94A3B8] mt-1.5">Monto base según planes</p>
          </div>
        </div>

        <div className="bg-[#111111] border border-[#222222] rounded-[16px] p-5 min-h-[140px] shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div className="flex items-start justify-between mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-[#22C55E]">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-[13px] font-bold tracking-wide uppercase text-[#94A3B8]">Total Facturado</p>
            <p className="text-[32px] font-bold text-white font-mono leading-none mt-1.5">${totalFacturado.toLocaleString('en-US', {minimumFractionDigits: 2})}</p>
            <p className="text-[13px] font-medium text-[#94A3B8] mt-1.5">Monto real facturado en el mes</p>
          </div>
        </div>

        <div className="bg-[#111111] border border-[#222222] rounded-[16px] p-5 min-h-[140px] shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div className="flex items-start justify-between mb-2">
            <div className={`w-10 h-10 rounded-xl ${diferencia > 0 ? 'bg-red-500/10 text-[#EF4444]' : 'bg-emerald-500/10 text-[#22C55E]'} flex items-center justify-center`}>
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-[13px] font-bold tracking-wide uppercase text-[#94A3B8]">Diferencia (Excedentes)</p>
            <p className={`text-[32px] font-bold font-mono leading-none mt-1.5 ${diferencia > 0 ? 'text-[#F87171]' : 'text-white'}`}>
              ${diferencia.toLocaleString('en-US', {minimumFractionDigits: 2})}
            </p>
            <p className="text-[13px] font-medium text-[#94A3B8] mt-1.5">Consumo fuera de plan</p>
          </div>
        </div>
      </div>

      <div className="bg-[#111111] border border-[#222222] rounded-xl p-6 shadow-sm">
        <h2 className="text-[16px] font-bold text-white uppercase tracking-tight mb-6 flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#00A8E8]" /> Comparativa por Terminal
        </h2>
        <div className="h-80">
          {loading ? (
             <div className="flex h-full items-center justify-center">
               <Activity className="w-8 h-8 animate-spin text-[#00A8E8]" />
             </div>
          ) : data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="#222222" vertical={false} />
                <XAxis dataKey="terminal" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#111111', 
                    borderColor: '#222222', 
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.6)',
                    color: '#FFFFFF'
                  }}
                  itemStyle={{ fontSize: '13px', fontWeight: 'bold' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#94A3B8' }} />
                <Bar dataKey="contratado" name="Monto Contratado ($)" fill="#00A8E8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="facturado" name="Monto Facturado ($)" fill="#22C55E" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-[#94A3B8] text-sm">
              No hay datos para el periodo seleccionado.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClienteContratadoVsFacturado;
