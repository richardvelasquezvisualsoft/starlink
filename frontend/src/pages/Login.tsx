import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Satellite, ShieldAlert, Eye, EyeOff, KeyRound, ArrowLeft, CheckCircle2, Copy, Check, Sparkles, RefreshCw } from 'lucide-react';
import client from '../api/client';
import { useDemoStore } from '../store/demoStore';

const Login: React.FC = () => {
  const navigate = useNavigate();
  
  // View mode: 'login' | 'forgot' | 'forgot_success'
  const [viewMode, setViewMode] = useState<'login' | 'forgot' | 'forgot_success'>('login');

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Forgot password form state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotResult, setForgotResult] = useState<{
    message: string;
    email_enmascarado?: string;
    token?: string;
    minutos_expiracion?: number;
  } | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);

  useEffect(() => {
    // If token exists, direct to correct dashboard based on saved user profile
    const token = localStorage.getItem('starlink_token');
    if (token) {
      const userStr = localStorage.getItem('starlink_user');

      if (userStr) {
        try {
          const u = JSON.parse(userStr);
          const codes: string[] = Array.isArray(u.role_codes) ? u.role_codes : [u.role_codes];
          const hasClientRole = codes.some(c => String(c).trim().toUpperCase() === 'CLIENTE');
          const hasResellerRole = codes.some(c => String(c).trim().toUpperCase() === 'RESELLER');
          
          if (hasClientRole) {
            navigate('/cliente/dashboard');
          } else if (hasResellerRole) {
            navigate('/reseller/dashboard');
          }
        } catch(e) {}
      }
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Login request
      const res = await client.post('/auth/login', { email, password });
      const { access_token } = res.data;
      
      localStorage.setItem('starlink_token', access_token);
      
      // Fetch user profile info
      const profileRes = await client.get('/auth/me');
      console.log('[DEBUG /auth/me profile]:', profileRes.data);
      
      localStorage.setItem('starlink_user', JSON.stringify(profileRes.data));
      
      // Auto-set the Demo Store based on the role
      const { setRole, setTenantId } = useDemoStore.getState();
      const rawCodes = profileRes.data.role_codes || [];
      const codes: string[] = Array.isArray(rawCodes) ? rawCodes : [rawCodes];
      console.log('[DEBUG role_codes extracted]:', codes);

      const hasClientRole = codes.some(c => String(c).trim().toUpperCase() === 'CLIENTE');
      const hasResellerRole = codes.some(c => String(c).trim().toUpperCase() === 'RESELLER');

      console.log('[DEBUG role match result]:', { hasClientRole, hasResellerRole, codes });

      const mustChangePassword = profileRes.data.debe_cambiar_password === true;

      if (hasClientRole) {
        setRole('CLIENTE');
        setTenantId(1); // Minera Horizonte S.A.C.
        if (mustChangePassword) {
          navigate('/cliente/perfil/password');
        } else {
          navigate('/cliente/dashboard');
        }
      } else if (hasResellerRole) {
        setRole('RESELLER');
        setTenantId(null);
        if (mustChangePassword) {
          navigate('/reseller/perfil/password');
        } else {
          navigate('/reseller/dashboard');
        }
      } else {
        const receivedRoles = codes.join(', ');
        throw new Error(`No tienes un rol válido asignado (Roles recibidos: [${receivedRoles || 'ninguno'}]). Por favor, contacta al administrador.`);
      }
      
    } catch (err: any) {
      setError(
        err.response?.data?.detail || 
        err.message ||
        'Error de conexión. Verifica tus credenciales e intenta nuevamente.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setError('');
    setForgotLoading(true);

    try {
      const res = await client.post('/auth/forgot-password', { email: forgotEmail.trim() });
      setForgotResult(res.data);
      setViewMode('forgot_success');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al solicitar el restablecimiento de contraseña.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!forgotResult?.token) return;
    const resetUrl = `${window.location.origin}/restablecer-password?token=${forgotResult.token}`;
    navigator.clipboard.writeText(resetUrl);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2500);
  };

  return (
    <div data-theme-scope="cliente" className="flex min-h-screen items-center justify-center bg-client-bg-app relative overflow-hidden px-4 py-12 font-sans text-client-text-primary">
      {/* Background Star Orbits */}
      <div className="absolute top-1/2 left-1/2 w-[800px] h-[800px] border border-client-border/50 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none" />
      <div className="absolute top-1/2 left-1/2 w-[500px] h-[500px] border border-client-primary/10 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none" />
      <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] border border-client-border/30 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none" />

      {/* Main Card */}
      <div className="w-full max-w-md bg-client-bg-surface border border-client-border rounded-[16px] shadow-modal p-8 z-10 relative">
        
        {/* Top Icon */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-20 bg-client-bg-surface border-4 border-client-bg-app rounded-full flex items-center justify-center text-client-primary shadow-sm">
          {viewMode === 'login' ? (
            <Satellite className="w-10 h-10 animate-pulse" />
          ) : (
            <KeyRound className="w-10 h-10 animate-pulse" />
          )}
        </div>

        {/* ========================================================
            VIEW 1: STANDARD LOGIN
            ======================================================== */}
        {viewMode === 'login' && (
          <div className="animate-fadeIn">
            <div className="mt-8 text-center">
              <h1 className="text-[26px] font-bold tracking-tight text-client-text-primary uppercase">STAR MONITOR</h1>
              <p className="text-[13px] text-client-text-muted mt-1 font-medium">Acceso Autorizado</p>
            </div>

            {error && (
              <div className="mt-6 flex items-start gap-2.5 p-3.5 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-[#EF4444]">
                <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-[13px] font-semibold text-client-text-secondary uppercase tracking-wider mb-1.5">Correo Electrónico</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@starlink.com"
                  className="w-full px-4 py-[14px] bg-client-bg-subtle border border-client-border rounded-[10px] text-client-text-primary placeholder-client-text-disabled focus:outline-none focus:ring-2 focus:ring-client-primary/20 focus:border-client-primary transition-colors text-[14px]"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-[13px] font-semibold text-client-text-secondary uppercase tracking-wider">Contraseña</label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(email);
                      setError('');
                      setViewMode('forgot');
                    }}
                    className="text-xs text-st-accent hover:underline font-semibold cursor-pointer"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-[14px] bg-client-bg-subtle border border-client-border rounded-[10px] text-client-text-primary placeholder-client-text-disabled focus:outline-none focus:ring-2 focus:ring-client-primary/20 focus:border-client-primary transition-colors text-[14px] pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-client-text-muted hover:text-client-primary transition-colors p-1 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-[44px] mt-6 bg-client-primary text-white keep-white font-bold uppercase tracking-wider rounded-[12px] hover:bg-client-primary-hover active:bg-client-primary-active transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 text-[14px]"
              >
                {isLoading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span>Autenticar Conexión</span>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ========================================================
            VIEW 2: FORGOT PASSWORD REQUEST
            ======================================================== */}
        {viewMode === 'forgot' && (
          <div className="animate-fadeIn">
            <div className="mt-8 text-center">
              <h2 className="text-[22px] font-bold tracking-tight text-client-text-primary uppercase">Recuperar Contraseña</h2>
              <p className="text-[13px] text-client-text-muted mt-1 font-medium">Ingresa tu correo para restablecer tu acceso</p>
            </div>

            {error && (
              <div className="mt-6 flex items-start gap-2.5 p-3.5 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-[#EF4444]">
                <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleForgotSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-[13px] font-semibold text-client-text-secondary uppercase tracking-wider mb-1.5">
                  Correo Electrónico Registrado
                </label>
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="cliente@starlink.com"
                  className="w-full px-4 py-[14px] bg-client-bg-subtle border border-client-border rounded-[10px] text-client-text-primary placeholder-client-text-disabled focus:outline-none focus:ring-2 focus:ring-client-primary/20 focus:border-client-primary transition-colors text-[14px]"
                />
                <p className="text-[11px] text-client-text-muted mt-1.5">
                  Se generará un token de recuperación con verificación de seguridad corporativa.
                </p>
              </div>

              <button
                type="submit"
                disabled={forgotLoading || !forgotEmail.trim()}
                className="w-full h-[44px] mt-2 bg-client-primary text-white keep-white font-bold uppercase tracking-wider rounded-[12px] hover:bg-client-primary-hover active:bg-client-primary-active transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 text-[14px]"
              >
                {forgotLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Generando Enlace...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Continuar con Recuperación</span>
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => { setError(''); setViewMode('login'); }}
                  className="text-xs text-client-text-muted hover:text-white inline-flex items-center gap-1.5 cursor-pointer font-medium transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Volver al Inicio de Sesión
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ========================================================
            VIEW 3: FORGOT PASSWORD GENERATED / SUCCESS
            ======================================================== */}
        {viewMode === 'forgot_success' && (
          <div className="mt-6 space-y-5 text-center animate-fadeIn py-2">
            <div className="w-14 h-14 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">Solicitud Generada</h3>
              <p className="text-xs text-client-text-muted mt-1 max-w-xs mx-auto">
                {forgotResult?.message || 'Se ha generado el proceso de recuperación para tu cuenta.'}
              </p>
            </div>

            {forgotResult?.token && (
              <div className="space-y-3 text-left">
                <div className="bg-client-bg-subtle border border-client-border rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-client-text-muted">
                    <span className="font-semibold uppercase tracking-wider">Token de Recuperación:</span>
                    <span className="text-emerald-400 font-bold">Válido {forgotResult.minutos_expiracion || 60} min</span>
                  </div>
                  <div className="font-mono text-xs font-bold text-white bg-black/40 p-2.5 rounded-lg break-all border border-white/5 select-all">
                    {forgotResult.token}
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => navigate(`/restablecer-password?token=${forgotResult.token}`)}
                    className="w-full py-3 bg-client-primary hover:bg-client-primary-hover text-white keep-white rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shadow-lg cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Restablecer Contraseña Ahora</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className={`w-full py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 border ${
                      copiedToken
                        ? 'bg-emerald-600 text-white border-emerald-500'
                        : 'bg-client-bg-subtle hover:bg-white/10 text-st-accent border-client-border'
                    }`}
                  >
                    {copiedToken ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>¡Enlace Copiado al Portapapeles!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copiar Enlace de Restablecimiento</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            <div className="pt-2">
              <button
                type="button"
                onClick={() => { setError(''); setViewMode('login'); }}
                className="text-xs text-client-text-muted hover:text-white inline-flex items-center gap-1.5 cursor-pointer font-medium"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Volver al Inicio de Sesión
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

export default Login;
