import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Plus,
  Edit2,
  Trash2,
  Database,
  Satellite,
  Radio,
  Users,
  Search,
  X,
  AlertTriangle
} from 'lucide-react';
import client from '../api/client';

type ActiveTab = 'cuentas' | 'dispositivos' | 'lineas' | 'usuarios';

const Maintenance: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Determine active tab based on pathname
  let activeTab: ActiveTab = 'cuentas';
  if (location.pathname.includes('/maintenance/devices')) {
    activeTab = 'dispositivos';
  } else if (location.pathname.includes('/maintenance/lines')) {
    activeTab = 'lineas';
  } else if (location.pathname.includes('/maintenance/users')) {
    activeTab = 'usuarios';
  }
  const [searchQuery, setSearchQuery] = useState('');
  
  // Data list states
  const [cuentas, setCuentas] = useState<any[]>([]);
  const [dispositivos, setDispositivos] = useState<any[]>([]);
  const [lineas, setLineas] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);

  // Dialog states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Form states
  const [cuentaForm, setCuentaForm] = useState({ numero_cuenta: '', nombre: '' });
  const [dispositivoForm, setDispositivoForm] = useState({ device_id: '', nombre: '', kit_starlink: 'Standard Rectangular' });
  const [lineaForm, setLineaForm] = useState({
    cuenta_id: '',
    dispositivo_id: '',
    numero_linea: '',
    nombre: '',
    subscription_id: '',
    id_producto: '',
    tipo_suscripcion: 'Standard',
    plan_contratado: 'Starlink Standard',
    es_plan_movil: false,
    estado_provisionamiento: 'active',
    permitir_excedentes_opt_in: false
  });
  const [userForm, setUserForm] = useState({ nombre: '', email: '', password: '' });

  // Combobox search states
  const [deviceSearchText, setDeviceSearchText] = useState('');
  const [accountSearchText, setAccountSearchText] = useState('');
  const [deviceDropdownOpen, setDeviceDropdownOpen] = useState(false);
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);

  const fetchData = async () => {
    try {
      if (activeTab === 'cuentas') {
        const res = await client.get('/cuentas');
        setCuentas(res.data);
      } else if (activeTab === 'dispositivos') {
        const res = await client.get('/dispositivos');
        setDispositivos(res.data);
      } else if (activeTab === 'lineas') {
        const res = await client.get('/lineas-servicio');
        setLineas(res.data);
        
        // Pre-fetch related listings for dropdowns
        const accs = await client.get('/cuentas');
        setCuentas(accs.data);
        const devs = await client.get('/dispositivos');
        setDispositivos(devs.data);
      } else if (activeTab === 'usuarios') {
        const res = await client.get('/usuarios');
        setUsuarios(res.data);
      }
    } catch (err) {}
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleOpenNew = () => {
    setEditingId(null);
    setCuentaForm({ numero_cuenta: '', nombre: '' });
    setDispositivoForm({ device_id: '', nombre: '', kit_starlink: 'Standard Rectangular' });
    setLineaForm({
      cuenta_id: '',
      dispositivo_id: '',
      numero_linea: '',
      nombre: '',
      subscription_id: '',
      id_producto: '',
      tipo_suscripcion: 'Standard',
      plan_contratado: 'Starlink Standard',
      es_plan_movil: false,
      estado_provisionamiento: 'active',
      permitir_excedentes_opt_in: false
    });
    setUserForm({ nombre: '', email: '', password: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingId(item.id);
    if (activeTab === 'cuentas') {
      setCuentaForm({ numero_cuenta: item.numero_cuenta, nombre: item.nombre });
    } else if (activeTab === 'dispositivos') {
      setDispositivoForm({ device_id: item.device_id, nombre: item.nombre || '', kit_starlink: item.kit_starlink || 'Standard Rectangular' });
    } else if (activeTab === 'lineas') {
      setLineaForm({
        cuenta_id: item.cuenta_id?.toString() || '',
        dispositivo_id: item.dispositivo_id?.toString() || '',
        numero_linea: item.numero_linea,
        nombre: item.nombre,
        subscription_id: item.subscription_id || '',
        id_producto: item.id_producto || '',
        tipo_suscripcion: item.tipo_suscripcion || 'Standard',
        plan_contratado: item.plan_contratado || 'Starlink Standard',
        es_plan_movil: item.es_plan_movil || false,
        estado_provisionamiento: item.estado_provisionamiento || 'active',
        permitir_excedentes_opt_in: item.permitir_excedentes_opt_in || false
      });
      // Setup initial names for type-to-search fields
      const matchingAcc = cuentas.find(c => c.id === item.cuenta_id);
      setAccountSearchText(matchingAcc ? matchingAcc.nombre : '');
      const matchingDev = dispositivos.find(d => d.id === item.dispositivo_id);
      setDeviceSearchText(matchingDev ? matchingDev.device_id : '');
    } else if (activeTab === 'usuarios') {
      setUserForm({ nombre: item.nombre, email: item.email, password: '' });
    }
    setIsModalOpen(true);
  };

  const handleDeletePrompt = (id: number) => {
    setDeletingId(id);
    setIsDeleteAlertOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (deletingId === null) return;
    try {
      let endpoint = '';
      if (activeTab === 'cuentas') endpoint = `/cuentas/${deletingId}`;
      else if (activeTab === 'dispositivos') endpoint = `/dispositivos/${deletingId}`;
      else if (activeTab === 'lineas') endpoint = `/lineas-servicio/${deletingId}`;
      
      if (endpoint) {
        await client.delete(endpoint);
        fetchData();
      }
    } catch (err) {}
    setIsDeleteAlertOpen(false);
    setDeletingId(null);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (activeTab === 'cuentas') {
        if (editingId) {
          await client.put(`/cuentas/${editingId}`, cuentaForm);
        } else {
          await client.post('/cuentas', cuentaForm);
        }
      } else if (activeTab === 'dispositivos') {
        if (editingId) {
          await client.put(`/dispositivos/${editingId}`, dispositivoForm);
        } else {
          await client.post('/dispositivos', dispositivoForm);
        }
      } else if (activeTab === 'lineas') {
        const payload = {
          ...lineaForm,
          cuenta_id: lineaForm.cuenta_id ? parseInt(lineaForm.cuenta_id) : null,
          dispositivo_id: lineaForm.dispositivo_id ? parseInt(lineaForm.dispositivo_id) : null
        };
        if (editingId) {
          await client.put(`/lineas-servicio/${editingId}`, payload);
        } else {
          await client.post('/lineas-servicio', payload);
        }
      } else if (activeTab === 'usuarios') {
        if (!editingId) {
          // Only create allowed for users in this demo screen
          await client.post('/auth/register', userForm);
        }
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) {}
  };

  // Filters listings locally
  const filteredCuentas = cuentas.filter(c => c.nombre.toLowerCase().includes(searchQuery.toLowerCase()) || c.numero_cuenta.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredDispositivos = dispositivos.filter(d => d.device_id.toLowerCase().includes(searchQuery.toLowerCase()) || (d.nombre || '').toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredLineas = lineas.filter(l => l.nombre.toLowerCase().includes(searchQuery.toLowerCase()) || l.numero_linea.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredUsuarios = usuarios.filter(u => u.nombre.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase()));

  // Dropdown list filters (combobox type-to-search)
  const filteredDevicesForSelect = dispositivos.filter(d => d.device_id.toLowerCase().includes(deviceSearchText.toLowerCase()) || (d.nombre || '').toLowerCase().includes(deviceSearchText.toLowerCase()));
  const filteredAccountsForSelect = cuentas.filter(c => c.nombre.toLowerCase().includes(accountSearchText.toLowerCase()) || c.numero_cuenta.toLowerCase().includes(accountSearchText.toLowerCase()));

  return (
    <div className="space-y-6">
      {/* Tab select bar */}
      <div className="flex bg-st-surface border border-st-border p-1.5 rounded-xl self-start max-w-2xl overflow-x-auto">
        <button
          onClick={() => { navigate('/maintenance/accounts'); setSearchQuery(''); }}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase rounded-lg cursor-pointer whitespace-nowrap transition-colors ${activeTab === 'cuentas' ? 'bg-white/10 text-white font-bold' : 'text-st-muted hover:text-white'}`}
        >
          <Database className="w-4 h-4 text-st-accent" />
          <span>Cuentas</span>
        </button>
        <button
          onClick={() => { navigate('/maintenance/devices'); setSearchQuery(''); }}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase rounded-lg cursor-pointer whitespace-nowrap transition-colors ${activeTab === 'dispositivos' ? 'bg-white/10 text-white font-bold' : 'text-st-muted hover:text-white'}`}
        >
          <Satellite className="w-4 h-4 text-[#D97706]" />
          <span>Dispositivos (UT)</span>
        </button>
        <button
          onClick={() => { navigate('/maintenance/lines'); setSearchQuery(''); }}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase rounded-lg cursor-pointer whitespace-nowrap transition-colors ${activeTab === 'lineas' ? 'bg-white/10 text-white font-bold' : 'text-st-muted hover:text-white'}`}
        >
          <Radio className="w-4 h-4 text-emerald-500" />
          <span>Líneas de Servicio</span>
        </button>
        <button
          onClick={() => { navigate('/maintenance/users'); setSearchQuery(''); }}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase rounded-lg cursor-pointer whitespace-nowrap transition-colors ${activeTab === 'usuarios' ? 'bg-white/10 text-white font-bold' : 'text-st-muted hover:text-white'}`}
        >
          <Users className="w-4 h-4 text-purple-500" />
          <span>Usuarios</span>
        </button>
      </div>

      {/* Toolbar / Actions */}
      <div className="bg-st-surface border border-st-border rounded-xl p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        {/* Left: search */}
        <div className="relative w-full max-w-xs">
          <Search className="w-4 h-4 text-st-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={`Filtrar ${activeTab}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-st-bg border border-st-border rounded-lg text-sm text-white placeholder-st-muted/50 focus:outline-none focus:ring-1 focus:ring-st-accent focus:border-st-accent"
          />
        </div>

        {/* Right: Add new button */}
        {activeTab !== 'usuarios' && (
          <button
            onClick={handleOpenNew}
            className="flex items-center gap-1.5 px-4 py-2 bg-st-primary text-black text-sm font-bold uppercase tracking-wider rounded-lg hover:bg-white/95 active:scale-[0.98] transition-all cursor-pointer w-full sm:w-auto justify-center"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Registro</span>
          </button>
        )}
      </div>

      {/* List Tables */}
      <div className="bg-st-surface border border-st-border rounded-xl p-5 overflow-x-auto">
        {/* Tab CUENTAS */}
        {activeTab === 'cuentas' && (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-st-border text-[10px] font-bold text-st-muted uppercase tracking-wider">
                <th className="py-3 px-4">Número de Cuenta</th>
                <th className="py-3 px-4">Nombre Cliente</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-st-border/30 text-sm">
              {filteredCuentas.length === 0 ? (
                <tr><td colSpan={3} className="py-8 text-center text-st-muted">Sin cuentas registradas.</td></tr>
              ) : (
                filteredCuentas.map(item => (
                  <tr key={item.id} className="hover:bg-white/[0.01] transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-white select-all">{item.numero_cuenta}</td>
                    <td className="py-3 px-4 text-white font-semibold">{item.nombre}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-3 text-st-muted">
                        <button onClick={() => handleOpenEdit(item)} className="hover:text-st-accent transition-colors"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDeletePrompt(item.id)} className="hover:text-[#EF4444] transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {/* Tab DISPOSITIVOS */}
        {activeTab === 'dispositivos' && (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-st-border text-[10px] font-bold text-st-muted uppercase tracking-wider">
                <th className="py-3 px-4">Dispositivo ID</th>
                <th className="py-3 px-4">Nombre Alias</th>
                <th className="py-3 px-4">Modelo Kit</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-st-border/30 text-sm">
              {filteredDispositivos.length === 0 ? (
                <tr><td colSpan={4} className="py-8 text-center text-st-muted">Sin dispositivos registrados.</td></tr>
              ) : (
                filteredDispositivos.map(item => (
                  <tr key={item.id} className="hover:bg-white/[0.01] transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-st-accent select-all">
                      <span onClick={() => navigate(`/maintenance/devices/${item.id}`)} className="cursor-pointer hover:underline">
                        {item.device_id}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-white font-semibold">{item.nombre || 'N/A'}</td>
                    <td className="py-3 px-4 text-st-muted">{item.kit_starlink || 'N/A'}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-3 text-st-muted">
                        <button onClick={() => navigate(`/maintenance/devices/${item.id}`)} className="hover:text-white transition-colors" title="Ver Ficha"><Search className="w-4 h-4" /></button>
                        <button onClick={() => handleOpenEdit(item)} className="hover:text-st-accent transition-colors" title="Editar"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDeletePrompt(item.id)} className="hover:text-[#EF4444] transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {/* Tab LINEAS */}
        {activeTab === 'lineas' && (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-st-border text-[10px] font-bold text-st-muted uppercase tracking-wider">
                <th className="py-3 px-4">Número Línea</th>
                <th className="py-3 px-4">Nombre Alias</th>
                <th className="py-3 px-4">Plan</th>
                <th className="py-3 px-4">Terminal Asignado</th>
                <th className="py-3 px-4">Cuenta Asignada</th>
                <th className="py-3 px-4">Excedentes</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-st-border/30 text-sm">
              {filteredLineas.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-st-muted">Sin líneas de servicio registradas.</td></tr>
              ) : (
                filteredLineas.map(item => (
                  <tr key={item.id} className="hover:bg-white/[0.01] transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-white select-all">{item.numero_linea}</td>
                    <td className="py-3 px-4 text-white font-semibold">{item.nombre}</td>
                    <td className="py-3 px-4 text-xs font-semibold">{item.plan_contratado || 'N/A'}</td>
                    <td className="py-3 px-4 font-mono text-st-accent">
                      {item.dispositivo ? (
                        <span onClick={() => navigate(`/maintenance/devices/${item.dispositivo.id}`)} className="cursor-pointer hover:underline">
                          {item.dispositivo.device_id}
                        </span>
                      ) : (
                        'Sin terminal'
                      )}
                    </td>
                    <td className="py-3 px-4 text-st-muted max-w-[120px] truncate">{item.cuenta?.nombre || 'Sin cuenta'}</td>
                    <td className="py-3 px-4 text-xs">
                      {item.permitir_excedentes_opt_in ? (
                        <span className="px-2 py-0.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded font-semibold">PERMITIDO</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-st-muted/15 text-st-muted border border-st-border rounded font-semibold">RESTRINGIDO</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-3 text-st-muted">
                        {item.dispositivo && (
                          <button onClick={() => navigate(`/maintenance/devices/${item.dispositivo.id}`)} className="hover:text-white transition-colors" title="Ver Ficha"><Search className="w-4 h-4" /></button>
                        )}
                        <button onClick={() => handleOpenEdit(item)} className="hover:text-st-accent transition-colors"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDeletePrompt(item.id)} className="hover:text-[#EF4444] transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {/* Tab USUARIOS */}
        {activeTab === 'usuarios' && (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-st-border text-[10px] font-bold text-st-muted uppercase tracking-wider">
                <th className="py-3 px-4">Nombre Completo</th>
                <th className="py-3 px-4">Correo Electrónico</th>
                <th className="py-3 px-4">Rol</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-st-border/30 text-sm">
              {filteredUsuarios.map(item => (
                <tr key={item.id} className="hover:bg-white/[0.01] transition-colors">
                  <td className="py-3 px-4 text-white font-semibold">{item.nombre}</td>
                  <td className="py-3 px-4 text-st-muted font-mono">{item.email}</td>
                  <td className="py-3 px-4 text-xs"><span className="px-2 py-0.5 bg-st-accent/15 text-st-accent border border-st-accent/30 rounded font-semibold">ADMINISTRADOR</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit / New Modal Dialog Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-40">
          <div className="w-full max-w-xl bg-st-surface border border-st-border rounded-xl shadow-2xl overflow-hidden glassmorphism flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-st-border">
              <h3 className="text-base font-bold text-white uppercase tracking-wider">
                {editingId ? 'Editar' : 'Crear Nuevo'} {activeTab === 'cuentas' ? 'Cuenta' : activeTab === 'dispositivos' ? 'Dispositivo' : activeTab === 'lineas' ? 'Línea de Servicio' : 'Usuario'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-st-muted hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 flex-1">
              {activeTab === 'cuentas' && (
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-st-muted uppercase tracking-wider mb-1.5">Número de Cuenta</label>
                    <input
                      type="text"
                      required
                      value={cuentaForm.numero_cuenta}
                      onChange={(e) => setCuentaForm({ ...cuentaForm, numero_cuenta: e.target.value })}
                      placeholder="AC-00000-X"
                      className="w-full px-3 py-2 bg-st-bg border border-st-border rounded-lg text-white placeholder-st-muted/30 focus:outline-none focus:ring-1 focus:ring-st-accent focus:border-st-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-st-muted uppercase tracking-wider mb-1.5">Nombre Cliente</label>
                    <input
                      type="text"
                      required
                      value={cuentaForm.nombre}
                      onChange={(e) => setCuentaForm({ ...cuentaForm, nombre: e.target.value })}
                      placeholder="Nombre de la empresa o cliente"
                      className="w-full px-3 py-2 bg-st-bg border border-st-border rounded-lg text-white placeholder-st-muted/30 focus:outline-none focus:ring-1 focus:ring-st-accent focus:border-st-accent"
                    />
                  </div>
                </div>
              )}

              {activeTab === 'dispositivos' && (
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-st-muted uppercase tracking-wider mb-1.5">Dispositivo ID (Starlink UT)</label>
                    <input
                      type="text"
                      required
                      value={dispositivoForm.device_id}
                      onChange={(e) => setDispositivoForm({ ...dispositivoForm, device_id: e.target.value })}
                      placeholder="ut000000"
                      className="w-full px-3 py-2 bg-st-bg border border-st-border rounded-lg text-white placeholder-st-muted/30 focus:outline-none focus:ring-1 focus:ring-st-accent focus:border-st-accent font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-st-muted uppercase tracking-wider mb-1.5">Nombre de Dispositivo</label>
                    <input
                      type="text"
                      value={dispositivoForm.nombre}
                      onChange={(e) => setDispositivoForm({ ...dispositivoForm, nombre: e.target.value })}
                      placeholder="Nombre representativo (ej: Antena Oficina Central)"
                      className="w-full px-3 py-2 bg-st-bg border border-st-border rounded-lg text-white placeholder-st-muted/30 focus:outline-none focus:ring-1 focus:ring-st-accent focus:border-st-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-st-muted uppercase tracking-wider mb-1.5">Modelo Kit Starlink</label>
                    <select
                      value={dispositivoForm.kit_starlink}
                      onChange={(e) => setDispositivoForm({ ...dispositivoForm, kit_starlink: e.target.value })}
                      className="w-full px-3 py-2.5 bg-st-bg border border-st-border rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-st-accent focus:border-st-accent"
                    >
                      <option value="Standard Rectangular">Standard Rectangular</option>
                      <option value="Flat High Performance">Flat High Performance</option>
                      <option value="Flat High Performance Maritime">Flat High Performance Maritime</option>
                      <option value="Mobile Standard">Mobile Standard</option>
                    </select>
                  </div>
                </div>
              )}

              {activeTab === 'lineas' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Account Advanced Combobox */}
                  <div className="relative">
                    <label className="block text-xs font-bold text-st-muted uppercase tracking-wider mb-1.5">Asociar Cuenta</label>
                    <div
                      onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}
                      className="w-full px-3 py-2 bg-st-bg border border-st-border rounded-lg text-white flex justify-between cursor-pointer min-h-[38px]"
                    >
                      <span>{accountSearchText || 'Ninguna seleccionada'}</span>
                      <span className="text-st-muted">▼</span>
                    </div>

                    {accountDropdownOpen && (
                      <div className="absolute left-0 mt-1 w-full bg-st-surface border border-st-border rounded-lg shadow-2xl z-50 p-2">
                        <input
                          type="text"
                          placeholder="Buscar cuenta..."
                          value={accountSearchText}
                          onChange={(e) => setAccountSearchText(e.target.value)}
                          className="w-full px-2 py-1.5 bg-st-bg border border-st-border rounded text-white text-xs mb-2 focus:outline-none"
                        />
                        <div className="max-h-36 overflow-y-auto space-y-1">
                          <div
                            onClick={() => { setLineaForm({ ...lineaForm, cuenta_id: '' }); setAccountSearchText(''); setAccountDropdownOpen(false); }}
                            className="px-2 py-1.5 hover:bg-white/5 text-xs text-st-muted cursor-pointer rounded"
                          >
                            - Desasociar Cuenta -
                          </div>
                          {filteredAccountsForSelect.map(acc => (
                            <div
                              key={`sel-acc-${acc.id}`}
                              onClick={() => { setLineaForm({ ...lineaForm, cuenta_id: acc.id.toString() }); setAccountSearchText(acc.nombre); setAccountDropdownOpen(false); }}
                              className="px-2 py-1.5 hover:bg-st-accent/20 hover:text-white text-xs text-white cursor-pointer rounded"
                            >
                              {acc.nombre} ({acc.numero_cuenta})
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Device Advanced Combobox */}
                  <div className="relative">
                    <label className="block text-xs font-bold text-st-muted uppercase tracking-wider mb-1.5">Asociar Terminal (UT)</label>
                    <div
                      onClick={() => setDeviceDropdownOpen(!deviceDropdownOpen)}
                      className="w-full px-3 py-2 bg-st-bg border border-st-border rounded-lg text-white flex justify-between cursor-pointer min-h-[38px]"
                    >
                      <span className="font-mono">{deviceSearchText || 'Ninguno seleccionado'}</span>
                      <span className="text-st-muted">▼</span>
                    </div>

                    {deviceDropdownOpen && (
                      <div className="absolute left-0 mt-1 w-full bg-st-surface border border-st-border rounded-lg shadow-2xl z-50 p-2">
                        <input
                          type="text"
                          placeholder="Buscar terminal..."
                          value={deviceSearchText}
                          onChange={(e) => setDeviceSearchText(e.target.value)}
                          className="w-full px-2 py-1.5 bg-st-bg border border-st-border rounded text-white text-xs mb-2 focus:outline-none"
                        />
                        <div className="max-h-36 overflow-y-auto space-y-1">
                          <div
                            onClick={() => { setLineaForm({ ...lineaForm, dispositivo_id: '' }); setDeviceSearchText(''); setDeviceDropdownOpen(false); }}
                            className="px-2 py-1.5 hover:bg-white/5 text-xs text-st-muted cursor-pointer rounded"
                          >
                            - Desasociar Terminal -
                          </div>
                          {filteredDevicesForSelect.map(d => (
                            <div
                              key={`sel-dev-${d.id}`}
                              onClick={() => { setLineaForm({ ...lineaForm, dispositivo_id: d.id.toString() }); setDeviceSearchText(d.device_id); setDeviceDropdownOpen(false); }}
                              className="px-2 py-1.5 hover:bg-st-accent/20 hover:text-white text-xs text-white cursor-pointer rounded font-mono"
                            >
                              {d.device_id} - {d.nombre || 'Terminal'}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-st-muted uppercase tracking-wider mb-1.5">Número de Línea</label>
                    <input
                      type="text"
                      required
                      value={lineaForm.numero_linea}
                      onChange={(e) => setLineaForm({ ...lineaForm, numero_linea: e.target.value })}
                      placeholder="L-000000-X"
                      className="w-full px-3 py-2 bg-st-bg border border-st-border rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-st-accent focus:border-st-accent"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-st-muted uppercase tracking-wider mb-1.5">Alias de Línea</label>
                    <input
                      type="text"
                      required
                      value={lineaForm.nombre}
                      onChange={(e) => setLineaForm({ ...lineaForm, nombre: e.target.value })}
                      placeholder="Nombre de la línea"
                      className="w-full px-3 py-2 bg-st-bg border border-st-border rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-st-accent focus:border-st-accent"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-st-muted uppercase tracking-wider mb-1.5">Subscription ID (Starlink API)</label>
                    <input
                      type="text"
                      value={lineaForm.subscription_id}
                      onChange={(e) => setLineaForm({ ...lineaForm, subscription_id: e.target.value })}
                      placeholder="sub_xxxxx"
                      className="w-full px-3 py-2 bg-st-bg border border-st-border rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-st-accent"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-st-muted uppercase tracking-wider mb-1.5">Plan Contratado</label>
                    <input
                      type="text"
                      value={lineaForm.plan_contratado}
                      onChange={(e) => setLineaForm({ ...lineaForm, plan_contratado: e.target.value })}
                      placeholder="Starlink Standard / Priority 1TB"
                      className="w-full px-3 py-2 bg-st-bg border border-st-border rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-st-accent"
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-4">
                    <input
                      type="checkbox"
                      id="es_plan_movil"
                      checked={lineaForm.es_plan_movil}
                      onChange={(e) => setLineaForm({ ...lineaForm, es_plan_movil: e.target.checked })}
                      className="w-4 h-4 accent-st-accent"
                    />
                    <label htmlFor="es_plan_movil" className="text-xs font-bold text-white uppercase tracking-wider cursor-pointer">¿Es plan móvil/itinerante?</label>
                  </div>

                  <div className="flex items-center gap-3 pt-4">
                    <input
                      type="checkbox"
                      id="permitir_excedentes_opt_in"
                      checked={lineaForm.permitir_excedentes_opt_in}
                      onChange={(e) => setLineaForm({ ...lineaForm, permitir_excedentes_opt_in: e.target.checked })}
                      className="w-4 h-4 accent-st-accent"
                    />
                    <label htmlFor="permitir_excedentes_opt_in" className="text-xs font-bold text-white uppercase tracking-wider cursor-pointer">¿Permitir excedentes (Opt-in)?</label>
                  </div>
                </div>
              )}

              {activeTab === 'usuarios' && (
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-st-muted uppercase tracking-wider mb-1.5">Nombre Completo</label>
                    <input
                      type="text"
                      required
                      value={userForm.nombre}
                      onChange={(e) => setUserForm({ ...userForm, nombre: e.target.value })}
                      placeholder="Nombre completo"
                      className="w-full px-3 py-2 bg-st-bg border border-st-border rounded-lg text-white focus:outline-none focus:ring-1"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-st-muted uppercase tracking-wider mb-1.5">Correo Electrónico</label>
                    <input
                      type="email"
                      required
                      value={userForm.email}
                      onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                      placeholder="correo@starlink.com"
                      className="w-full px-3 py-2 bg-st-bg border border-st-border rounded-lg text-white focus:outline-none focus:ring-1"
                    />
                  </div>
                  {!editingId && (
                    <div>
                      <label className="block text-xs font-bold text-st-muted uppercase tracking-wider mb-1.5">Contraseña</label>
                      <input
                        type="password"
                        required
                        value={userForm.password}
                        onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                        placeholder="Contraseña inicial"
                        className="w-full px-3 py-2 bg-st-bg border border-st-border rounded-lg text-white focus:outline-none focus:ring-1"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-6 border-t border-st-border mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-st-border text-st-muted text-sm font-bold uppercase rounded-lg hover:text-white transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-st-primary text-black text-sm font-bold uppercase rounded-lg hover:bg-white/90 active:scale-[0.98] transition-all cursor-pointer"
                >
                  {editingId ? 'Guardar Cambios' : 'Confirmar Registro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Destructive Confirmation Alert Modal */}
      {isDeleteAlertOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-40">
          <div className="w-full max-w-md bg-st-surface border border-st-border rounded-xl shadow-2xl p-6 glassmorphism">
            <div className="flex items-center gap-3 text-[#EF4444] mb-4">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
              <h3 className="text-base font-bold uppercase tracking-wider">Confirmar Eliminación</h3>
            </div>
            
            <p className="text-sm text-st-muted mb-6">
              ¿Estás seguro de que deseas eliminar este registro de la base de datos? Esta acción es destructiva y no se puede deshacer. Las relaciones asociadas también podrían verse afectadas.
            </p>
            
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setIsDeleteAlertOpen(false)}
                className="px-4 py-2 border border-st-border text-st-muted text-xs font-bold uppercase rounded-lg hover:text-white transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-5 py-2 bg-[#EF4444] text-white text-xs font-bold uppercase rounded-lg hover:bg-red-600 transition-colors active:scale-[0.98] transition-all cursor-pointer"
              >
                Eliminar Registro
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Maintenance;
