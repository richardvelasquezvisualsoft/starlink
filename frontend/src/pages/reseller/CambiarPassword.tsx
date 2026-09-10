import React, { useState } from 'react';
import { Shield, Eye, EyeOff, KeyRound, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import client from '../../api/client';
import AlertPopup from '../../components/AlertPopup';

const CambiarPassword = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [formData, setFormData] = useState({
    password_actual: '',
    nueva_password: '',
    confirmar_password: ''
  });

  const [alertData, setAlertData] = useState<{isOpen: boolean, type: 'success'|'error'|'info', message: string}>({
    isOpen: false,
    type: 'info',
    message: ''
  });

  const showAlert = (type: 'success'|'error'|'info', message: string) => {
    setAlertData({ isOpen: true, type, message });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    if (!formData.password_actual || !formData.nueva_password || !formData.confirmar_password) {
      showAlert('error', 'Por favor, completa todos los campos requeridos antes de continuar.');
      return;
    }
    if (formData.nueva_password !== formData.confirmar_password) {
      showAlert('error', 'La nueva contraseña y su confirmación no coinciden. Inténtalo nuevamente.');
      return;
    }
    if (formData.nueva_password.length < 8) {
      showAlert('error', 'Por seguridad, la nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }

    setLoading(true);
    try {
      await client.post('/perfil/password', {
        password_actual: formData.password_actual,
        nueva_password: formData.nueva_password
      });
      showAlert('success', '¡Excelente! Tu contraseña ha sido actualizada y tu acceso es seguro.');
      setFormData({ password_actual: '', nueva_password: '', confirmar_password: '' });
    } catch (error: any) {
      const msg = error.response?.data?.detail || 'No se pudo actualizar la contraseña. Verifica tu contraseña actual e intenta de nuevo.';
      showAlert('error', msg);
    } finally {
      setLoading(false);
    }
  };

  const isCliente = location.pathname.startsWith('/cliente');
  const dashboardPath = isCliente ? '/cliente/dashboard' : '/reseller/dashboard';

  return (
      <div className="max-w-4xl mx-auto py-6 px-4">
        <AlertPopup 
          isOpen={alertData.isOpen} 
          type={alertData.type} 
          message={alertData.message} 
          onClose={() => setAlertData(prev => ({ ...prev, isOpen: false }))} 
        />
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative mt-6">
          {/* Top colored border to match design (yellow) */}
          <div className="h-1 w-full bg-[#f59e0b]"></div>
          
          <button 
            onClick={() => navigate(dashboardPath)}
            className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors z-10"
            title="Cerrar y volver al Dashboard"
          >
            <X className="w-5 h-5 text-gray-500 hover:text-gray-800" />
          </button>
          
          <div className="p-8">
            <div className="flex items-center gap-4 mb-8 border-b border-gray-100 pb-6">
              <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 border border-amber-100">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800">Cambiar Contraseña</h2>
                <p className="text-sm text-gray-500">Usa una contraseña fuerte para proteger tu acceso corporativo.</p>
              </div>
            </div>

            <div className="max-w-xl mx-auto space-y-5">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 mb-1.5 uppercase">Contraseña Actual</label>
                <div className="relative">
                  <input 
                    type={showCurrent ? "text" : "password"} 
                    name="password_actual"
                    value={formData.password_actual}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded text-sm text-gray-800 focus:outline-none focus:border-[#112a23]"
                    placeholder="••••••••"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 mb-1.5 uppercase">Nueva Contraseña</label>
                <div className="relative">
                  <input 
                    type={showNew ? "text" : "password"} 
                    name="nueva_password"
                    value={formData.nueva_password}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded text-sm text-gray-800 focus:outline-none focus:border-[#112a23]"
                    placeholder="••••••••"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 mb-1.5 uppercase">Confirmar Nueva Contraseña</label>
                <div className="relative">
                  <input 
                    type={showConfirm ? "text" : "password"} 
                    name="confirmar_password"
                    value={formData.confirmar_password}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded text-sm text-gray-800 focus:outline-none focus:border-[#112a23]"
                    placeholder="••••••••"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button 
                  onClick={handleSave}
                  disabled={loading}
                  className="px-6 py-2.5 bg-[#0f2e23] hover:bg-[#153e30] text-white rounded text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  <KeyRound className="w-4 h-4" />
                  {loading ? 'Actualizando...' : 'Actualizar Contraseña'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
};

export default CambiarPassword;
