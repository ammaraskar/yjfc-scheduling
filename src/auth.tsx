import { createContext, useContext, useState } from 'react'
import { login as apiLogin, type LoginResponse } from '@/api'

const SESSION_KEY = 'auth_session';

interface AuthContextType {
  isLoggedIn: boolean;
  session: LoginResponse | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null)

function loadSession(): LoginResponse | null {
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<LoginResponse | null>(loadSession);

  async function login(username: string, password: string) {
    const result = await apiLogin(username, password);
    localStorage.setItem(SESSION_KEY, JSON.stringify(result));
    setSession(result);
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
  }

  return (
    <AuthContext.Provider value={{ isLoggedIn: session !== null, session, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
