
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL || "https://sigu-back-e39xv5vbt-enmanuelalxs-projects.vercel.app";

export interface User {
  id: string;
  document_type: string;
  name: string;
  lastname: string;
  cargo?: string;
  sucursal?: string;
  telephone: string;
  document_number?: string;
  email: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CreateUserData {
  document_type: string;
  name: string;
  lastname: string;
  cargo?: string;
  sucursal?: string;
  telephone: string;
  document_number?: string;
  email: string;
  password: string;
  status: string;
}

export const useUsers = () => {
  const authenticatedFetch = useAuthenticatedFetch();
  
  return useQuery({
    queryKey: ['users'],
    queryFn: async (): Promise<User[]> => {
      const response = await authenticatedFetch(`${API_URL}/api/v1/users/`);
      if (!response.ok) {
        throw new Error('Error al obtener usuarios');
      }
      return response.json();
    },
  });
};

export const useCreateUser = () => {
  const authenticatedFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (userData: CreateUserData): Promise<User> => {
      const response = await authenticatedFetch(`${API_URL}/api/v1/users/`, {
        method: 'POST',
        body: JSON.stringify(userData),
      });
      if (!response.ok) {
        throw new Error('Error al crear usuario');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

export const useDeleteUser = () => {
  const authenticatedFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (userId: string): Promise<void> => {
      const response = await authenticatedFetch(`${API_URL}/api/v1/users/${userId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Error al eliminar usuario');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};
