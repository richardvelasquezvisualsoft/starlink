import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Satellite, ShieldAlert, Eye, EyeOff } from 'lucide-react';
import client from '../api/client';
import { useDemoStore } from '../store/demoStore';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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

      if (hasClientRole) {
        setRole('CLIENTE');
        setTenantId(1); // Minera Horizonte S.A.C.
        navigate('/cliente/dashboard');
      } else if (hasResellerRole) {
        setRole('RESELLER');
        setTenantId(null);
        navigate('/reseller/dashboard');
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

  return (
    <div className="flex h-screen items-center justify-center bg-st-bg relative overflow-hidden px-4">
      {/* Background Star Orbits */}
      <div className="absolute top-1/2 left-1/2 w-[800px] h-[800px] border border-st-border/30 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none" />
      <div className="absolute top-1/2 left-1/2 w-[500px] h-[500px] border border-st-accent/10 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none" />
      <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] border border-st-border/20 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none" />

      {/* Login Card */}
      <div className="w-full max-w-md bg-st-surface border border-st-border rounded-xl shadow-2xl p-8 z-10 glassmorphism relative">
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-20 bg-st-surface border border-st-accent/30 rounded-full flex items-center justify-center text-st-accent shadow-lg shadow-st-accent/10">
          <Satellite className="w-10 h-10 animate-pulse" />
        </div>

        <div className="mt-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans uppercase">STAR MONITOR</h1>
          <p className="text-xs text-st-muted mt-1">StarMonitor Portal</p>
        </div>

        {error && (
          <div className="mt-6 flex items-start gap-2.5 p-3.5 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-[#EF4444]">
            <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-st-muted uppercase tracking-wider mb-1.5">Correo Electrónico</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@starlink.com"
              className="w-full px-4 py-3 bg-st-bg border border-st-border rounded-lg text-white placeholder-st-muted/50 focus:outline-none focus:ring-1 focus:ring-st-accent focus:border-st-accent transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-st-muted uppercase tracking-wider mb-1.5">Contraseña</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-st-bg border border-st-border rounded-lg text-white placeholder-st-muted/50 focus:outline-none focus:ring-1 focus:ring-st-accent focus:border-st-accent transition-colors pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-st-muted hover:text-white transition-colors p-1"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 mt-6 bg-st-primary text-black font-bold uppercase tracking-wider rounded-lg hover:bg-white/95 active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <span className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>Autenticar Conexión</span>
            )}
          </button>
        </form>

        <div className="mt-8 border-t border-st-border pt-4 text-center">
          <p className="text-[10px] text-st-muted">
            Acceso restringido a personal autorizado.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
