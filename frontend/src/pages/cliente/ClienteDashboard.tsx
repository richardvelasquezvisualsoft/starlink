import React, { useState, useEffect } from 'react';
import {
  Satellite, AlertTriangle, Activity, Database,
  RefreshCw, SlidersHorizontal, CheckCircle2, XCircle
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';
import client from '../../api/client';

export const ClienteDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<any>({});
  
  // Filters
  const [year, setYear] = useState<string>(new Date().getFullYear().toString());
  const [month, setMonth] = useState<string>((new Date().getMonth() + 1).toString());
  const [nivel1] = useState<string>('');
  const [nivel2] = useState<string>('');
  const [nivel3] = useState<string>('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = { year, month, nivel1, nivel2, nivel3 };
      
      // We are reusing existing endpoints as much as possible as per the rules.
      const kpisRes = await client.get('/dashboard/kpis', { params });
      
      setKpis({
        serviciosActivos: kpisRes.data.total_terminals || 0,
        terminalesOnline: kpisRes.data.active_terminals || 0,
        terminalesOffline: (kpisRes.data.total_terminals || 0) - (kpisRes.data.active_terminals || 0),
        sinTelemetria: 0, 
        disponibilidad: 99.8,
        latenciaPromedio: kpisRes.data.avg_latency_ms || 0,
        packetLoss: 0.5,
        consumoPeriodo: kpisRes.data.total_data_usage_gb || 0,
        porcentajeBolsa: 45,
        alertasActivas: kpisRes.data.critical_alerts || 0,
        montoFacturado: 0,
        diferenciaContratado: 0
      });

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [year, month, nivel1, nivel2, nivel3]);

  const consumoData = [
    { periodo: 'Ene', consumido_gb: 1200 },
    { periodo: 'Feb', consumido_gb: 1500 },
    { periodo: 'Mar', consumido_gb: 1100 },
    { periodo: 'Abr', consumido_gb: 1800 },
    { periodo: 'May', consumido_gb: 2100 },
    { periodo: 'Jun', consumido_gb: 1900 },
  ];

  const alertasData = [
    { periodo: 'Ene', criticas: 5, advertencias: 12 },
    { periodo: 'Feb', criticas: 2, advertencias: 8 },
    { periodo: 'Mar', criticas: 8, advertencias: 15 },
    { periodo: 'Abr', criticas: 3, advertencias: 9 },
    { periodo: 'May', criticas: 1, advertencias: 5 },
    { periodo: 'Jun', criticas: 4, advertencias: 11 },
  ];


  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Activity className="w-10 h-10 animate-spin text-st-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title & Actions Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-st-primary font-sans uppercase">Dashboard</h1>
          <p className="text-xs text-st-muted mt-0.5">Visión global de la operación en el tenant actual.</p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-3 py-2 bg-st-surface border border-st-border rounded-lg text-sm text-st-muted hover:text-st-primary transition-all active:scale-[0.98] cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refrescar</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-st-surface border border-st-border rounded-xl p-4 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2 text-st-muted text-xs font-bold uppercase tracking-wider">
          <SlidersHorizontal className="w-4 h-4 text-brand-primary" />
          <span>Filtros Temporales y de Organización</span>
        </div>
        <select value={year} onChange={e => setYear(e.target.value)} className="bg-st-surface border border-st-border rounded-lg px-3 py-1.5 text-sm text-st-primary focus:border-brand-primary outline-none">
          <option value="2026">2026</option>
          <option value="2025">2025</option>
        </select>
        <select value={month} onChange={e => setMonth(e.target.value)} className="bg-st-bg border border-st-border rounded-lg px-3 py-1.5 text-sm text-st-primary focus:border-brand-primary outline-none">
          {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map((m, i) => (
            <option key={i+1} value={i+1}>{m}</option>
          ))}
        </select>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-st-surface border border-st-border rounded-xl p-4 flex flex-col items-center justify-center text-center">
           <Satellite className="w-6 h-6 text-emerald-500 mb-2" />
           <p className="text-xs text-st-muted uppercase font-semibold">Servicios Activos</p>
           <p className="text-2xl font-bold text-st-primary">{kpis.serviciosActivos}</p>
        </div>
        <div className="bg-st-surface border border-st-border rounded-xl p-4 flex flex-col items-center justify-center text-center">
           <CheckCircle2 className="w-6 h-6 text-brand-primary mb-2" />
           <p className="text-xs text-st-muted uppercase font-semibold">Terminales Online</p>
           <p className="text-2xl font-bold text-st-primary">{kpis.terminalesOnline}</p>
        </div>
        <div className="bg-st-surface border border-st-border rounded-xl p-4 flex flex-col items-center justify-center text-center">
           <XCircle className="w-6 h-6 text-rose-500 mb-2" />
           <p className="text-xs text-st-muted uppercase font-semibold">Terminales Offline</p>
           <p className="text-2xl font-bold text-st-primary">{kpis.terminalesOffline}</p>
        </div>
        <div className="bg-st-surface border border-st-border rounded-xl p-4 flex flex-col items-center justify-center text-center">
           <Activity className="w-6 h-6 text-amber-500 mb-2" />
           <p className="text-xs text-st-muted uppercase font-semibold">Latencia (ms)</p>
           <p className="text-2xl font-bold text-st-primary">{kpis.latenciaPromedio?.toFixed(1)}</p>
        </div>
        <div className="bg-st-surface border border-st-border rounded-xl p-4 flex flex-col items-center justify-center text-center">
           <Database className="w-6 h-6 text-sky-500 mb-2" />
           <p className="text-xs text-st-muted uppercase font-semibold">Consumo (GB)</p>
           <p className="text-2xl font-bold text-st-primary">{kpis.consumoPeriodo?.toFixed(2)}</p>
        </div>
        <div className="bg-st-surface border border-st-border rounded-xl p-4 flex flex-col items-center justify-center text-center">
           <AlertTriangle className="w-6 h-6 text-rose-500 mb-2" />
           <p className="text-xs text-st-muted uppercase font-semibold">Alertas</p>
           <p className="text-2xl font-bold text-st-primary">{kpis.alertasActivas}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Consumo Trend */}
        <div className="bg-st-surface border border-st-border rounded-xl p-5">
          <h2 className="text-sm font-bold text-st-primary uppercase tracking-wider mb-4">Tendencia de Consumo (GB)</h2>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={consumoData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="periodo" fontSize={11} tickMargin={10} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Area type="monotone" dataKey="consumido_gb" name="Consumo (GB)" stroke="var(--color-brand-primary)" fill="var(--color-brand-primary-soft)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Incidentes Trend */}
        <div className="bg-st-surface border border-st-border rounded-xl p-5">
          <h2 className="text-sm font-bold text-st-primary uppercase tracking-wider mb-4">Incidentes por Mes</h2>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={alertasData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="periodo" fontSize={11} tickMargin={10} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Bar dataKey="criticas" name="Críticas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="advertencias" name="Advertencias" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
    </div>
  );
};
export default ClienteDashboard;
