import { createContext, useContext, useState, ReactNode } from 'react';
import { apiPost, setSession, clearSession, getToken } from '../lib/api';
import type { LoginResponse } from '../types';

interface AuthCtx {
  token: string | null;
  role: string | null;
  name: string | null;
  login: (username: string, password: string) => Promise<LoginResponse>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx>({} as AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(getToken());
  const [role, setRole] = useState<string | null>(localStorage.getItem('baseer_role'));
  const [name, setName] = useState<string | null>(localStorage.getItem('baseer_name'));

  async function login(username: string, password: string) {
    const res = await apiPost<LoginResponse>('/auth/login', { username, password });
    setSession(res.token, res.role, res.full_name || res.username);
    setToken(res.token);
    setRole(res.role);
    setName(res.full_name || res.username);
    return res;
  }

  function logout() {
    clearSession();
    setToken(null);
    setRole(null);
    setName(null);
  }

  return <Ctx.Provider value={{ token, role, name, login, logout }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
