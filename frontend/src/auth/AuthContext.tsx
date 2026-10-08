import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, token } from '../lib/api';
import type { User } from '../lib/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // se já tem token salvo, busca o usuário pra não precisar logar de novo
  useEffect(() => {
    if (!token.get()) {
      setLoading(false);
      return;
    }
    api.me()
      .then(setUser)
      .catch(() => token.clear())
      .finally(() => setLoading(false));
  }, []);

  // o api.ts dispara esse evento quando o token expira
  useEffect(() => {
    const onLogout = () => setUser(null);
    window.addEventListener('logout', onLogout);
    return () => window.removeEventListener('logout', onLogout);
  }, []);

  async function login(email: string, password: string) {
    const res = await api.login(email, password);
    token.set(res.access_token);
    setUser(res.user);
  }

  function logout() {
    token.clear();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

export const isManager = (user: User | null) => user?.role === 'manager' || user?.role === 'admin';
