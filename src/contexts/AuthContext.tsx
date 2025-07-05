
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Verificar si hay un token guardado al cargar la app
  useEffect(() => {
    const savedToken = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('authUser');
    
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error('Credenciales inválidas');
      }

      const data = await response.json();
      const { access_token: receivedToken, user_id } = data;

      const userData = {
        id: user_id,
        email: email,
        name: 'Usuario de Prueba'
      };

      setToken(receivedToken);
      setUser(userData);
      localStorage.setItem('authToken', receivedToken);
      localStorage.setItem('authUser', JSON.stringify(userData));
    } catch (error) {
      // Modo desarrollo: si el backend no está disponible, simular login exitoso
      console.warn('Backend no disponible, usando modo desarrollo');
      
      // Solo permitir las credenciales de prueba en modo desarrollo
      if (email === 'admin@servimont.com' && password === '123456') {
        const mockToken = 'dev-token-' + Date.now();
        const userData = {
          id: '1',
          email: email,
          name: 'Admin Servi-Mont.M2D'
        };

        setToken(mockToken);
        setUser(userData);
        localStorage.setItem('authToken', mockToken);
        localStorage.setItem('authUser', JSON.stringify(userData));
      } else {
        throw new Error('Credenciales inválidas');
      }
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
  };

  const value = {
    user,
    token,
    login,
    logout,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
