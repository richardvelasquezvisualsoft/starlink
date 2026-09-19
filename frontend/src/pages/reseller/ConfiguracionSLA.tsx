import { useState, useEffect } from 'react';
import client from '../../api/client';
import { Plus } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function ConfiguracionSLA() {
  const [politicas, setPoliticas] = useState<any[]>([]);
  const [diasNoLaborables, setDiasNoLaborables] = useState<any[]>([]);
  const [_tiposSolicitud, setTiposSolicitud] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resPol, resDias, resTipos] = await Promise.all([
        client.get('/solicitudes/sla/politicas'),
        client.get('/solicitudes/sla/dias-no-laborables'),
        client.get('/solicitudes/tipos')
      ]);
      setPoliticas(resPol.data);
      setDiasNoLaborables(resDias.data);
      setTiposSolicitud(resTipos.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 lg:space-y-8 animate-fade-in max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tight font-sans">Configuración SLA</h1>
          <p className="text-sm text-st-muted mt-1">Definición de políticas y días no laborables para tiempos de atención.</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-st-surface border border-st-border rounded-xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-white font-sans uppercase">Políticas SLA Vigentes</h2>
            <p className="text-xs text-st-muted mt-1">Definición de tiempos máximos de primera atención y resolución por tipo de solicitud y prioridad.</p>
          </div>
          <button className="flex items-center gap-2 px-3 py-1.5 bg-st-accent text-white rounded hover:bg-st-accent/90 transition-all text-xs font-bold uppercase tracking-wider">
            <Plus className="w-3.5 h-3.5" /> Nueva Política
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/20 border-y border-st-border">
                <th className="p-3 text-[10px] font-bold text-st-muted uppercase tracking-wider">Tipo</th>
                <th className="p-3 text-[10px] font-bold text-st-muted uppercase tracking-wider">Prioridad</th>
                <th className="p-3 text-[10px] font-bold text-st-muted uppercase tracking-wider">1ª Atención</th>
                <th className="p-3 text-[10px] font-bold text-st-muted uppercase tracking-wider">Resolución</th>
                <th className="p-3 text-[10px] font-bold text-st-muted uppercase tracking-wider">Tipo Tiempo</th>
                <th className="p-3 text-[10px] font-bold text-st-muted uppercase tracking-wider">Pausa Info Cliente</th>
                <th className="p-3 text-[10px] font-bold text-st-muted uppercase tracking-wider text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-st-border/50 text-sm">
              {loading ? (
                <tr><td colSpan={7} className="p-4 text-center text-st-muted text-sm">Cargando...</td></tr>
              ) : politicas.length === 0 ? (
                <tr><td colSpan={7} className="p-4 text-center text-st-muted text-sm">No hay políticas SLA configuradas.</td></tr>
              ) : (
                politicas.map((p) => (
                  <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-3 text-white">{p.tipo_solicitud_nombre}</td>
                    <td className="p-3">
                      <span className="text-[10px] font-bold text-st-muted bg-black/30 px-1.5 py-0.5 rounded">{p.prioridad}</span>
                    </td>
                    <td className="p-3 text-white">{p.minutos_primera_atencion} min</td>
                    <td className="p-3 text-white">{p.minutos_resolucion} min</td>
                    <td className="p-3 text-st-muted text-xs">{p.tipo_tiempo}</td>
                    <td className="p-3 text-white">{p.pausar_requiere_informacion ? 'Sí' : 'No'}</td>
                    <td className="p-3 text-right">
                      <button className="text-st-accent hover:text-white transition-colors text-xs font-bold uppercase tracking-wider">Editar</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-st-surface border border-st-border rounded-xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-white font-sans uppercase">Días No Laborables</h2>
            <p className="text-xs text-st-muted mt-1">Fechas exceptuadas del cálculo de SLA cuando el tipo de tiempo es HABIL.</p>
          </div>
          <button className="flex items-center gap-2 px-3 py-1.5 bg-st-accent text-white rounded hover:bg-st-accent/90 transition-all text-xs font-bold uppercase tracking-wider">
            <Plus className="w-3.5 h-3.5" /> Agregar Día
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/20 border-y border-st-border">
                <th className="p-3 text-[10px] font-bold text-st-muted uppercase tracking-wider">Fecha</th>
                <th className="p-3 text-[10px] font-bold text-st-muted uppercase tracking-wider">Descripción</th>
                <th className="p-3 text-[10px] font-bold text-st-muted uppercase tracking-wider">Estado</th>
                <th className="p-3 text-[10px] font-bold text-st-muted uppercase tracking-wider text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-st-border/50 text-sm">
              {loading ? (
                <tr><td colSpan={4} className="p-4 text-center text-st-muted text-sm">Cargando...</td></tr>
              ) : diasNoLaborables.length === 0 ? (
                <tr><td colSpan={4} className="p-4 text-center text-st-muted text-sm">No hay días no laborables registrados.</td></tr>
              ) : (
                diasNoLaborables.map((d) => (
                  <tr key={d.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-3 text-white font-mono text-xs">{format(new Date(d.fecha), "dd MMM yyyy", { locale: es })}</td>
                    <td className="p-3 text-st-muted">{d.descripcion}</td>
                    <td className="p-3">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${d.activo ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                        {d.activo ? 'ACTIVO' : 'INACTIVO'}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button className="text-st-accent hover:text-white transition-colors text-xs font-bold uppercase tracking-wider">Desactivar</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </div>
  );
}
