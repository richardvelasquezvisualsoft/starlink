import React, { useState, useEffect } from 'react';
import { Users, Plus, LayoutList, ChevronRight, MapPin, Building, GitMerge } from 'lucide-react';
import client from '../api/client';

interface NivelConfig {
  numero_nivel: number;
  nombre_nivel: string;
  nombre_nivel_plural: string;
  activo: boolean;
}

interface UnidadOrg {
  id: number;
  numero_nivel: number;
  codigo: string;
  nombre: string;
  parent_id: number | null;
  activo: boolean;
}

const Hierarchy: React.FC = () => {
  const [niveles, setNiveles] = useState<NivelConfig[]>([]);
  const [unidades, setUnidades] = useState<UnidadOrg[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [nivelesRes, unidadesRes] = await Promise.all([
          client.get('/niveles-organizacion'),
          client.get('/unidades-organizacionales')
        ]);
        setNiveles(nivelesRes.data);
        setUnidades(unidadesRes.data);
      } catch (error) {
        console.error('Error fetching hierarchy:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getIconForLevel = (nivel: number) => {
    if (nivel === 1) return <Building className="w-5 h-5" />;
    if (nivel === 2) return <MapPin className="w-5 h-5" />;
    return <GitMerge className="w-5 h-5" />;
  };

  const renderUnitsTree = (parentId: number | null, currentLevel: number) => {
    const children = unidades.filter(u => u.parent_id === parentId);
    if (children.length === 0) return null;

    return (
      <div className={`space-y-2 ${parentId !== null ? 'pl-8 mt-2 border-l border-white/10' : ''}`}>
        {children.map(unit => (
          <div key={unit.id} className="group">
            <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-white/5 flex items-center justify-center text-st-accent">
                  {getIconForLevel(unit.numero_nivel)}
                </div>
                <div>
                  <h4 className="text-white font-medium group-hover:text-st-accent transition-colors">{unit.nombre}</h4>
                  <p className="text-xs text-st-muted">Código: {unit.codigo}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  unit.activo ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}>
                  {unit.activo ? 'Activo' : 'Inactivo'}
                </span>
                <ChevronRight className="w-4 h-4 text-st-muted opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
            {renderUnitsTree(unit.id, currentLevel + 1)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <LayoutList className="w-6 h-6 text-st-accent" />
            Jerarquía Organizacional
          </h1>
          <p className="text-st-muted mt-1 text-sm">Configuración de niveles y estructura organizativa</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button className="btn-primary flex items-center gap-2 justify-center w-full md:w-auto">
            <Plus className="w-4 h-4" /> Agregar Unidad
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-st-muted gap-4 card">
          <div className="w-8 h-8 border-2 border-st-accent border-t-transparent rounded-full animate-spin"></div>
          Cargando estructura...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Levels Configuration (Left Sidebar) */}
          <div className="col-span-1 space-y-4">
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <SettingsIcon className="w-4 h-4 text-st-muted" /> Configuración de Niveles
              </h3>
              <div className="space-y-3">
                {niveles.map((nivel) => (
                  <div key={nivel.numero_nivel} className="p-3 rounded-lg bg-black/20 border border-white/5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-st-accent bg-st-accent/10 px-2 py-0.5 rounded">
                        Nivel {nivel.numero_nivel}
                      </span>
                    </div>
                    <p className="text-sm text-white font-medium">{nivel.nombre_nivel}</p>
                    <p className="text-xs text-st-muted">Plural: {nivel.nombre_nivel_plural || `${nivel.nombre_nivel}s`}</p>
                  </div>
                ))}
                {niveles.length === 0 && (
                  <p className="text-sm text-st-muted italic">No hay niveles configurados.</p>
                )}
              </div>
            </div>
          </div>

          {/* Tree View (Main Content) */}
          <div className="col-span-1 lg:col-span-3">
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-6 flex items-center gap-2">
                <Users className="w-4 h-4 text-st-muted" /> Estructura de Unidades
              </h3>
              {unidades.length === 0 ? (
                <div className="text-center py-12 text-st-muted">
                  <LayoutList className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>No se encontraron unidades organizacionales configuradas.</p>
                </div>
              ) : (
                <div className="overflow-x-auto pb-4">
                  <div className="min-w-[600px]">
                    {renderUnitsTree(null, 1)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Pequeño SVG inline para Settings que faltó importar
const SettingsIcon = (props: any) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export default Hierarchy;
