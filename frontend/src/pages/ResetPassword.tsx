import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { KeyRound, ShieldCheck, ShieldAlert, Eye, EyeOff, CheckCircle2, ArrowLeft, RefreshCw, Check, AlertTriangle } from 'lucide-react';
import client from '../api/client';

export const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || '';

  const [token, setToken] = useState(tokenFromUrl);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Validation / verification state
  const [verifying, setVerifying] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [tokenError, setTokenError] = useState('');
  const [userInfo, setUserInfo] = useState<{ nombre?: string; email_enmascarado?: string; longitud_minima?: number } | null>(null);

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const minLength = userInfo?.longitud_minima || 12;

  useEffect(() => {
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
      verifyToken(tokenFromUrl);
    }
  }, [tokenFromUrl]);

  const verifyToken = async (tok: string) => {
    if (!tok.trim()) return;
    setVerifying(true);
    setTokenError('');
    try {
      const res = await client.post('/auth/verify-reset-token', { token: tok.trim() });
      setTokenValid(true);
      setUserInfo(res.data);
    } catch (err: any) {
      setTokenValid(false);
      setTokenError(err.response?.data?.detail || 'El token de recuperación no es válido o ha expirado.');
    } finally {
      setVerifying(false);
    }
  };

  const handleManualTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (token.trim()) {
      verifyToken(token.trim());
    }
  };

  const isPasswordValid = password.length >= minLength;
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const canSubmit = isPasswordValid && passwordsMatch && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError('');

    try {
      await client.post('/auth/reset-password', {
        token: token.trim(),
        nueva_password: password.trim()
      });
      setIsSuccess(true);
    } catch (err: any) {
      setSubmitError(err.response?.data?.detail || 'Ocurrió un error al restablecer la contraseña.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div data-theme-scope="cliente" className="flex min-h-screen items-center justify-center bg-client-bg-app relative overflow-hidden px-4 py-12 font-sans text-client-text-primary">
      {/* Background Star Orbits */}
      <div className="absolute top-1/2 left-1/2 w-[800px] h-[800px] border border-client-border/50 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none" />
      <div className="absolute top-1/2 left-1/2 w-[500px] h-[500px] border border-client-primary/10 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none" />
      <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] border border-client-border/30 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none" />

      <div className="w-full max-w-md bg-client-bg-surface border border-client-border rounded-[16px] shadow-modal p-8 z-10 relative">
        {/* Header Icon */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-20 bg-client-bg-surface border-4 border-client-bg-app rounded-full flex items-center justify-center text-client-primary shadow-sm">
          <KeyRound className="w-10 h-10 animate-pulse" />
        </div>

        <div className="mt-8 text-center">
          <h1 className="text-[24px] font-bold tracking-tight text-client-text-primary uppercase">Restablecer Contraseña</h1>
          <p className="text-[13px] text-client-text-muted mt-1 font-medium">Recuperación Segura de Acceso</p>
        </div>

        {/* STEP 1: If no token was verified or verification failed */}
        {!tokenValid && !isSuccess && (
          <div className="mt-6 space-y-4">
            {tokenError ? (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl space-y-3">
                <div className="flex items-start gap-2.5 text-sm text-[#EF4444]">
                  <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>{tokenError}</span>
                </div>
                <div className="pt-2 flex flex-col gap-2">
                  <Link
                    to="/login"
                    className="w-full py-2 bg-client-bg-subtle hover:bg-white/10 text-white rounded-lg text-xs font-bold text-center border border-client-border transition-colors"
                  >
                    Volver al Inicio de Sesión
                  </Link>
                </div>
              </div>
            ) : verifying ? (
              <div className="py-8 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-client-primary animate-spin mx-auto" />
                <p className="text-xs text-client-text-muted">Validando token de seguridad...</p>
              </div>
            ) : (
              <form onSubmit={handleManualTokenSubmit} className="space-y-4">
                <p className="text-xs text-client-text-secondary">
                  Ingresa el token de recuperación que recibiste o fue generado para tu cuenta:
                </p>
                <div>
                  <label className="block text-xs font-bold text-client-text-secondary uppercase tracking-wider mb-1.5">Token de Seguridad</label>
                  <input
                    type="text"
                    required
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Pega tu token de 32 caracteres"
                    className="w-full px-4 py-3 bg-client-bg-subtle border border-client-border rounded-lg text-client-text-primary font-mono text-sm focus:outline-none focus:border-client-primary"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 bg-client-primary hover:bg-client-primary-hover text-white rounded-lg text-sm font-bold uppercase tracking-wider transition-all cursor-pointer"
                >
                  Validar Token
                </button>
                <div className="text-center pt-2">
                  <Link to="/login" className="text-xs text-client-text-muted hover:text-white inline-flex items-center gap-1">
                    <ArrowLeft className="w-3.5 h-3.5" /> Volver al Login
                  </Link>
                </div>
              </form>
            )}
          </div>
        )}

        {/* STEP 2: Token is valid -> Form to set new password */}
        {tokenValid && !isSuccess && (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4 animate-fadeIn">
            {userInfo && (
              <div className="p-3 bg-client-primary/10 border border-client-primary/20 rounded-xl text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-client-text-muted">Usuario:</span>
                  <span className="font-bold text-white">{userInfo.nombre}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-client-text-muted">Cuenta:</span>
                  <span className="font-mono text-client-primary font-semibold">{userInfo.email_enmascarado}</span>
                </div>
              </div>
            )}

            {submitError && (
              <div className="flex items-start gap-2.5 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-[#EF4444]">
                <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{submitError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-client-text-secondary uppercase tracking-wider mb-1.5">
                Nueva Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 12 caracteres"
                  className={`w-full px-4 py-3 bg-client-bg-subtle border rounded-lg text-client-text-primary text-sm focus:outline-none pr-12 transition-colors ${
                    isPasswordValid ? 'border-emerald-500/60 focus:border-emerald-500' : 'border-client-border focus:border-amber-500'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-client-text-muted hover:text-client-primary p-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Real-time length indicator */}
              <div className="flex items-center justify-between mt-1.5 text-[11px]">
                <div className="flex items-center gap-1">
                  {isPasswordValid ? (
                    <span className="text-emerald-400 font-medium flex items-center gap-1">
                      <Check className="w-3 h-3" /> Longitud válida
                    </span>
                  ) : (
                    <span className="text-amber-400 font-medium flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Mínimo {minLength} caracteres
                    </span>
                  )}
                </div>
                <span className={`font-mono font-bold px-1.5 py-0.5 rounded ${isPasswordValid ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                  {password.length} / {minLength}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-client-text-secondary uppercase tracking-wider mb-1.5">
                Confirmar Contraseña
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite tu nueva contraseña"
                  className={`w-full px-4 py-3 bg-client-bg-subtle border rounded-lg text-client-text-primary text-sm focus:outline-none pr-12 transition-colors ${
                    passwordsMatch ? 'border-emerald-500/60 focus:border-emerald-500' : 'border-client-border focus:border-amber-500'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-client-text-muted hover:text-client-primary p-1 cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {confirmPassword.length > 0 && (
                <div className="mt-1 text-[11px]">
                  {passwordsMatch ? (
                    <span className="text-emerald-400 font-medium flex items-center gap-1">
                      <Check className="w-3 h-3" /> Las contraseñas coinciden
                    </span>
                  ) : (
                    <span className="text-red-400 font-medium flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Las contraseñas no coinciden
                    </span>
                  )}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full py-3.5 mt-2 bg-client-primary hover:bg-client-primary-hover active:bg-client-primary-active text-white rounded-lg text-sm font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Establecer Contraseña</span>
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <Link to="/login" className="text-xs text-client-text-muted hover:text-white inline-flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" /> Cancelar y volver al Login
              </Link>
            </div>
          </form>
        )}

        {/* STEP 3: Success Screen */}
        {isSuccess && (
          <div className="mt-6 space-y-5 text-center animate-fadeIn py-2">
            <div className="w-14 h-14 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">¡Contraseña Restablecida!</h3>
              <p className="text-xs text-client-text-muted mt-1.5 max-w-xs mx-auto">
                Tu clave ha sido actualizada con éxito bajo los estándares corporativos. Ya puedes ingresar al portal con tus nuevas credenciales.
              </p>
            </div>

            <div className="pt-3">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full py-3 bg-client-primary hover:bg-client-primary-hover text-white rounded-lg text-sm font-bold uppercase tracking-wider transition-colors shadow-lg cursor-pointer"
              >
                Iniciar Sesión Ahora
              </button>
            </div>
          </div>
        )}

        <div className="mt-8 border-t border-client-border pt-4 text-center">
          <p className="text-[12px] text-client-text-muted font-medium">
            Acceso restringido a personal autorizado.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
