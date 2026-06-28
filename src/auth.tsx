import { createContext, useContext, useState } from 'react'
import { login as apiLogin, getUserInfo, type LoginResponse, type UserInfo } from '@/api'

const SESSION_KEY = 'auth_session';
const USERINFO_KEY = 'auth_userinfo';

interface AuthContextType {
  isLoggedIn: boolean;
  session: LoginResponse | null;
  userInfo: UserInfo | null;
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

function loadUserInfo(): UserInfo | null {
  try {
    const stored = localStorage.getItem(USERINFO_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<LoginResponse | null>(loadSession);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(loadUserInfo);

  async function login(username: string, password: string) {
    const result = await apiLogin(username, password);
    const info = await getUserInfo(result.userid, result.session);
    localStorage.setItem(SESSION_KEY, JSON.stringify(result));
    localStorage.setItem(USERINFO_KEY, JSON.stringify(info));
    setSession(result);
    setUserInfo(info);
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(USERINFO_KEY);
    setSession(null);
    setUserInfo(null);
  }

  return (
    <AuthContext.Provider value={{ isLoggedIn: session !== null, session, userInfo, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
