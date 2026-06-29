import { useAuth } from '@/contexts/AuthContext';
import { useCallback } from 'react';

export const useAuthenticatedFetch = () => {
  const { token, logout, refreshToken } = useAuth();

  const isUnauthorizedPayload = (payload: any): boolean => {
    if (!payload || typeof payload !== 'object') return false;

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

  const shouldTryRefresh = async (response: Response): Promise<boolean> => {
    if (response.status !== 401 && response.status !== 403) return false;

    // 401 siempre intenta refresh.
    if (response.status === 401) return true;

    // Para 403 sólo intenta refresh si el payload indica falta de auth.
    try {
      const cloned = response.clone();
      const payload = await cloned.json();
      return isUnauthorizedPayload(payload);
    } catch {
      return false;
    }
  };

  const authenticatedFetch = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const makeRequest = async (tokenToUse?: string | null) => {
        const headers = new Headers(options.headers ?? {});

        // Sólo agrega Content-Type por defecto si el caller no lo define.
        if (!headers.has('Content-Type')) {
          headers.set('Content-Type', 'application/json');
        }

        // Fallback a localStorage para cubrir carreras de hidratación del contexto.
        const authToken = tokenToUse ?? token ?? localStorage.getItem('authToken');
        if (authToken) {
          headers.set('Authorization', `Bearer ${authToken}`);
        }

        return fetch(url, {
          ...options,
          headers,
        });
      };

      let response = await makeRequest();

      if (await shouldTryRefresh(response)) {
        const newToken = await refreshToken();
        if (!newToken) {
          logout();
          throw new Error('Sesión expirada');
        }

        response = await makeRequest(newToken);

        if (await shouldTryRefresh(response)) {
          logout();
          throw new Error('Sesión expirada');
        }
      }

      return response;
    },
    [token, refreshToken, logout]
  );

  return authenticatedFetch;
};
