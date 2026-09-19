import React, { useEffect, useState } from 'react';
import client from '../../api/client';
import { Save, AlertTriangle, ShieldCheck } from 'lucide-react';

interface Role {
  id: number;
  codigo: string;
  descripcion: string;
}

interface MenuItem {
  id: number;
  codigo: string;
  nombre: string;
  path: string;
}

interface MenuModule {
  id: number;
  codigo: string;
  titulo: string;
  items: MenuItem[];
}

const PermisosMenu: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<number | null>(null);
  const [modulos, setModulos] = useState<MenuModule[]>([]);
  const [activeModulos, setActiveModulos] = useState<number[]>([]);
  const [activeItems, setActiveItems] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [resRoles, resModulos] = await Promise.all([
        client.get('/menus/roles'),
        client.get('/menus/modulos')
      ]);
      setRoles(resRoles.data);
      setModulos(resModulos.data);
      if (resRoles.data.length > 0) {
        handleRoleSelect(resRoles.data[0].id);
      }
    } catch (error) {
      console.error(error);
      setMessage({ text: 'Error al cargar los datos iniciales', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleSelect = async (roleId: number) => {
    setSelectedRole(roleId);
    setMessage(null);
    try {
      const res = await client.get(`/menus/roles/${roleId}/modulos`);
      setActiveModulos(res.data.modulos || []);
      setActiveItems(res.data.items || []);
    } catch (error) {
      console.error(error);
    }
  };

  const handleToggleModule = (mod: MenuModule) => {
    const isCurrentlyActive = activeModulos.includes(mod.id);
    
    // Si se desactiva el módulo principal, desactivar todos sus items también
    if (isCurrentlyActive) {
      setActiveModulos(prev => prev.filter(id => id !== mod.id));
      setActiveItems(prev => {
        const itemIds = mod.items.map(it => it.id);
        return prev.filter(id => !itemIds.includes(id));
      });
    } else {
      // Si se activa el módulo, activar también todos sus items por defecto
      setActiveModulos(prev => [...prev, mod.id]);
      setActiveItems(prev => {
        const newItemIds = mod.items.map(it => it.id).filter(id => !prev.includes(id));
        return [...prev, ...newItemIds];
      });
    }
  };

  const handleToggleItem = (e: React.MouseEvent, itemId: number, mod: MenuModule) => {
    e.stopPropagation(); // Evitar que se active el toggle del modulo padre
    
    // Ensure module is active if an item is being activated
    if (!activeItems.includes(itemId) && !activeModulos.includes(mod.id)) {
      setActiveModulos(prev => [...prev, mod.id]);
    }
    
    setActiveItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleSave = async () => {
    if (!selectedRole) return;
    setSaving(true);
    setMessage(null);
    try {
      await client.post(`/menus/roles/${selectedRole}/modulos`, {
        modulos: activeModulos,
        items: activeItems
      });
      setMessage({ text: 'Permisos actualizados correctamente', type: 'success' });
      
      setTimeout(() => {
         window.location.reload();
      }, 1500);

    } catch (error) {
      console.error(error);
      setMessage({ text: 'Error al guardar los permisos', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-st-muted text-center animate-pulse">Cargando módulos de configuración...</div>;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-st-accent" />
            Gestión de Permisos de Menú
          </h1>
          <p className="text-st-muted">Habilita o deshabilita la visibilidad de los módulos y submenús según el perfil.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !selectedRole}
          className="flex items-center gap-2 px-6 py-2.5 bg-st-accent hover:bg-st-accent/80 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${message.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
          {message.type === 'error' && <AlertTriangle className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-8">
        {/* Selector de Rol */}
        <div className="w-full md:w-1/4">
          <h2 className="text-lg font-bold text-white mb-4 uppercase tracking-wider text-sm border-b border-white/10 pb-2">Perfil a Configurar</h2>
          <div className="space-y-2">
            {roles.map(rol => (
              <button
                key={rol.id}
                onClick={() => handleRoleSelect(rol.id)}
                className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                  selectedRole === rol.id 
                    ? 'bg-st-accent/10 border-st-accent text-st-accent font-bold'
                    : 'bg-st-surface border-st-border text-st-muted hover:border-white/30 hover:text-white'
                }`}
              >
                {rol.codigo}
                <div className="text-xs opacity-70 mt-1 font-normal">{rol.descripcion}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Lista de Módulos */}
        <div className="w-full md:w-3/4">
          <h2 className="text-lg font-bold text-white mb-4 uppercase tracking-wider text-sm border-b border-white/10 pb-2">Módulos y Submenús</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {modulos.map(mod => {
              const isModActive = activeModulos.includes(mod.id);
              return (
                <div 
                  key={mod.id} 
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isModActive 
                      ? 'bg-st-accent/5 border-st-accent/30 shadow-[0_0_15px_rgba(var(--accent-color-rgb),0.1)]' 
                      : 'bg-st-surface border-st-border opacity-70 hover:opacity-100 hover:border-white/20'
                  }`}
                  onClick={() => handleToggleModule(mod)}
                >
                  <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
                    <h3 className={`font-bold uppercase tracking-wider text-sm ${isModActive ? 'text-white' : 'text-st-muted'}`}>
                      {mod.titulo}
                    </h3>
                    <div className={`w-10 h-5 rounded-full p-1 transition-colors ${isModActive ? 'bg-st-accent' : 'bg-gray-600'}`}>
                      <div className={`w-3 h-3 rounded-full bg-white transition-transform ${isModActive ? 'translate-x-5' : 'translate-x-0'}`} />
                    </div>
                  </div>
                  
                  <ul className="space-y-2 mt-2">
                    {mod.items.map(item => {
                      const isItemActive = activeItems.includes(item.id);
                      return (
                        <li 
                          key={item.id} 
                          className="flex items-center justify-between p-1.5 rounded hover:bg-white/5 transition-colors"
                          onClick={(e) => handleToggleItem(e, item.id, mod)}
                        >
                          <span className={`text-xs ${isItemActive ? 'text-white font-medium' : 'text-st-muted'}`}>
                            {item.nombre}
                          </span>
                          <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${isItemActive ? 'bg-st-accent/80' : 'bg-gray-700'}`}>
                            <div className={`w-3 h-3 rounded-full bg-white transition-transform ${isItemActive ? 'translate-x-4' : 'translate-x-0'}`} />
                          </div>
                        </li>
                      );
                    })}
                    {mod.items.length === 0 && (
                      <li className="text-xs text-st-muted italic px-2">Sin submenús</li>
                    )}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PermisosMenu;
