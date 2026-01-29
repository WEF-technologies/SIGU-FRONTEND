import React, {
  createContext,
  useContext,
  useState,
  useEffect,
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
  import.meta.env.VITE_API_URL || 'https://sigu-back.vercel.app';

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restaurar sesión (sin timers, sin exp)
  useEffect(() => {
    const savedToken = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('authUser');

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
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

  //  Refresh token (solo se usa desde useAuthenticatedFetch)
  const refreshToken = async (): Promise<string | null> => {
    try {
      const storedRefreshToken = localStorage.getItem('refreshToken');
      if (!storedRefreshToken) return null;

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
    }
  };

  //  Logout
  const logout = () => {
    setToken(null);
    setUser(null);
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
