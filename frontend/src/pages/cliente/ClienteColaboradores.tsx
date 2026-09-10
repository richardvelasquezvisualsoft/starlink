import React, { useState } from 'react';
import { Search, Plus, Mail, Shield, UserX } from 'lucide-react';

export const ClienteColaboradores: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  
  const [colaboradores] = useState([
    { id: 1, nombre: 'Juan Pérez', email: 'juan.perez@empresa.com', rol: 'Administrador', estado: 'Activo', ultima_conexion: '2026-09-09 10:23' },
    { id: 2, nombre: 'María García', email: 'maria.garcia@empresa.com', rol: 'Supervisor', estado: 'Activo', ultima_conexion: '2026-09-08 15:45' },
    { id: 3, nombre: 'Carlos López', email: 'carlos.lopez@empresa.com', rol: 'Operador', estado: 'Inactivo', ultima_conexion: '2026-08-20 09:12' },
  ]);

  const filteredColaboradores = colaboradores.filter(c => 
    c.nombre.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans uppercase">Colaboradores</h1>
          <p className="text-xs text-st-muted mt-0.5">Gestión de accesos y roles para los usuarios de tu organización.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-st-accent text-white rounded-lg text-sm font-bold shadow-[0_0_15px_rgba(59,130,246,0.5)] hover:bg-blue-500 transition-colors">
          <Plus className="w-4 h-4" /> Nuevo Colaborador
        </button>
      </div>

      <div className="bg-st-surface border border-st-border rounded-xl flex flex-col min-h-[400px]">
        <div className="p-4 border-b border-st-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-st-muted" />
            <input
              type="text"
              placeholder="Buscar por nombre o correo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-st-bg border border-st-border rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:border-st-accent outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-st-bg/80 text-st-muted uppercase tracking-wider font-semibold border-b border-st-border">
                <th className="py-3 px-4">Colaborador</th>
                <th className="py-3 px-4">Rol</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <th className="py-3 px-4">Última Conexión</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredColaboradores.map((col) => (
                <tr key={col.id} className="border-b border-st-border/50 hover:bg-white/5 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-st-accent/20 flex items-center justify-center text-st-accent font-bold text-xs uppercase">
                        {col.nombre.substring(0, 2)}
                      </div>
                      <div>
                        <div className="text-white font-bold text-sm">{col.nombre}</div>
                        <div className="text-xs text-st-muted flex items-center gap-1"><Mail className="w-3 h-3" /> {col.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="flex items-center gap-1 text-st-muted text-xs">
                      <Shield className="w-3 h-3" /> {col.rol}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                      col.estado === 'Activo' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                    }`}>
                      {col.estado}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-st-muted text-xs font-mono">
                    {col.ultima_conexion}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button className="p-1.5 hover:bg-white/10 rounded text-st-muted hover:text-white transition-colors" title="Desactivar Usuario">
                      <UserX className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredColaboradores.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-st-muted text-sm">
                    No se encontraron colaboradores.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ClienteColaboradores;
