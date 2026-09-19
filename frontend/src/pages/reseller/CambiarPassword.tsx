import React, { useState, useEffect } from 'react';
import { Shield, Eye, EyeOff, KeyRound, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import client from '../../api/client';
import AlertPopup from '../../components/AlertPopup';

const CambiarPassword = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [policy, setPolicy] = useState<{ longitud_minima: number; longitud_maxima: number; historial_passwords: number }>({
    longitud_minima: 8,
    longitud_maxima: 128,
    historial_passwords: 5
  });

  const [formData, setFormData] = useState({
    password_actual: '',
    nueva_password: '',
    confirmar_password: ''
  });

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [alertData, setAlertData] = useState<{isOpen: boolean, type: 'success'|'error'|'info', message: string}>({
    isOpen: false,
    type: 'info',
    message: ''
  });

  useEffect(() => {
    const fetchPolicy = async () => {
      try {
        const res = await client.get('/perfil/password-policy');
        if (res.data) {
          setPolicy(res.data);
        }
      } catch (e) {
        console.error('Failed to fetch password policy', e);
      }
    };
    fetchPolicy();
  }, []);

  const showAlert = (type: 'success'|'error'|'info', message: string) => {
    setAlertData({ isOpen: true, type, message });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!formData.password_actual.trim()) {
      setErrorMsg('Debes ingresar tu contraseña actual.');
      showAlert('error', 'Debes ingresar tu contraseña actual.');
      return;
    }
    if (!formData.nueva_password) {
      setErrorMsg('Debes ingresar la nueva contraseña.');
      showAlert('error', 'Debes ingresar la nueva contraseña.');
      return;
    }
    if (formData.nueva_password.length < policy.longitud_minima) {
      setErrorMsg(`Por políticas de seguridad, la nueva contraseña debe tener al menos ${policy.longitud_minima} caracteres.`);
      showAlert('error', `Por políticas de seguridad, la nueva contraseña debe tener al menos ${policy.longitud_minima} caracteres.`);
      return;
    }
    if (formData.nueva_password === formData.password_actual) {
      setErrorMsg('La nueva contraseña no puede ser idéntica a tu contraseña actual.');
      showAlert('error', 'La nueva contraseña no puede ser idéntica a tu contraseña actual.');
      return;
    }
    if (formData.nueva_password !== formData.confirmar_password) {
      setErrorMsg('La nueva contraseña y su confirmación no coinciden.');
      showAlert('error', 'La nueva contraseña y su confirmación no coinciden.');
      return;
    }

    setLoading(true);
    try {
      const res = await client.post('/perfil/password', {
        password_actual: formData.password_actual,
        nueva_password: formData.nueva_password
      });
      const msg = res.data?.message || '¡Excelente! Tu contraseña ha sido actualizada y tu acceso es seguro.';
      setSuccessMsg(msg);
      showAlert('success', msg);
      setFormData({ password_actual: '', nueva_password: '', confirmar_password: '' });
    } catch (error: any) {
      const msg = error.response?.data?.detail || 'No se pudo actualizar la contraseña. Verifica tu contraseña actual e intenta de nuevo.';
      setErrorMsg(msg);
      showAlert('error', msg);
    } finally {
      setLoading(false);
    }
  };

  const isCliente = location.pathname.startsWith('/cliente');
  const dashboardPath = isCliente ? '/cliente/dashboard' : '/reseller/dashboard';

  const isMinLength = formData.nueva_password.length >= policy.longitud_minima;
  const isMatching = formData.nueva_password.length > 0 && formData.nueva_password === formData.confirmar_password;

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
              {errorMsg && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Error al actualizar contraseña</p>
                    <p className="mt-0.5">{errorMsg}</p>
                  </div>
                </div>
              )}

              {successMsg && (
                <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">¡Contraseña Cambiada!</p>
                    <p className="mt-0.5">{successMsg}</p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1.5 uppercase">Contraseña Actual</label>
                <div className="relative">
                  <input 
                    type={showCurrent ? "text" : "password"} 
                    name="password_actual"
                    value={formData.password_actual}
                    onChange={handleChange}
                    autoComplete="current-password"
                    style={{ color: '#FFFFFF', WebkitTextFillColor: '#FFFFFF', caretColor: '#FFFFFF', backgroundColor: '#1e2024', fontSize: '15px' }}
                    className="dark-input w-full px-4 py-3 bg-[#1e2024] text-white border border-gray-600 rounded-lg text-[15px] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 placeholder:text-gray-400 font-medium pr-12"
                    placeholder="Ingresa tu contraseña actual"
                  />
                  <button 
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition-colors focus:outline-none cursor-pointer flex items-center justify-center"
                    title={showCurrent ? "Ocultar contraseña" : "Ver contraseña"}
                  >
                    {showCurrent ? <EyeOff className="w-5 h-5 text-amber-400" /> : <Eye className="w-5 h-5 text-gray-300 hover:text-white" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1.5 uppercase">Nueva Contraseña</label>
                <div className="relative">
                  <input 
                    type={showNew ? "text" : "password"} 
                    name="nueva_password"
                    value={formData.nueva_password}
                    onChange={handleChange}
                    autoComplete="new-password"
                    style={{ color: '#FFFFFF', WebkitTextFillColor: '#FFFFFF', caretColor: '#FFFFFF', backgroundColor: '#1e2024', fontSize: '15px' }}
                    className="dark-input w-full px-4 py-3 bg-[#1e2024] text-white border border-gray-600 rounded-lg text-[15px] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 placeholder:text-gray-400 font-medium pr-12"
                    placeholder={`Mínimo ${policy.longitud_minima} caracteres`}
                  />
                  <button 
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition-colors focus:outline-none cursor-pointer flex items-center justify-center"
                    title={showNew ? "Ocultar contraseña" : "Ver contraseña"}
                  >
                    {showNew ? <EyeOff className="w-5 h-5 text-amber-400" /> : <Eye className="w-5 h-5 text-gray-300 hover:text-white" />}
                  </button>
                </div>
                {formData.nueva_password && (
                  <p className={`text-xs mt-1.5 flex items-center gap-1.5 ${isMinLength ? 'text-emerald-600 font-semibold' : 'text-amber-600 font-medium'}`}>
                    {isMinLength ? `✓ Cumple con el mínimo de ${policy.longitud_minima} caracteres` : `• Debe tener al menos ${policy.longitud_minima} caracteres`}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1.5 uppercase">Confirmar Nueva Contraseña</label>
                <div className="relative">
                  <input 
                    type={showConfirm ? "text" : "password"} 
                    name="confirmar_password"
                    value={formData.confirmar_password}
                    onChange={handleChange}
                    autoComplete="new-password"
                    style={{ color: '#FFFFFF', WebkitTextFillColor: '#FFFFFF', caretColor: '#FFFFFF', backgroundColor: '#1e2024', fontSize: '15px' }}
                    className="dark-input w-full px-4 py-3 bg-[#1e2024] text-white border border-gray-600 rounded-lg text-[15px] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 placeholder:text-gray-400 font-medium pr-12"
                    placeholder="Repite la nueva contraseña"
                  />
                  <button 
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition-colors focus:outline-none cursor-pointer flex items-center justify-center"
                    title={showConfirm ? "Ocultar contraseña" : "Ver contraseña"}
                  >
                    {showConfirm ? <EyeOff className="w-5 h-5 text-amber-400" /> : <Eye className="w-5 h-5 text-gray-300 hover:text-white" />}
                  </button>
                </div>
                {formData.confirmar_password && (
                  <p className={`text-xs mt-1.5 flex items-center gap-1.5 ${isMatching ? 'text-emerald-600 font-semibold' : 'text-red-600 font-medium'}`}>
                    {isMatching ? '✓ Las contraseñas coinciden' : '• Las contraseñas no coinciden'}
                  </p>
                )}
              </div>

              <div className="pt-4 flex justify-end">
                <button 
                  onClick={handleSave}
                  disabled={loading}
                  className="px-6 py-2.5 bg-[#0f2e23] hover:bg-[#153e30] text-white rounded text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
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
