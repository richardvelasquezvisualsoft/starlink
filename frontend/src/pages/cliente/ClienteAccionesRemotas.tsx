import React, { useState, useEffect, useMemo } from 'react';
import { Terminal, Send, RefreshCw, Power, RotateCcw, Search, Activity, CheckCircle, XCircle } from 'lucide-react';
import client from '../../api/client';
import AlertPopup from '../../components/AlertPopup';

export const ClienteAccionesRemotas: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [devices, setDevices] = useState<any[]>([]);
  const [catalogo, setCatalogo] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterN1, setFilterN1] = useState('');
  const [filterN2, setFilterN2] = useState('');
  const [filterN3, setFilterN3] = useState('');
  const [filterCC, setFilterCC] = useState('');
  
  const [selectedDevice, setSelectedDevice] = useState<number | null>(null);
  
  const [alert, setAlert] = useState<{isOpen: boolean, title: string, message: string, type: "info" | "warning" | "error" | "success"}>({
    isOpen: false, title: "", message: "", type: "info"
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [devRes, catRes, histRes] = await Promise.all([
        client.get('/operation/devices'),
        client.get('/operation/commands'),
        client.get('/operation/history')
      ]);
      setDevices(devRes.data || []);
      setCatalogo(catRes.data || []);
      setHistory(histRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleExecute = async (comando_id: number) => {
    if (!selectedDevice) return;
    
    setLoading(true);
    try {
      await client.post('/operation/execute', {
        dispositivo_id: selectedDevice,
        comando_id: comando_id,
        parametros: {}
      });
      setAlert({ isOpen: true, title: "Éxito", message: "Comando enviado correctamente.", type: "success" });
      fetchData(); // Refresh history
    } catch (err) {
      setAlert({ isOpen: true, title: "Error", message: "No se pudo ejecutar el comando.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // Derive filter options
  const n1Options = useMemo(() => Array.from(new Set(devices.map(d => d.nivel1).filter(v => v && v !== '-'))), [devices]);
  const n2Options = useMemo(() => Array.from(new Set(devices.map(d => d.nivel2).filter(v => v && v !== '-'))), [devices]);
  const n3Options = useMemo(() => Array.from(new Set(devices.map(d => d.nivel3).filter(v => v && v !== '-'))), [devices]);
  const ccOptions = useMemo(() => Array.from(new Set(devices.map(d => d.centro_costo).filter(v => v && v !== '-'))), [devices]);

  const filteredDevices = devices.filter(d => {
    const mSearch = searchQuery === '' || d.device_id.toLowerCase().includes(searchQuery.toLowerCase()) || d.nombre?.toLowerCase().includes(searchQuery.toLowerCase());
    const mN1 = filterN1 === '' || d.nivel1 === filterN1;
    const mN2 = filterN2 === '' || d.nivel2 === filterN2;
    const mN3 = filterN3 === '' || d.nivel3 === filterN3;
    const mCC = filterCC === '' || d.centro_costo === filterCC;
    return mSearch && mN1 && mN2 && mN3 && mCC;
  });

  return (
    <div className="space-y-6">
      <AlertPopup 
        isOpen={alert.isOpen} 
        title={alert.title} 
        message={alert.message} 
        type={alert.type} 
        onClose={() => setAlert(prev => ({...prev, isOpen: false}))} 
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-st-primary font-sans leading-tight">Acciones Remotas</h1>
          <p className="text-[14px] font-medium text-client-text-secondary mt-0.5">Ejecuta comandos de diagnóstico y control en tus terminales.</p>
        </div>
        <button onClick={fetchData} disabled={loading} className="flex items-center gap-2 px-3 py-1.5 border border-client-border rounded-lg text-xs font-semibold text-client-text-secondary hover:text-client-text-primary transition-colors">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refrescar
        </button>
      </div>

      {/* Advanced Filters */}
      <div className="bg-client-bg-surface border border-client-border rounded-[16px] p-4 shadow-sm">
        <h2 className="text-sm font-bold text-client-text-primary uppercase tracking-wider mb-4 flex items-center gap-2">
          <Search className="w-4 h-4 text-client-accent" /> Búsqueda y Filtros
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-client-text-secondary" />
             <input
               type="text"
               placeholder="Buscar por terminal o nombre..."
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="w-full bg-client-bg-subtle border border-client-border rounded-xl pl-9 pr-4 py-2 text-xs text-client-text-primary focus:outline-none focus:border-client-primary transition-all"
             />
          </div>
          <select value={filterN1} onChange={e => setFilterN1(e.target.value)} className="bg-client-bg-subtle border border-client-border rounded-xl px-3 py-2 text-xs text-client-text-primary focus:outline-none focus:border-client-primary cursor-pointer">
            <option value="">Todos los Nivel 1</option>
            {n1Options.map(o => <option key={o as string} value={o as string}>{o as string}</option>)}
          </select>
          <select value={filterN2} onChange={e => setFilterN2(e.target.value)} className="bg-client-bg-subtle border border-client-border rounded-xl px-3 py-2 text-xs text-client-text-primary focus:outline-none focus:border-client-primary cursor-pointer">
            <option value="">Todos los Nivel 2</option>
            {n2Options.map(o => <option key={o as string} value={o as string}>{o as string}</option>)}
          </select>
          <select value={filterN3} onChange={e => setFilterN3(e.target.value)} className="bg-client-bg-subtle border border-client-border rounded-xl px-3 py-2 text-xs text-client-text-primary focus:outline-none focus:border-client-primary cursor-pointer">
            <option value="">Todos los Nivel 3</option>
            {n3Options.map(o => <option key={o as string} value={o as string}>{o as string}</option>)}
          </select>
          <select value={filterCC} onChange={e => setFilterCC(e.target.value)} className="bg-client-bg-subtle border border-client-border rounded-xl px-3 py-2 text-xs text-client-text-primary focus:outline-none focus:border-client-primary cursor-pointer">
            <option value="">Todos los Centros Costo</option>
            {ccOptions.map(o => <option key={o as string} value={o as string}>{o as string}</option>)}
          </select>
        </div>
      </div>

      {/* Main Terminal Table & Actions */}
      <div className="bg-client-bg-surface border border-client-border rounded-[16px] shadow-sm flex flex-col">
        <div className="p-4 border-b border-client-border">
          <h2 className="text-sm font-bold text-client-text-primary uppercase tracking-wider flex items-center gap-2">
            <Terminal className="w-4 h-4 text-client-accent" /> 1. Seleccionar Terminal
          </h2>
        </div>
        <div className="overflow-x-auto border-b border-client-border max-h-[400px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-client-bg-surface border-b border-client-border z-10">
              <tr className="text-client-text-secondary uppercase tracking-wider font-bold">
                <th className="py-3 px-4 w-12 text-center">Sel</th>
                <th className="py-3 px-4">Terminal / Nombre</th>
                <th className="py-3 px-4">Nivel 1</th>
                <th className="py-3 px-4">Nivel 2</th>
                <th className="py-3 px-4">Nivel 3</th>
                <th className="py-3 px-4">Centro Costo</th>
                <th className="py-3 px-4">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-client-border">
              {filteredDevices.map(d => (
                <tr 
                  key={d.id} 
                  onClick={() => setSelectedDevice(d.id)}
                  className={`cursor-pointer transition-colors hover:bg-client-bg-soft ${selectedDevice === d.id ? 'bg-client-primary-soft' : ''}`}
                >
                  <td className="py-3 px-4 text-center">
                    <input type="radio" readOnly checked={selectedDevice === d.id} className="cursor-pointer" />
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-client-text-primary">{d.nombre || d.device_id}</div>
                    <div className="text-[10px] font-mono text-client-text-secondary">{d.device_id}</div>
                  </td>
                  <td className="py-3 px-4 text-client-text-secondary">{d.nivel1 || '-'}</td>
                  <td className="py-3 px-4 text-client-text-secondary">{d.nivel2 || '-'}</td>
                  <td className="py-3 px-4 text-client-text-secondary">{d.nivel3 || '-'}</td>
                  <td className="py-3 px-4 text-client-text-secondary">{d.centro_costo || '-'}</td>
                  <td className="py-3 px-4">
                    {d.estado === 'OPERATIVO' ? (
                      <span className="text-[10px] uppercase font-bold text-client-success bg-client-success-soft px-2 py-1 rounded-md">Online</span>
                    ) : (
                      <span className="text-[10px] uppercase font-bold text-client-danger bg-client-danger-soft px-2 py-1 rounded-md">Offline</span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredDevices.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-client-text-secondary text-sm">No se encontraron equipos.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Commands Action Bar at the bottom */}
        <div className="p-4 bg-client-bg-subtle rounded-b-[16px]">
          <h2 className="text-sm font-bold text-client-text-primary uppercase tracking-wider mb-4 flex items-center gap-2">
            <Send className="w-4 h-4 text-client-accent" /> 2. Ejecutar Comando Remoto
          </h2>
          <div className="flex flex-wrap gap-3">
            {catalogo.map(c => (
              <button
                key={c.id}
                onClick={() => handleExecute(c.id)}
                disabled={!selectedDevice || loading}
                className="flex flex-1 min-w-[200px] items-center justify-center gap-2 px-5 py-3 border border-client-border rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:border-client-primary hover:bg-client-primary-soft bg-client-bg-surface text-client-text-primary"
              >
                {c.comando.includes('REBOOT') ? <RotateCcw className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                {c.nombre}
              </button>
            ))}
            {catalogo.length === 0 && (
              <div className="text-xs text-client-text-secondary py-2 w-full text-center">No hay comandos disponibles en el catálogo.</div>
            )}
          </div>
        </div>
      </div>

      {/* History */}
      <div className="bg-client-bg-surface border border-client-border rounded-[16px] shadow-sm">
        <div className="p-4 border-b border-client-border">
          <h2 className="text-sm font-bold text-client-text-primary uppercase tracking-wider flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-client-primary" /> Historial Reciente
          </h2>
        </div>
        <div className="overflow-x-auto p-4 max-h-[300px]">
          {loading && history.length === 0 ? (
            <div className="flex justify-center py-4"><Activity className="w-6 h-6 animate-spin text-client-primary" /></div>
          ) : history.length > 0 ? (
            <table className="w-full text-left text-xs border-collapse">
               <thead>
                 <tr className="text-client-text-secondary uppercase tracking-wider font-bold border-b border-client-border">
                   <th className="py-2 px-2">Fecha</th>
                   <th className="py-2 px-2">Terminal</th>
                   <th className="py-2 px-2">Comando</th>
                   <th className="py-2 px-2">Estado</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-client-border">
                  {history.map(h => (
                    <tr key={h.id} className="hover:bg-client-bg-soft transition-colors">
                      <td className="py-2 px-2 text-client-text-secondary">{new Date(h.fecha_hora_envio).toLocaleString()}</td>
                      <td className="py-2 px-2 font-medium text-client-text-primary">{h.dispositivo_nombre || h.device_id}</td>
                      <td className="py-2 px-2 text-client-text-secondary font-bold">{h.comando_nombre}</td>
                      <td className="py-2 px-2">
                        {h.estado === 'PENDIENTE' || h.estado === 'EJECUTANDO' ? (
                           <span className="flex items-center w-fit gap-1 text-[9px] uppercase font-bold text-client-warning bg-client-warning-soft px-1.5 py-0.5 rounded-[6px]"><Activity className="w-3 h-3 animate-pulse" /> Pendiente</span>
                         ) : h.estado === 'COMPLETADO' ? (
                           <span className="flex items-center w-fit gap-1 text-[9px] uppercase font-bold text-client-success bg-client-success-soft px-1.5 py-0.5 rounded-[6px]"><CheckCircle className="w-3 h-3" /> Exitoso</span>
                         ) : (
                           <span className="flex items-center w-fit gap-1 text-[9px] uppercase font-bold text-client-danger bg-client-danger-soft px-1.5 py-0.5 rounded-[6px]"><XCircle className="w-3 h-3" /> Fallido</span>
                         )}
                      </td>
                    </tr>
                  ))}
               </tbody>
            </table>
          ) : (
            <div className="text-center text-sm text-client-text-secondary py-4">No hay comandos recientes.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClienteAccionesRemotas;
