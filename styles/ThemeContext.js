import React, { createContext, useContext, useState, useMemo } from 'react';
import { DefaultTheme as NavigationDefaultTheme, DarkTheme as NavigationDarkTheme } from '@react-navigation/native';
import { lightColors, darkColors } from './commonStyles';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false);

  const toggleTheme = () => setIsDark((v) => !v);

  const colors = isDark ? darkColors : lightColors;

  const navigationTheme = useMemo(() => {
    return {
      dark: isDark,
      colors: {
        primary: colors.primary,
        background: colors.background,
        card: colors.surface,
        text: colors.text,
        border: colors.lightGray,
        notification: colors.primary,
      },
    };
  }, [isDark]);

  const value = useMemo(
    () => ({ isDark, toggleTheme, colors, navigationTheme }),
    [isDark, colors, navigationTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

export default ThemeContext;
