import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  BarChart3,
  Radio,
  MapPin,
  AlertTriangle,
  Settings,
  Users,
  Database,
  LogOut,
  ChevronDown,
  ChevronRight,
  Star,
  Bell,
  Menu,
  X,
  Satellite,
  Activity,
  CreditCard,
  Briefcase,
  FileText,
  Sun,
  Moon
} from 'lucide-react';
import client, { buildAvatarUrl } from '../api/client';
import { useTenantTheme } from '../context/TenantThemeContext';
import { useResellerTheme } from '../context/ResellerThemeContext';


interface MenuItem {
  id: string;
  name: string;
  path: string;
  icon: React.ComponentType<any>;
}

interface MenuSection {
  title: string;
  icon: React.ComponentType<any>;
  items: MenuItem[];
}

const DEMO_TENANTS = [
  { id: 1, name: 'Minera Horizonte S.A.C.' },
  { id: 2, name: 'Compañía Petrolera Sur' }
];

const Layout: React.FC<{ children: React.ReactNode; type?: 'CLIENTE' | 'RESELLER' }> = ({ children, type }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;
  const { logoUrl: tenantLogoUrl, logoVersion, shortName: tenantShortName } = useTenantTheme();
  const { themeMode, toggleThemeMode } = useResellerTheme();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [tenantDropdownOpen, setTenantDropdownOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'ANALÍTICA RESELLER': true,
    'OPERACIÓN GLOBAL': true,
    'GESTIÓN COMERCIAL': true,
    'SERVICIOS': true,
    'REPORTES': true,
    'OPERACION': true,
    'ORGANIZACIÓN': false
  });
  const [favorites, setFavorites] = useState<string[]>([]);
  const [criticalAlertsCount, setCriticalAlertsCount] = useState(0);
  const [userName, setUserName] = useState('Administrador');
  const [userFotoUrl, setUserFotoUrl] = useState('');
  const [imageHasError, setImageHasError] = useState(false);
  const [avatarVersion, setAvatarVersion] = useState<number>(Date.now());
  const [nivelConfigList, setNivelConfigList] = useState<any[]>([
    { numero_nivel: 1, nombre_nivel: 'Gerencia', nombre_nivel_plural: 'Gerencias' },
    { numero_nivel: 2, nombre_nivel: 'Área', nombre_nivel_plural: 'Áreas' },
    { numero_nivel: 3, nombre_nivel: 'Sede', nombre_nivel_plural: 'Sedes' }
  ]);

  // Determinar Scope explícito basado en el tipo inyectado
  let scope: 'RESELLER_GLOBAL' | 'RESELLER_CONTEXT' | 'CLIENTE' = type === 'CLIENTE' ? 'CLIENTE' : 'RESELLER_GLOBAL';
  let prefix = type === 'CLIENTE' ? '/cliente' : '/reseller';
  let activeTenantId: number | null = null;
  
  if (type === 'RESELLER' && pathname.startsWith('/reseller/clientes/')) {
    const parts = pathname.split('/');
    if (parts.length >= 4 && !isNaN(Number(parts[3]))) {
      scope = 'RESELLER_CONTEXT';
      activeTenantId = Number(parts[3]);
      prefix = `/reseller/clientes/${activeTenantId}`;
    }
  }

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileDrawerOpen(false);
  }, [pathname]);

  // Dynamically set data-theme-scope on root element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme-scope', scope === 'CLIENTE' ? 'cliente' : 'reseller');
  }, [scope]);

  // Load user data & levels configuration
  useEffect(() => {
    const loadUserData = (evt?: any) => {
      const savedFavs = localStorage.getItem('starlink_favorites');
      if (savedFavs) {
        setFavorites(JSON.parse(savedFavs));
      }
      const userJson = localStorage.getItem('starlink_user');
      if (userJson) {
        try {
          const u = JSON.parse(userJson);
          setUserName(u.nombre || 'Administrador');
          setUserFotoUrl(u.foto_url || '');
          setImageHasError(false);
          setAvatarVersion(Date.now());
        } catch (e) {}
      }
      if (evt && evt.detail && evt.detail.foto_url !== undefined) {
        setUserFotoUrl(evt.detail.foto_url || '');
        setImageHasError(false);
        setAvatarVersion(Date.now());
      }
    };

    const fetchUserProfile = async () => {
      try {
        const res = await client.get('/auth/me');
        if (res.data) {
          setUserName(res.data.nombre || 'Administrador');
          setUserFotoUrl(res.data.foto_url || '');
          setImageHasError(false);
          setAvatarVersion(Date.now());
          localStorage.setItem('starlink_user', JSON.stringify(res.data));
        }
      } catch (e) {}
    };

    const fetchNiveles = async () => {
      try {
        const res = await client.get('/niveles-organizacion-config');
        if (res.data && Array.isArray(res.data) && res.data.length > 0) {
          setNivelConfigList(res.data);
        }
      } catch (e) {}
    };

    loadUserData();
    fetchUserProfile();
    fetchNiveles();
    window.addEventListener('storage', loadUserData);
    window.addEventListener('user_profile_updated', loadUserData);
    window.addEventListener('niveles_config_updated', fetchNiveles);
    
    const fetchAlerts = async () => {
      try {
        const res = await client.get('/alertas?activa=true');
        const criticals = res.data.filter((a: any) => a.catalogo_alerta?.criticidad === 'critical');
        setCriticalAlertsCount(criticals.length);
      } catch (err) {}
    };
    fetchAlerts();

    return () => {
      window.removeEventListener('storage', loadUserData);
      window.removeEventListener('user_profile_updated', loadUserData);
      window.removeEventListener('niveles_config_updated', fetchNiveles);
    };
  }, []);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleFavorite = (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    const updated = favorites.includes(itemId) ? favorites.filter(id => id !== itemId) : [...favorites, itemId];
    setFavorites(updated);
    localStorage.setItem('starlink_favorites', JSON.stringify(updated));
  };

  const handleLogout = () => {
    localStorage.removeItem('starlink_token');
    localStorage.removeItem('starlink_user');
    navigate('/login');
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    setIsMobileDrawerOpen(false);
  };

  // Build Sections based on scope
  const sections: MenuSection[] = [];

  if (scope === 'RESELLER_GLOBAL') {
    sections.push({
      title: 'OPERACIÓN GLOBAL',
      icon: Radio,
      items: [
        { id: 'g-clientes', name: 'Clientes', path: '/reseller/clientes', icon: Users },
        { id: 'g-noc', name: 'NOC Global', path: '/reseller/noc', icon: Activity },
        { id: 'g-solicitudes', name: 'Solicitudes de Clientes', path: '/reseller/solicitudes', icon: Briefcase },
        { id: 'g-alertas', name: 'Alertas Globales', path: '/reseller/alertas', icon: AlertTriangle },
        { id: 'g-operaciones', name: 'Operaciones', path: '/reseller/operaciones', icon: Settings },
        { id: 'g-aprovisionamiento', name: 'Aprovisionamiento', path: '/reseller/aprovisionamiento', icon: Database },
      ]
    });
    sections.push({
      title: 'ANALÍTICA RESELLER',
      icon: BarChart3,
      items: [
        { id: 'a-cartera', name: 'Cartera y Crecimiento', path: '/reseller/analitica/cartera', icon: Users },
        { id: 'a-calidad', name: 'Calidad Histórica', path: '/reseller/analitica/calidad', icon: Activity },
        { id: 'a-flota', name: 'Evolución de Flota', path: '/reseller/analitica/flota', icon: Satellite },
        { id: 'a-costos', name: 'Costos por Cliente', path: '/reseller/analitica/costos', icon: CreditCard },
        { id: 'a-performance', name: 'Performance de Aprovisionamiento', path: '/reseller/analitica/performance', icon: Database },
        { id: 'a-productos', name: 'Productos / Planes', path: '/reseller/analitica/productos', icon: Briefcase },
      ]
    });
    sections.push({
      title: 'GESTIÓN COMERCIAL',
      icon: Briefcase,
      items: [
        { id: 'g-consumo', name: 'Consumo Global', path: '/reseller/consumo', icon: BarChart3 },
        { id: 'g-facturacion', name: 'Facturación Starlink', path: '/reseller/facturacion', icon: CreditCard },
        { id: 'g-contratos', name: 'Contratos Comerciales', path: '/reseller/contratos', icon: Briefcase },
      ]
    });
    sections.push({
      title: 'ADMINISTRACIÓN',
      icon: Settings,
      items: [
        { id: 'g-usuarios', name: 'Usuarios y Accesos', path: '/reseller/usuarios', icon: Users },
        { id: 'g-seguridad', name: 'Seguridad', path: '/reseller/seguridad', icon: Database },
      ]
    });
  } else if (scope === 'CLIENTE') {
    const n1 = nivelConfigList.find(n => n.numero_nivel === 1) || { nombre_nivel_plural: 'Gerencias' };
    const n2 = nivelConfigList.find(n => n.numero_nivel === 2) || { nombre_nivel_plural: 'Áreas' };
    const n3 = nivelConfigList.find(n => n.numero_nivel === 3) || { nombre_nivel_plural: 'Sedes' };

    sections.push({
      title: 'MI OPERACIÓN',
      icon: Satellite,
      items: [
        { id: 'c-servicios', name: 'Mis Servicios', path: `/cliente/servicios`, icon: Radio },
        { id: 'c-equipos', name: 'Mis Equipos', path: `/cliente/servicios/equipos`, icon: Database },
        { id: 'c-planes', name: 'Mis Planes', path: `/cliente/servicios/planes`, icon: Briefcase },
        { id: 'c-alertas', name: 'Alertas', path: `/cliente/calidad/alertas`, icon: AlertTriangle },
        { id: 'c-estado', name: 'Estado y Ubicación', path: `/cliente/calidad/estado-ubicacion`, icon: MapPin },
      ]
    });
    sections.push({
      title: 'ANALÍTICA',
      icon: Activity,
      items: [
        { id: 'c-calidad', name: 'Calidad de Servicio', path: `/cliente/calidad/calidad-servicio`, icon: Activity },
        { id: 'c-telemetria', name: 'Telemetría', path: `/cliente/calidad/telemetria`, icon: BarChart3 },
        { id: 'c-reportes', name: 'Reportes', path: `/cliente/facturacion/reportes`, icon: BarChart3 },
      ]
    });
    sections.push({
      title: 'FACTURACIÓN',
      icon: CreditCard,
      items: [
        { id: 'c-resumen-gasto', name: 'Resumen de Gasto', path: `/cliente/facturacion/reportes`, icon: CreditCard },
        { id: 'c-comparativo', name: 'Contratado vs Facturado', path: `/cliente/facturacion/comparativo`, icon: Briefcase },
        { id: 'c-comprobantes', name: 'Mis Comprobantes', path: `/cliente/facturacion/comprobantes`, icon: FileText },
      ]
    });
    sections.push({
      title: 'OPERACIONES',
      icon: Settings,
      items: [
        { id: 'c-control-datos', name: 'Control de Datos', path: `/cliente/operaciones/control-datos`, icon: Database },
        { id: 'c-remotas', name: 'Acciones Remotas', path: `/cliente/operaciones/remotas`, icon: Activity },
        { id: 'c-geozonas', name: 'Geozonas', path: `/cliente/operaciones/geozonas`, icon: MapPin },
      ]
    });
    sections.push({
      title: 'SOLICITUDES',
      icon: Users,
      items: [
        { id: 'c-mis-solicitudes', name: 'Mis Solicitudes', path: `/cliente/solicitudes`, icon: Briefcase },
      ]
    });
    sections.push({
      title: 'MANTENIMIENTO',
      icon: Settings,
      items: [
        { id: 'c-org-n1', name: n1.nombre_nivel_plural || n1.nombre_nivel || 'Nivel 1', path: `/cliente/mantenimiento/organizacion/nivel/1`, icon: Users },
        { id: 'c-org-n2', name: n2.nombre_nivel_plural || n2.nombre_nivel || 'Nivel 2', path: `/cliente/mantenimiento/organizacion/nivel/2`, icon: Users },
        { id: 'c-org-n3', name: n3.nombre_nivel_plural || n3.nombre_nivel || 'Nivel 3', path: `/cliente/mantenimiento/organizacion/nivel/3`, icon: Users },
        { id: 'c-centros-costos', name: 'Centros de Costos', path: `/cliente/mantenimiento/centros-costos`, icon: Database },
        { id: 'c-asignaciones', name: 'Asignaciones', path: `/cliente/mantenimiento/asignaciones`, icon: Users },
      ]
    });
    sections.push({
      title: 'CONFIGURACIÓN',
      icon: Settings,
      items: [
        { id: 'c-configuracion-global', name: 'Global', path: `/cliente/configuracion/global`, icon: Settings },
      ]
    });
  }

  const allItems = [
    { id: 'dashboard', name: scope === 'CLIENTE' ? 'Dashboard' : (scope === 'RESELLER_GLOBAL' ? 'Dashboard Global' : 'Resumen'), path: `${prefix}/dashboard`, icon: LayoutDashboard },
    ...sections.flatMap(s => s.items)
  ];
  const activeFavItems = allItems.filter(item => favorites.includes(item.id));

  const activeTenantName = DEMO_TENANTS.find(t => t.id === activeTenantId)?.name || 'Todos los clientes';

  return (
    <div className="flex h-screen overflow-hidden bg-st-bg text-st-primary font-sans relative">
      {/* Mobile Drawer Backdrop Overlay */}
      {isMobileDrawerOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setIsMobileDrawerOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex flex-col bg-st-surface border-r border-st-border transition-all duration-300
          lg:static lg:z-auto
          ${isMobileDrawerOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
          ${isSidebarCollapsed ? 'lg:w-20' : 'lg:w-72'}
          w-72
        `}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-st-border shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border border-white/20 bg-black/40 shadow-[0_0_10px_rgba(0,0,0,0.3)]">
              {scope === 'CLIENTE' ? (
                tenantLogoUrl ? (
                  <img src={buildAvatarUrl(tenantLogoUrl, logoVersion)} alt="Logo Tenant" className="w-full h-full object-contain p-0.5" />
                ) : (
                  <img src="/logo.jpg" alt="STARMONITOR" className="w-full h-full object-cover" />
                )
              ) : (
                <img src="/logo.jpg" alt="STARMONITOR RESELLER" className="w-full h-full object-cover" />
              )}
            </div>
            {(!isSidebarCollapsed || isMobileDrawerOpen) && (
              <span
                className="text-sm font-bold tracking-wider text-white truncate max-w-[160px]"
                title={scope === 'CLIENTE' ? (tenantShortName || 'STARMONITOR') : 'STARMONITOR RESELLER'}
              >
                {scope === 'CLIENTE' ? (tenantShortName || 'STARMONITOR') : 'STARMONITOR RESELLER'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Mobile close button */}
            <button
              onClick={() => setIsMobileDrawerOpen(false)}
              className="p-1.5 rounded-lg text-st-muted hover:text-white hover:bg-white/10 transition-colors lg:hidden cursor-pointer"
              title="Cerrar menú"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Desktop collapse button */}
            {!isSidebarCollapsed && (
              <button
                onClick={() => setIsSidebarCollapsed(true)}
                className="hidden lg:block p-1 rounded opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
                style={{ color: scope === 'CLIENTE' ? 'var(--color-brand-primary-contrast)' : '#FFFFFF' }}
                title="Colapsar menú lateral"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-2 space-y-4 custom-scrollbar">
          {/* Desktop expand button when collapsed */}
          {isSidebarCollapsed && (
            <button
              onClick={() => setIsSidebarCollapsed(false)}
              className="hidden lg:block mx-auto p-2 rounded text-st-muted hover:text-white hover:bg-white/5 transition-colors mb-4 cursor-pointer"
              title="Expandir menú lateral"
            >
              <Menu className="w-6 h-6" />
            </button>
          )}

          {activeFavItems.length > 0 && (!isSidebarCollapsed || isMobileDrawerOpen) && (
            <div className="space-y-1">
              <p className="px-3 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 text-st-accent">
                <Star className="w-3 h-3 fill-current" /> FAVORITOS
              </p>
              {activeFavItems.map(item => {
                const isActive = location.pathname === item.path;
                return (
                  <div
                    key={`fav-${item.id}`}
                    onClick={() => handleNavigate(item.path)}
                    className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all ${
                      isActive ? 'bg-white/10 text-white font-semibold' : 'text-st-muted hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <item.icon className={`w-4 h-4 ${isActive ? 'text-st-accent' : 'text-st-muted'}`} />
                      <span className="text-sm">{item.name}</span>
                    </div>
                    <Star onClick={(e) => toggleFavorite(e, item.id)} className="w-3.5 h-3.5 fill-current text-st-accent hover:scale-125 transition-transform" />
                  </div>
                );
              })}
            </div>
          )}

          <div className="space-y-1">
            {(() => {
              const isDashActive = location.pathname === `${prefix}/dashboard`;
              return (
                <div
                  onClick={() => handleNavigate(`${prefix}/dashboard`)}
                  className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all ${
                    isDashActive ? 'bg-white/10 text-white font-semibold border border-white/20' : 'text-st-muted hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <LayoutDashboard className={`w-4 h-4 ${isDashActive ? 'text-st-accent' : 'text-st-muted'}`} />
                    {(!isSidebarCollapsed || isMobileDrawerOpen) && <span className="text-sm">{scope === 'RESELLER_GLOBAL' ? 'Dashboard Global' : 'Resumen'}</span>}
                  </div>
                  {(!isSidebarCollapsed || isMobileDrawerOpen) && (
                    <button onClick={(e) => toggleFavorite(e, 'dashboard')} className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <Star className={`w-3.5 h-3.5 ${favorites.includes('dashboard') ? 'fill-current text-st-accent' : 'opacity-60 hover:opacity-100'}`} />
                    </button>
                  )}
                </div>
              );
            })()}
          </div>

          {sections.map(sec => {
            const isExpanded = expandedSections[sec.title];
            return (
              <div key={sec.title} className="space-y-1">
                {(!isSidebarCollapsed || isMobileDrawerOpen) ? (
                  <button
                    onClick={() => toggleSection(sec.title)}
                    className="w-full flex items-center justify-between px-3 py-1.5 text-base font-bold uppercase tracking-widest text-st-muted hover:text-white transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <sec.icon className="w-5 h-5 text-st-muted" />
                      {sec.title}
                    </span>
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                ) : <div className="w-full h-px bg-white/10 my-2" />}

                {(isExpanded || isSidebarCollapsed || isMobileDrawerOpen) && sec.items.map(item => {
                  const isActive = location.pathname === item.path;
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleNavigate(item.path)}
                      className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all ${(!isSidebarCollapsed || isMobileDrawerOpen) ? 'ml-8' : ''} ${
                        isActive ? 'bg-white/10 text-white font-semibold' : 'text-st-muted hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <item.icon className={`w-4 h-4 ${isActive ? 'text-st-accent' : 'text-st-muted'}`} />
                        {(!isSidebarCollapsed || isMobileDrawerOpen) && <span className="text-sm">{item.name}</span>}
                      </div>
                      {(!isSidebarCollapsed || isMobileDrawerOpen) && (
                        <button onClick={(e) => toggleFavorite(e, item.id)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <Star className={`w-3.5 h-3.5 ${favorites.includes(item.id) ? 'fill-current text-st-accent' : 'opacity-60 hover:opacity-100'}`} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
        <div className="p-3 border-t border-white/10 shrink-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2.5 px-3 py-2 rounded-lg text-white hover:bg-white/10 transition-colors cursor-pointer font-semibold"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {(!isSidebarCollapsed || isMobileDrawerOpen) && <span className="text-sm">Cerrar Sesión</span>}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 flex items-center justify-between px-3 sm:px-6 bg-st-surface border-b border-st-border text-white shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Mobile hamburger menu toggle */}
            <button
              onClick={() => setIsMobileDrawerOpen(true)}
              className="p-1.5 rounded-lg text-st-muted hover:text-white hover:bg-white/5 transition-colors lg:hidden cursor-pointer"
              title="Abrir menú de navegación"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Desktop expand button if collapsed */}
            {isSidebarCollapsed && (
              <button
                onClick={() => setIsSidebarCollapsed(false)}
                className="hidden lg:flex p-1.5 rounded-lg text-st-muted hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                title="Expandir menú lateral"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            {/* Mobile Header Brand Display */}
            <div className="flex items-center gap-2 lg:hidden min-w-0">
              <span className="text-xs sm:text-sm font-bold tracking-wider text-white truncate max-w-[130px] sm:max-w-[200px]">
                {scope === 'CLIENTE' ? (tenantShortName || 'STARMONITOR') : 'STARMONITOR'}
              </span>
            </div>
          </div>

          <div className="flex-1 flex justify-center px-2 min-w-0">
            {scope === 'RESELLER_CONTEXT' && (
              <div className="relative max-w-[160px] sm:max-w-xs md:max-w-sm w-full">
                <button
                  onClick={() => setTenantDropdownOpen(!tenantDropdownOpen)}
                  className="flex items-center justify-between w-full gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 bg-st-bg border border-st-border rounded-lg hover:border-st-accent/50 transition-colors"
                >
                  <span className="hidden sm:inline text-xs font-bold text-st-muted uppercase">Cliente:</span>
                  <span className="text-xs sm:text-sm font-bold text-white truncate">{activeTenantName}</span>
                  <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-st-muted shrink-0" />
                </button>

                {tenantDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setTenantDropdownOpen(false)} />
                    <div className="absolute top-full left-0 mt-2 w-64 rounded-lg bg-st-surface border border-st-border shadow-2xl py-1 z-20">
                      <button
                        onClick={() => {
                          setTenantDropdownOpen(false);
                          navigate('/reseller/dashboard');
                        }}
                        className={`w-full text-left px-4 py-2 text-sm transition-colors ${activeTenantId === null ? 'bg-white/10 text-white font-bold' : 'text-st-muted hover:text-white hover:bg-white/5'}`}
                      >
                        [ Todos los clientes ]
                      </button>
                      <div className="h-px bg-st-border my-1" />
                      {DEMO_TENANTS.map(t => (
                        <button
                          key={t.id}
                          onClick={() => {
                            setTenantDropdownOpen(false);
                            navigate(`/reseller/clientes/${t.id}/dashboard`);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm transition-colors ${activeTenantId === t.id ? 'bg-white/10 text-white font-bold' : 'text-st-muted hover:text-white hover:bg-white/5'}`}
                        >
                          {t.name}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <button
              onClick={toggleThemeMode}
              className="p-1.5 sm:p-2 rounded-lg bg-st-bg border border-st-border text-st-muted hover:text-st-primary transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
              title={`Cambiar a tema ${themeMode === 'dark' ? 'claro' : 'oscuro'}`}
            >
              {themeMode === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span className="hidden sm:inline text-st-primary">Claro</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-blue-500" />
                  <span className="hidden sm:inline text-st-primary">Oscuro</span>
                </>
              )}
            </button>

            <div
              className="relative cursor-pointer p-1.5 rounded-full text-st-muted hover:text-white hover:bg-white/5 transition-colors"
              onClick={() => navigate(`${prefix}/alertas`)}
              title="Alertas"
            >
              <Bell className="w-5 h-5" />
              {criticalAlertsCount > 0 && (
                <span className="absolute top-0.5 right-0.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-st-offline opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-st-offline"></span>
                </span>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2 sm:gap-3 p-1 rounded-lg hover:bg-white/5 text-left focus:outline-none transition-colors cursor-pointer"
              >
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-st-bg border border-st-border flex items-center justify-center overflow-hidden shadow-sm shrink-0">
                  {userFotoUrl && !imageHasError ? (
                    <img 
                      src={buildAvatarUrl(userFotoUrl, avatarVersion)} 
                      alt="User" 
                      className="w-full h-full object-cover" 
                      onError={() => setImageHasError(true)}
                    />
                  ) : (
                    <div className="w-full h-full bg-st-bg text-st-primary font-bold flex items-center justify-center text-sm sm:text-lg">
                      {userName.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="hidden md:block text-right">
                  <div className="text-sm font-semibold leading-tight text-white truncate max-w-[130px]">{userName}</div>
                  <div className="text-xs leading-tight text-st-muted">{scope === 'CLIENTE' ? 'Cliente' : 'Administrador'}</div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-st-muted" />
              </button>

              {profileDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setProfileDropdownOpen(false)} />
                  <div className="absolute right-0 mt-2 w-56 rounded-xl bg-st-surface border border-st-border shadow-2xl py-2 z-20 text-white">
                    <button onClick={() => { setProfileDropdownOpen(false); navigate(`${prefix}/perfil`); }} className="w-full text-left px-5 py-2.5 text-[15px] hover:bg-white/5 transition-colors cursor-pointer">
                      Mi Perfil
                    </button>
                    <button onClick={() => { setProfileDropdownOpen(false); navigate(`${prefix}/perfil/password`); }} className="w-full text-left px-5 py-2.5 text-[15px] hover:bg-white/5 transition-colors cursor-pointer">
                      Cambiar contraseña
                    </button>
                    <div className="h-px bg-st-border my-2" />
                    <button onClick={() => { setProfileDropdownOpen(false); handleLogout(); }} className="w-full text-left px-5 py-2.5 text-[15px] text-[#EF4444] hover:bg-red-500/10 transition-colors flex items-center gap-2 cursor-pointer">
                      <LogOut className="w-4 h-4" /> Cerrar Sesión
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-st-bg p-3 sm:p-4 md:p-6 custom-scrollbar min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
