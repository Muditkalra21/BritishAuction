import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const SupplierAuthContext = createContext(null);

export function SupplierAuthProvider({ children }) {
  const [supplier, setSupplier] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('supplier_token');
    const data = localStorage.getItem('supplier_data');
    if (token && data) {
      api.get('/supplier/verify', { headers: { Authorization: `Bearer ${token}` } })
        .then(() => {
          setSupplier(JSON.parse(data));
          api.defaults.headers.common['Supplier-Authorization'] = `Bearer ${token}`;
        })
        .catch(() => {
          localStorage.removeItem('supplier_token');
          localStorage.removeItem('supplier_data');
        })
        .finally(() => setChecking(false));
    } else {
      setChecking(false);
    }
  }, []);

  const register = async (companyName, email, password) => {
    const { data } = await api.post('/supplier/register', { companyName, email, password });
    localStorage.setItem('supplier_token', data.token);
    localStorage.setItem('supplier_data', JSON.stringify(data.supplier));
    api.defaults.headers.common['Supplier-Authorization'] = `Bearer ${data.token}`;
    setSupplier(data.supplier);
    return data;
  };

  const login = async (email, password) => {
    const { data } = await api.post('/supplier/login', { email, password });
    localStorage.setItem('supplier_token', data.token);
    localStorage.setItem('supplier_data', JSON.stringify(data.supplier));
    api.defaults.headers.common['Supplier-Authorization'] = `Bearer ${data.token}`;
    setSupplier(data.supplier);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('supplier_token');
    localStorage.removeItem('supplier_data');
    delete api.defaults.headers.common['Supplier-Authorization'];
    setSupplier(null);
  };

  return (
    <SupplierAuthContext.Provider value={{ supplier, checking, register, login, logout, isSupplier: !!supplier }}>
      {children}
    </SupplierAuthContext.Provider>
  );
}

export function useSupplierAuth() {
  return useContext(SupplierAuthContext);
}
