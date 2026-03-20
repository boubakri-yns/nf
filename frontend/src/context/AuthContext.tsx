import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../api/client';
import { disableFastLocalMode, isManagedSessionToken, isMockAxiosResponse, resolveUserFromStoredSession } from '../api/localApi';
import type { AuthResponse, RegistrationRequestResponse, User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isImpersonating: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: Record<string, string>) => Promise<RegistrationRequestResponse>;
  startImpersonation: (payload: AuthResponse) => void;
  stopImpersonation: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const AUTH_USER_STORAGE_KEY = 'auth_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem(AUTH_USER_STORAGE_KEY);
    const token = localStorage.getItem('token');
    if (!storedUser) {
      return resolveUserFromStoredSession(token);
    }

    try {
      return resolveUserFromStoredSession(token, JSON.parse(storedUser) as User);
    } catch {
      localStorage.removeItem(AUTH_USER_STORAGE_KEY);
      return resolveUserFromStoredSession(token);
    }
  });
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(false);
  const [isImpersonating, setIsImpersonating] = useState(localStorage.getItem('impersonation_token') !== null);

  useEffect(() => {
    const bootstrap = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      if (isManagedSessionToken(token)) {
        localStorage.removeItem('token');
        localStorage.removeItem(AUTH_USER_STORAGE_KEY);
        setToken(null);
        setUser(null);
        setLoading(false);
        toast.error('Reconnectez-vous pour utiliser la sauvegarde serveur des notes.');
        return;
      }

      const localUser = resolveUserFromStoredSession(token, user);
      if (localUser) {
        setUser(localUser);
        localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(localUser));
        setLoading(false);
        return;
      }

      try {
        const { data } = await api.get<User>('/auth/user');
        setUser(data);
        localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(data));
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem(AUTH_USER_STORAGE_KEY);
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    void bootstrap();
  }, [token]);

  const login = async (email: string, password: string) => {
    const { data } = await api.post<AuthResponse>('/auth/login', { email, password });
    disableFastLocalMode();
    localStorage.setItem('token', data.token);
    localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    setLoading(false);
    toast.success('Connexion reussie');
  };

  const register = async (payload: Record<string, string>) => {
    const response = await api.post<RegistrationRequestResponse>('/auth/register', payload);
    if (!isMockAxiosResponse(response)) {
      disableFastLocalMode();
    }
    toast.success('Demande envoyee a l administrateur');
    return response.data;
  };

  const startImpersonation = (payload: AuthResponse) => {
    if (token) {
      localStorage.setItem('admin_token_backup', token);
    }
    if (user) {
      localStorage.setItem('admin_user_backup', JSON.stringify(user));
    }

    localStorage.setItem('token', payload.token);
    localStorage.setItem('impersonation_token', payload.token);
    localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(payload.user));
    setToken(payload.token);
    setUser(payload.user);
    setIsImpersonating(true);
    toast.success(`Session ouverte comme ${payload.user.nom}`);
  };

  const stopImpersonation = () => {
    const adminToken = localStorage.getItem('admin_token_backup');
    const adminUser = localStorage.getItem('admin_user_backup');

    if (!adminToken || !adminUser) {
      toast.error('Impossible de restaurer la session admin.');
      return;
    }

    localStorage.setItem('token', adminToken);
    localStorage.setItem(AUTH_USER_STORAGE_KEY, adminUser);
    localStorage.removeItem('impersonation_token');
    localStorage.removeItem('admin_token_backup');
    localStorage.removeItem('admin_user_backup');
    setToken(adminToken);
    setUser(JSON.parse(adminUser) as User);
    setIsImpersonating(false);
    toast.success('Session admin restauree');
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore
    }

    localStorage.removeItem('token');
    localStorage.removeItem('impersonation_token');
    localStorage.removeItem('admin_token_backup');
    localStorage.removeItem('admin_user_backup');
    localStorage.removeItem(AUTH_USER_STORAGE_KEY);
    setToken(null);
    setUser(null);
    setIsImpersonating(false);
  };

  const value = useMemo(() => ({ user, token, loading, isImpersonating, login, register, startImpersonation, stopImpersonation, logout }), [user, token, loading, isImpersonating]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth doit etre utilise dans AuthProvider');
  }

  return ctx;
}
