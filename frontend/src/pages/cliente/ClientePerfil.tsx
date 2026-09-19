import React, { useState, useEffect, useRef } from 'react';
import { Save, Camera, Trash2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import client, { buildAvatarUrl } from '../../api/client';
import AlertPopup from '../../components/AlertPopup';

interface PerfilData {
  nombre: string;
  email: string;
  email_recuperacion: string;
  celular: string;
  sigla_corta: string;
  pais: string;
  zona_horaria: string;
  foto_url: string;
  id?: number;
}

const ClientePerfil: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageHasError, setImageHasError] = useState(false);
  const [avatarVersion, setAvatarVersion] = useState<number>(Date.now());
  
  const [formData, setFormData] = useState<PerfilData>({
    nombre: '',
    email: '',
    email_recuperacion: '',
    celular: '',
    sigla_corta: '',
    pais: '',
    zona_horaria: '',
    foto_url: ''
  });

  const navigate = useNavigate();

  const [userId, setUserId] = useState<number | string>('-');
  const [alertData, setAlertData] = useState<{isOpen: boolean, type: 'success'|'error'|'info', message: string}>({
    isOpen: false,
    type: 'info',
    message: ''
  });

  const showAlert = (type: 'success'|'error'|'info', message: string) => {
    setAlertData({ isOpen: true, type, message });
  };

  useEffect(() => {
    fetchPerfil();
  }, []);

  const fetchPerfil = async () => {
    try {
      const res = await client.get('/perfil');
      const data = res.data;
      setFormData({
        nombre: data.nombre || '',
        email: data.email || '',
        email_recuperacion: data.email_recuperacion || '',
        celular: data.celular || '',
        sigla_corta: data.sigla_corta || '',
        pais: data.pais || 'PERU',
        zona_horaria: data.zona_horaria || 'Perú - Lima (UTC-05:00)',
        foto_url: data.foto_url || ''
      });
      setImageHasError(false);
      setAvatarVersion(Date.now());
      if (data.id) setUserId(data.id);

      // Sync starlink_user in localStorage
      const userJson = localStorage.getItem('starlink_user');
      if (userJson) {
        const u = JSON.parse(userJson);
        u.foto_url = data.foto_url || '';
        u.nombre = data.nombre || u.nombre;
        localStorage.setItem('starlink_user', JSON.stringify(u));
        window.dispatchEvent(new CustomEvent('user_profile_updated', { detail: u }));
        window.dispatchEvent(new Event('storage'));
      }
    } catch (error) {
      showAlert('error', 'Ocurrió un error al cargar la información del perfil. Por favor, intenta de nuevo.');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await client.put('/perfil', {
        nombre: formData.nombre,
        email_recuperacion: formData.email_recuperacion,
        celular: formData.celular,
        sigla_corta: formData.sigla_corta,
        pais: formData.pais,
        zona_horaria: formData.zona_horaria
      });
      showAlert('success', '¡Excelente! Tus datos personales y configuración regional se han guardado exitosamente.');
      
      // Update local storage if name changed
      const userJson = localStorage.getItem('starlink_user');
      if (userJson) {
        const u = JSON.parse(userJson);
        u.nombre = formData.nombre;
        u.foto_url = formData.foto_url;
        localStorage.setItem('starlink_user', JSON.stringify(u));
        window.dispatchEvent(new CustomEvent('user_profile_updated', { detail: u }));
        window.dispatchEvent(new Event('storage'));
      }
    } catch (error) {
      showAlert('error', 'Lo sentimos, no pudimos guardar los cambios. Revisa tu conexión o inténtalo más tarde.');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    
    const file = e.target.files[0];
    
    // File size validation (max 5MB)
    const MAX_SIZE_MB = 5;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      showAlert('error', `El archivo es muy pesado. El tamaño máximo permitido es de ${MAX_SIZE_MB}MB.`);
      return;
    }

    const uploadData = new FormData();
    uploadData.append('file', file);
    
    try {
      // client automatically adds Authorization header
      const res = await client.post('/perfil/foto', uploadData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      const newFotoUrl = res.data.foto_url;
      setFormData(prev => ({ ...prev, foto_url: newFotoUrl }));
      setImageHasError(false);
      setAvatarVersion(Date.now());
      
      // Update local storage and trigger events
      const userJson = localStorage.getItem('starlink_user');
      if (userJson) {
        const u = JSON.parse(userJson);
        u.foto_url = newFotoUrl;
        localStorage.setItem('starlink_user', JSON.stringify(u));
        window.dispatchEvent(new CustomEvent('user_profile_updated', { detail: u }));
        window.dispatchEvent(new Event('storage'));
      }
      
      showAlert('success', '¡Tu nueva foto de perfil se ha subido correctamente!');
    } catch (error) {
      showAlert('error', 'Hubo un problema al intentar subir tu foto. Asegúrate de que sea una imagen válida.');
    }
  };

  const handlePhotoDelete = async () => {
    try {
      await client.delete('/perfil/foto');
      setFormData(prev => ({ ...prev, foto_url: '' }));
      setImageHasError(false);
      setAvatarVersion(Date.now());
      
      const userJson = localStorage.getItem('starlink_user');
      if (userJson) {
        const u = JSON.parse(userJson);
        u.foto_url = '';
        localStorage.setItem('starlink_user', JSON.stringify(u));
        window.dispatchEvent(new CustomEvent('user_profile_updated', { detail: u }));
        window.dispatchEvent(new Event('storage'));
      }
      
      showAlert('success', 'Foto de perfil eliminada correctamente.');
    } catch (error) {
      showAlert('error', 'No se pudo eliminar la foto de perfil.');
    }
  };

  const isCliente = location.pathname.startsWith('/cliente');
  const dashboardPath = isCliente ? '/cliente/dashboard' : '/reseller/dashboard';
  const roleLabel = isCliente ? 'Cliente' : 'Administrador';

  return (
    <div className="max-w-4xl py-6 px-4">
      <AlertPopup 
        isOpen={alertData.isOpen} 
        type={alertData.type} 
        message={alertData.message} 
        onClose={() => setAlertData(prev => ({ ...prev, isOpen: false }))} 
      />

      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-[20px] font-bold text-client-text-primary tracking-tight">Mi Perfil</h1>
          <p className="text-[13px] text-client-text-secondary mt-1 font-medium">Administra tu información personal y credenciales.</p>
        </div>
      </div>

      <div className="bg-client-bg-surface rounded-[12px] shadow-sm border border-client-border overflow-hidden relative">
        <div className="h-1 w-full bg-client-primary"></div>
        
        <button 
          onClick={() => navigate(dashboardPath)}
          className="absolute top-4 right-4 p-2 text-client-text-secondary hover:bg-client-bg-subtle rounded-lg transition-colors z-10"
          title="Cerrar y volver al Dashboard"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="p-8 flex flex-col md:flex-row gap-10">
          {/* Left Column: Photo & Info */}
          <div className="flex flex-col items-center shrink-0 w-64">
            <div className="w-32 h-32 rounded-full border-[3px] border-client-bg-app shadow-sm mb-6 flex items-center justify-center overflow-hidden bg-client-bg-subtle relative group">
              {formData.foto_url && !imageHasError ? (
                <img 
                  src={buildAvatarUrl(formData.foto_url, avatarVersion)} 
                  alt="Perfil" 
                  className="w-full h-full object-cover" 
                  onError={() => setImageHasError(true)}
                />
              ) : (
                <span className="text-[40px] font-bold text-client-text-secondary uppercase">
                  {formData.nombre ? formData.nombre.charAt(0) : (isCliente ? 'C' : 'R')}
                </span>
              )}

              {/* Upload overlay */}
              <div 
                className="absolute inset-0 bg-client-primary/80 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="w-6 h-6 text-client-text-primary mb-1" />
                <span className="text-sm text-client-text-primary font-medium">Cambiar</span>
              </div>
            </div>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*"
              onChange={handlePhotoUpload}
            />
            
            <div className="flex gap-2 w-full mb-6">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-2 border border-client-border rounded-[6px] text-[12px] font-semibold text-client-text-secondary hover:bg-client-bg-subtle flex items-center justify-center gap-1.5 transition-colors"
              >
                <Camera className="w-3.5 h-3.5" /> FOTO
              </button>
              {formData.foto_url && (
                <button 
                  onClick={handlePhotoDelete}
                  className="flex-1 py-2 border border-client-danger/30 rounded-[6px] text-[12px] font-semibold text-client-danger bg-client-danger-soft hover:bg-client-danger/20 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> ELIMINAR
                </button>
              )}
            </div>

            <div className="w-full bg-client-bg-subtle rounded-[8px] p-4 border border-client-border text-center">
              <p className="text-[13px] font-bold text-client-text-primary">{roleLabel}</p>
              <p className="text-[12px] text-client-text-secondary mt-1">ID Sistema: {userId}</p>
            </div>
          </div>

          {/* Right Column: Form */}
          <div className="flex-1">
            <div className="mb-8">
              <h2 className="text-[16px] font-bold text-client-text-primary mb-4 border-b border-client-border pb-2">Datos Personales</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[12px] font-bold text-client-text-secondary mb-1.5 uppercase">Usuario</label>
                  <input 
                    type="text" 
                    value={formData.email}
                    disabled
                    className="w-full px-3 py-[10px] border border-client-border bg-client-bg-app rounded-[8px] text-[13px] text-client-text-secondary cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-client-text-secondary mb-1.5 uppercase">Nombre Completo</label>
                  <input 
                    type="text" 
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleChange}
                    className="w-full px-3 py-[10px] border border-client-border rounded-[8px] bg-client-bg-surface text-[13px] text-client-text-primary focus:outline-none focus:ring-1 focus:ring-client-primary focus:border-client-primary"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-client-text-secondary mb-1.5 uppercase">Correo Alternativo *</label>
                  <input 
                    type="email" 
                    name="email_recuperacion"
                    value={formData.email_recuperacion}
                    onChange={handleChange}
                    className="w-full px-3 py-[10px] border border-client-border rounded-[8px] bg-client-bg-surface text-[13px] text-client-text-primary focus:outline-none focus:ring-1 focus:ring-client-primary focus:border-client-primary"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-client-text-secondary mb-1.5 uppercase">Celular *</label>
                  <input 
                    type="text" 
                    name="celular"
                    value={formData.celular}
                    onChange={handleChange}
                    className="w-full px-3 py-[10px] border border-client-border rounded-[8px] bg-client-bg-surface text-[13px] text-client-text-primary focus:outline-none focus:ring-1 focus:ring-client-primary focus:border-client-primary"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-client-text-secondary mb-1.5 uppercase">Sigla Corta</label>
                  <input 
                    type="text" 
                    name="sigla_corta"
                    value={formData.sigla_corta}
                    onChange={handleChange}
                    className="w-full px-3 py-[10px] border border-client-border rounded-[8px] bg-client-bg-surface text-[13px] text-client-text-primary focus:outline-none focus:ring-1 focus:ring-client-primary focus:border-client-primary"
                  />
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-[16px] font-bold text-client-text-primary mb-4 border-b border-client-border pb-2">Región Asignada (Listas)</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[12px] font-bold text-client-text-secondary mb-1.5 uppercase">País Principal</label>
                  <select 
                    name="pais"
                    value={formData.pais}
                    onChange={handleChange}
                    className="w-full px-3 py-[10px] border border-client-border rounded-[8px] bg-client-bg-surface text-[13px] text-client-text-primary focus:outline-none focus:ring-1 focus:ring-client-primary focus:border-client-primary appearance-none"
                  >
                    <option value="PERU">PERU</option>
                    <option value="CHILE">CHILE</option>
                    <option value="COLOMBIA">COLOMBIA</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-client-text-secondary mb-1.5 uppercase">Zona Horaria / Operativa</label>
                  <select 
                    name="zona_horaria"
                    value={formData.zona_horaria}
                    onChange={handleChange}
                    className="w-full px-3 py-[10px] border border-client-border rounded-[8px] bg-client-bg-surface text-[13px] text-client-text-primary focus:outline-none focus:ring-1 focus:ring-client-primary focus:border-client-primary appearance-none"
                  >
                    <option value="Perú - Lima (UTC-05:00)">Perú - Lima (UTC-05:00)</option>
                    <option value="Chile - Santiago (UTC-04:00)">Chile - Santiago (UTC-04:00)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-client-bg-app px-8 py-4 border-t border-client-border flex justify-end">
          <button 
            onClick={handleSave}
            disabled={loading}
            className="w-[160px] h-[40px] bg-client-primary hover:bg-client-primary-hover text-white rounded-[8px] text-[13px] font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4" />
                Guardar Cambios
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientePerfil;
