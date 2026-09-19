import { useState, useEffect, useMemo } from 'react';
import { Shield, Lock, Search, Key, UserCheck, User, Unlock, Ban, RefreshCw, X, ChevronUp, ChevronDown, ArrowUpDown, Trash2, AlertTriangle, KeyRound, Copy, Check, Eye, EyeOff, Sparkles } from 'lucide-react';
import client from '../../api/client';
import AlertPopup from '../../components/AlertPopup';

export default function UsuariosAccesos() {
  const [loading, setLoading] = useState(true);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Current user info
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Drawer state
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'sesiones' | 'auditoria'>('general');
  
  // Drawer Data
  const [userSesiones, setUserSesiones] = useState<any[]>([]);
  const [userAuditoria, setUserAuditoria] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Delete modal state
  const [userToDelete, setUserToDelete] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Reset Password modal state
  const [resetPasswordModal, setResetPasswordModal] = useState<{
    isOpen: boolean;
    user: any;
    password: string;
    forceChange: boolean;
    showPassword: boolean;
    loading: boolean;
    isSuccess: boolean;
    copied: boolean;
  }>({
    isOpen: false,
    user: null,
    password: '',
    forceChange: true,
    showPassword: true,
    loading: false,
    isSuccess: false,
    copied: false
  });

  // Alert popup state
  const [alertData, setAlertData] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'info' | 'warning';
    title?: string;
    message: string;
  }>({
    isOpen: false,
    type: 'info',
    message: ''
  });

  const [passwordPolicy, setPasswordPolicy] = useState<{ longitud_minima: number; longitud_maxima: number }>({
    longitud_minima: 12,
    longitud_maxima: 128
  });

  const [sortBy, setSortBy] = useState<string>('nombre');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('asc');
    }
  };

  useEffect(() => {
    fetchUsuarios();
    fetchPasswordPolicy();
    try {
      const stored = localStorage.getItem('starlink_user');
      if (stored) {
        setCurrentUser(JSON.parse(stored));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchPasswordPolicy = async () => {
    try {
      const res = await client.get('/perfil/password-policy');
      if (res.data) {
        setPasswordPolicy({
          longitud_minima: res.data.longitud_minima || 12,
          longitud_maxima: res.data.longitud_maxima || 128
        });
      }
    } catch (e) {
      console.error('Error fetching password policy:', e);
    }
  };

  const fetchUsuarios = async () => {
    try {
      const res = await client.get('/usuarios');
      setUsuarios(res.data);
    } catch (error) {
      console.error(error);
      setAlertData({
        isOpen: true,
        type: 'error',
        title: 'Error de Carga',
        message: 'No se pudieron cargar los usuarios del sistema.'
      });
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

  const generateRandomPassword = () => {
    const randNum = Math.floor(1000 + Math.random() * 9000);
    return `TempStarlink#${randNum}`;
  };

  const handleOpenResetPassword = (user: any) => {
    if (!user) return;
    const generated = generateRandomPassword();
    setResetPasswordModal({
      isOpen: true,
      user,
      password: generated,
      forceChange: true,
      showPassword: true,
      loading: false,
      isSuccess: false,
      copied: false
    });
  };

  const handleConfirmResetPassword = async () => {
    if (!resetPasswordModal.user || !resetPasswordModal.password.trim()) return;
    setResetPasswordModal(prev => ({ ...prev, loading: true }));
    try {
      const res = await client.post(`/usuarios/${resetPasswordModal.user.id}/reset_password`, {
        nueva_password: resetPasswordModal.password.trim(),
        forzar_cambio: resetPasswordModal.forceChange
      });
      
      setResetPasswordModal(prev => ({
        ...prev,
        loading: false,
        isSuccess: true,
        password: res.data.password_temporal || prev.password
      }));

      if (selectedUser?.id === resetPasswordModal.user.id) {
        setSelectedUser({ ...selectedUser, debe_cambiar_password: resetPasswordModal.forceChange });
      }

      await fetchUsuarios();
    } catch (error: any) {
      console.error(error);
      setResetPasswordModal(prev => ({ ...prev, loading: false }));
      const msg = error.response?.data?.detail || 'Error al restablecer la contraseña.';
      setAlertData({
        isOpen: true,
        type: 'error',
        title: 'Error de Restablecimiento',
        message: msg
      });
    }
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(resetPasswordModal.password);
    setResetPasswordModal(prev => ({ ...prev, copied: true }));
    setTimeout(() => {
      setResetPasswordModal(prev => ({ ...prev, copied: false }));
    }, 2500);
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

  const handleInitiateDelete = (user: any) => {
    if (!user) return;
    if (currentUser && (currentUser.id === user.id || currentUser.email === user.email)) {
      setAlertData({
        isOpen: true,
        type: 'error',
        title: 'Acción No Permitida',
        message: 'No puedes eliminar tu propia cuenta de usuario en sesión activa.'
      });
      return;
    }
    setUserToDelete(user);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setDeleting(true);
    try {
      await client.delete(`/usuarios/${userToDelete.id}`);
      if (selectedUser?.id === userToDelete.id) {
        setIsDrawerOpen(false);
        setSelectedUser(null);
      }
      setAlertData({
        isOpen: true,
        type: 'success',
        title: 'Usuario Eliminado',
        message: `El usuario ${userToDelete.nombre} (${userToDelete.email}) ha sido eliminado permanentemente.`
      });
      setUserToDelete(null);
      await fetchUsuarios();
    } catch (error: any) {
      console.error(error);
      let msg = error.response?.data?.detail || 'Error al eliminar el usuario. Inténtalo nuevamente.';
      if (typeof msg === 'string' && (msg.includes('psycopg2') || msg.includes('SQL:') || msg.includes('ForeignKeyViolation'))) {
        msg = 'No se pudo eliminar el usuario debido a restricciones de seguridad en la base de datos.';
      }
      setAlertData({
        isOpen: true,
        type: 'error',
        title: 'Error al Eliminar',
        message: msg
      });
    } finally {
      setDeleting(false);
    }
  };

  const filtered = usuarios.filter(u => 
    u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedUsers = useMemo(() => {
    const list = [...filtered];
    list.sort((a: any, b: any) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      if (sortBy === 'rol') {
        aVal = a.roles?.[0]?.rol?.codigo || '';
        bVal = b.roles?.[0]?.rol?.codigo || '';
      } else if (sortBy === 'estado') {
        const aBlocked = a.bloqueado_manual || (a.bloqueado_hasta && new Date(a.bloqueado_hasta) > new Date());
        const bBlocked = b.bloqueado_manual || (b.bloqueado_hasta && new Date(b.bloqueado_hasta) > new Date());
        aVal = aBlocked ? 'BLOQUEADO' : (!a.activo ? 'INACTIVO' : 'ACTIVO');
        bVal = bBlocked ? 'BLOQUEADO' : (!b.activo ? 'INACTIVO' : 'ACTIVO');
      } else if (sortBy === 'mfa') {
        aVal = a.mfa_habilitado ? 1 : 0;
        bVal = b.mfa_habilitado ? 1 : 0;
      }

      if (aVal === undefined || aVal === null) aVal = '';
      if (bVal === undefined || bVal === null) bVal = '';

      if (typeof aVal === 'string') {
        const comp = aVal.localeCompare(String(bVal));
        return sortDirection === 'asc' ? comp : -comp;
      }
      return sortDirection === 'asc' ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);
    });
    return list;
  }, [filtered, sortBy, sortDirection]);

  const renderSortIcon = (field: string) => {
    if (sortBy === field) {
      return sortDirection === 'asc' ? (
        <ChevronUp className="w-3.5 h-3.5 text-st-accent flex-shrink-0" />
      ) : (
        <ChevronDown className="w-3.5 h-3.5 text-st-accent flex-shrink-0" />
      );
    }
    return <ArrowUpDown className="w-2.5 h-2.5 text-st-muted/40 group-hover:text-st-muted flex-shrink-0 transition-colors" />;
  };

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
                <th
                  className="px-6 py-4 font-bold tracking-wider cursor-pointer select-none hover:text-white transition-colors group"
                  onClick={() => handleSort('nombre')}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Usuario</span>
                    {renderSortIcon('nombre')}
                  </div>
                </th>
                <th
                  className="px-6 py-4 font-bold tracking-wider cursor-pointer select-none hover:text-white transition-colors group"
                  onClick={() => handleSort('rol')}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Rol / Alcance</span>
                    {renderSortIcon('rol')}
                  </div>
                </th>
                <th
                  className="px-6 py-4 font-bold tracking-wider cursor-pointer select-none hover:text-white transition-colors group"
                  onClick={() => handleSort('estado')}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Estado</span>
                    {renderSortIcon('estado')}
                  </div>
                </th>
                <th
                  className="px-6 py-4 font-bold tracking-wider text-center cursor-pointer select-none hover:text-white transition-colors group"
                  onClick={() => handleSort('mfa')}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>MFA</span>
                    {renderSortIcon('mfa')}
                  </div>
                </th>
                <th
                  className="px-6 py-4 font-bold tracking-wider text-center cursor-pointer select-none hover:text-white transition-colors group"
                  onClick={() => handleSort('intentos_fallidos')}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Intentos Fallidos</span>
                    {renderSortIcon('intentos_fallidos')}
                  </div>
                </th>
                <th className="px-6 py-4 font-bold tracking-wider text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-st-border">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12">Cargando usuarios...</td></tr>
              ) : sortedUsers.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-st-muted">No se encontraron usuarios.</td></tr>
              ) : (
                sortedUsers.map(u => {
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
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            className="text-st-primary hover:text-white px-3 py-1 border border-st-primary/50 rounded hover:bg-st-primary hover:border-st-primary transition-colors text-xs font-bold" 
                            onClick={(e) => { e.stopPropagation(); openDrawer(u); }}
                          >
                            Ver Detalles
                          </button>
                          <button 
                            className="p-1.5 text-st-muted hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 rounded transition-colors" 
                            title="Eliminar Usuario"
                            onClick={(e) => { e.stopPropagation(); handleInitiateDelete(u); }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
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
                      onClick={() => handleOpenResetPassword(selectedUser)}
                      className="w-full flex items-center justify-between p-4 bg-st-bg hover:bg-white/5 border border-st-border hover:border-amber-500/40 rounded-xl transition-colors group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg group-hover:bg-amber-500/20"><Key className="w-5 h-5"/></div>
                        <div className="text-left">
                          <p className="text-sm font-bold text-white group-hover:text-amber-400">Restablecer / Forzar Cambio de Clave</p>
                          <p className="text-xs text-st-muted">Asigna una clave temporal y exige el cambio al iniciar sesión.</p>
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

                    {/* Botón Eliminar Usuario */}
                    <button 
                      onClick={() => handleInitiateDelete(selectedUser)}
                      className="w-full flex items-center justify-between p-4 bg-red-500/5 hover:bg-red-500/15 border border-red-500/30 hover:border-red-500/60 rounded-xl transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-500/10 text-red-400 rounded-lg group-hover:bg-red-500/20"><Trash2 className="w-5 h-5"/></div>
                        <div className="text-left">
                          <p className="text-sm font-bold text-red-400 group-hover:text-red-300">Eliminar Usuario</p>
                          <p className="text-xs text-st-muted">Elimina permanentemente la cuenta, roles y accesos.</p>
                        </div>
                      </div>
                      <Trash2 className="w-4 h-4 text-red-400/60 group-hover:text-red-400" />
                    </button>
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

      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
      {userToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-st-surface border border-red-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-500/10 text-red-500 rounded-xl border border-red-500/20 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">¿Eliminar Usuario?</h3>
                <p className="text-sm text-st-muted mt-1">
                  Estás a punto de eliminar permanentemente al usuario <strong className="text-white">{userToDelete.nombre}</strong> (<span className="text-st-accent">{userToDelete.email}</span>).
                </p>
                <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-300 leading-relaxed">
                  ⚠️ Esta acción no se puede deshacer. Se revocarán todas sus sesiones activas, asignaciones de roles y credenciales de acceso.
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 bg-st-bg hover:bg-white/10 text-white rounded-lg text-sm font-semibold border border-st-border transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-50 shadow-lg shadow-red-600/30 cursor-pointer"
              >
                {deleting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Eliminando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Sí, Eliminar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE RESTABLECIMIENTO / FORZAR CAMBIO DE CONTRASEÑA */}
      {resetPasswordModal.isOpen && resetPasswordModal.user && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-st-surface border border-amber-500/30 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6">
            <div className="flex justify-between items-start border-b border-st-border pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                  <KeyRound className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Restablecer Contraseña</h3>
                  <p className="text-xs text-st-muted">Usuario: <span className="text-white font-semibold">{resetPasswordModal.user.nombre}</span> ({resetPasswordModal.user.email})</p>
                </div>
              </div>
              <button 
                onClick={() => setResetPasswordModal(prev => ({ ...prev, isOpen: false }))} 
                className="p-1.5 text-st-muted hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!resetPasswordModal.isSuccess ? (
              <div className="space-y-5">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-bold text-st-muted uppercase">Contraseña Temporal</label>
                    <button 
                      type="button" 
                      onClick={() => setResetPasswordModal(prev => ({ ...prev, password: generateRandomPassword() }))}
                      className="text-xs text-st-accent hover:underline flex items-center gap-1 cursor-pointer font-medium"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Generar otra
                    </button>
                  </div>
                  <div className="relative">
                    <input 
                      type={resetPasswordModal.showPassword ? "text" : "password"}
                      value={resetPasswordModal.password}
                      onChange={(e) => setResetPasswordModal(prev => ({ ...prev, password: e.target.value }))}
                      style={{ color: '#FFFFFF', WebkitTextFillColor: '#FFFFFF', caretColor: '#FFFFFF', backgroundColor: '#1e2024' }}
                      className={`dark-input w-full px-4 py-3 bg-[#1e2024] text-white border rounded-lg text-sm focus:outline-none font-mono pr-12 transition-colors ${
                        resetPasswordModal.password.length >= passwordPolicy.longitud_minima 
                          ? 'border-emerald-500/60 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500' 
                          : 'border-amber-500/60 focus:border-amber-500 focus:ring-1 focus:ring-amber-500'
                      }`}
                      placeholder="Ingresa o genera una contraseña"
                    />
                    <button 
                      type="button"
                      onClick={() => setResetPasswordModal(prev => ({ ...prev, showPassword: !prev.showPassword }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-white transition-colors cursor-pointer"
                      title={resetPasswordModal.showPassword ? "Ocultar" : "Mostrar"}
                    >
                      {resetPasswordModal.showPassword ? <EyeOff className="w-5 h-5 text-amber-400" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-2 text-xs">
                    <div className="flex items-center gap-1.5">
                      {resetPasswordModal.password.length >= passwordPolicy.longitud_minima ? (
                        <span className="text-emerald-400 font-medium flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Cumple con la política corporativa
                        </span>
                      ) : (
                        <span className="text-amber-400 font-medium flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> Mínimo requerido: {passwordPolicy.longitud_minima} caracteres
                        </span>
                      )}
                    </div>
                    <span className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                      resetPasswordModal.password.length >= passwordPolicy.longitud_minima 
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      {resetPasswordModal.password.length} / {passwordPolicy.longitud_minima}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-2">
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input 
                      type="checkbox"
                      checked={resetPasswordModal.forceChange}
                      onChange={(e) => setResetPasswordModal(prev => ({ ...prev, forceChange: e.target.checked }))}
                      className="mt-1 w-4 h-4 rounded border-gray-600 text-amber-500 focus:ring-amber-500 accent-amber-500 cursor-pointer"
                    />
                    <div>
                      <p className="text-sm font-bold text-white">Forzar cambio en el próximo inicio de sesión</p>
                      <p className="text-xs text-st-muted mt-0.5">El usuario deberá crear una nueva contraseña obligatoria antes de acceder al portal.</p>
                    </div>
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    disabled={resetPasswordModal.loading}
                    onClick={() => setResetPasswordModal(prev => ({ ...prev, isOpen: false }))}
                    className="px-4 py-2 bg-st-bg hover:bg-white/10 text-white rounded-lg text-sm font-semibold border border-st-border transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={resetPasswordModal.loading || resetPasswordModal.password.length < passwordPolicy.longitud_minima}
                    onClick={handleConfirmResetPassword}
                    className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-600/30 cursor-pointer"
                  >
                    {resetPasswordModal.loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Guardando...</span>
                      </>
                    ) : (
                      <>
                        <Key className="w-4 h-4" />
                        <span>Aplicar Contraseña</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-5 text-center py-2">
                <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">¡Contraseña Asignada Exitosamente!</h4>
                  <p className="text-xs text-st-muted mt-1 max-w-sm mx-auto">
                    Comparte la contraseña temporal con el usuario. {resetPasswordModal.forceChange ? "El sistema le solicitará cambiarla inmediatamente al iniciar sesión." : ""}
                  </p>
                </div>

                <div className="bg-[#1e2024] border border-st-border rounded-xl p-4 flex items-center justify-between gap-3 text-left">
                  <div>
                    <span className="text-[10px] text-st-muted uppercase font-bold block">Contraseña Temporal:</span>
                    <span className="font-mono text-base font-bold text-white tracking-wide">{resetPasswordModal.password}</span>
                  </div>
                  <button 
                    type="button"
                    onClick={handleCopyPassword}
                    className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${resetPasswordModal.copied ? 'bg-emerald-600 text-white' : 'bg-st-bg hover:bg-white/10 text-st-accent border border-st-border'}`}
                  >
                    {resetPasswordModal.copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>¡Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setResetPasswordModal(prev => ({ ...prev, isOpen: false }))}
                    className="w-full py-2.5 bg-st-primary hover:bg-st-primary/90 text-white font-bold rounded-lg text-sm transition-colors cursor-pointer"
                  >
                    Entendido / Cerrar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* POPUP DE ALERTAS / FEEDBACK */}
      <AlertPopup
        isOpen={alertData.isOpen}
        type={alertData.type}
        title={alertData.title}
        message={alertData.message}
        onClose={() => setAlertData(prev => ({ ...prev, isOpen: false }))}
      />

    </div>
  );
}
