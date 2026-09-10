import { useState, useEffect } from 'react';
import { Shield, Lock, Search, Key, UserCheck, User, Unlock, Ban, RefreshCw, X } from 'lucide-react';
import client from '../../api/client';

export default function UsuariosAccesos() {
  const [loading, setLoading] = useState(true);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Drawer state
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'sesiones' | 'auditoria'>('general');
  
  // Drawer Data
  const [userSesiones, setUserSesiones] = useState<any[]>([]);
  const [userAuditoria, setUserAuditoria] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const fetchUsuarios = async () => {
    try {
      const res = await client.get('/usuarios');
      setUsuarios(res.data);
    } catch (error) {
      console.error(error);
      alert('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const openDrawer = (user: any) => {
    setSelectedUser(user);
    setActiveTab('general');
    setIsDrawerOpen(true);
    fetchUserDetails(user.id);
  };

  const fetchUserDetails = async (id: number) => {
    setLoadingDetails(true);
    try {
      const [sesRes, audRes] = await Promise.all([
        client.get(`/usuarios/${id}/sesiones`),
        client.get(`/usuarios/${id}/auditoria`)
      ]);
      setUserSesiones(sesRes.data);
      setUserAuditoria(audRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleBloquear = async () => {
    if (!selectedUser) return;
    if (!confirm(`¿Seguro que desea bloquear a ${selectedUser.nombre}?`)) return;
    try {
      await client.post(`/usuarios/${selectedUser.id}/bloquear`, null, { params: { motivo: 'Bloqueo manual administrativo' } });
      fetchUsuarios();
      setSelectedUser({ ...selectedUser, bloqueado_manual: true });
    } catch (error) {
      console.error(error);
    }
  };

  const handleDesbloquear = async () => {
    if (!selectedUser) return;
    if (!confirm(`¿Seguro que desea desbloquear a ${selectedUser.nombre}?`)) return;
    try {
      await client.post(`/usuarios/${selectedUser.id}/desbloquear`);
      fetchUsuarios();
      setSelectedUser({ ...selectedUser, bloqueado_manual: false, intentos_fallidos: 0, bloqueado_hasta: null });
    } catch (error) {
      console.error(error);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser) return;
    if (!confirm(`¿Forzar reseteo de contraseña para ${selectedUser.email}?`)) return;
    try {
      await client.post(`/usuarios/${selectedUser.id}/reset_password`);
      alert('Reseteo de contraseña iniciado. El usuario deberá cambiar su clave en el próximo login.');
      fetchUsuarios();
      setSelectedUser({ ...selectedUser, debe_cambiar_password: true });
    } catch (error) {
      console.error(error);
      alert('Error al reiniciar contraseña');
    }
  };

  const handleRevocarSesion = async (sesionId: number) => {
    if (!selectedUser) return;
    if (!confirm('¿Seguro que desea revocar esta sesión?')) return;
    try {
      await client.post(`/usuarios/${selectedUser.id}/sesiones/${sesionId}/revocar`);
      fetchUserDetails(selectedUser.id);
    } catch (error) {
      console.error(error);
      alert('Error al revocar sesión');
    }
  };

  const filtered = usuarios.filter(u => 
    u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white uppercase tracking-wider">Usuarios y Accesos</h1>
          <p className="text-sm text-st-muted mt-1">Gestión detallada de identidades, sesiones, bloqueos y auditoría individual.</p>
        </div>
      </div>

      <div className="bg-st-surface border border-st-border rounded-xl flex flex-col flex-1 overflow-hidden">
        <div className="p-4 border-b border-st-border flex items-center justify-between bg-black/20">
          <div className="relative w-64">
            <Search className="w-4 h-4 text-st-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Buscar por nombre o email..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-st-bg border border-st-border rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:border-st-accent focus:outline-none transition-colors"
            />
          </div>
          <div className="text-st-muted text-sm font-semibold">
            {filtered.length} Usuarios listados
          </div>
        </div>

        <div className="overflow-auto flex-1">
          <table className="w-full text-left text-sm text-st-muted">
            <thead className="text-xs uppercase bg-black/40 border-b border-st-border sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 font-bold tracking-wider">Usuario</th>
                <th className="px-6 py-4 font-bold tracking-wider">Rol / Alcance</th>
                <th className="px-6 py-4 font-bold tracking-wider">Estado</th>
                <th className="px-6 py-4 font-bold tracking-wider text-center">MFA</th>
                <th className="px-6 py-4 font-bold tracking-wider text-center">Intentos Fallidos</th>
                <th className="px-6 py-4 font-bold tracking-wider text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-st-border">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12">Cargando usuarios...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-st-muted">No se encontraron usuarios.</td></tr>
              ) : (
                filtered.map(u => {
                  const isBlocked = u.bloqueado_manual || (u.bloqueado_hasta && new Date(u.bloqueado_hasta) > new Date());
                  return (
                    <tr key={u.id} className="hover:bg-white/5 transition-colors group cursor-pointer" onClick={() => openDrawer(u)}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-st-bg border border-st-border flex items-center justify-center text-st-primary font-bold">
                            {u.nombre.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-white font-semibold group-hover:text-st-primary transition-colors">{u.nombre}</div>
                            <div className="text-xs text-st-muted">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          {u.roles?.map((r: any) => (
                            <span key={r.rol.id} className="px-2 py-0.5 bg-st-accent/10 text-st-accent text-xs rounded border border-st-accent/20 w-fit">
                              {r.rol.codigo}
                            </span>
                          ))}
                          <span className="text-xs mt-1">
                            {u.acceso_todos_tenants ? 'Global (Todos)' : `${u.tenant_usuarios?.length || 0} Tenants`}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {isBlocked ? (
                          <span className="flex items-center gap-1.5 text-red-500 font-semibold text-xs bg-red-500/10 px-2 py-1 rounded w-fit border border-red-500/20">
                            <Ban className="w-3.5 h-3.5" /> BLOQUEADO
                          </span>
                        ) : !u.activo ? (
                          <span className="flex items-center gap-1.5 text-gray-400 font-semibold text-xs bg-gray-500/10 px-2 py-1 rounded w-fit border border-gray-500/20">
                            <User className="w-3.5 h-3.5" /> INACTIVO
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-emerald-500 font-semibold text-xs bg-emerald-500/10 px-2 py-1 rounded w-fit border border-emerald-500/20">
                            <UserCheck className="w-3.5 h-3.5" /> ACTIVO
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {u.mfa?.habilitado ? (
                          <Shield className="w-5 h-5 text-emerald-500 mx-auto" />
                        ) : (
                          <Shield className="w-5 h-5 text-st-muted mx-auto opacity-50" />
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`font-bold ${u.intentos_fallidos > 0 ? 'text-amber-500' : 'text-st-muted'}`}>{u.intentos_fallidos}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-st-primary hover:text-white px-3 py-1 border border-st-primary/50 rounded hover:bg-st-primary hover:border-st-primary transition-colors text-xs font-bold" onClick={(e) => { e.stopPropagation(); openDrawer(u); }}>
                          Ver Detalles
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DRAWER LATERAL */}
      {isDrawerOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
          <div className="bg-st-surface border-l border-st-border w-full max-w-xl h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-6 border-b border-st-border bg-black/40 flex justify-between items-start">
              <div className="flex gap-4 items-center">
                <div className="w-14 h-14 rounded-full bg-st-bg border-2 border-st-primary flex items-center justify-center text-st-primary font-bold text-2xl shadow-lg shadow-st-primary/20">
                  {selectedUser.nombre.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedUser.nombre}</h2>
                  <p className="text-sm text-st-muted">{selectedUser.email}</p>
                </div>
              </div>
              <button onClick={() => setIsDrawerOpen(false)} className="p-2 text-st-muted hover:text-white hover:bg-white/5 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Tabs */}
            <div className="flex border-b border-st-border px-6 pt-4 gap-6 bg-black/20">
              <button 
                onClick={() => setActiveTab('general')}
                className={`pb-3 font-semibold text-sm uppercase tracking-wide transition-colors ${activeTab === 'general' ? 'text-st-accent border-b-2 border-st-accent' : 'text-st-muted hover:text-white'}`}
              >
                General
              </button>
              <button 
                onClick={() => setActiveTab('sesiones')}
                className={`pb-3 font-semibold text-sm uppercase tracking-wide transition-colors ${activeTab === 'sesiones' ? 'text-st-accent border-b-2 border-st-accent' : 'text-st-muted hover:text-white'}`}
              >
                Sesiones Activas
              </button>
              <button 
                onClick={() => setActiveTab('auditoria')}
                className={`pb-3 font-semibold text-sm uppercase tracking-wide transition-colors ${activeTab === 'auditoria' ? 'text-st-accent border-b-2 border-st-accent' : 'text-st-muted hover:text-white'}`}
              >
                Auditoría
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-6">
              
              {/* TAB: GENERAL */}
              {activeTab === 'general' && (
                <div className="space-y-6">
                  
                  {/* Info Box */}
                  <div className="bg-st-bg border border-st-border rounded-xl p-5 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-st-muted uppercase">Rol Asignado</p>
                      <p className="font-semibold text-white mt-1">{selectedUser.roles?.[0]?.rol?.codigo || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-st-muted uppercase">Email Recuperación</p>
                      <p className="font-semibold text-white mt-1">{selectedUser.email_recuperacion || 'No configurado'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-st-muted uppercase">Alcance</p>
                      <p className="font-semibold text-white mt-1">{selectedUser.acceso_todos_tenants ? 'Global' : `${selectedUser.tenant_usuarios?.length || 0} Tenants`}</p>
                    </div>
                    <div>
                      <p className="text-xs text-st-muted uppercase">Autenticación (MFA)</p>
                      <p className="font-semibold text-white mt-1">{selectedUser.mfa?.habilitado ? 'Habilitado (Activo)' : 'Desactivado'}</p>
                    </div>
                  </div>

                  {/* Security Status */}
                  <div className="space-y-3">
                    <h3 className="font-bold text-white flex items-center gap-2"><Lock className="w-4 h-4 text-st-accent"/> Estado de Seguridad</h3>
                    <div className="bg-st-bg border border-st-border rounded-xl p-4 divide-y divide-st-border">
                      
                      <div className="flex justify-between items-center pb-3">
                        <div>
                          <p className="text-sm text-white font-medium">Bloqueo de Cuenta</p>
                          <p className="text-xs text-st-muted">Estado actual e intentos fallidos.</p>
                        </div>
                        <div className="text-right">
                          {selectedUser.bloqueado_manual ? (
                            <span className="text-xs font-bold text-red-500 bg-red-500/10 px-2 py-1 rounded">BLOQUEO MANUAL</span>
                          ) : selectedUser.bloqueado_hasta && new Date(selectedUser.bloqueado_hasta) > new Date() ? (
                            <span className="text-xs font-bold text-red-500 bg-red-500/10 px-2 py-1 rounded">BLOQUEO TEMPORAL</span>
                          ) : (
                            <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded">DESBLOQUEADO</span>
                          )}
                          <p className="text-xs text-st-muted mt-1">{selectedUser.intentos_fallidos} intentos fallidos</p>
                        </div>
                      </div>

                      <div className="flex justify-between items-center py-3">
                        <div>
                          <p className="text-sm text-white font-medium">Requisito de Contraseña</p>
                          <p className="text-xs text-st-muted">Forzar cambio de clave.</p>
                        </div>
                        <div>
                          {selectedUser.debe_cambiar_password ? (
                            <span className="text-xs font-bold text-amber-500 bg-amber-500/10 px-2 py-1 rounded">CAMBIO REQUERIDO</span>
                          ) : (
                            <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded">AL DÍA</span>
                          )}
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="space-y-3 pt-4 border-t border-st-border">
                    <h3 className="font-bold text-white uppercase text-xs tracking-wider">Acciones Administrativas</h3>
                    
                    <button 
                      onClick={handleResetPassword}
                      className="w-full flex items-center justify-between p-4 bg-st-bg hover:bg-white/5 border border-st-border rounded-xl transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg group-hover:bg-amber-500/20"><Key className="w-5 h-5"/></div>
                        <div className="text-left">
                          <p className="text-sm font-bold text-white">Forzar Reseteo de Contraseña</p>
                          <p className="text-xs text-st-muted">El usuario deberá cambiar su clave en su próximo login.</p>
                        </div>
                      </div>
                      <RefreshCw className="w-4 h-4 text-st-muted group-hover:text-amber-500" />
                    </button>

                    {selectedUser.bloqueado_manual || (selectedUser.bloqueado_hasta && new Date(selectedUser.bloqueado_hasta) > new Date()) ? (
                       <button 
                         onClick={handleDesbloquear}
                         className="w-full flex items-center justify-between p-4 bg-st-bg hover:bg-white/5 border border-emerald-500/30 rounded-xl transition-colors group"
                       >
                         <div className="flex items-center gap-3">
                           <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg group-hover:bg-emerald-500/20"><Unlock className="w-5 h-5"/></div>
                           <div className="text-left">
                             <p className="text-sm font-bold text-white">Desbloquear Usuario</p>
                             <p className="text-xs text-st-muted">Restaura el acceso y limpia los intentos fallidos.</p>
                           </div>
                         </div>
                       </button>
                    ) : (
                      <button 
                        onClick={handleBloquear}
                        className="w-full flex items-center justify-between p-4 bg-st-bg hover:bg-white/5 border border-red-500/30 rounded-xl transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-red-500/10 text-red-500 rounded-lg group-hover:bg-red-500/20"><Ban className="w-5 h-5"/></div>
                          <div className="text-left">
                            <p className="text-sm font-bold text-white">Bloquear Usuario</p>
                            <p className="text-xs text-st-muted">Revoca el acceso al sistema de forma inmediata y permanente.</p>
                          </div>
                        </div>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* TAB: SESIONES */}
              {activeTab === 'sesiones' && (
                <div className="space-y-4">
                  {loadingDetails ? (
                     <div className="text-center py-8 text-st-muted text-sm">Cargando sesiones...</div>
                  ) : userSesiones.length === 0 ? (
                     <div className="text-center py-12 text-st-muted border border-dashed border-st-border rounded-xl">No hay historial de sesiones registrado.</div>
                  ) : (
                    <div className="space-y-3">
                      {userSesiones.map(s => {
                        const isActive = !s.revocada && new Date(s.fecha_expiracion) > new Date();
                        return (
                          <div key={s.id} className="bg-st-bg border border-st-border rounded-xl p-4 flex flex-col gap-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-sm font-bold text-white">IP: <span className="font-mono font-normal text-st-muted">{s.ip_address || 'Desconocida'}</span></p>
                                <p className="text-xs text-st-muted mt-1 truncate max-w-xs" title={s.user_agent}>{s.user_agent || 'User Agent Desconocido'}</p>
                              </div>
                              {isActive ? (
                                <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded">ACTIVA</span>
                              ) : s.revocada ? (
                                <span className="text-xs font-bold text-red-500 bg-red-500/10 px-2 py-1 rounded">REVOCADA</span>
                              ) : (
                                <span className="text-xs font-bold text-gray-400 bg-gray-500/10 px-2 py-1 rounded">EXPIRADA</span>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-xs pt-3 border-t border-st-border">
                              <div>
                                <span className="text-st-muted block">Inicio:</span>
                                <span className="text-white">{new Date(s.fecha_inicio).toLocaleString()}</span>
                              </div>
                              <div>
                                <span className="text-st-muted block">Última Actividad:</span>
                                <span className="text-white">{new Date(s.ultima_actividad).toLocaleString()}</span>
                              </div>
                            </div>
                            {isActive && (
                              <button 
                                onClick={() => handleRevocarSesion(s.id)} 
                                className="mt-2 w-full py-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/30 rounded-lg text-xs font-bold transition-colors"
                              >
                                Revocar esta sesión
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB: AUDITORIA */}
              {activeTab === 'auditoria' && (
                <div className="space-y-4">
                  {loadingDetails ? (
                     <div className="text-center py-8 text-st-muted text-sm">Cargando auditoría...</div>
                  ) : userAuditoria.length === 0 ? (
                     <div className="text-center py-12 text-st-muted border border-dashed border-st-border rounded-xl">No hay eventos de auditoría.</div>
                  ) : (
                    <div className="relative border-l border-st-border ml-3 space-y-6 pb-4">
                      {userAuditoria.map(a => (
                        <div key={a.id} className="relative pl-6">
                          <div className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-st-primary shadow-[0_0_8px_rgba(255,255,255,0.5)]"></div>
                          <div className="bg-st-bg border border-st-border rounded-lg p-3">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs font-bold text-st-accent bg-st-accent/10 px-2 py-0.5 rounded">{a.evento}</span>
                              <span className="text-xs text-st-muted">{new Date(a.fecha_evento).toLocaleString()}</span>
                            </div>
                            <p className="text-sm text-white mt-2">{a.descripcion || 'Sin descripción detallada.'}</p>
                            {a.ip_origen && (
                              <p className="text-xs text-st-muted mt-2 font-mono">IP: {a.ip_origen}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
