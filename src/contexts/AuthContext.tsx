import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { localizeApiErrorPayload } from '@/lib/errorI18n';
import { isRecord, SESSION_EXPIRED_MESSAGE } from '@/lib/apiClient';
import {
  AccessLevel,
  AppModule,
  hasModuleAccess,
  toUserRole,
  UserRole,
} from '@/lib/permissions';
import { toast } from '@/hooks/use-toast';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  lastname?: string;
  role: UserRole;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  role: UserRole | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  /** Si el rol de la sesion puede leer (o modificar) un modulo del backend. */
  can: (module: AppModule, level?: AccessLevel) => boolean;
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

const TOKEN_STORAGE_KEY = 'authToken';
const USER_STORAGE_KEY = 'authUser';

const extractErrorMessage = async (response: Response, fallback: string) => {
  try {
    const payload = await response.json();
    return localizeApiErrorPayload(payload, fallback);
  } catch {
    return fallback;
  }
};

/** Sin un rol valido no se sabe que mostrar: ese usuario no sirve como sesion. */
const toAuthUser = (payload: unknown, fallbackRole?: UserRole | null): AuthUser | null => {
  if (!isRecord(payload)) return null;

  const id = typeof payload.id === 'string' ? payload.id : '';
  const role = toUserRole(payload.role) ?? fallbackRole ?? null;
  if (!id || !role) return null;

  return {
    id,
    email: typeof payload.email === 'string' ? payload.email : '',
    name: typeof payload.name === 'string' ? payload.name : '',
    lastname: typeof payload.lastname === 'string' ? payload.lastname : undefined,
    role,
  };
};

const isSameUser = (a: AuthUser, b: AuthUser) =>
  a.id === b.id &&
  a.email === b.email &&
  a.name === b.name &&
  a.lastname === b.lastname &&
  a.role === b.role;

/** Las sesiones guardadas antes de los roles no traen `role`: se descartan. */
const readStoredUser = (): AuthUser | null => {
  try {
    const saved = localStorage.getItem(USER_STORAGE_KEY);
    return saved ? toAuthUser(JSON.parse(saved)) : null;
  } catch {
    return null;
  }
};

const clearStoredSession = () => {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
};

type CurrentUserResult =
  | { status: 'ok'; user: AuthUser }
  | { status: 'unauthorized' }
  | { status: 'error' };

/** `GET /users/me` devuelve el usuario del token, con su rol vigente. */
const fetchCurrentUser = async (
  token: string,
  fallbackRole?: UserRole | null
): Promise<CurrentUserResult> => {
  try {
    const response = await fetch(`${API_URL}/api/v1/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.status === 401) return { status: 'unauthorized' };
    if (!response.ok) return { status: 'error' };

    const user = toAuthUser(await response.json(), fallbackRole);
    return user ? { status: 'ok', user } : { status: 'error' };
  } catch {
    return { status: 'error' };
  }
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  /**
   * Token de la sesion vigente. La verificacion al arrancar es asincrona: si
   * mientras tanto el usuario cerro sesion o entro con otra cuenta, su
   * respuesta ya no corresponde y se descarta.
   */
  const sessionTokenRef = useRef<string | null>(null);

  const applySession = useCallback((nextToken: string, nextUser: AuthUser) => {
    sessionTokenRef.current = nextToken;
    setToken(nextToken);
    // Misma informacion, mismo objeto: evita re-renderizar toda la app.
    setUser((prev) => (prev && isSameUser(prev, nextUser) ? prev : nextUser));
    localStorage.setItem(TOKEN_STORAGE_KEY, nextToken);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser));
  }, []);

  const logout = useCallback(() => {
    sessionTokenRef.current = null;
    setToken(null);
    setUser(null);
    clearStoredSession();
    // Lo cacheado pertenece a la sesion que termina: quien entre despues en
    // esta pestaña no debe verlo mientras se recargan sus datos.
    queryClient.clear();
  }, [queryClient]);

  /**
   * Restaura la sesion de localStorage y la confirma con `/users/me`, que trae
   * el rol vigente. Si el usuario guardado ya tiene rol se muestra enseguida y
   * se verifica en segundo plano; si no lo tiene (sesion de antes de los
   * roles), se espera a la verificacion para no mostrar menus equivocados.
   */
  useEffect(() => {
    let isActive = true;
    const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);

    if (!savedToken) {
      clearStoredSession();
      setIsLoading(false);
      return;
    }

    const cachedUser = readStoredUser();
    if (cachedUser) {
      sessionTokenRef.current = savedToken;
      setToken(savedToken);
      setUser(cachedUser);
      setIsLoading(false);
    }

    void (async () => {
      const result = await fetchCurrentUser(savedToken, cachedUser?.role);
      if (!isActive) return;

      const isCurrentSession = !cachedUser || sessionTokenRef.current === savedToken;
      if (isCurrentSession) {
        if (result.status === 'ok') {
          applySession(savedToken, result.user);
        } else if (result.status === 'unauthorized') {
          if (cachedUser) {
            toast({ title: SESSION_EXPIRED_MESSAGE });
            logout();
          } else {
            clearStoredSession();
          }
        } else if (!cachedUser) {
          // Sin conexion y sin rol conocido: se pide iniciar sesion de nuevo.
          clearStoredSession();
        }
      }

      if (!cachedUser) setIsLoading(false);
    })();

    return () => {
      isActive = false;
    };
  }, [applySession, logout]);

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

    const data: unknown = await response.json();
    const receivedToken =
      isRecord(data) && typeof data.access_token === 'string' ? data.access_token : '';
    if (!receivedToken) {
      throw new Error('El servidor no devolvió una sesión válida. Intenta nuevamente.');
    }

    const loginRole = isRecord(data) ? toUserRole(data.role) : null;
    const result = await fetchCurrentUser(receivedToken, loginRole);
    if (result.status !== 'ok') {
      throw new Error('Error al obtener información del usuario');
    }

    applySession(receivedToken, result.user);
  }, [applySession]);

  const role = user?.role ?? null;

  const can = useCallback(
    (module: AppModule, level: AccessLevel = 'read') => hasModuleAccess(role, module, level),
    [role]
  );

  // `logout` y `token` son dependencias de `useAuthenticatedFetch`, y este a su
  // vez de los efectos de carga de cada modulo: si cambiaran en cada render,
  // cualquier render del provider volveria a disparar todas las cargas.
  const value = useMemo(
    () => ({ user, token, role, login, logout, isLoading, can }),
    [user, token, role, login, logout, isLoading, can]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
