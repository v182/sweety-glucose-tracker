import { createContext, useContext, useEffect, useState } from 'react';
import { api, setCsrfToken } from './api.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  function establish(result) {
    setCsrfToken(result.csrfToken);
    setUser(result.user);
    setError('');
  }
  useEffect(() => {
    let active = true;
    api('/auth/me')
      .then((result) => {
        if (active) establish(result);
      })
      .catch((err) => {
        if (active && err.status !== 401) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    const expired = () => {
      setCsrfToken(null);
      setUser(null);
    };
    window.addEventListener('sweety:session-expired', expired);
    return () => {
      active = false;
      window.removeEventListener('sweety:session-expired', expired);
    };
  }, []);
  const login = async (body) => establish(await api('/auth/login', { method: 'POST', body }));
  const register = async (body) => establish(await api('/auth/register', { method: 'POST', body }));
  const logout = async () => {
    await api('/auth/logout', { method: 'POST' });
    setCsrfToken(null);
    setUser(null);
  };
  return (
    <AuthContext.Provider value={{ user, loading, error, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
