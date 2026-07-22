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
  User,
  Menu,
  Satellite
} from 'lucide-react';
import client from '../api/client';

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

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'REPORTES': true,
    'OPERACION': true,
    'MANTENIMIENTO': false
  });
  const [favorites, setFavorites] = useState<string[]>([]);
  const [criticalAlertsCount, setCriticalAlertsCount] = useState(0);
  const [userName, setUserName] = useState('Administrador1');
  const [userEmail, setUserEmail] = useState('admin@starlink.com');

  useEffect(() => {
    // Load favorites from localStorage
    const savedFavs = localStorage.getItem('starlink_favorites');
    if (savedFavs) {
      setFavorites(JSON.parse(savedFavs));
    }
    
    // Load user data
    const userJson = localStorage.getItem('starlink_user');
    if (userJson) {
      try {
        const u = JSON.parse(userJson);
        setUserName(u.nombre || 'Administrador1');
        setUserEmail(u.email || 'admin@starlink.com');
      } catch (e) {}
    }

    // Fetch active critical alerts for the notification count
    const fetchAlerts = async () => {
      try {
        const res = await client.get('/alertas?activa=true');
        const criticals = res.data.filter((a: any) => a.catalogo_alerta?.criticidad === 'critical');
        setCriticalAlertsCount(criticals.length);
      } catch (err) {}
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const toggleFavorite = (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    let updated: string[];
    if (favorites.includes(itemId)) {
      updated = favorites.filter(id => id !== itemId);
    } else {
      updated = [...favorites, itemId];
    }
    setFavorites(updated);
    localStorage.setItem('starlink_favorites', JSON.stringify(updated));
  };

  const handleLogout = () => {
    localStorage.removeItem('starlink_token');
    localStorage.removeItem('starlink_user');
    navigate('/login');
  };

  const sections: MenuSection[] = [
    {
      title: 'REPORTES',
      icon: BarChart3,
      items: [
        { id: 'rep-consumo', name: 'Consumo de Datos', path: '/reports/consumption', icon: BarChart3 },
        { id: 'rep-calidad', name: 'Calidad & Latencia', path: '/reports/telemetry', icon: Radio }
      ]
    },
    {
      title: 'OPERACION',
      icon: Radio,
      items: [
        { id: 'op-alertas', name: 'Alertas de Flota', path: '/operation/alerts', icon: AlertTriangle },
        { id: 'op-geoloc', name: 'Geolocalización', path: '/operation/geo', icon: MapPin }
      ]
    },
    {
      title: 'MANTENIMIENTO',
      icon: Settings,
      items: [
        { id: 'mant-cuentas', name: 'Cuentas', path: '/maintenance/accounts', icon: Database },
        { id: 'mant-disp', name: 'Dispositivos (UT)', path: '/maintenance/devices', icon: Satellite },
        { id: 'mant-lineas', name: 'Líneas de Servicio', path: '/maintenance/lines', icon: Radio },
        { id: 'mant-user', name: 'Usuarios', path: '/maintenance/users', icon: Users }
      ]
    }
  ];

  // Helper to flat list of items for Favorites rendering
  const allItems = [
    { id: 'dashboard', name: 'Dashboard General', path: '/dashboard', icon: LayoutDashboard },
    ...sections.flatMap(s => s.items)
  ];

  const activeFavItems = allItems.filter(item => favorites.includes(item.id));

  return (
    <div className="flex h-screen overflow-hidden bg-st-bg text-st-primary font-sans">
      {/* Sidebar */}
      <aside className={`flex flex-col bg-st-surface border-r border-st-border transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-72'}`}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-st-border">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-st-accent/10 text-st-accent flex-shrink-0 animate-pulse">
              <Satellite className="w-6 h-6" />
            </div>
            {!isSidebarCollapsed && (
              <span className="text-lg font-bold tracking-wider text-white whitespace-nowrap">STARLINK FLEET</span>
            )}
          </div>
          {!isSidebarCollapsed && (
            <button onClick={() => setIsSidebarCollapsed(true)} className="p-1 rounded text-st-muted hover:text-white hover:bg-white/5">
              <Menu className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Sidebar Menu Scrollable */}
        <div className="flex-1 overflow-y-auto py-4 px-2 space-y-4">
          {isSidebarCollapsed && (
            <button onClick={() => setIsSidebarCollapsed(false)} className="mx-auto block p-2 rounded text-st-muted hover:text-white hover:bg-white/5 mb-4">
              <Menu className="w-6 h-6" />
            </button>
          )}

          {/* Favoritos Group */}
          {activeFavItems.length > 0 && !isSidebarCollapsed && (
            <div className="space-y-1">
              <p className="px-3 text-[10px] font-bold text-st-muted uppercase tracking-widest flex items-center gap-1.5">
                <Star className="w-3 h-3 text-amber-500 fill-amber-500" /> FAVORITOS
              </p>
              {activeFavItems.map(item => (
                <div
                  key={`fav-${item.id}`}
                  onClick={() => navigate(item.path)}
                  className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${location.pathname === item.path ? 'bg-white/10 text-white font-semibold' : 'text-st-muted hover:bg-white/5 hover:text-white'}`}
                >
                  <div className="flex items-center gap-2.5">
                    <item.icon className="w-4 h-4" />
                    <span className="text-sm">{item.name}</span>
                  </div>
                  <Star
                    onClick={(e) => toggleFavorite(e, item.id)}
                    className="w-3.5 h-3.5 text-amber-500 fill-amber-500 hover:scale-125 transition-transform"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Main Dashboard Link */}
          <div className="space-y-1">
            <div
              onClick={() => navigate('/dashboard')}
              className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${location.pathname === '/dashboard' ? 'bg-[#D97706]/20 border border-[#D97706]/40 text-white font-semibold' : 'text-st-muted hover:bg-white/5 hover:text-white'}`}
            >
              <div className="flex items-center gap-2.5">
                <LayoutDashboard className="w-4 h-4 text-[#D97706]" />
                {!isSidebarCollapsed && <span className="text-sm">Dashboard General</span>}
              </div>
              {!isSidebarCollapsed && (
                <button onClick={(e) => toggleFavorite(e, 'dashboard')} className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <Star className={`w-3.5 h-3.5 ${favorites.includes('dashboard') ? 'text-amber-500 fill-amber-500' : 'text-st-muted hover:text-white'}`} />
                </button>
              )}
            </div>
          </div>

          {/* Sections Accordion */}
          {sections.map(sec => {
            const isExpanded = expandedSections[sec.title];
            return (
              <div key={sec.title} className="space-y-1">
                {!isSidebarCollapsed ? (
                  <button
                    onClick={() => toggleSection(sec.title)}
                    className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-bold text-st-muted hover:text-white uppercase tracking-widest"
                  >
                    <span className="flex items-center gap-1.5">
                      <sec.icon className="w-3.5 h-3.5" />
                      {sec.title}
                    </span>
                    {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  </button>
                ) : (
                  <div className="w-full h-px bg-st-border my-2" />
                )}

                {/* Section Items */}
                {(isExpanded || isSidebarCollapsed) && sec.items.map(item => (
                  <div
                    key={item.id}
                    onClick={() => navigate(item.path)}
                    className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${location.pathname === item.path ? 'bg-white/10 text-white font-semibold' : 'text-st-muted hover:bg-white/5 hover:text-white'}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <item.icon className={`w-4 h-4 ${location.pathname === item.path ? 'text-st-accent' : 'text-st-muted group-hover:text-white'}`} />
                      {!isSidebarCollapsed && <span className="text-sm">{item.name}</span>}
                    </div>
                    {!isSidebarCollapsed && (
                      <button onClick={(e) => toggleFavorite(e, item.id)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Star className={`w-3.5 h-3.5 ${favorites.includes(item.id) ? 'text-amber-500 fill-amber-500' : 'text-st-muted hover:text-white'}`} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Sidebar Footer - Cerrar Sesion */}
        <div className="p-3 border-t border-st-border">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[#EF4444] hover:bg-red-500/10 transition-colors cursor-pointer text-left"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!isSidebarCollapsed && <span className="text-sm font-semibold">Cerrar Sesión</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-6 bg-st-surface border-b border-st-border">
          {/* Left: Collapse Toggle (on collapsed sidebar only) */}
          <div className="flex items-center gap-4">
            {isSidebarCollapsed && (
              <button onClick={() => setIsSidebarCollapsed(false)} className="p-1 rounded text-st-muted hover:text-white hover:bg-white/5">
                <Menu className="w-5 h-5" />
              </button>
            )}
            <span className="text-xs font-semibold text-st-muted select-none">SYSTEM STATUS: <span className="text-st-online">ONLINE</span></span>
          </div>

          {/* Right: Notifications & Profile */}
          <div className="flex items-center gap-5">
            {/* Notification Bell */}
            <div className="relative cursor-pointer p-1 rounded-full text-st-muted hover:text-white hover:bg-white/5" onClick={() => navigate('/operation/alerts')}>
              <Bell className="w-5 h-5" />
              {criticalAlertsCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-st-offline opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-st-offline"></span>
                </span>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-white/5 text-left focus:outline-none"
              >
                <div className="w-8 h-8 rounded-full bg-st-accent/20 border border-st-accent/40 flex items-center justify-center text-st-accent font-bold text-sm">
                  {userName.charAt(0)}
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-bold text-white leading-tight">{userName}</p>
                  <p className="text-xs text-st-muted leading-tight">Administrador</p>
                </div>
                <ChevronDown className="w-4 h-4 text-st-muted" />
              </button>

              {profileDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setProfileDropdownOpen(false)} />
                  <div className="absolute right-0 mt-2 w-52 rounded-lg bg-st-surface border border-st-border shadow-2xl py-1 z-20">
                    <div className="px-4 py-2 border-b border-st-border">
                      <p className="text-xs text-st-muted">Usuario</p>
                      <p className="text-sm font-semibold text-white truncate">{userName}</p>
                      <p className="text-xs text-st-muted truncate">{userEmail}</p>
                    </div>
                    <button className="w-full text-left px-4 py-2 text-sm text-st-muted hover:text-white hover:bg-white/5 transition-colors">
                      Mi Perfil
                    </button>
                    <button className="w-full text-left px-4 py-2 text-sm text-st-muted hover:text-white hover:bg-white/5 transition-colors">
                      Cambiar contraseña
                    </button>
                    <div className="h-px bg-st-border my-1" />
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-[#EF4444] hover:bg-red-500/10 transition-colors font-semibold"
                    >
                      Cerrar Sesión
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Content Body Scrollable */}
        <main className="flex-1 overflow-y-auto bg-st-bg p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
