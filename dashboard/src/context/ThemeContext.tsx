import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface ThemeCtx {
  dark: boolean;
  toggle: () => void;
}

const Ctx = createContext<ThemeCtx>({ dark: false, toggle: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(() => localStorage.getItem('baseer_theme') === 'dark');

  useEffect(() => {
    const root = document.documentElement;
    if (dark) root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('baseer_theme', dark ? 'dark' : 'light');
  }, [dark]);

  return <Ctx.Provider value={{ dark, toggle: () => setDark((d) => !d) }}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);
