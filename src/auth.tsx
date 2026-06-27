import { createContext, useContext, useState } from 'react'
import { login as apiLogin, type LoginResponse } from '@/api'

interface AuthContextType {
  isLoggedIn: boolean;
  session: LoginResponse | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<LoginResponse | null>(null);

  async function login(username: string, password: string) {
    const result = await apiLogin(username, password);
    setSession(result);
  }

  function logout() {
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
