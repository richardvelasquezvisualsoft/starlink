import React, { useState, useEffect } from 'react';
import {
  Save,
  Globe,
  Bell,
  Shield,
  Layers,
  CheckCircle2,
  AlertCircle,
  Sliders,
  Check,
  Building
} from 'lucide-react';
import client from '../../api/client';
import { useTenantTheme } from '../../context/TenantThemeContext';

export const ClienteConfiguracionGlobal: React.FC = () => {
  const { tenantConfig } = useTenantTheme();

  const [activeTab, setActiveTab] = useState<'organizacion' | 'perfil' | 'notificaciones' | 'preferencias'>('organizacion');

  // General & Notifications Form State
  const [formData, setFormData] = useState({
    nombre_empresa: 'Empresa Cliente S.A.C.',
    idioma: 'es',
    zona_horaria: 'America/Lima',
    notificaciones_email: true,
    alertas_sms: false,
    permitir_geolocalizacion: true,
    doble_factor_auth: false
  });

  // Organization Levels State
  const [levelsData, setLevelsData] = useState({
    n1_singular: 'Gerencia',
    n1_plural: 'Gerencias',
    n2_singular: 'Área',
    n2_plural: 'Áreas',
    n3_singular: 'Sede',
    n3_plural: 'Sedes'
  });
  const [savingLevels, setSavingLevels] = useState(false);

  // Global Alerts
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Synchronize company name with tenantConfig when loaded/updated
  useEffect(() => {
    if (tenantConfig) {
      setFormData(prev => ({
        ...prev,
        nombre_empresa: tenantConfig.razon_social || prev.nombre_empresa
      }));
    }
  }, [tenantConfig]);

  const fetchLevelsConfig = async () => {
    try {
      const res = await client.get('/niveles-organizacion-config');
      const items: any[] = res.data || [];
      const n1 = items.find(i => i.numero_nivel === 1);
      const n2 = items.find(i => i.numero_nivel === 2);
      const n3 = items.find(i => i.numero_nivel === 3);

      setLevelsData({
        n1_singular: n1?.nombre_nivel || 'Gerencia',
        n1_plural: n1?.nombre_nivel_plural || 'Gerencias',
        n2_singular: n2?.nombre_nivel || 'Área',
        n2_plural: n2?.nombre_nivel_plural || 'Áreas',
        n3_singular: n3?.nombre_nivel || 'Sede',
        n3_plural: n3?.nombre_nivel_plural || 'Sedes'
      });
    } catch (err) {
      console.error('Error loading levels config:', err);
    }
  };

  useEffect(() => {
    fetchLevelsConfig();
  }, []);

  // Event Handlers for General Settings
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleLevelsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLevelsData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveLevels = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingLevels(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      await client.put('/niveles-organizacion-config/1', {
        nombre_nivel: levelsData.n1_singular.trim(),
        nombre_nivel_plural: levelsData.n1_plural.trim()
      });
      await client.put('/niveles-organizacion-config/2', {
        nombre_nivel: levelsData.n2_singular.trim(),
        nombre_nivel_plural: levelsData.n2_plural.trim()
      });
      await client.put('/niveles-organizacion-config/3', {
        nombre_nivel: levelsData.n3_singular.trim(),
        nombre_nivel_plural: levelsData.n3_plural.trim()
      });
      setSuccessMsg('Configuración de nombres de niveles guardada correctamente.');
      window.dispatchEvent(new Event('niveles_config_updated'));
      fetchLevelsConfig();
    } catch (err) {
      console.error('Error saving levels config:', err);
      setErrorMsg('Ocurrió un error al guardar la configuración de niveles.');
    } finally {
      setSavingLevels(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-client-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-client-text-primary font-sans uppercase flex items-center gap-2">
            <Sliders className="w-6 h-6 text-client-primary" />
            Configuración Global
          </h1>
          <p className="text-xs text-client-text-secondary mt-1">
            Gestión integral de niveles organizacionales, perfil del tenant, notificaciones y preferencias.
          </p>
        </div>
      </div>

      {/* Alert Messages */}
      {successMsg && (
        <div className="p-4 bg-client-success-soft border border-emerald-500/30 rounded-xl text-client-success text-sm flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span className="font-medium">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-client-success/60 hover:text-client-success text-xs">✕</button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-client-danger-soft border border-red-500/30 rounded-xl text-client-danger text-sm flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span className="font-medium">{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="text-client-danger/60 hover:text-client-danger text-xs">✕</button>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-client-border overflow-x-auto custom-scrollbar pb-1">
        <button
          onClick={() => setActiveTab('organizacion')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'organizacion'
              ? 'bg-client-bg-surface text-client-warning border-t-2 border-amber-400 border-x border-client-border'
              : 'text-client-text-secondary hover:text-client-text-primary hover:bg-white/5'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Jerarquía Organizacional</span>
        </button>

        <button
          onClick={() => setActiveTab('perfil')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'perfil'
              ? 'bg-client-bg-surface text-client-success border-t-2 border-emerald-400 border-x border-client-border'
              : 'text-client-text-secondary hover:text-client-text-primary hover:bg-white/5'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Perfil del Tenant</span>
        </button>

        <button
          onClick={() => setActiveTab('notificaciones')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'notificaciones'
              ? 'bg-client-bg-surface text-blue-400 border-t-2 border-blue-400 border-x border-client-border'
              : 'text-client-text-secondary hover:text-client-text-primary hover:bg-white/5'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Notificaciones</span>
        </button>

        <button
          onClick={() => setActiveTab('preferencias')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'preferencias'
              ? 'bg-client-bg-surface text-purple-700 border-t-2 border-purple-400 border-x border-client-border'
              : 'text-client-text-secondary hover:text-client-text-primary hover:bg-white/5'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Preferencias y Seguridad</span>
        </button>
      </div>

      {/* TAB 2: JERARQUÍA ORGANIZACIONAL */}
      {activeTab === 'organizacion' && (
        <div className="bg-client-bg-surface border border-client-border rounded-xl overflow-hidden animate-fadeIn">
          <div className="p-4 border-b border-client-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-500" />
              <h2 className="font-bold text-client-text-primary uppercase tracking-wider text-sm">Nombres de Niveles Organizacionales</h2>
            </div>
            <span className="text-xs text-client-text-secondary">Personaliza la jerarquía de tu empresa</span>
          </div>
          <form onSubmit={handleSaveLevels} className="p-6 space-y-6">
            <p className="text-xs text-client-text-secondary">
              Define los nombres personalizados para cada nivel de la organización. Estos nombres se mostrarán en los submenús de navegación y en las grillas de gestión.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Level 1 */}
              <div className="bg-client-bg-subtle border border-client-border rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-client-border/50 pb-2">
                  <span className="text-xs font-bold text-client-warning uppercase tracking-wider">Nivel 1</span>
                  <span className="text-xs text-client-text-secondary">Jerarquía Superior</span>
                </div>
                <div>
                  <label className="block text-xs text-client-text-secondary font-bold uppercase tracking-wider mb-1">Nombre Singular</label>
                  <input
                    type="text"
                    name="n1_singular"
                    value={levelsData.n1_singular}
                    onChange={handleLevelsChange}
                    placeholder="ej. Gerencia, Empresa"
                    className="w-full bg-client-bg-surface border border-client-border rounded-lg px-3 py-2 text-sm text-client-text-primary focus:border-st-accent outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-client-text-secondary font-bold uppercase tracking-wider mb-1">Nombre Plural (Submenú)</label>
                  <input
                    type="text"
                    name="n1_plural"
                    value={levelsData.n1_plural}
                    onChange={handleLevelsChange}
                    placeholder="ej. Gerencias, Empresas"
                    className="w-full bg-client-bg-surface border border-client-border rounded-lg px-3 py-2 text-sm text-client-text-primary focus:border-st-accent outline-none"
                    required
                  />
                </div>
              </div>

              {/* Level 2 */}
              <div className="bg-client-bg-subtle border border-client-border rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-client-border/50 pb-2">
                  <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Nivel 2</span>
                  <span className="text-xs text-client-text-secondary">Jerarquía Intermedia</span>
                </div>
                <div>
                  <label className="block text-xs text-client-text-secondary font-bold uppercase tracking-wider mb-1">Nombre Singular</label>
                  <input
                    type="text"
                    name="n2_singular"
                    value={levelsData.n2_singular}
                    onChange={handleLevelsChange}
                    placeholder="ej. Área, Región"
                    className="w-full bg-client-bg-surface border border-client-border rounded-lg px-3 py-2 text-sm text-client-text-primary focus:border-st-accent outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-client-text-secondary font-bold uppercase tracking-wider mb-1">Nombre Plural (Submenú)</label>
                  <input
                    type="text"
                    name="n2_plural"
                    value={levelsData.n2_plural}
                    onChange={handleLevelsChange}
                    placeholder="ej. Áreas, Regiones"
                    className="w-full bg-client-bg-surface border border-client-border rounded-lg px-3 py-2 text-sm text-client-text-primary focus:border-st-accent outline-none"
                    required
                  />
                </div>
              </div>

              {/* Level 3 */}
              <div className="bg-client-bg-subtle border border-client-border rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-client-border/50 pb-2">
                  <span className="text-xs font-bold text-client-success uppercase tracking-wider">Nivel 3</span>
                  <span className="text-xs text-client-text-secondary">Jerarquía Operativa</span>
                </div>
                <div>
                  <label className="block text-xs text-client-text-secondary font-bold uppercase tracking-wider mb-1">Nombre Singular</label>
                  <input
                    type="text"
                    name="n3_singular"
                    value={levelsData.n3_singular}
                    onChange={handleLevelsChange}
                    placeholder="ej. Sede, Sucursal"
                    className="w-full bg-client-bg-surface border border-client-border rounded-lg px-3 py-2 text-sm text-client-text-primary focus:border-st-accent outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-client-text-secondary font-bold uppercase tracking-wider mb-1">Nombre Plural (Submenú)</label>
                  <input
                    type="text"
                    name="n3_plural"
                    value={levelsData.n3_plural}
                    onChange={handleLevelsChange}
                    placeholder="ej. Sedes, Sucursales"
                    className="w-full bg-client-bg-surface border border-client-border rounded-lg px-3 py-2 text-sm text-client-text-primary focus:border-st-accent outline-none"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={savingLevels}
                className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 text-white rounded-lg text-sm font-bold shadow-md hover:bg-amber-500 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{savingLevels ? 'Guardando...' : 'Guardar Nombres de Niveles'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: PERFIL DEL TENANT */}
      {activeTab === 'perfil' && (
        <div className="bg-client-bg-surface border border-client-border rounded-xl overflow-hidden animate-fadeIn">
          <div className="p-4 border-b border-client-border flex items-center gap-2">
            <Building className="w-5 h-5 text-client-success" />
            <h2 className="font-bold text-client-text-primary uppercase tracking-wider text-sm">Información Institucional del Tenant</h2>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-client-text-secondary uppercase tracking-wider mb-2">Razón Social</label>
                <input
                  type="text"
                  readOnly
                  value={tenantConfig?.razon_social || formData.nombre_empresa}
                  className="w-full bg-client-bg-subtle/60 border border-client-border rounded-lg px-4 py-2.5 text-sm text-client-text-primary outline-none cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-client-text-secondary uppercase tracking-wider mb-2">Nombre Comercial</label>
                <input
                  type="text"
                  readOnly
                  value={tenantConfig?.nombre_comercial || tenantConfig?.razon_social || ''}
                  className="w-full bg-client-bg-subtle/60 border border-client-border rounded-lg px-4 py-2.5 text-sm text-client-text-primary outline-none cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-client-text-secondary uppercase tracking-wider mb-2">ID Tenant Autenticado</label>
                <input
                  type="text"
                  readOnly
                  value={`TENANT-${tenantConfig?.tenant_id || 1}`}
                  className="w-full bg-client-bg-subtle/60 border border-client-border rounded-lg px-4 py-2.5 text-sm text-client-warning font-mono outline-none cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-client-text-secondary uppercase tracking-wider mb-2">Estado de Cuenta</label>
                <div className="flex items-center gap-2 px-4 py-2.5 bg-client-success-soft border border-emerald-500/30 rounded-lg text-client-success text-xs font-bold">
                  <Check className="w-4 h-4" />
                  <span>Tenant Activo - Plan Corporativo Starlink</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: NOTIFICACIONES */}
      {activeTab === 'notificaciones' && (
        <div className="bg-client-bg-surface border border-client-border rounded-xl overflow-hidden animate-fadeIn">
          <div className="p-4 border-b border-client-border flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-400" />
            <h2 className="font-bold text-client-text-primary uppercase tracking-wider text-sm">Canales de Notificaciones</h2>
          </div>
          <div className="p-6 space-y-4">
            <label className="flex items-center justify-between cursor-pointer group">
              <div>
                <div className="text-sm font-bold text-client-text-primary group-hover:text-client-primary transition-colors">Alertas por Correo Electrónico</div>
                <div className="text-xs text-client-text-secondary mt-0.5">Recibir reportes y alertas críticas por email.</div>
              </div>
              <div className="relative">
                <input type="checkbox" name="notificaciones_email" className="sr-only" checked={formData.notificaciones_email} onChange={handleChange} />
                <div className={`block w-10 h-6 rounded-full transition-colors ${formData.notificaciones_email ? 'bg-st-accent' : 'bg-client-bg-subtle border border-client-border'}`}></div>
                <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${formData.notificaciones_email ? 'transform translate-x-4' : ''}`}></div>
              </div>
            </label>

            <label className="flex items-center justify-between cursor-pointer group pt-3 border-t border-white/5">
              <div>
                <div className="text-sm font-bold text-client-text-primary group-hover:text-client-primary transition-colors">Alertas por SMS</div>
                <div className="text-xs text-client-text-secondary mt-0.5">Recibir notificaciones urgentes en su teléfono.</div>
              </div>
              <div className="relative">
                <input type="checkbox" name="alertas_sms" className="sr-only" checked={formData.alertas_sms} onChange={handleChange} />
                <div className={`block w-10 h-6 rounded-full transition-colors ${formData.alertas_sms ? 'bg-st-accent' : 'bg-client-bg-subtle border border-client-border'}`}></div>
                <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${formData.alertas_sms ? 'transform translate-x-4' : ''}`}></div>
              </div>
            </label>
          </div>
        </div>
      )}

      {/* TAB 5: PREFERENCIAS Y SEGURIDAD */}
      {activeTab === 'preferencias' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
          <div className="bg-client-bg-surface border border-client-border rounded-xl overflow-hidden">
            <div className="p-4 border-b border-client-border flex items-center gap-2">
              <Globe className="w-5 h-5 text-purple-700" />
              <h2 className="font-bold text-client-text-primary uppercase tracking-wider text-sm">Ajustes de Idioma y Región</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-client-text-secondary uppercase tracking-wider mb-2">Idioma</label>
                  <select
                    name="idioma"
                    value={formData.idioma}
                    onChange={handleChange}
                    className="w-full bg-client-bg-subtle border border-client-border rounded-lg px-4 py-2 text-sm text-client-text-primary focus:border-st-accent outline-none"
                  >
                    <option value="es">Español</option>
                    <option value="en">English</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-client-text-secondary uppercase tracking-wider mb-2">Zona Horaria</label>
                  <select
                    name="zona_horaria"
                    value={formData.zona_horaria}
                    onChange={handleChange}
                    className="w-full bg-client-bg-subtle border border-client-border rounded-lg px-4 py-2 text-sm text-client-text-primary focus:border-st-accent outline-none"
                  >
                    <option value="America/Lima">America/Lima (UTC-5)</option>
                    <option value="America/Bogota">America/Bogota (UTC-5)</option>
                    <option value="America/Santiago">America/Santiago (UTC-4)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-client-bg-surface border border-client-border rounded-xl overflow-hidden">
            <div className="p-4 border-b border-client-border flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-700" />
              <h2 className="font-bold text-client-text-primary uppercase tracking-wider text-sm">Privacidad y Seguridad</h2>
            </div>
            <div className="p-6 space-y-4">
              <label className="flex items-center justify-between cursor-pointer group">
                <div>
                  <div className="text-sm font-bold text-client-text-primary group-hover:text-client-primary transition-colors">Compartir Geolocalización</div>
                  <div className="text-xs text-client-text-secondary mt-0.5">Permitir a los operadores ver la ubicación en tiempo real.</div>
                </div>
                <div className="relative">
                  <input type="checkbox" name="permitir_geolocalizacion" className="sr-only" checked={formData.permitir_geolocalizacion} onChange={handleChange} />
                  <div className={`block w-10 h-6 rounded-full transition-colors ${formData.permitir_geolocalizacion ? 'bg-st-accent' : 'bg-client-bg-subtle border border-client-border'}`}></div>
                  <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${formData.permitir_geolocalizacion ? 'transform translate-x-4' : ''}`}></div>
                </div>
              </label>

              <label className="flex items-center justify-between cursor-pointer group pt-3 border-t border-white/5">
                <div>
                  <div className="text-sm font-bold text-client-text-primary group-hover:text-client-primary transition-colors">Doble Factor de Autenticación (2FA)</div>
                  <div className="text-xs text-client-text-secondary mt-0.5">Exigir 2FA a todos los usuarios del tenant.</div>
                </div>
                <div className="relative">
                  <input type="checkbox" name="doble_factor_auth" className="sr-only" checked={formData.doble_factor_auth} onChange={handleChange} />
                  <div className={`block w-10 h-6 rounded-full transition-colors ${formData.doble_factor_auth ? 'bg-emerald-500' : 'bg-client-bg-subtle border border-client-border'}`}></div>
                  <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${formData.doble_factor_auth ? 'transform translate-x-4' : ''}`}></div>
                </div>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClienteConfiguracionGlobal;
