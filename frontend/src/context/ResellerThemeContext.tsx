import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type ResellerThemeMode = 'dark' | 'light';

interface ResellerThemeContextType {
  themeMode: ResellerThemeMode;
  setThemeMode: (mode: ResellerThemeMode) => void;
  toggleThemeMode: () => void;
}

const ResellerThemeContext = createContext<ResellerThemeContextType | undefined>(undefined);

export const ResellerThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ResellerThemeMode>(() => {
    const saved = localStorage.getItem('st_reseller_theme_mode');
    return saved === 'light' ? 'light' : 'dark';
  });

  const setThemeMode = useCallback((mode: ResellerThemeMode) => {
    setThemeModeState(mode);
    localStorage.setItem('st_reseller_theme_mode', mode);
  }, []);

  const toggleThemeMode = useCallback(() => {
    setThemeModeState(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('st_reseller_theme_mode', next);
      return next;
    });
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-reseller-theme', themeMode);
    document.documentElement.setAttribute('data-theme-mode', themeMode);
    if (themeMode === 'light') {
      document.documentElement.classList.add('light-theme');
      document.documentElement.classList.remove('dark-theme');
    } else {
      document.documentElement.classList.add('dark-theme');
      document.documentElement.classList.remove('light-theme');
    }
  }, [themeMode]);

  return (
    <ResellerThemeContext.Provider value={{ themeMode, setThemeMode, toggleThemeMode }}>
      {children}
    </ResellerThemeContext.Provider>
  );
};

export const useResellerTheme = (): ResellerThemeContextType => {
  const context = useContext(ResellerThemeContext);
  if (!context) {
    throw new Error('useResellerTheme must be used within a ResellerThemeProvider');
  }
  return context;
};
