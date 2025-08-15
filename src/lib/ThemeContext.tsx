'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';

export type Theme = 'light' | 'dark' | 'auto';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
  getIconPath: (iconName: string) => string;
  mounted: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>('auto');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  // Get system theme preference
  const getSystemTheme = useCallback((): 'light' | 'dark' => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  }, []);

  // Resolve the actual theme to apply
  const resolveTheme = useCallback((themeToResolve: Theme): 'light' | 'dark' => {
    if (themeToResolve === 'auto') {
      return getSystemTheme();
    }
    return themeToResolve;
  }, [getSystemTheme]);

  // Apply theme to document
  const applyTheme = useCallback((appliedTheme: 'light' | 'dark', themeMode: Theme) => {
    if (typeof window !== 'undefined') {
      const root = document.documentElement;
      root.setAttribute('data-theme', themeMode);
      setResolvedTheme(appliedTheme);
    }
  }, []);

  // Set theme with persistence
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', newTheme);
    }
    const resolved = resolveTheme(newTheme);
    applyTheme(resolved, newTheme);
  };

  // Get icon path based on resolved theme
  const getIconPath = (iconName: string): string => {
    const iconFolder = resolvedTheme === 'dark' ? 'icon_light' : 'icon';
    return `/${iconFolder}/${iconName}.svg`;
  };

  // Initialize theme on mount
  useEffect(() => {
    setMounted(true);
    
    if (typeof window !== 'undefined') {
      // Get saved theme or default to auto
      const savedTheme = localStorage.getItem('theme') as Theme;
      const initialTheme = savedTheme || 'auto';
      
      setThemeState(initialTheme);
      const resolved = resolveTheme(initialTheme);
      applyTheme(resolved, initialTheme);

      // Listen for system theme changes
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleSystemThemeChange = (e: MediaQueryListEvent) => {
        if (theme === 'auto') {
          const newResolvedTheme = e.matches ? 'dark' : 'light';
          applyTheme(newResolvedTheme, 'auto');
        }
      };

      mediaQuery.addEventListener('change', handleSystemThemeChange);
      return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
    }
  }, [theme, resolveTheme, applyTheme]);



  const value: ThemeContextType = {
    theme,
    setTheme,
    resolvedTheme,
    getIconPath,
    mounted,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}; 