import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('eh_user');
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      if (parsed && !parsed.name && parsed.full_name) {
        parsed.name = parsed.full_name;
      }
      return parsed;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(() => {
    return !!localStorage.getItem('eh_token') && !localStorage.getItem('eh_user');
  });

  useEffect(() => {
    let isMounted = true;
    const token = localStorage.getItem('eh_token');
    if (token) {
      api.getMe()
        .then((res) => {
          if (isMounted) {
            const userData = res.data?.user || res.data || res.user;
            if (userData) {
              if (!userData.name && userData.full_name) {
                userData.name = userData.full_name;
              }
              setUser(userData);
              localStorage.setItem('eh_user', JSON.stringify(userData));
            }
          }
        })
        .catch((err) => {
          if (isMounted && err?.status === 401) {
            localStorage.removeItem('eh_token');
            localStorage.removeItem('eh_user');
            setUser(null);
          }
        })
        .finally(() => {
          if (isMounted) {
            setLoading(false);
          }
        });
    } else {
      setLoading(false);
    }
    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (credentials, maybePassword) => {
    const payload =
      typeof credentials === 'string'
        ? { email: credentials, password: maybePassword }
        : credentials;
    const res = await api.login(payload);
    const token = res.data?.token || res.token;
    const userData = res.data?.user || res.user;
    if (token) localStorage.setItem('eh_token', token);
    if (userData) {
      if (!userData.name && userData.full_name) {
        userData.name = userData.full_name;
      }
      localStorage.setItem('eh_user', JSON.stringify(userData));
      setUser(userData);
    }
    return res;
  };

  const register = async (userData) => {
    const res = await api.register(userData);
    const token = res.data?.token || res.token;
    const u = res.data?.user || res.user;
    if (token) localStorage.setItem('eh_token', token);
    if (u) {
      localStorage.setItem('eh_user', JSON.stringify(u));
      setUser(u);
    }
    return res;
  };

  const logout = () => {
    localStorage.removeItem('eh_token');
    localStorage.removeItem('eh_user');
    setUser(null);
  };

  const updateUser = (data) => {
    setUser((prev) => {
      const updated = { ...prev, ...data };
      localStorage.setItem('eh_user', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}