import React, { useState, useEffect } from 'react';
import { Terminal, Send, RefreshCw, Power, RotateCcw, Search, Activity, CheckCircle, XCircle } from 'lucide-react';
import client from '../../api/client';
import AlertPopup from '../../components/AlertPopup';

export const ClienteAccionesRemotas: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [devices, setDevices] = useState<any[]>([]);
  const [catalogo, setCatalogo] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDevice, setSelectedDevice] = useState<number | null>(null);
  const [selectedCommand, setSelectedCommand] = useState<number | null>(null);
  
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

  const handleExecute = async () => {
    if (!selectedDevice || !selectedCommand) return;
    
    setLoading(true);
    try {
      await client.post('/operation/execute', {
        dispositivo_id: selectedDevice,
        comando_id: selectedCommand,
        parametros: {}
      });
      setAlert({ isOpen: true, title: "Éxito", message: "Comando enviado correctamente.", type: "success" });
      setSelectedCommand(null);
      fetchData(); // Refresh history
    } catch (err) {
      setAlert({ isOpen: true, title: "Error", message: "No se pudo ejecutar el comando.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const filteredDevices = devices.filter(d => 
    d.device_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.nombre?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans uppercase">Acciones Remotas</h1>
          <p className="text-xs text-st-muted mt-0.5">Ejecuta comandos de diagnóstico y control en tus terminales.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-st-surface border border-st-border rounded-xl flex flex-col min-h-[400px] lg:col-span-2">
          <div className="p-4 border-b border-st-border">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-st-accent" /> Panel de Control
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-st-muted uppercase tracking-wider mb-2">1. Seleccionar Terminal</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-st-muted" />
                  <input
                    type="text"
                    placeholder="Buscar terminal..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-st-bg border border-st-border rounded-t-lg pl-9 pr-4 py-2 text-sm text-white focus:border-st-accent outline-none"
                  />
                </div>
                <div className="border border-t-0 border-st-border rounded-b-lg max-h-[200px] overflow-y-auto bg-st-bg">
                  {filteredDevices.map(d => (
                    <div 
                      key={d.id} 
                      onClick={() => setSelectedDevice(d.id)}
                      className={`p-2 px-3 text-sm cursor-pointer border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors ${selectedDevice === d.id ? 'bg-st-accent/20 border-l-2 border-l-st-accent text-white' : 'text-st-muted'}`}
                    >
                      <div className="font-bold">{d.nombre || d.device_id}</div>
                      <div className="text-[10px] opacity-70 font-mono">{d.device_id}</div>
                    </div>
                  ))}
                  {filteredDevices.length === 0 && <div className="p-4 text-center text-xs text-st-muted">No se encontraron terminales.</div>}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-st-muted uppercase tracking-wider mb-2">2. Seleccionar Comando</label>
                <div className="space-y-2 max-h-[240px] overflow-y-auto pr-2">
                  {catalogo.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCommand(c.id)}
                      disabled={!selectedDevice}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${!selectedDevice ? 'opacity-50 cursor-not-allowed border-st-border bg-st-bg' : selectedCommand === c.id ? 'border-st-accent bg-st-accent/10' : 'border-st-border bg-st-bg hover:border-white/20'}`}
                    >
                      <div className="flex items-center gap-2">
                        {c.comando.includes('REBOOT') ? <RotateCcw className={`w-4 h-4 ${selectedCommand === c.id ? 'text-st-accent' : 'text-st-muted'}`} /> : <Power className={`w-4 h-4 ${selectedCommand === c.id ? 'text-st-accent' : 'text-st-muted'}`} />}
                        <span className={`text-sm font-bold ${selectedCommand === c.id ? 'text-white' : 'text-st-muted'}`}>{c.nombre}</span>
                      </div>
                      <p className="text-[10px] text-st-muted mt-1 leading-tight">{c.descripcion}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end pt-4 border-t border-st-border">
              <button
                onClick={handleExecute}
                disabled={!selectedDevice || !selectedCommand || loading}
                className="flex items-center gap-2 px-6 py-2.5 bg-st-accent text-white rounded-lg text-sm font-bold shadow-[0_0_15px_rgba(59,130,246,0.5)] hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Activity className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Ejecutar Comando
              </button>
            </div>
          </div>
        </div>

        <div className="bg-st-surface border border-st-border rounded-xl flex flex-col h-[calc(100vh-12rem)]">
          <div className="p-4 border-b border-st-border flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-st-accent" /> Historial Reciente
            </h2>
          </div>
          <div className="flex-1 overflow-auto p-4 space-y-4">
             {loading && history.length === 0 ? (
                <div className="flex justify-center py-8"><Activity className="w-6 h-6 animate-spin text-st-accent" /></div>
             ) : history.length > 0 ? (
               history.map(h => (
                 <div key={h.id} className="p-3 bg-st-bg border border-st-border rounded-lg relative overflow-hidden">
                   <div className="absolute top-0 left-0 w-1 h-full bg-st-accent"></div>
                   <div className="flex items-start justify-between mb-2 pl-2">
                     <span className="font-bold text-xs text-white">{h.comando_nombre}</span>
                     {h.estado === 'PENDING' ? (
                       <span className="flex items-center gap-1 text-[9px] uppercase font-bold text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded"><Activity className="w-3 h-3 animate-pulse" /> Pendiente</span>
                     ) : h.estado === 'SUCCESS' ? (
                       <span className="flex items-center gap-1 text-[9px] uppercase font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded"><CheckCircle className="w-3 h-3" /> Exitoso</span>
                     ) : (
                       <span className="flex items-center gap-1 text-[9px] uppercase font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded"><XCircle className="w-3 h-3" /> Fallido</span>
                     )}
                   </div>
                   <div className="text-[10px] text-st-muted mb-1 pl-2">Terminal: <span className="text-white">{h.dispositivo_nombre || h.device_id}</span></div>
                   <div className="text-[10px] text-st-muted pl-2">{new Date(h.fecha_hora_envio).toLocaleString()}</div>
                 </div>
               ))
             ) : (
               <div className="text-center text-sm text-st-muted py-8">No hay comandos recientes.</div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClienteAccionesRemotas;
