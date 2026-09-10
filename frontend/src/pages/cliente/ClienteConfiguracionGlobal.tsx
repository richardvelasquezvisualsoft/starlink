import React, { useState, useEffect, useRef } from 'react';
import {
  Save,
  Globe,
  Bell,
  Shield,
  Layers,
  CheckCircle2,
  AlertCircle,
  Palette,
  Upload,
  Trash2,
  RefreshCw,
  Eye,
  Sliders,
  Check,
  Building,
  Image as ImageIcon
} from 'lucide-react';
import client, { buildAvatarUrl } from '../../api/client';
import { useTenantTheme } from '../../context/TenantThemeContext';
import {
  DEFAULT_PRIMARY_COLOR,
  DEFAULT_SECONDARY_COLOR,
  calculateContrastRatio,
  isValidHexColor,
  normalizeHexColor
} from '../../utils/themeUtils';

export const ClienteConfiguracionGlobal: React.FC = () => {
  const {
    tenantConfig,
    logoUrl,
    tokens,
    applyLiveTheme,
    resetLiveTheme,
    updateBranding,
    uploadLogo,
    removeLogo
  } = useTenantTheme();


  const [activeTab, setActiveTab] = useState<'perfil' | 'organizacion' | 'notificaciones' | 'branding' | 'preferencias'>('branding');

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

  // Branding Local Form State
  const [brandingForm, setBrandingForm] = useState({
    nombre_corto: '',
    color_primario: DEFAULT_PRIMARY_COLOR,
    color_secundario: DEFAULT_SECONDARY_COLOR
  });
  const [savingBranding, setSavingBranding] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Global Alerts
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Synchronize branding state with tenantConfig when loaded/updated
  useEffect(() => {
    if (tenantConfig) {
      setBrandingForm({
        nombre_corto: tenantConfig.nombre_corto || tenantConfig.nombre_comercial || tenantConfig.razon_social || '',
        color_primario: normalizeHexColor(tenantConfig.color_primario, DEFAULT_PRIMARY_COLOR),
        color_secundario: normalizeHexColor(tenantConfig.color_secundario, DEFAULT_SECONDARY_COLOR)
      });
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

  // Branding Handlers with Live Theme Application
  const handleBrandingColorChange = (field: 'color_primario' | 'color_secundario', val: string) => {
    let cleanHex = val.trim();
    if (!cleanHex.startsWith('#') && cleanHex.length > 0) {
      cleanHex = `#${cleanHex}`;
    }
    const updated = { ...brandingForm, [field]: cleanHex };
    setBrandingForm(updated);

    if (isValidHexColor(cleanHex)) {
      const p = field === 'color_primario' ? cleanHex : brandingForm.color_primario;
      const s = field === 'color_secundario' ? cleanHex : brandingForm.color_secundario;
      applyLiveTheme(p, s);
    }
  };

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBranding(true);
    setSuccessMsg('');
    setErrorMsg('');

    if (!isValidHexColor(brandingForm.color_primario)) {
      setErrorMsg('El color primario debe ser un código HEX de 6 caracteres válido (ej. #00382B).');
      setSavingBranding(false);
      return;
    }

    if (!isValidHexColor(brandingForm.color_secundario)) {
      setErrorMsg('El color secundario debe ser un código HEX de 6 caracteres válido (ej. #D99B26).');
      setSavingBranding(false);
      return;
    }

    try {
      await updateBranding({
        nombre_corto: brandingForm.nombre_corto.trim(),
        color_primario: brandingForm.color_primario.toUpperCase(),
        color_secundario: brandingForm.color_secundario.toUpperCase()
      });
      setSuccessMsg('Identidad visual del tenant guardada y aplicada correctamente en toda la plataforma.');
    } catch (err: any) {
      console.error('Error saving branding:', err);
      const msg = err.response?.data?.detail || 'Ocurrió un error al guardar la identidad visual del tenant.';
      setErrorMsg(msg);
    } finally {
      setSavingBranding(false);
    }
  };

  const handleResetBranding = () => {
    resetLiveTheme();
    if (tenantConfig) {
      setBrandingForm({
        nombre_corto: tenantConfig.nombre_corto || tenantConfig.nombre_comercial || tenantConfig.razon_social || '',
        color_primario: normalizeHexColor(tenantConfig.color_primario, DEFAULT_PRIMARY_COLOR),
        color_secundario: normalizeHexColor(tenantConfig.color_secundario, DEFAULT_SECONDARY_COLOR)
      });
    }
  };

  const handleLogoFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedMimes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
    if (!allowedMimes.includes(file.type.toLowerCase())) {
      setErrorMsg('Formato de imagen no soportado. Por favor suba un archivo PNG, JPEG, WebP o SVG.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('El logotipo no puede superar 5 MB.');
      return;
    }

    setUploadingLogo(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      await uploadLogo(file);
      setSuccessMsg('Logotipo actualizado correctamente.');
    } catch (err: any) {
      console.error('Error uploading logo:', err);
      const msg = err.response?.data?.detail || 'Ocurrió un error al subir el logotipo.';
      setErrorMsg(msg);
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveLogo = async () => {
    if (!window.confirm('¿Está seguro de que desea eliminar el logotipo del tenant?')) return;
    setUploadingLogo(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      await removeLogo();
      setSuccessMsg('Logotipo eliminado. Se restauró el isotipo por defecto.');
    } catch (err: any) {
      console.error('Error removing logo:', err);
      const msg = err.response?.data?.detail || 'Ocurrió un error al eliminar el logotipo.';
      setErrorMsg(msg);
    } finally {
      setUploadingLogo(false);
    }
  };

  // WCAG Contrast Computations
  const primHex = isValidHexColor(brandingForm.color_primario) ? brandingForm.color_primario : DEFAULT_PRIMARY_COLOR;
  const secHex = isValidHexColor(brandingForm.color_secundario) ? brandingForm.color_secundario : DEFAULT_SECONDARY_COLOR;

  const contrastWhitePrim = calculateContrastRatio(primHex, '#FFFFFF');
  const contrastDarkPrim = calculateContrastRatio(primHex, '#111827');
  const bestPrimContrastRatio = Math.max(contrastWhitePrim, contrastDarkPrim);
  const primPassWCAG = bestPrimContrastRatio >= 4.5;

  const contrastWhiteSec = calculateContrastRatio(secHex, '#FFFFFF');
  const contrastDarkSec = calculateContrastRatio(secHex, '#111827');
  const bestSecContrastRatio = Math.max(contrastWhiteSec, contrastDarkSec);
  const secPassWCAG = bestSecContrastRatio >= 4.5;


  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-st-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans uppercase flex items-center gap-2">
            <Sliders className="w-6 h-6 text-st-accent" />
            Configuración Global
          </h1>
          <p className="text-xs text-st-muted mt-1">
            Gestión integral de la identidad visual del tenant, niveles organizacionales, notificaciones y preferencias.
          </p>
        </div>
      </div>

      {/* Alert Messages */}
      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span className="font-medium">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-400/60 hover:text-emerald-400 text-xs">✕</button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span className="font-medium">{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="text-red-400/60 hover:text-red-400 text-xs">✕</button>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-st-border overflow-x-auto custom-scrollbar pb-1">
        <button
          onClick={() => setActiveTab('branding')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'branding'
              ? 'bg-st-surface text-st-accent border-t-2 border-st-accent border-x border-st-border'
              : 'text-st-muted hover:text-white hover:bg-white/5'
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>Branding e Identidad</span>
        </button>

        <button
          onClick={() => setActiveTab('organizacion')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'organizacion'
              ? 'bg-st-surface text-amber-400 border-t-2 border-amber-400 border-x border-st-border'
              : 'text-st-muted hover:text-white hover:bg-white/5'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Jerarquía Organizacional</span>
        </button>

        <button
          onClick={() => setActiveTab('perfil')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'perfil'
              ? 'bg-st-surface text-emerald-400 border-t-2 border-emerald-400 border-x border-st-border'
              : 'text-st-muted hover:text-white hover:bg-white/5'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Perfil del Tenant</span>
        </button>

        <button
          onClick={() => setActiveTab('notificaciones')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'notificaciones'
              ? 'bg-st-surface text-blue-400 border-t-2 border-blue-400 border-x border-st-border'
              : 'text-st-muted hover:text-white hover:bg-white/5'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Notificaciones</span>
        </button>

        <button
          onClick={() => setActiveTab('preferencias')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'preferencias'
              ? 'bg-st-surface text-purple-400 border-t-2 border-purple-400 border-x border-st-border'
              : 'text-st-muted hover:text-white hover:bg-white/5'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Preferencias y Seguridad</span>
        </button>
      </div>

      {/* TAB 1: BRANDING E IDENTIDAD VISUAL */}
      {activeTab === 'branding' && (
        <div className="space-y-6">
          <form onSubmit={handleSaveBranding} className="space-y-6">
            {/* Top Row: Logotipo & Nombre Corto */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Logotipo Card */}
              <div className="bg-st-surface border border-st-border rounded-xl p-5 space-y-4 md:col-span-1">
                <div className="flex items-center justify-between border-b border-st-border/60 pb-3">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-st-accent" />
                    <h3 className="font-bold text-white uppercase text-xs tracking-wider">Logotipo Oficial</h3>
                  </div>
                  <span className="text-[10px] text-st-muted font-mono">PNG, JPG, SVG</span>
                </div>

                <div className="flex flex-col items-center justify-center p-4 bg-st-bg border border-st-border rounded-xl space-y-3">
                  <div className="w-32 h-32 rounded-xl overflow-hidden border-2 border-dashed border-st-border flex items-center justify-center bg-black/40 relative group">
                    {logoUrl ? (
                      <img src={buildAvatarUrl(logoUrl)} alt="Logo Tenant" className="w-full h-full object-contain p-2" />
                    ) : (
                      <div className="text-center p-2">
                        <img src="/logo.jpg" alt="Default STARMONITOR" className="w-12 h-12 object-cover mx-auto rounded-lg mb-1 opacity-70" />
                        <span className="text-[10px] text-st-muted block">Sin logo personalizado</span>
                      </div>
                    )}
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleLogoFileSelect}
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="hidden"
                  />

                  <div className="flex items-center gap-2 w-full pt-1">
                    <button
                      type="button"
                      disabled={uploadingLogo}
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-st-accent/20 border border-st-accent/40 hover:bg-st-accent/30 text-st-accent rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{uploadingLogo ? 'Subiendo...' : 'Cambiar Logo'}</span>
                    </button>

                    {logoUrl && (
                      <button
                        type="button"
                        disabled={uploadingLogo}
                        onClick={handleRemoveLogo}
                        className="p-2 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-bold transition-all cursor-pointer"
                        title="Eliminar Logotipo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-st-muted text-center">Máximo 5 MB. Aspect ratio óptimo 1:1 o 4:3.</p>
                </div>
              </div>

              {/* Nombre Corto y Colores Card */}
              <div className="bg-st-surface border border-st-border rounded-xl p-5 space-y-4 md:col-span-2">
                <div className="flex items-center justify-between border-b border-st-border/60 pb-3">
                  <div className="flex items-center gap-2">
                    <Palette className="w-5 h-5 text-st-accent" />
                    <h3 className="font-bold text-white uppercase text-xs tracking-wider">Nombre Corto y Paleta de Colores</h3>
                  </div>
                  <span className="text-[10px] text-st-muted">WCAG 2.2 AA Standard</span>
                </div>

                {/* Nombre Corto */}
                <div>
                  <label className="block text-xs font-bold text-st-muted uppercase tracking-wider mb-1.5">
                    Nombre Corto del Tenant (Mostrar en Sidebar y AppShell)
                  </label>
                  <input
                    type="text"
                    name="nombre_corto"
                    value={brandingForm.nombre_corto}
                    onChange={(e) => setBrandingForm({ ...brandingForm, nombre_corto: e.target.value })}
                    placeholder="ej. Minera Horizonte"
                    maxLength={50}
                    className="w-full bg-st-bg border border-st-border rounded-lg px-3.5 py-2.5 text-sm text-white focus:border-st-accent outline-none"
                    required
                  />
                  <p className="text-[11px] text-st-muted mt-1">Este nombre identificará a la organización en la barra de navegación superior y menús principales.</p>
                </div>

                {/* Color Inputs Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  {/* Primary Color Picker */}
                  <div className="bg-st-bg border border-st-border rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase tracking-wider text-white">Color Primario Base</label>
                      <span
                        className="w-4 h-4 rounded-full border border-white/20 shadow-sm"
                        style={{ backgroundColor: primHex }}
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={primHex}
                        onChange={(e) => handleBrandingColorChange('color_primario', e.target.value)}
                        className="w-12 h-10 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                      />
                      <input
                        type="text"
                        value={brandingForm.color_primario}
                        onChange={(e) => handleBrandingColorChange('color_primario', e.target.value)}
                        maxLength={7}
                        placeholder="#00382B"
                        className="flex-1 bg-st-surface border border-st-border rounded-lg px-3 py-2 text-sm text-white font-mono uppercase focus:border-st-accent outline-none"
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <span className="text-st-muted">Fallback: <code className="text-amber-400">#00382B</code></span>
                      <span className={`font-bold ${primPassWCAG ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {bestPrimContrastRatio.toFixed(1)}:1 {primPassWCAG ? '✓ WCAG AA' : '⚠ Bajo Contraste'}
                      </span>
                    </div>
                  </div>

                  {/* Secondary Color Picker */}
                  <div className="bg-st-bg border border-st-border rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase tracking-wider text-white">Color Secundario Base</label>
                      <span
                        className="w-4 h-4 rounded-full border border-white/20 shadow-sm"
                        style={{ backgroundColor: secHex }}
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={secHex}
                        onChange={(e) => handleBrandingColorChange('color_secundario', e.target.value)}
                        className="w-12 h-10 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                      />
                      <input
                        type="text"
                        value={brandingForm.color_secundario}
                        onChange={(e) => handleBrandingColorChange('color_secundario', e.target.value)}
                        maxLength={7}
                        placeholder="#D99B26"
                        className="flex-1 bg-st-surface border border-st-border rounded-lg px-3 py-2 text-sm text-white font-mono uppercase focus:border-st-accent outline-none"
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <span className="text-st-muted">Fallback: <code className="text-amber-400">#D99B26</code></span>
                      <span className={`font-bold ${secPassWCAG ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {bestSecContrastRatio.toFixed(1)}:1 {secPassWCAG ? '✓ WCAG AA' : '⚠ Bajo Contraste'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Derived Palette Showcase */}
            <div className="bg-st-surface border border-st-border rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-st-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <Palette className="w-5 h-5 text-st-accent" />
                  <h3 className="font-bold text-white uppercase text-xs tracking-wider">Rango de Colores Derivados y Tokens Generados</h3>
                </div>
                <span className="text-[10px] text-st-muted">Inyección Automática a CSS Variables (:root)</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Primary Palette Variants */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-st-muted uppercase tracking-wider">Variantes Color Primario</span>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    <div className="p-2 rounded-lg text-center space-y-1" style={{ backgroundColor: tokens.primary.base, color: tokens.primary.contrast }}>
                      <span className="block text-[9px] font-bold uppercase">Base</span>
                      <span className="block text-[9px] font-mono">{tokens.primary.base}</span>
                    </div>
                    <div className="p-2 rounded-lg text-center space-y-1" style={{ backgroundColor: tokens.primary.hover, color: tokens.primary.hoverContrast }}>
                      <span className="block text-[9px] font-bold uppercase">Hover</span>
                      <span className="block text-[9px] font-mono">{tokens.primary.hover}</span>
                    </div>
                    <div className="p-2 rounded-lg text-center space-y-1" style={{ backgroundColor: tokens.primary.active, color: tokens.primary.activeContrast }}>
                      <span className="block text-[9px] font-bold uppercase">Active</span>
                      <span className="block text-[9px] font-mono">{tokens.primary.active}</span>
                    </div>
                    <div className="p-2 rounded-lg text-center space-y-1 border border-st-border text-st-primary" style={{ backgroundColor: tokens.primary.soft }}>
                      <span className="block text-[9px] font-bold uppercase">Soft</span>
                      <span className="block text-[9px] font-mono">15% Alpha</span>
                    </div>
                    <div className="p-2 rounded-lg text-center space-y-1 border-2 text-st-primary" style={{ borderColor: tokens.primary.base }}>
                      <span className="block text-[9px] font-bold uppercase">Border</span>
                      <span className="block text-[9px] font-mono">Stroke</span>
                    </div>
                    <div className="p-2 rounded-lg text-center space-y-1 bg-st-surface text-st-primary border border-st-border">
                      <span className="block text-[9px] font-bold uppercase">Texto</span>
                      <span className="block text-[9px] font-mono" style={{ color: tokens.primary.base }}>Primary</span>
                    </div>
                  </div>
                </div>

                {/* Secondary Palette Variants */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-st-muted uppercase tracking-wider">Variantes Color Secundario</span>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    <div className="p-2 rounded-lg text-center space-y-1" style={{ backgroundColor: tokens.secondary.base, color: tokens.secondary.contrast }}>
                      <span className="block text-[9px] font-bold uppercase">Base</span>
                      <span className="block text-[9px] font-mono">{tokens.secondary.base}</span>
                    </div>
                    <div className="p-2 rounded-lg text-center space-y-1" style={{ backgroundColor: tokens.secondary.hover, color: tokens.secondary.hoverContrast }}>
                      <span className="block text-[9px] font-bold uppercase">Hover</span>
                      <span className="block text-[9px] font-mono">{tokens.secondary.hover}</span>
                    </div>
                    <div className="p-2 rounded-lg text-center space-y-1" style={{ backgroundColor: tokens.secondary.active, color: tokens.secondary.activeContrast }}>
                      <span className="block text-[9px] font-bold uppercase">Active</span>
                      <span className="block text-[9px] font-mono">{tokens.secondary.active}</span>
                    </div>
                    <div className="p-2 rounded-lg text-center space-y-1 border border-st-border text-st-primary" style={{ backgroundColor: tokens.secondary.soft }}>
                      <span className="block text-[9px] font-bold uppercase">Soft</span>
                      <span className="block text-[9px] font-mono">15% Alpha</span>
                    </div>
                    <div className="p-2 rounded-lg text-center space-y-1 border-2 text-st-primary" style={{ borderColor: tokens.secondary.base }}>
                      <span className="block text-[9px] font-bold uppercase">Border</span>
                      <span className="block text-[9px] font-mono">Stroke</span>
                    </div>
                    <div className="p-2 rounded-lg text-center space-y-1 bg-st-surface text-st-primary border border-st-border">
                      <span className="block text-[9px] font-bold uppercase">Texto</span>
                      <span className="block text-[9px] font-mono" style={{ color: tokens.secondary.base }}>Secondary</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Live AppShell Preview Card */}
            <div className="bg-st-surface border border-st-border rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-st-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-st-accent" />
                  <h3 className="font-bold text-white uppercase text-xs tracking-wider">Vista Previa Interactiva en Tiempo Real (Live AppShell)</h3>
                </div>
                <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" /> Reacción Inmediata
                </span>
              </div>

              <div className="bg-black/60 border border-st-border rounded-xl p-4 overflow-hidden">
                <div className="flex h-48 rounded-lg overflow-hidden border border-white/10 shadow-xl">
                  {/* Simulated Mini Sidebar */}
                  <div className="w-48 bg-st-surface border-r border-st-border p-3 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 pb-2 border-b border-st-border">
                        <div className="w-7 h-7 rounded-md bg-st-bg border border-st-border overflow-hidden flex items-center justify-center">
                          {logoUrl ? (
                            <img src={buildAvatarUrl(logoUrl)} alt="Logo" className="w-full h-full object-contain p-0.5" />
                          ) : (
                            <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover" />
                          )}
                        </div>
                        <span className="text-xs font-bold text-white truncate max-w-[100px]">
                          {brandingForm.nombre_corto || 'STARMONITOR'}
                        </span>
                      </div>

                      {/* Menu Items */}
                      <div className="space-y-1.5">
                        <div
                          className="px-2.5 py-1.5 rounded-md text-xs font-bold flex items-center justify-between transition-colors"
                          style={{ backgroundColor: tokens.primary.soft, color: tokens.primary.base, borderLeft: `3px solid ${tokens.primary.base}` }}
                        >
                          <span>Dashboard</span>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tokens.primary.base }} />
                        </div>
                        <div className="px-2.5 py-1.5 text-xs text-st-muted flex items-center justify-between">
                          <span>Equipos</span>
                        </div>
                        <div className="px-2.5 py-1.5 text-xs text-st-muted flex items-center justify-between">
                          <span>Servicios</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-[9px] text-st-muted border-t border-st-border/50 pt-1">
                      Scope: Cliente Autenticado
                    </div>
                  </div>

                  {/* Simulated Mini Content Area */}
                  <div className="flex-1 bg-st-bg p-4 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">Consola de Control Tenant</span>
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-bold"
                          style={{ backgroundColor: tokens.secondary.soft, color: tokens.secondary.base, border: `1px solid ${tokens.secondary.border}` }}
                        >
                          PLAN ENTERPRISE
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-st-surface border border-st-border rounded-lg space-y-1">
                          <span className="text-[10px] text-st-muted uppercase">Terminales Activas</span>
                          <span className="block text-lg font-bold text-white">48 / 50</span>
                          <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                            <div className="h-full" style={{ width: '92%', backgroundColor: tokens.primary.base }} />
                          </div>
                        </div>

                        <div className="p-3 bg-st-surface border border-st-border rounded-lg space-y-1">
                          <span className="text-[10px] text-st-muted uppercase">Nivel de SLA</span>
                          <span className="block text-lg font-bold" style={{ color: tokens.secondary.base }}>99.98%</span>
                          <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                            <div className="h-full" style={{ width: '99%', backgroundColor: tokens.secondary.base }} />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-st-border/50">
                      <button
                        type="button"
                        className="px-3 py-1.5 text-xs font-bold rounded-lg transition-all"
                        style={{ backgroundColor: tokens.primary.base, color: tokens.primary.contrast }}
                      >
                        Botón Primario
                      </button>
                      <button
                        type="button"
                        className="px-3 py-1.5 text-xs font-bold rounded-lg transition-all"
                        style={{ backgroundColor: tokens.secondary.base, color: tokens.secondary.contrast }}
                      >
                        Botón Secundario
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleResetBranding}
                className="flex items-center gap-2 px-4 py-2.5 bg-st-surface border border-st-border hover:bg-white/5 text-st-muted hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Restablecer</span>
              </button>

              <button
                type="submit"
                disabled={savingBranding}
                className="btn-brand-primary flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold shadow-lg transition-all cursor-pointer disabled:opacity-50 hover:brightness-110 active:scale-[0.98]"
                style={{ backgroundColor: tokens.primary.base, color: tokens.primary.contrast }}
              >
                <Save className="w-4 h-4" />
                <span>{savingBranding ? 'Guardando...' : 'Guardar y Aplicar Branding'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: JERARQUÍA ORGANIZACIONAL */}
      {activeTab === 'organizacion' && (
        <div className="bg-st-surface border border-st-border rounded-xl overflow-hidden animate-fadeIn">
          <div className="p-4 border-b border-st-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-500" />
              <h2 className="font-bold text-white uppercase tracking-wider text-sm">Nombres de Niveles Organizacionales</h2>
            </div>
            <span className="text-xs text-st-muted">Personaliza la jerarquía de tu empresa</span>
          </div>
          <form onSubmit={handleSaveLevels} className="p-6 space-y-6">
            <p className="text-xs text-st-muted">
              Define los nombres personalizados para cada nivel de la organización. Estos nombres se mostrarán en los submenús de navegación y en las grillas de gestión.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Level 1 */}
              <div className="bg-st-bg border border-st-border rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-st-border/50 pb-2">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Nivel 1</span>
                  <span className="text-[10px] text-st-muted">Jerarquía Superior</span>
                </div>
                <div>
                  <label className="block text-xs text-st-muted font-bold uppercase tracking-wider mb-1">Nombre Singular</label>
                  <input
                    type="text"
                    name="n1_singular"
                    value={levelsData.n1_singular}
                    onChange={handleLevelsChange}
                    placeholder="ej. Gerencia, Empresa"
                    className="w-full bg-st-surface border border-st-border rounded-lg px-3 py-2 text-sm text-white focus:border-st-accent outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-st-muted font-bold uppercase tracking-wider mb-1">Nombre Plural (Submenú)</label>
                  <input
                    type="text"
                    name="n1_plural"
                    value={levelsData.n1_plural}
                    onChange={handleLevelsChange}
                    placeholder="ej. Gerencias, Empresas"
                    className="w-full bg-st-surface border border-st-border rounded-lg px-3 py-2 text-sm text-white focus:border-st-accent outline-none"
                    required
                  />
                </div>
              </div>

              {/* Level 2 */}
              <div className="bg-st-bg border border-st-border rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-st-border/50 pb-2">
                  <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Nivel 2</span>
                  <span className="text-[10px] text-st-muted">Jerarquía Intermedia</span>
                </div>
                <div>
                  <label className="block text-xs text-st-muted font-bold uppercase tracking-wider mb-1">Nombre Singular</label>
                  <input
                    type="text"
                    name="n2_singular"
                    value={levelsData.n2_singular}
                    onChange={handleLevelsChange}
                    placeholder="ej. Área, Región"
                    className="w-full bg-st-surface border border-st-border rounded-lg px-3 py-2 text-sm text-white focus:border-st-accent outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-st-muted font-bold uppercase tracking-wider mb-1">Nombre Plural (Submenú)</label>
                  <input
                    type="text"
                    name="n2_plural"
                    value={levelsData.n2_plural}
                    onChange={handleLevelsChange}
                    placeholder="ej. Áreas, Regiones"
                    className="w-full bg-st-surface border border-st-border rounded-lg px-3 py-2 text-sm text-white focus:border-st-accent outline-none"
                    required
                  />
                </div>
              </div>

              {/* Level 3 */}
              <div className="bg-st-bg border border-st-border rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-st-border/50 pb-2">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Nivel 3</span>
                  <span className="text-[10px] text-st-muted">Jerarquía Operativa</span>
                </div>
                <div>
                  <label className="block text-xs text-st-muted font-bold uppercase tracking-wider mb-1">Nombre Singular</label>
                  <input
                    type="text"
                    name="n3_singular"
                    value={levelsData.n3_singular}
                    onChange={handleLevelsChange}
                    placeholder="ej. Sede, Sucursal"
                    className="w-full bg-st-surface border border-st-border rounded-lg px-3 py-2 text-sm text-white focus:border-st-accent outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-st-muted font-bold uppercase tracking-wider mb-1">Nombre Plural (Submenú)</label>
                  <input
                    type="text"
                    name="n3_plural"
                    value={levelsData.n3_plural}
                    onChange={handleLevelsChange}
                    placeholder="ej. Sedes, Sucursales"
                    className="w-full bg-st-surface border border-st-border rounded-lg px-3 py-2 text-sm text-white focus:border-st-accent outline-none"
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
        <div className="bg-st-surface border border-st-border rounded-xl overflow-hidden animate-fadeIn">
          <div className="p-4 border-b border-st-border flex items-center gap-2">
            <Building className="w-5 h-5 text-emerald-400" />
            <h2 className="font-bold text-white uppercase tracking-wider text-sm">Información Institucional del Tenant</h2>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-st-muted uppercase tracking-wider mb-2">Razón Social</label>
                <input
                  type="text"
                  readOnly
                  value={tenantConfig?.razon_social || formData.nombre_empresa}
                  className="w-full bg-st-bg/60 border border-st-border rounded-lg px-4 py-2.5 text-sm text-white outline-none cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-st-muted uppercase tracking-wider mb-2">Nombre Comercial</label>
                <input
                  type="text"
                  readOnly
                  value={tenantConfig?.nombre_comercial || tenantConfig?.razon_social || ''}
                  className="w-full bg-st-bg/60 border border-st-border rounded-lg px-4 py-2.5 text-sm text-white outline-none cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-st-muted uppercase tracking-wider mb-2">ID Tenant Autenticado</label>
                <input
                  type="text"
                  readOnly
                  value={`TENANT-${tenantConfig?.tenant_id || 1}`}
                  className="w-full bg-st-bg/60 border border-st-border rounded-lg px-4 py-2.5 text-sm text-amber-400 font-mono outline-none cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-st-muted uppercase tracking-wider mb-2">Estado de Cuenta</label>
                <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs font-bold">
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
        <div className="bg-st-surface border border-st-border rounded-xl overflow-hidden animate-fadeIn">
          <div className="p-4 border-b border-st-border flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-400" />
            <h2 className="font-bold text-white uppercase tracking-wider text-sm">Canales de Notificaciones</h2>
          </div>
          <div className="p-6 space-y-4">
            <label className="flex items-center justify-between cursor-pointer group">
              <div>
                <div className="text-sm font-bold text-white group-hover:text-st-accent transition-colors">Alertas por Correo Electrónico</div>
                <div className="text-xs text-st-muted mt-0.5">Recibir reportes y alertas críticas por email.</div>
              </div>
              <div className="relative">
                <input type="checkbox" name="notificaciones_email" className="sr-only" checked={formData.notificaciones_email} onChange={handleChange} />
                <div className={`block w-10 h-6 rounded-full transition-colors ${formData.notificaciones_email ? 'bg-st-accent' : 'bg-st-bg border border-st-border'}`}></div>
                <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${formData.notificaciones_email ? 'transform translate-x-4' : ''}`}></div>
              </div>
            </label>

            <label className="flex items-center justify-between cursor-pointer group pt-3 border-t border-white/5">
              <div>
                <div className="text-sm font-bold text-white group-hover:text-st-accent transition-colors">Alertas por SMS</div>
                <div className="text-xs text-st-muted mt-0.5">Recibir notificaciones urgentes en su teléfono.</div>
              </div>
              <div className="relative">
                <input type="checkbox" name="alertas_sms" className="sr-only" checked={formData.alertas_sms} onChange={handleChange} />
                <div className={`block w-10 h-6 rounded-full transition-colors ${formData.alertas_sms ? 'bg-st-accent' : 'bg-st-bg border border-st-border'}`}></div>
                <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${formData.alertas_sms ? 'transform translate-x-4' : ''}`}></div>
              </div>
            </label>
          </div>
        </div>
      )}

      {/* TAB 5: PREFERENCIAS Y SEGURIDAD */}
      {activeTab === 'preferencias' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
          <div className="bg-st-surface border border-st-border rounded-xl overflow-hidden">
            <div className="p-4 border-b border-st-border flex items-center gap-2">
              <Globe className="w-5 h-5 text-purple-400" />
              <h2 className="font-bold text-white uppercase tracking-wider text-sm">Ajustes de Idioma y Región</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-st-muted uppercase tracking-wider mb-2">Idioma</label>
                  <select
                    name="idioma"
                    value={formData.idioma}
                    onChange={handleChange}
                    className="w-full bg-st-bg border border-st-border rounded-lg px-4 py-2 text-sm text-white focus:border-st-accent outline-none"
                  >
                    <option value="es">Español</option>
                    <option value="en">English</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-st-muted uppercase tracking-wider mb-2">Zona Horaria</label>
                  <select
                    name="zona_horaria"
                    value={formData.zona_horaria}
                    onChange={handleChange}
                    className="w-full bg-st-bg border border-st-border rounded-lg px-4 py-2 text-sm text-white focus:border-st-accent outline-none"
                  >
                    <option value="America/Lima">America/Lima (UTC-5)</option>
                    <option value="America/Bogota">America/Bogota (UTC-5)</option>
                    <option value="America/Santiago">America/Santiago (UTC-4)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-st-surface border border-st-border rounded-xl overflow-hidden">
            <div className="p-4 border-b border-st-border flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-400" />
              <h2 className="font-bold text-white uppercase tracking-wider text-sm">Privacidad y Seguridad</h2>
            </div>
            <div className="p-6 space-y-4">
              <label className="flex items-center justify-between cursor-pointer group">
                <div>
                  <div className="text-sm font-bold text-white group-hover:text-st-accent transition-colors">Compartir Geolocalización</div>
                  <div className="text-xs text-st-muted mt-0.5">Permitir a los operadores ver la ubicación en tiempo real.</div>
                </div>
                <div className="relative">
                  <input type="checkbox" name="permitir_geolocalizacion" className="sr-only" checked={formData.permitir_geolocalizacion} onChange={handleChange} />
                  <div className={`block w-10 h-6 rounded-full transition-colors ${formData.permitir_geolocalizacion ? 'bg-st-accent' : 'bg-st-bg border border-st-border'}`}></div>
                  <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${formData.permitir_geolocalizacion ? 'transform translate-x-4' : ''}`}></div>
                </div>
              </label>

              <label className="flex items-center justify-between cursor-pointer group pt-3 border-t border-white/5">
                <div>
                  <div className="text-sm font-bold text-white group-hover:text-st-accent transition-colors">Doble Factor de Autenticación (2FA)</div>
                  <div className="text-xs text-st-muted mt-0.5">Exigir 2FA a todos los colaboradores del tenant.</div>
                </div>
                <div className="relative">
                  <input type="checkbox" name="doble_factor_auth" className="sr-only" checked={formData.doble_factor_auth} onChange={handleChange} />
                  <div className={`block w-10 h-6 rounded-full transition-colors ${formData.doble_factor_auth ? 'bg-emerald-500' : 'bg-st-bg border border-st-border'}`}></div>
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
