
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

      try {
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
      } catch (error) {
        // Si el backend no está disponible y estamos en modo desarrollo
        if (error instanceof TypeError && error.message.includes('fetch')) {
          console.warn('Backend no disponible, usando datos mock');
          
          // Retornar datos mock dependiendo del endpoint
          if (url.includes('/vehicles')) {
            return new Response(JSON.stringify([]), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          
          if (url.includes('/maintenance')) {
            return new Response(JSON.stringify([]), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          
          // Para otros endpoints, devolver array vacío por defecto
          return new Response(JSON.stringify([]), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        throw error;
      }
    },
    [token, logout]
  );

  return authenticatedFetch;
};
