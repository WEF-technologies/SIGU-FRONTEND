import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from 'react';

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
  refreshToken: () => Promise<string | null>;
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

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Singleton del refresh en vuelo.
   * Si varias llamadas paralelas reciben 401 al mismo tiempo, todas
   * esperan este mismo Promise en lugar de lanzar refreshes independientes
   * que colisionarían (el backend invalida el refresh_token anterior al
   * emitir uno nuevo, lo que provoca que los refreshes #2, #3... fallen
   * y llamen a logout() aunque la sesión fuera válida).
   */
  const pendingRefreshRef = useRef<Promise<string | null> | null>(null);

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
        localStorage.removeItem('refreshToken');
      }
    }

    setIsLoading(false);
  }, []);

  // Login
  const login = async (email: string, password: string) => {
    const response = await fetch(`${API_URL}/api/v1/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error('Credenciales inválidas');
    }

    const data = await response.json();
    const {
      access_token: receivedToken,
      refresh_token: receivedRefreshToken,
      user_id,
    } = data;

    const userResponse = await fetch(`${API_URL}/api/v1/users/${user_id}`, {
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

    if (receivedRefreshToken) {
      localStorage.setItem('refreshToken', receivedRefreshToken);
    }
  };

  /**
   * Refresca el access token con protección ante llamadas concurrentes.
   * Si ya hay un refresh en vuelo, devuelve el mismo Promise para que
   * todos los callers esperen el mismo resultado.
   */
  const refreshToken = (): Promise<string | null> => {
    if (pendingRefreshRef.current) {
      return pendingRefreshRef.current;
    }

    const doRefresh = async (): Promise<string | null> => {
      try {
        const storedRefreshToken = localStorage.getItem('refreshToken');
        if (!storedRefreshToken) {
          logout();
          return null;
        }

        const response = await fetch(`${API_URL}/api/v1/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: storedRefreshToken }),
        });

        if (!response.ok) {
          logout();
          return null;
        }

        const data = await response.json();
        const {
          access_token: newAccessToken,
          refresh_token: newRefreshToken,
        } = data;

        if (!newAccessToken) {
          logout();
          return null;
        }

        setToken(newAccessToken);
        localStorage.setItem('authToken', newAccessToken);

        if (newRefreshToken) {
          localStorage.setItem('refreshToken', newRefreshToken);
        }

        return newAccessToken;
      } catch {
        logout();
        return null;
      } finally {
        // Liberar el singleton cuando se resuelva (con éxito o error)
        pendingRefreshRef.current = null;
      }
    };

    pendingRefreshRef.current = doRefresh();
    return pendingRefreshRef.current;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    pendingRefreshRef.current = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('authUser');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        refreshToken,
        logout,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
