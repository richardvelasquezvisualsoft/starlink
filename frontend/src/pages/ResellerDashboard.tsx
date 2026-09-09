import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Satellite, Activity, CreditCard, 
  AlertTriangle, ShieldAlert, Clock 
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line
} from 'recharts';
import client from '../api/client';

const formatGBtoTB = (gb: number | undefined | null) => {
  if (gb === undefined || gb === null) return '0 GB';
  if (gb < 1) return `${(gb * 1024).toFixed(1)} MB`;
  if (gb >= 1024) return `${(gb / 1024).toFixed(1)} TB`;
  return `${gb.toFixed(1)} GB`;
};

const ResellerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<any>(null);
  const [topClients, setTopClients] = useState<any[]>([]);
  const [portfolioTrend, setPortfolioTrend] = useState<any[]>([]);
  const [qualityTrend, setQualityTrend] = useState<any[]>([]);
  const [billingTrend, setBillingTrend] = useState<any[]>([]);
  const [criticalAlerts, setCriticalAlerts] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [provisioning, setProvisioning] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [
          sumRes, topRes, portRes, qualRes, billRes, alertRes, contRes, provRes
        ] = await Promise.all([
          client.get('/reseller/dashboard/summary'),
          client.get('/reseller/dashboard/top-clients'),
          client.get('/reseller/dashboard/portfolio-trend'),
          client.get('/reseller/dashboard/quality-trend'),
          client.get('/reseller/dashboard/billing-trend'),
          client.get('/reseller/dashboard/critical-alerts'),
          client.get('/reseller/dashboard/contracts-expiring'),
          client.get('/reseller/dashboard/provisioning-pending')
        ]);
        
        setSummary(sumRes.data);
        setTopClients(topRes.data);
        setPortfolioTrend(portRes.data);
        setQualityTrend(qualRes.data);
        setBillingTrend(billRes.data);
        setCriticalAlerts(alertRes.data);
        setContracts(contRes.data);
        setProvisioning(provRes.data);
      } catch (err) {
        console.error('Error fetching reseller dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading || !summary) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Activity className="w-10 h-10 text-st-accent animate-spin" />
      </div>
    );
  }

  const kpis = [
    {
      title: "Clientes Activos",
      value: summary.portafolio?.clientes_activos || 0,
      icon: Users,
      trend: "+1 cliente neto vs mes anterior"
    },
    {
      title: "Starlinks en Servicio",
      value: summary.portafolio?.starlinks_con_actividad || 0,
      icon: Satellite,
      trend: "Total de líneas con tráfico"
    },
    {
      title: "Calidad Global",
      value: summary.portafolio?.calidad_global_score || 0,
      icon: Activity,
      trend: summary.portafolio?.calidad_global_score >= 90 ? "EXCELENTE" : (summary.portafolio?.calidad_global_score >= 80 ? "BUENA" : "ATENCIÓN"),
      color: summary.portafolio?.calidad_global_score >= 90 ? "text-green-500" : "text-yellow-500"
    },
    {
      title: "Facturación Starlink",
      value: `USD ${summary.facturacion?.monto_facturado?.toLocaleString() || 0}`,
      icon: CreditCard,
      trend: `${summary.facturacion?.variacion_vs_anterior_pct > 0 ? '▲' : '▼'} ${Math.abs(summary.facturacion?.variacion_vs_anterior_pct || 0)}% vs mes anterior`
    },
    {
      title: "Alertas Graves",
      value: summary.alertas?.total_graves || 0,
      icon: AlertTriangle,
      trend: `${summary.alertas?.sin_reconocer || 0} sin reconocer`,
      color: summary.alertas?.total_graves > 0 ? "text-red-500" : "text-st-muted"
    },
    {
      title: "Riesgo Operativo",
      value: summary.riesgo?.offline || 0,
      icon: ShieldAlert,
      trend: `${summary.riesgo?.offline || 0} offline, ${summary.riesgo?.sin_telemetria || 0} sin telemetría`,
      color: summary.riesgo?.offline > 0 ? "text-yellow-500" : "text-st-muted"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans">Dashboard Reseller</h1>
          <p className="text-xs text-st-muted mt-0.5">Vista ejecutiva consolidada de clientes B2B.</p>
        </div>
      </div>

      {/* BLOQUE 1 - KPIs EJECUTIVOS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div key={idx} className="bg-st-surface border border-st-border rounded-xl p-4 flex flex-col justify-between hover:border-st-accent/40 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-bold text-st-muted uppercase">{kpi.title}</span>
                <Icon className={`w-4 h-4 ${kpi.color || 'text-st-accent'}`} />
              </div>
              <div>
                <span className={`text-2xl font-bold font-mono ${kpi.color || 'text-white'}`}>{kpi.value}</span>
                <p className="text-[10px] text-st-muted mt-1 leading-tight">{kpi.trend}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* BLOQUE 2 - EVOLUCIÓN, CALIDAD Y FACTURACIÓN */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-st-surface border border-st-border rounded-xl p-5 flex flex-col">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Evolución Cartera 12m</h2>
          <div className="flex-1 min-h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={portfolioTrend}>
                <defs>
                  <linearGradient id="colorClients" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00E5FF" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#00E5FF" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorStars" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ffffff" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#ffffff" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                <XAxis dataKey="periodo" stroke="#666" fontSize={10} tickMargin={10} />
                <YAxis yAxisId="left" stroke="#666" fontSize={10} />
                <YAxis yAxisId="right" orientation="right" stroke="#666" fontSize={10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area yAxisId="left" type="monotone" dataKey="clientes_activos" name="Clientes" stroke="#00E5FF" fillOpacity={1} fill="url(#colorClients)" strokeWidth={2} />
                <Area yAxisId="right" type="monotone" dataKey="starlinks_con_actividad" name="Starlinks" stroke="#ffffff" fillOpacity={1} fill="url(#colorStars)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-st-surface border border-st-border rounded-xl p-5">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Calidad de Servicio 12m</h2>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={qualityTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                <XAxis dataKey="periodo" stroke="#666" fontSize={10} tickMargin={10} />
                <YAxis domain={[80, 100]} stroke="#666" fontSize={10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: '8px' }}
                />
                <Line type="monotone" dataKey="calidad_global_score" name="Quality Score" stroke="#00E5FF" strokeWidth={3} dot={{r: 4, fill: '#00E5FF'}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-st-surface border border-st-border rounded-xl p-5">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Facturación Starlink 12m</h2>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={billingTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                <XAxis dataKey="periodo" stroke="#666" fontSize={10} tickMargin={10} />
                <YAxis stroke="#666" fontSize={10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: '8px' }}
                />
                <Bar dataKey="monto_facturado" name="Facturado" fill="#00E5FF" radius={[4, 4, 0, 0]} />
                <Bar dataKey="monto_pendiente" name="Pendiente" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* BLOQUE 3 - ALERTAS Y OPERACIONES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-2 bg-st-surface border border-st-border rounded-xl p-5">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            Alertas Críticas Recientes
          </h2>
          {criticalAlerts.length === 0 ? (
            <p className="text-st-muted text-sm italic">No hay alertas críticas pendientes.</p>
          ) : (
            <div className="space-y-3">
              {criticalAlerts.map((ca, idx) => (
                <div key={idx} className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5">
                  <div>
                    <p className="text-white text-sm font-medium">Tenant ID: {ca.tenant_id}</p>
                    <p className="text-xs text-st-muted mt-0.5">{ca.sin_reconocer} sin reconocer</p>
                  </div>
                  <div className="bg-red-500/20 text-red-400 px-3 py-1 rounded text-xs font-bold font-mono border border-red-500/30">
                    {ca.alertas_graves_pendientes} graves
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-st-surface border border-st-border rounded-xl p-5">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-yellow-500" />
            Contratos por Vencer
          </h2>
          {contracts.length === 0 ? (
            <p className="text-st-muted text-sm italic">No hay contratos próximos a vencer.</p>
          ) : (
            <div className="space-y-3">
              {contracts.slice(0, 4).map((ct, idx) => (
                <div key={idx} className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5">
                  <div className="flex-1 truncate pr-2">
                    <p className="text-white text-sm font-medium truncate">{ct.cliente}</p>
                    <p className="text-xs text-st-muted mt-0.5">{ct.fecha_fin}</p>
                  </div>
                  <div className="text-yellow-400 font-mono text-xs font-bold whitespace-nowrap">
                    {ct.dias_restantes} días
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-st-surface border border-st-border rounded-xl p-5">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <Satellite className="w-4 h-4 text-st-accent" />
            Provisioning
          </h2>
          {provisioning.length === 0 ? (
            <p className="text-st-muted text-sm italic">No hay aprovisionamientos pendientes.</p>
          ) : (
            <div className="space-y-3">
              {provisioning.slice(0, 4).map((pv, idx) => (
                <div key={idx} className="flex flex-col gap-1 bg-white/5 p-3 rounded-lg border border-white/5">
                  <div className="flex justify-between items-center">
                    <p className="text-white text-sm font-medium truncate pr-2">{pv.cliente}</p>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-st-accent/10 text-st-accent border border-st-accent/20">
                      {pv.estado}
                    </span>
                  </div>
                  {pv.mensaje_error && <p className="text-[10px] text-red-400">{pv.mensaje_error}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* BLOQUE 4 (AL FINAL) - TABLA TOP 10 DE EMPRESAS / CLIENTES */}
      <div className="bg-st-surface border border-st-border rounded-xl p-5">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Top 10 Empresas con Mayor Flota Starlink</h2>
            <p className="text-xs text-st-muted mt-0.5">Ranking de clientes por concentración de terminales y calidad de servicio.</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="text-st-muted border-b border-st-border">
                <th className="pb-3 font-semibold uppercase text-xs">#</th>
                <th className="pb-3 font-semibold uppercase text-xs">Empresa / Cliente</th>
                <th className="pb-3 font-semibold text-right uppercase text-xs">Starlinks</th>
                <th className="pb-3 font-semibold text-right uppercase text-xs">Consumo Total</th>
                <th className="pb-3 font-semibold text-right uppercase text-xs">Latencia Prom.</th>
                <th className="pb-3 font-semibold text-right uppercase text-xs">Pérdida Paquetes</th>
                <th className="pb-3 font-semibold text-right uppercase text-xs">Score Calidad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-st-border/50">
              {topClients.map((client, idx) => (
                <tr 
                  key={idx} 
                  className="hover:bg-white/5 cursor-pointer transition-colors"
                  onClick={() => navigate(`/reseller/clientes/${client.tenant_id}/dashboard`)}
                >
                  <td className="py-3 text-st-muted font-mono text-xs w-8">{idx + 1}</td>
                  <td className="py-3 text-white font-medium">{client.cliente}</td>
                  <td className="py-3 text-white font-mono text-right">{client.starlinks_con_actividad}</td>
                  <td className="py-3 text-white font-mono text-right" title={`${client.consumo_total_gb} GB`}>
                    {formatGBtoTB(client.consumo_total_gb)}
                  </td>
                  <td className="py-3 text-white font-mono text-right">{client.latencia_avg_ms} ms</td>
                  <td className="py-3 text-white font-mono text-right">{client.packet_loss_pct}%</td>
                  <td className="py-3 text-right">
                    <span className={`font-mono px-2 py-0.5 rounded text-xs font-bold ${
                      client.calidad_servicio_score >= 90 ? 'bg-green-500/20 text-green-400' :
                      client.calidad_servicio_score >= 80 ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {client.calidad_servicio_score}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ResellerDashboard;
