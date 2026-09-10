import React, { useState } from 'react';
import { LayoutList, Building, MapPin, GitMerge, Plus, ChevronRight } from 'lucide-react';

export const ClienteHierarchy: React.FC = () => {
  const [niveles] = useState([
    { numero_nivel: 1, nombre_nivel: 'Empresa', activo: true },
    { numero_nivel: 2, nombre_nivel: 'Región', activo: true },
    { numero_nivel: 3, nombre_nivel: 'Sucursal', activo: true }
  ]);
  
  const [unidades] = useState([
    { id: 1, numero_nivel: 1, codigo: 'HQ', nombre: 'Oficina Central', parent_id: null, activo: true },
    { id: 2, numero_nivel: 2, codigo: 'NORTE', nombre: 'Región Norte', parent_id: 1, activo: true },
    { id: 3, numero_nivel: 3, codigo: 'SUC-01', nombre: 'Sucursal Piura', parent_id: 2, activo: true },
    { id: 4, numero_nivel: 3, codigo: 'SUC-02', nombre: 'Sucursal Tumbes', parent_id: 2, activo: true }
  ]);

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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <LayoutList className="w-6 h-6 text-st-accent" />
            Jerarquía Organizacional
          </h1>
          <p className="text-st-muted mt-1 text-sm">Configuración de niveles y estructura organizativa de la empresa.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button className="flex items-center gap-2 px-4 py-2 bg-st-accent text-white rounded-lg text-sm font-bold hover:bg-blue-500 transition-colors">
            <Plus className="w-4 h-4" /> Agregar Unidad
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="card">
            <div className="p-4 border-b border-white/5">
              <h2 className="text-lg font-bold text-white">Niveles de Jerarquía</h2>
            </div>
            <div className="p-4 space-y-3">
              {niveles.map(nivel => (
                <div key={nivel.numero_nivel} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded bg-st-accent/20 text-st-accent flex items-center justify-center font-bold text-xs">
                      {nivel.numero_nivel}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{nivel.nombre_nivel}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    nivel.activo ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                  }`}>
                    {nivel.activo ? 'ACTIVO' : 'INACTIVO'}
                  </span>
                </div>
              ))}
              <div className="mt-4 p-3 border border-dashed border-white/20 rounded-lg text-center text-st-muted text-sm cursor-not-allowed">
                Límite máximo de niveles alcanzado
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="card h-full">
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Estructura Organizacional</h2>
            </div>
            <div className="p-6">
              {renderUnitsTree(null, 1)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClienteHierarchy;
