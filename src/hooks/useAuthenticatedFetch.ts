import { useAuth } from '@/contexts/AuthContext';
import { useCallback } from 'react';
import { isRecord, SESSION_EXPIRED_MESSAGE } from '@/lib/apiClient';
import { toast } from '@/hooks/use-toast';

const isUnauthorizedPayload = (payload: unknown): boolean => {
  if (!isRecord(payload)) return false;

  const code = String(payload.code ?? '').toLowerCase();
  const message = String(payload.message ?? '').toLowerCase();
  const detail = String(payload.detail ?? '').toLowerCase();

  return (
    code === 'unauthorized' ||
    message.includes('not authenticated') ||
    detail.includes('not authenticated') ||
    message.includes('unauthorized') ||
    detail.includes('unauthorized')
  );
};

const isSessionRejected = async (response: Response): Promise<boolean> => {
  if (response.status === 401) return true;
  if (response.status !== 403) return false;

  // Para 403 sólo trata la sesión como inválida si el payload indica falta de auth.
  try {
    const cloned = response.clone();
    const payload = await cloned.json();
    return isUnauthorizedPayload(payload);
  } catch {
    return false;
  }
};

export const useAuthenticatedFetch = () => {
  const { token, logout } = useAuth();

  const authenticatedFetch = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const headers = new Headers(options.headers ?? {});

      // Sólo agrega Content-Type por defecto si el caller no lo define.
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }

      // Fallback a localStorage para cubrir carreras de hidratación del contexto.
      const authToken = token ?? localStorage.getItem('authToken');
      if (authToken) {
        headers.set('Authorization', `Bearer ${authToken}`);
      }

      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (await isSessionRejected(response)) {
        // La mayoria de los modulos no notifica este error para no repetirlo;
        // el aviso sale de aqui. Su id es fijo: aunque fallen varias
        // peticiones a la vez, se muestra uno solo.
        toast({ title: SESSION_EXPIRED_MESSAGE });
        logout();
        throw new Error(SESSION_EXPIRED_MESSAGE);
      }

      return response;
    },
    [token, logout]
  );

  return authenticatedFetch;
};
