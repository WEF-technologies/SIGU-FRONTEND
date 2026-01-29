import { useAuth } from '@/contexts/AuthContext';
import { useCallback } from 'react';

export const useAuthenticatedFetch = () => {
  const { token, logout, refreshToken } = useAuth();

  const authenticatedFetch = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const makeRequest = async (tokenToUse?: string | null) => {
        const headers = {
          'Content-Type': 'application/json',
          ...options.headers,
        } as Record<string, string>;

        const authToken = tokenToUse ?? token;
        if (authToken) {
          headers['Authorization'] = `Bearer ${authToken}`;
        }

        return fetch(url, {
          ...options,
          headers,
        });
      };

      let response = await makeRequest();

      if (response.status === 401) {
        const newToken = await refreshToken();
        if (!newToken) {
          logout();
          throw new Error('Sesión expirada');
        }

        response = await makeRequest(newToken);

        if (response.status === 401) {
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
