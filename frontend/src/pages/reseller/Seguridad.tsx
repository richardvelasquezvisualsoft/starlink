import { useState, useEffect } from 'react';
import { Shield, Lock, Save, Settings, Search, AlertTriangle, Key, Activity, Clock, Server, CheckCircle2, XCircle } from 'lucide-react';
import client from '../../api/client';

export default function Seguridad() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [globalPolicy, setGlobalPolicy] = useState<any>(null);
  const [tenantPolicies, setTenantPolicies] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'global' | 'clientes'>('global');
  
  // Modal / Drawer state
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalPolicy, setModalPolicy] = useState<any>(null);
  const [modalPolicyType, setModalPolicyType] = useState<'global' | 'personalizada'>('global');

  // Filters for Tenants
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterMfa, setFilterMfa] = useState('all');

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [polRes, tenRes] = await Promise.all([
        client.get('/seguridad/politicas'),
        client.get('/seguridad/politicas/tenants')
      ]);

      const politicas = polRes.data;
      setGlobalPolicy(politicas.find((p: any) => p.tenant_id === null) || {
        longitud_minima_password: 12,
        longitud_maxima_password: 128,
        cantidad_passwords_historial: 5,
        max_intentos_fallidos: 5,
        minutos_bloqueo: 15,
        mfa_obligatorio_reseller: false,
        mfa_obligatorio_cliente: false,
        duracion_token_reset_minutos: 60,
        requerir_email_recuperacion_verificado: false,
        timeout_inactividad_minutos: 30,
        duracion_maxima_sesion_horas: 24,
        validar_password_comprometido: false
      });
      setTenantPolicies(tenRes.data);
    } catch (err: any) {
      console.error(err);
      if (err.response?.status === 403) {
        setError('Acceso denegado. No tiene permisos para ver esta información.');
      } else {
        setError('Error al cargar datos de seguridad. Verifique su conexión y permisos.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGlobal = async () => {
    if (!globalPolicy) return;
    
    // Validations
    if (globalPolicy.longitud_minima_password > globalPolicy.longitud_maxima_password) {
      alert('La longitud mínima no puede ser mayor a la máxima'); return;
    }
    if (globalPolicy.longitud_minima_password <= 0 || globalPolicy.longitud_maxima_password <= 0 || globalPolicy.cantidad_passwords_historial < 0) {
      alert('Valores de contraseña inválidos'); return;
    }
    if (globalPolicy.max_intentos_fallidos <= 0 || globalPolicy.minutos_bloqueo <= 0) {
      alert('Valores de bloqueo inválidos'); return;
    }
    if (globalPolicy.timeout_inactividad_minutos <= 0 || globalPolicy.duracion_maxima_sesion_horas <= 0) {
      alert('Valores de sesión inválidos'); return;
    }
    if (globalPolicy.duracion_maxima_sesion_horas * 60 < globalPolicy.timeout_inactividad_minutos) {
      alert('La duración máxima no puede ser menor al timeout por inactividad'); return;
    }
    if (globalPolicy.duracion_token_reset_minutos <= 0) {
      alert('Valor de validez de token inválido'); return;
    }

    setSaving(true);
    try {
      if (globalPolicy.id) {
        await client.put(`/seguridad/politicas/${globalPolicy.id}`, globalPolicy);
      } else {
        const payload = { ...globalPolicy };
        delete payload.id;
        delete payload.tenant_id;
        await client.post('/seguridad/politicas', payload);
      }
      alert('Políticas globales guardadas con éxito');
      fetchAll();
    } catch (error) {
      console.error(error);
      alert('Error guardando políticas globales');
    } finally {
      setSaving(false);
    }
  };

  const openConfigModal = (tenant: any) => {
    setSelectedTenant(tenant);
    if (tenant.politica) {
      setModalPolicyType('personalizada');
      setModalPolicy({ ...tenant.politica });
    } else {
      setModalPolicyType('global');
      setModalPolicy({ ...globalPolicy, id: null, tenant_id: tenant.tenant_id }); // copy global as starting point if they switch to custom
    }
    setIsModalOpen(true);
  };

  const handleSaveTenantPolicy = async () => {
    if (modalPolicyType === 'global') {
      if (selectedTenant.politica?.id) {
        try {
          await client.delete(`/seguridad/politicas/${selectedTenant.politica.id}`);
        } catch (e) {
          console.error(e);
          alert('Error al restaurar política global');
          return;
        }
      }
    } else {
      // Validate Custom Policy
      if (modalPolicy.longitud_minima_password > modalPolicy.longitud_maxima_password) {
        alert('La longitud mínima no puede ser mayor a la máxima'); return;
      }
      if (modalPolicy.max_intentos_fallidos <= 0 || modalPolicy.minutos_bloqueo <= 0) {
        alert('Valores de bloqueo inválidos'); return;
      }
      
      try {
        if (selectedTenant.politica?.id) {
          await client.put(`/seguridad/politicas/${selectedTenant.politica.id}`, modalPolicy);
        } else {
          const payload = { ...modalPolicy, tenant_id: selectedTenant.tenant_id };
          delete payload.id;
          await client.post('/seguridad/politicas', payload);
        }
      } catch (e) {
        console.error(e);
        alert('Error al guardar política personalizada');
        return;
      }
    }
    
    setIsModalOpen(false);
    fetchAll();
  };

  const handleChangeGlobal = (field: string, value: any) => {
    setGlobalPolicy((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleChangeModal = (field: string, value: any) => {
    setModalPolicy((prev: any) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-st-accent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/20 text-red-500 mb-4">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Ops! Algo salió mal</h2>
        <p className="text-st-muted mb-4">{error}</p>
        <button onClick={fetchAll} className="bg-st-primary text-black px-6 py-2 rounded-lg font-bold">
          Reintentar
        </button>
      </div>
    );
  }

  // KPIs
  const isGlobalActive = globalPolicy?.activo !== false;
  const customCount = tenantPolicies.filter(t => t.politica !== null).length;
  const globalMfaReseller = globalPolicy?.mfa_obligatorio_reseller;
  const globalMfaCliente = globalPolicy?.mfa_obligatorio_cliente;

  // Filtered tenants
  const filteredTenants = tenantPolicies.filter(t => {
    if (search && !t.razon_social.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterType === 'global' && t.politica !== null) return false;
    if (filterType === 'personalizada' && t.politica === null) return false;
    
    const effPolicy = t.politica || globalPolicy;
    if (filterMfa === 'req' && !effPolicy.mfa_obligatorio_cliente) return false;
    if (filterMfa === 'opt' && effPolicy.mfa_obligatorio_cliente) return false;
    return true;
  });

  return (
    <div className="p-8 space-y-6 overflow-y-auto h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white uppercase tracking-wider">Seguridad Global</h1>
          <p className="text-sm text-st-muted mt-1">Configuración de políticas de autenticación, contraseñas, bloqueo, sesiones y MFA.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchAll} className="bg-st-surface border border-st-border text-white px-4 py-2 rounded hover:bg-white/5 transition-colors">
            Refrescar
          </button>
          {activeTab === 'global' && (
            <button onClick={handleSaveGlobal} disabled={saving} className="bg-st-primary text-black px-4 py-2 rounded font-bold hover:bg-white transition-colors disabled:opacity-50 flex items-center gap-2">
              <Save className="w-4 h-4" /> {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-st-surface border border-st-border p-4 rounded-xl flex items-center gap-4">
          <div className="p-3 bg-st-accent/10 rounded-lg text-st-accent"><Shield className="w-6 h-6"/></div>
          <div>
            <p className="text-xs text-st-muted uppercase tracking-wider">Política Global</p>
            <p className={`text-xl font-bold mt-1 ${isGlobalActive ? 'text-green-400' : 'text-red-400'}`}>
              {isGlobalActive ? 'Activa' : 'Inactiva'}
            </p>
          </div>
        </div>
        <div className="bg-st-surface border border-st-border p-4 rounded-xl flex items-center gap-4">
          <div className="p-3 bg-purple-400/10 rounded-lg text-purple-400"><Settings className="w-6 h-6"/></div>
          <div>
            <p className="text-xs text-st-muted uppercase tracking-wider">Políticas Personalizadas</p>
            <p className="text-xl font-bold text-white mt-1">{customCount} clientes</p>
          </div>
        </div>
        <div className="bg-st-surface border border-st-border p-4 rounded-xl flex items-center gap-4">
          <div className="p-3 bg-blue-400/10 rounded-lg text-blue-400"><Key className="w-6 h-6"/></div>
          <div>
            <p className="text-xs text-st-muted uppercase tracking-wider">MFA Reseller</p>
            <p className="text-xl font-bold text-white mt-1">{globalMfaReseller ? 'Requerido' : 'Opcional'}</p>
          </div>
        </div>
        <div className="bg-st-surface border border-st-border p-4 rounded-xl flex items-center gap-4">
          <div className="p-3 bg-orange-400/10 rounded-lg text-orange-400"><Key className="w-6 h-6"/></div>
          <div>
            <p className="text-xs text-st-muted uppercase tracking-wider">MFA Cliente</p>
            <p className="text-xl font-bold text-white mt-1">{globalMfaCliente ? 'Requerido' : 'Opcional'}</p>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="border-b border-st-border flex gap-6">
        <button 
          onClick={() => setActiveTab('global')}
          className={`pb-3 font-semibold text-sm uppercase tracking-wide transition-colors ${activeTab === 'global' ? 'text-st-accent border-b-2 border-st-accent' : 'text-st-muted hover:text-white'}`}
        >
          Política Global
        </button>
        <button 
          onClick={() => setActiveTab('clientes')}
          className={`pb-3 font-semibold text-sm uppercase tracking-wide transition-colors ${activeTab === 'clientes' ? 'text-st-accent border-b-2 border-st-accent' : 'text-st-muted hover:text-white'}`}
        >
          Políticas por Cliente
        </button>
      </div>

      {/* TAB: GLOBAL */}
      {activeTab === 'global' && globalPolicy && (
        <div className="space-y-6 pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Contraseñas */}
            <div className="bg-st-surface border border-st-border rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-bold text-white uppercase border-b border-st-border pb-2 flex items-center gap-2">
                <Lock className="w-4 h-4 text-st-accent"/> Contraseñas
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-sm text-st-muted w-1/2">Longitud mínima</label>
                  <input type="number" min="8" value={globalPolicy.longitud_minima_password} onChange={e => handleChangeGlobal('longitud_minima_password', parseInt(e.target.value))} className="w-32 bg-st-bg border border-st-border rounded p-2 text-white text-sm text-center" />
                </div>
                <div className="flex justify-between items-center">
                  <label className="text-sm text-st-muted w-1/2">Longitud máxima</label>
                  <input type="number" min="8" value={globalPolicy.longitud_maxima_password} onChange={e => handleChangeGlobal('longitud_maxima_password', parseInt(e.target.value))} className="w-32 bg-st-bg border border-st-border rounded p-2 text-white text-sm text-center" />
                </div>
                <div className="flex justify-between items-center">
                  <label className="text-sm text-st-muted w-1/2">Historial de contraseñas</label>
                  <input type="number" min="0" value={globalPolicy.cantidad_passwords_historial} onChange={e => handleChangeGlobal('cantidad_passwords_historial', parseInt(e.target.value))} className="w-32 bg-st-bg border border-st-border rounded p-2 text-white text-sm text-center" />
                </div>
                <p className="text-xs text-st-muted/70 italic mt-2">Evita que el usuario reutilice sus últimas contraseñas.</p>
              </div>
            </div>

            {/* Bloqueo */}
            <div className="bg-st-surface border border-st-border rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-bold text-white uppercase border-b border-st-border pb-2 flex items-center gap-2">
                <Activity className="w-4 h-4 text-st-accent"/> Bloqueo de Cuentas
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-sm text-st-muted w-1/2">Máximo intentos fallidos</label>
                  <input type="number" min="1" value={globalPolicy.max_intentos_fallidos} onChange={e => handleChangeGlobal('max_intentos_fallidos', parseInt(e.target.value))} className="w-32 bg-st-bg border border-st-border rounded p-2 text-white text-sm text-center" />
                </div>
                <div className="flex justify-between items-center">
                  <label className="text-sm text-st-muted w-1/2">Tiempo de bloqueo (minutos)</label>
                  <input type="number" min="1" value={globalPolicy.minutos_bloqueo} onChange={e => handleChangeGlobal('minutos_bloqueo', parseInt(e.target.value))} className="w-32 bg-st-bg border border-st-border rounded p-2 text-white text-sm text-center" />
                </div>
                <div className="bg-white/5 p-3 rounded mt-2 text-xs text-st-muted">
                  Al alcanzar <strong className="text-white">{globalPolicy.max_intentos_fallidos}</strong> intentos fallidos consecutivos, la cuenta será bloqueada durante <strong className="text-white">{globalPolicy.minutos_bloqueo}</strong> minutos.
                </div>
              </div>
            </div>

            {/* MFA */}
            <div className="bg-st-surface border border-st-border rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-bold text-white uppercase border-b border-st-border pb-2 flex items-center gap-2">
                <Shield className="w-4 h-4 text-st-accent"/> Autenticación Multifactor (MFA)
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white">Requerir MFA para RESELLER</p>
                    <p className="text-xs text-st-muted">Hace obligatorio el 2FA para el personal del reseller.</p>
                  </div>
                  <button onClick={() => handleChangeGlobal('mfa_obligatorio_reseller', !globalPolicy.mfa_obligatorio_reseller)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${globalPolicy.mfa_obligatorio_reseller ? 'bg-st-accent' : 'bg-st-border'}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${globalPolicy.mfa_obligatorio_reseller ? 'translate-x-6' : 'translate-x-1'}`}/>
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white">Requerir MFA para CLIENTE</p>
                    <p className="text-xs text-st-muted">Hace obligatorio el 2FA para los operadores finales.</p>
                  </div>
                  <button onClick={() => handleChangeGlobal('mfa_obligatorio_cliente', !globalPolicy.mfa_obligatorio_cliente)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${globalPolicy.mfa_obligatorio_cliente ? 'bg-st-accent' : 'bg-st-border'}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${globalPolicy.mfa_obligatorio_cliente ? 'translate-x-6' : 'translate-x-1'}`}/>
                  </button>
                </div>
              </div>
            </div>

            {/* Recuperación */}
            <div className="bg-st-surface border border-st-border rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-bold text-white uppercase border-b border-st-border pb-2 flex items-center gap-2">
                <Clock className="w-4 h-4 text-st-accent"/> Recuperación de Contraseña
              </h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-sm text-st-muted w-2/3">Validez del token (minutos)</label>
                  <input type="number" min="1" value={globalPolicy.duracion_token_reset_minutos} onChange={e => handleChangeGlobal('duracion_token_reset_minutos', parseInt(e.target.value))} className="w-32 bg-st-bg border border-st-border rounded p-2 text-white text-sm text-center" />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm text-st-muted w-2/3">Requerir email verificado</label>
                  <button onClick={() => handleChangeGlobal('requerir_email_recuperacion_verificado', !globalPolicy.requerir_email_recuperacion_verificado)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${globalPolicy.requerir_email_recuperacion_verificado ? 'bg-st-accent' : 'bg-st-border'}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${globalPolicy.requerir_email_recuperacion_verificado ? 'translate-x-6' : 'translate-x-1'}`}/>
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm text-st-muted w-2/3">Verificar pwned passwords (HIBP)</label>
                  <button onClick={() => handleChangeGlobal('validar_password_comprometido', !globalPolicy.validar_password_comprometido)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${globalPolicy.validar_password_comprometido ? 'bg-st-accent' : 'bg-st-border'}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${globalPolicy.validar_password_comprometido ? 'translate-x-6' : 'translate-x-1'}`}/>
                  </button>
                </div>
                <p className="text-xs text-st-muted/70 italic">* La validación HIBP requiere implementación en el backend, no funcional en esta versión.</p>
              </div>
            </div>

            {/* Sesiones */}
            <div className="bg-st-surface border border-st-border rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-bold text-white uppercase border-b border-st-border pb-2 flex items-center gap-2">
                <Server className="w-4 h-4 text-st-accent"/> Sesiones
              </h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-sm text-st-muted w-2/3">Inactividad (minutos)</label>
                  <input type="number" min="1" value={globalPolicy.timeout_inactividad_minutos} onChange={e => handleChangeGlobal('timeout_inactividad_minutos', parseInt(e.target.value))} className="w-32 bg-st-bg border border-st-border rounded p-2 text-white text-sm text-center" />
                </div>
                <div className="flex justify-between items-center">
                  <label className="text-sm text-st-muted w-2/3">Duración máxima (horas)</label>
                  <input type="number" min="1" value={globalPolicy.duracion_maxima_sesion_horas} onChange={e => handleChangeGlobal('duracion_maxima_sesion_horas', parseInt(e.target.value))} className="w-32 bg-st-bg border border-st-border rounded p-2 text-white text-sm text-center" />
                </div>
                <div className="bg-white/5 p-3 rounded mt-2 text-xs text-st-muted">
                  Cerrar sesión después de <strong className="text-white">{globalPolicy.timeout_inactividad_minutos}</strong> minutos de inactividad, o forzar cierre a las <strong className="text-white">{globalPolicy.duracion_maxima_sesion_horas}</strong> horas.
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TAB: CLIENTES */}
      {activeTab === 'clientes' && (
        <div className="bg-st-surface border border-st-border rounded-xl flex flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="p-4 border-b border-st-border flex flex-wrap gap-4 items-center bg-black/20">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-st-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Buscar cliente..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-st-bg border border-st-border rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-st-accent transition-colors"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-st-muted uppercase">Tipo:</label>
              <select value={filterType} onChange={e => setFilterType(e.target.value)} className="bg-st-bg border border-st-border rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-st-accent">
                <option value="all">Todos</option>
                <option value="global">Global</option>
                <option value="personalizada">Personalizada</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-st-muted uppercase">MFA Cliente:</label>
              <select value={filterMfa} onChange={e => setFilterMfa(e.target.value)} className="bg-st-bg border border-st-border rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-st-accent">
                <option value="all">Todos</option>
                <option value="req">Requerido</option>
                <option value="opt">Opcional</option>
              </select>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-white">
              <thead className="bg-black/40 border-b border-st-border text-xs uppercase text-st-muted">
                <tr>
                  <th className="p-4 font-semibold">Cliente</th>
                  <th className="p-4 font-semibold">Política</th>
                  <th className="p-4 font-semibold text-center">Mín. Clave</th>
                  <th className="p-4 font-semibold text-center">Intentos</th>
                  <th className="p-4 font-semibold text-center">Bloqueo</th>
                  <th className="p-4 font-semibold text-center">MFA Cliente</th>
                  <th className="p-4 font-semibold text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-st-border">
                {filteredTenants.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-st-muted">No se encontraron clientes con los filtros actuales.</td>
                  </tr>
                ) : (
                  filteredTenants.map(t => {
                    const isCustom = t.politica !== null;
                    const eff = t.politica || globalPolicy;
                    return (
                      <tr key={t.tenant_id} className="hover:bg-white/5 transition-colors">
                        <td className="p-4 font-medium">{t.razon_social}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${isCustom ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-white/10 text-st-muted border border-white/10'}`}>
                            {isCustom ? 'Personalizada' : 'Global'}
                          </span>
                        </td>
                        <td className="p-4 text-center">{eff.longitud_minima_password}</td>
                        <td className="p-4 text-center">{eff.max_intentos_fallidos}</td>
                        <td className="p-4 text-center">{eff.minutos_bloqueo}m</td>
                        <td className="p-4 flex justify-center">
                          {eff.mfa_obligatorio_cliente ? (
                            <span className="flex items-center gap-1 text-st-accent"><CheckCircle2 className="w-4 h-4"/> Requerido</span>
                          ) : (
                            <span className="flex items-center gap-1 text-st-muted"><XCircle className="w-4 h-4"/> Opcional</span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <button onClick={() => openConfigModal(t)} className="text-st-primary hover:text-white px-3 py-1 border border-st-primary/50 rounded hover:bg-st-primary hover:border-st-primary transition-colors text-xs font-bold">
                            {isCustom ? 'Editar' : 'Configurar'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DRAWER / MODAL */}
      {isModalOpen && selectedTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-st-surface border border-st-border rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="p-5 border-b border-st-border flex justify-between items-center bg-black/20">
              <div>
                <h2 className="text-lg font-bold text-white uppercase">Política de Seguridad</h2>
                <p className="text-sm text-st-muted">{selectedTenant.razon_social}</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-st-muted hover:text-white transition-colors">✕</button>
            </div>
            
            <div className="p-5 flex-1 overflow-y-auto space-y-6">
              
              {/* Type selector */}
              <div className="flex gap-4 p-1 bg-st-bg rounded-lg border border-st-border">
                <button 
                  onClick={() => setModalPolicyType('global')}
                  className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${modalPolicyType === 'global' ? 'bg-st-surface text-white shadow' : 'text-st-muted hover:text-white'}`}
                >
                  Usar Política Global
                </button>
                <button 
                  onClick={() => setModalPolicyType('personalizada')}
                  className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${modalPolicyType === 'personalizada' ? 'bg-st-surface text-purple-400 shadow' : 'text-st-muted hover:text-white'}`}
                >
                  Usar Política Personalizada
                </button>
              </div>
              
              {modalPolicyType === 'global' ? (
                <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-lg flex gap-3 text-blue-200 text-sm">
                  <Shield className="w-5 h-5 shrink-0" />
                  <p>Este cliente heredará automáticamente los parámetros de la política global. Cualquier configuración personalizada anterior será desactivada al guardar.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs text-st-muted uppercase">Longitud min contraseña</label>
                      <input type="number" min="8" value={modalPolicy.longitud_minima_password} onChange={e => handleChangeModal('longitud_minima_password', parseInt(e.target.value))} className="w-full bg-st-bg border border-st-border rounded p-2 text-white text-sm" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-st-muted uppercase">Max Intentos Fallidos</label>
                      <input type="number" min="1" value={modalPolicy.max_intentos_fallidos} onChange={e => handleChangeModal('max_intentos_fallidos', parseInt(e.target.value))} className="w-full bg-st-bg border border-st-border rounded p-2 text-white text-sm" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-st-muted uppercase">Minutos de Bloqueo</label>
                      <input type="number" min="1" value={modalPolicy.minutos_bloqueo} onChange={e => handleChangeModal('minutos_bloqueo', parseInt(e.target.value))} className="w-full bg-st-bg border border-st-border rounded p-2 text-white text-sm" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-st-muted uppercase">Inactividad (minutos)</label>
                      <input type="number" min="1" value={modalPolicy.timeout_inactividad_minutos} onChange={e => handleChangeModal('timeout_inactividad_minutos', parseInt(e.target.value))} className="w-full bg-st-bg border border-st-border rounded p-2 text-white text-sm" />
                    </div>
                  </div>

                  <div className="space-y-4 p-4 border border-st-border rounded-xl bg-black/20">
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-white">Requerir MFA Cliente</label>
                      <button onClick={() => handleChangeModal('mfa_obligatorio_cliente', !modalPolicy.mfa_obligatorio_cliente)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${modalPolicy.mfa_obligatorio_cliente ? 'bg-purple-500' : 'bg-st-border'}`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${modalPolicy.mfa_obligatorio_cliente ? 'translate-x-6' : 'translate-x-1'}`}/>
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-white">Verificar Email Recuperación</label>
                      <button onClick={() => handleChangeModal('requerir_email_recuperacion_verificado', !modalPolicy.requerir_email_recuperacion_verificado)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${modalPolicy.requerir_email_recuperacion_verificado ? 'bg-purple-500' : 'bg-st-border'}`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${modalPolicy.requerir_email_recuperacion_verificado ? 'translate-x-6' : 'translate-x-1'}`}/>
                      </button>
                    </div>
                  </div>
                  
                </div>
              )}
            </div>

            <div className="p-4 border-t border-st-border bg-black/40 flex justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-st-muted hover:text-white font-medium transition-colors">Cancelar</button>
              <button onClick={handleSaveTenantPolicy} className="px-6 py-2 bg-st-primary text-black text-sm font-bold rounded hover:bg-white transition-colors">Guardar Configuración</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
