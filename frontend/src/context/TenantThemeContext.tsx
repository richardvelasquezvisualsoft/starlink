import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import client from '../api/client';
import {
  DEFAULT_PRIMARY_COLOR,
  DEFAULT_SECONDARY_COLOR,
  TenantThemeTokens,
  generateBrandTokens,
  normalizeHexColor,
  applyThemeToCssVariables
} from '../utils/themeUtils';

export interface TenantConfig {
  tenant_id: number;
  razon_social?: string;
  nombre_comercial?: string;
  nombre_corto?: string;
  color_primario: string;
  color_secundario: string;
  logo_url?: string | null;
  logo_nombre?: string | null;
  logo_sha256?: string | null;
  logo_mime_type?: string | null;
  logo_tamano_bytes?: number | null;
  fecha_modificacion?: string | null;
}

interface TenantThemeContextType {
  tenantConfig: TenantConfig | null;
  loading: boolean;
  primaryColor: string;
  secondaryColor: string;
  shortName: string;
  logoUrl: string | null;
  logoVersion: number;
  tokens: TenantThemeTokens;
  fetchTenantConfig: () => Promise<void>;
  applyLiveTheme: (primary: string, secondary: string) => void;
  resetLiveTheme: () => void;
  updateBranding: (data: { nombre_corto?: string; color_primario?: string; color_secundario?: string }) => Promise<TenantConfig>;
  uploadLogo: (file: File) => Promise<TenantConfig>;
  removeLogo: () => Promise<TenantConfig>;
}

const TenantThemeContext = createContext<TenantThemeContextType | undefined>(undefined);

export const TenantThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tenantConfig, setTenantConfig] = useState<TenantConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [livePrimary, setLivePrimary] = useState<string>(DEFAULT_PRIMARY_COLOR);
  const [liveSecondary, setLiveSecondary] = useState<string>(DEFAULT_SECONDARY_COLOR);
  const [logoVersion, setLogoVersion] = useState<number>(Date.now());

  const applyConfigToStateAndCss = useCallback((cfg: TenantConfig) => {
    const p = normalizeHexColor(cfg.color_primario, DEFAULT_PRIMARY_COLOR);
    const s = normalizeHexColor(cfg.color_secundario, DEFAULT_SECONDARY_COLOR);
    setLivePrimary(p);
    setLiveSecondary(s);
    setLogoVersion(Date.now());
    applyThemeToCssVariables(p, s);
  }, []);

  const fetchTenantConfig = useCallback(async () => {
    try {
      setLoading(true);
      const res = await client.get('/configuracion-global');
      const data: TenantConfig = res.data;
      setTenantConfig(data);
      applyConfigToStateAndCss(data);
    } catch (err) {
      console.error('Error loading tenant global configuration:', err);
      const fallbackCfg: TenantConfig = {
        tenant_id: 1,
        color_primario: DEFAULT_PRIMARY_COLOR,
        color_secundario: DEFAULT_SECONDARY_COLOR,
      };
      setTenantConfig(fallbackCfg);
      applyConfigToStateAndCss(fallbackCfg);
    } finally {
      setLoading(false);
    }
  }, [applyConfigToStateAndCss]);

  useEffect(() => {
    fetchTenantConfig();
  }, [fetchTenantConfig]);

  const applyLiveTheme = (primary: string, secondary: string) => {
    const p = normalizeHexColor(primary, DEFAULT_PRIMARY_COLOR);
    const s = normalizeHexColor(secondary, DEFAULT_SECONDARY_COLOR);
    setLivePrimary(p);
    setLiveSecondary(s);
    applyThemeToCssVariables(p, s);
  };

  const resetLiveTheme = () => {
    if (tenantConfig) {
      applyConfigToStateAndCss(tenantConfig);
    } else {
      applyLiveTheme(DEFAULT_PRIMARY_COLOR, DEFAULT_SECONDARY_COLOR);
    }
  };

  const updateBranding = async (data: { nombre_corto?: string; color_primario?: string; color_secundario?: string }): Promise<TenantConfig> => {
    const res = await client.put('/configuracion-global', data);
    const updated: TenantConfig = res.data;
    setTenantConfig(updated);
    applyConfigToStateAndCss(updated);
    window.dispatchEvent(new Event('tenant_branding_updated'));
    return updated;
  };

  const uploadLogo = async (file: File): Promise<TenantConfig> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await client.post('/configuracion-global/logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const updated: TenantConfig = res.data;
    setTenantConfig(updated);
    applyConfigToStateAndCss(updated);
    window.dispatchEvent(new Event('tenant_branding_updated'));
    return updated;
  };

  const removeLogo = async (): Promise<TenantConfig> => {
    const res = await client.delete('/configuracion-global/logo');
    const updated: TenantConfig = res.data;
    setTenantConfig(updated);
    applyConfigToStateAndCss(updated);
    window.dispatchEvent(new Event('tenant_branding_updated'));
    return updated;
  };

  const tokens = generateBrandTokens(livePrimary, liveSecondary);
  const shortName = tenantConfig?.nombre_corto || tenantConfig?.nombre_comercial || tenantConfig?.razon_social || 'STARMONITOR';
  const logoUrl = tenantConfig?.logo_url || null;

  return (
    <TenantThemeContext.Provider
      value={{
        tenantConfig,
        loading,
        primaryColor: livePrimary,
        secondaryColor: liveSecondary,
        shortName,
        logoUrl,
        logoVersion,
        tokens,
        fetchTenantConfig,
        applyLiveTheme,
        resetLiveTheme,
        updateBranding,
        uploadLogo,
        removeLogo,
      }}
    >
      {children}
    </TenantThemeContext.Provider>
  );
};

export const useTenantTheme = (): TenantThemeContextType => {
  const context = useContext(TenantThemeContext);
  if (!context) {
    throw new Error('useTenantTheme must be used within a TenantThemeProvider');
  }
  return context;
};
