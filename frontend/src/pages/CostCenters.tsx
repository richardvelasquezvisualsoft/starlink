import React, { useState, useEffect } from 'react';
import { Database, Plus, Search, Filter } from 'lucide-react';
import client from '../api/client';

interface CostCenter {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string;
  moneda_referencia: string;
  activo: boolean;
}

const CostCenters: React.FC = () => {
  const [centers, setCenters] = useState<CostCenter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCenters = async () => {
      try {
        const { data } = await client.get('/centros-costos');
        setCenters(data);
      } catch (error) {
        console.error('Error fetching cost centers:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCenters();
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Database className="w-6 h-6 text-st-accent" />
            Centros de Costos
          </h1>
          <p className="text-st-muted mt-1 text-sm">Administración y asignación de presupuestos por centro operativo</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button className="btn-primary flex items-center gap-2 justify-center w-full md:w-auto">
            <Plus className="w-4 h-4" /> Nuevo Centro
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card bg-gradient-to-br from-st-card to-st-card/50 border border-white/5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-st-muted font-medium mb-1">Total Activos</p>
              <h3 className="text-3xl font-bold text-white">{centers.length}</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-st-accent/20 flex items-center justify-center">
              <Database className="w-5 h-5 text-st-accent" />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-white/10 flex flex-col sm:flex-row gap-4 justify-between items-center bg-white/5">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-st-muted" />
            <input 
              type="text" 
              placeholder="Buscar por código o nombre..." 
              className="w-full bg-black/20 border border-white/10 rounded-md py-2 pl-9 pr-4 text-sm text-white placeholder:text-st-muted focus:outline-none focus:border-st-accent/50 focus:ring-1 focus:ring-st-accent/50 transition-all"
            />
          </div>
          <button className="btn-secondary flex items-center gap-2 text-sm w-full sm:w-auto justify-center">
            <Filter className="w-4 h-4" /> Filtrar
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-black/20 text-st-muted">
              <tr>
                <th className="px-6 py-4 font-semibold tracking-wider">Código</th>
                <th className="px-6 py-4 font-semibold tracking-wider">Nombre</th>
                <th className="px-6 py-4 font-semibold tracking-wider">Moneda</th>
                <th className="px-6 py-4 font-semibold tracking-wider">Estado</th>
                <th className="px-6 py-4 font-semibold tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-st-muted">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-st-accent border-t-transparent rounded-full animate-spin"></div>
                      Cargando centros de costos...
                    </div>
                  </td>
                </tr>
              ) : centers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-st-muted">
                    No se encontraron centros de costos configurados para este tenant.
                  </td>
                </tr>
              ) : (
                centers.map((c) => (
                  <tr key={c.id} className="hover:bg-white/[0.02] transition-colors group cursor-pointer">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-white">{c.codigo}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-st-gray">
                      <div>
                        <p className="text-white group-hover:text-st-accent transition-colors">{c.nombre}</p>
                        <p className="text-xs text-st-muted mt-0.5">{c.descripcion}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-st-gray">{c.moneda_referencia || 'USD'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        c.activo ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {c.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button className="text-st-accent hover:text-white transition-colors text-sm font-medium">Editar</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CostCenters;
