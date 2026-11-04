import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { localizeApiErrorPayload } from '@/lib/errorI18n';

interface User {
  id: string;
  email: string;
  name: string;
  lastname?: string;
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
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

const API_URL =
  import.meta.env.VITE_API_URL ?? "";

const extractErrorMessage = async (response: Response, fallback: string) => {
  try {
    const payload = await response.json();
    return localizeApiErrorPayload(payload, fallback);
  } catch {
    return fallback;
  }
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restaurar sesión desde localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('authUser');

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch {
        // JSON corrupto: limpiar
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
      }
    }

    setIsLoading(false);
  }, []);

  // Login
  const login = useCallback(async (email: string, password: string) => {
    const response = await fetch(`${API_URL}/api/v1/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error(
        await extractErrorMessage(response, 'Credenciales inválidas. Verifica tu correo y contraseña.')
      );
    }

    const data = await response.json();
    const {
      access_token: receivedToken,
      user_id,
    } = data;

    const userResponse = await fetch(`${API_URL}/api/v1/users/${encodeURIComponent(user_id)}`, {
      headers: {
        Authorization: `Bearer ${receivedToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!userResponse.ok) {
      throw new Error('Error al obtener información del usuario');
    }

    const userData = await userResponse.json();

    const userInfo: User = {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      lastname: userData.lastname,
    };

    setToken(receivedToken);
    setUser(userInfo);

    localStorage.setItem('authToken', receivedToken);
    localStorage.setItem('authUser', JSON.stringify(userInfo));
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    // Lo cacheado pertenece a la sesion que termina: quien entre despues en
    // esta pestaña no debe verlo mientras se recargan sus datos.
    queryClient.clear();
  }, [queryClient]);

  // `logout` y `token` son dependencias de `useAuthenticatedFetch`, y este a su
  // vez de los efectos de carga de cada modulo: si cambiaran en cada render,
  // cualquier render del provider volveria a disparar todas las cargas.
  const value = useMemo(
    () => ({ user, token, login, logout, isLoading }),
    [user, token, login, logout, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
