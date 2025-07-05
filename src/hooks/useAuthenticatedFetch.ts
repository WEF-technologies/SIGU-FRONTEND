
import { useAuth } from '@/contexts/AuthContext';
import { useCallback } from 'react';

export const useAuthenticatedFetch = () => {
  const { token, logout } = useAuth();

  const authenticatedFetch = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
      };

      if (token) {
        headers['Authentication'] = `Bearer ${token}`;
      }

      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Si recibimos un 401, significa que el token expiró
      if (response.status === 401) {
        logout();
        throw new Error('Sesión expirada');
      }

      return response;
    },
    [token, logout]
  );

  return authenticatedFetch;
};
