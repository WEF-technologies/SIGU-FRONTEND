import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { requestJson, withAllPages } from '@/lib/apiClient';
import { UserRole } from '@/lib/permissions';

const API_URL = import.meta.env.VITE_API_URL ?? "";

/** `UserResponse` del backend. `document_type` guarda el numero de documento. */
export interface User {
  id: string;
  document_type: string;
  name: string;
  lastname: string;
  telephone: string;
  email: string;
  status: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

/** `UserCreate` del backend: solo el gerente puede crear usuarios. */
export interface CreateUserData {
  document_type: string;
  name: string;
  lastname: string;
  telephone: string;
  email: string;
  password: string;
  status: string;
  role: UserRole;
}

/** El backend no usa el estado para el login; los usuarios nuevos nacen activos. */
export const DEFAULT_USER_STATUS = 'active';

export const USER_STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  inactive: 'Inactivo',
};

export const useUsers = () => {
  const authenticatedFetch = useAuthenticatedFetch();

  return useQuery({
    queryKey: ['users'],
    // `requestJson` lanza un ApiError con el status: sin el, la regla de
    // reintento por defecto no distingue un 4xx de un fallo de red.
    queryFn: async (): Promise<User[]> =>
      (await requestJson(
        withAllPages(authenticatedFetch),
        `${API_URL}/api/v1/users/`,
        {},
        'Error al obtener usuarios'
      )) as User[],
  });
};

export const useCreateUser = () => {
  const authenticatedFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();

  return useMutation({
    // `requestJson` traduce el detalle del backend (correo o documento
    // repetido, rol sin permiso) para mostrarselo al usuario.
    mutationFn: async (userData: CreateUserData): Promise<User> =>
      (await requestJson(
        authenticatedFetch,
        `${API_URL}/api/v1/users/`,
        {
          method: 'POST',
          body: JSON.stringify(userData),
        },
        'No se pudo crear el usuario.'
      )) as User,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};
