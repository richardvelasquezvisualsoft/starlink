import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Satellite, ShieldAlert, Check } from 'lucide-react';
import client from '../api/client';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // If token exists, direct to dashboard
    const token = localStorage.getItem('starlink_token');
    if (token) {
      navigate('/dashboard');
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
      localStorage.setItem('starlink_user', JSON.stringify(profileRes.data));
      
      navigate('/dashboard');
    } catch (err: any) {
      setError(
        err.response?.data?.detail || 
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
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans uppercase">MISSION CONTROL</h1>
          <p className="text-xs text-st-muted mt-1">Starlink Fleet Management Portal</p>
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
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-st-bg border border-st-border rounded-lg text-white placeholder-st-muted/50 focus:outline-none focus:ring-1 focus:ring-st-accent focus:border-st-accent transition-colors"
            />
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
            Acceso restringido a personal autorizado. Credenciales demo por defecto: <br />
            <strong className="text-white">admin@starlink.com</strong> / <strong className="text-white">admin123</strong>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
