import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [checking, setChecking] = useState(true);

  // Check stored token on mount
  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    const user = localStorage.getItem('admin_user');
    if (token && user) {
      // Quickly verify token is still valid
      api.get('/auth/verify', { headers: { Authorization: `Bearer ${token}` } })
        .then(() => {
          setAdmin(JSON.parse(user));
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        })
        .catch(() => {
          localStorage.removeItem('admin_token');
          localStorage.removeItem('admin_user');
        })
        .finally(() => setChecking(false));
    } else {
      setChecking(false);
    }
  }, []);

  const login = async (username, password) => {
    const { data } = await api.post('/auth/login', { username, password });
    localStorage.setItem('admin_token', data.token);
    localStorage.setItem('admin_user', JSON.stringify(data.user));
    api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
    setAdmin(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    delete api.defaults.headers.common['Authorization'];
    setAdmin(null);
  };

  return (
    <AuthContext.Provider value={{ admin, checking, login, logout, isAdmin: !!admin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
