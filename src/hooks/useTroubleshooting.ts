import { useCallback, useEffect, useRef } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthenticatedFetch } from "@/hooks/useAuthenticatedFetch";
import { useToast } from "@/hooks/use-toast";
import { ApiError, isClientError, isSessionExpiredError } from "@/lib/apiClient";
import {
  GuidePage,
  isModuleNotDeployed,
  troubleshootingApi,
} from "@/services/troubleshootingApi";
import {
  TroubleshootingGuide,
  TroubleshootingGuideFilters,
  TroubleshootingGuidePayload,
} from "@/types";

export const DEFAULT_GUIDE_PAGE_SIZE = 20;

/** Limite del panel de criticas: es un acceso rapido, no un listado completo. */
const CRITICAL_GUIDES_LIMIT = 12;

/**
 * Llaves de cache jerarquicas: invalidar `all` refresca listado y criticas a la
 * vez, sin que cada mutacion tenga que enumerar las combinaciones de filtros.
 */
export const troubleshootingKeys = {
  all: ["troubleshooting"] as const,
  lists: () => [...troubleshootingKeys.all, "list"] as const,
  list: (filters: TroubleshootingGuideFilters, page: number, pageSize: number) =>
    [...troubleshootingKeys.lists(), { filters, page, pageSize }] as const,
  critical: () => [...troubleshootingKeys.all, "critical"] as const,
};

const emptyPage = (page: number, pageSize: number): GuidePage => ({
  items: [],
  hasMore: false,
  page,
  pageSize,
});

/** Una sesion caida ya redirige al login y un 4xx no mejora al repetirlo. */
const shouldRetry = (failureCount: number, error: unknown) => {
  if (isSessionExpiredError(error) || isClientError(error)) return false;
  return failureCount < 2;
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

/**
 * `useQuery` de v5 ya no acepta `onError`, asi que el aviso se emite aqui: una
 * sola vez por error y en silencio cuando la sesion expiro (eso ya lo maneja
 * `useAuthenticatedFetch` cerrando sesion).
 */
export const useApiErrorToast = (error: unknown, fallbackMessage: string) => {
  const { toast } = useToast();
  const lastReportedError = useRef<unknown>(null);

  useEffect(() => {
    if (!error) {
      lastReportedError.current = null;
      return;
    }

    if (error === lastReportedError.current) return;
    lastReportedError.current = error;

    if (isSessionExpiredError(error)) return;

    console.error("Troubleshooting request failed:", error);
    toast({
      title: "Error",
      description: getErrorMessage(error, fallbackMessage),
      variant: "destructive",
    });
  }, [error, fallbackMessage, toast]);
};

interface UseGuidesPageOptions {
  filters: TroubleshootingGuideFilters;
  page: number;
  pageSize?: number;
}

/** Una pagina del manual, filtrada en el servidor. */
export const useGuidesPage = ({
  filters,
  page,
  pageSize = DEFAULT_GUIDE_PAGE_SIZE,
}: UseGuidesPageOptions) => {
  const authenticatedFetch = useAuthenticatedFetch();

  const query = useQuery({
    queryKey: troubleshootingKeys.list(filters, page, pageSize),
    queryFn: async ({ signal }) => {
      try {
        return await troubleshootingApi.list(authenticatedFetch, {
          filters,
          page,
          pageSize,
          signal,
        });
      } catch (error) {
        // El modulo puede no estar desplegado todavia: se muestra vacio.
        if (isModuleNotDeployed(error)) return emptyPage(page, pageSize);
        throw error;
      }
    },
    // Mantiene la pagina anterior en pantalla mientras llega la nueva.
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    retry: shouldRetry,
  });

  useApiErrorToast(query.error, "No se pudo cargar el manual de fallas.");

  return query;
};

/**
 * Fallas criticas activas, con su propia consulta para que el panel de acceso
 * rapido no dependa de los filtros que el usuario tenga puestos.
 */
export const useCriticalGuides = () => {
  const authenticatedFetch = useAuthenticatedFetch();

  return useQuery({
    queryKey: troubleshootingKeys.critical(),
    queryFn: async ({ signal }) => {
      try {
        const result = await troubleshootingApi.list(authenticatedFetch, {
          filters: { severity: "critica", status: "activa" },
          page: 0,
          pageSize: CRITICAL_GUIDES_LIMIT,
          signal,
        });
        return result;
      } catch (error) {
        if (isModuleNotDeployed(error)) return emptyPage(0, CRITICAL_GUIDES_LIMIT);
        throw error;
      }
    },
    staleTime: 60_000,
    retry: shouldRetry,
  });
};

/**
 * Altas, ediciones y bajas. Devuelven boolean para que la UI sepa si cerrar el
 * formulario; el aviso de exito o error se emite aqui, en un solo lugar.
 */
export const useGuideMutations = () => {
  const authenticatedFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const invalidateGuides = useCallback(
    () => queryClient.invalidateQueries({ queryKey: troubleshootingKeys.all }),
    [queryClient]
  );

  const notifyError = useCallback(
    (error: unknown, fallback: string) => {
      if (isSessionExpiredError(error)) return;

      console.error(fallback, error);
      toast({
        title: "Error",
        description: getErrorMessage(error, fallback),
        variant: "destructive",
      });
    },
    [toast]
  );

  const createMutation = useMutation({
    mutationFn: (payload: TroubleshootingGuidePayload) =>
      troubleshootingApi.create(authenticatedFetch, payload),
    onSuccess: async (guide) => {
      toast({ title: "Falla registrada", description: `${guide.code} fue agregada al manual.` });
      await invalidateGuides();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: TroubleshootingGuidePayload }) =>
      troubleshootingApi.update(authenticatedFetch, id, payload),
    onSuccess: async (guide) => {
      toast({
        title: "Falla actualizada",
        description: `${guide.code} fue actualizada correctamente.`,
      });
      await invalidateGuides();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (guide: TroubleshootingGuide) =>
      troubleshootingApi.remove(authenticatedFetch, guide.id),
    onSuccess: async (_result, guide) => {
      toast({ title: "Falla eliminada", description: `${guide.code} fue eliminada del manual.` });
      await invalidateGuides();
    },
  });

  const createGuide = useCallback(
    async (payload: TroubleshootingGuidePayload) => {
      try {
        await createMutation.mutateAsync(payload);
        return true;
      } catch (error) {
        notifyError(error, "No se pudo registrar la falla.");
        return false;
      }
    },
    [createMutation, notifyError]
  );

  const updateGuide = useCallback(
    async (id: string, payload: TroubleshootingGuidePayload) => {
      try {
        await updateMutation.mutateAsync({ id, payload });
        return true;
      } catch (error) {
        notifyError(error, "No se pudo actualizar la falla.");
        return false;
      }
    },
    [notifyError, updateMutation]
  );

  const deleteGuide = useCallback(
    async (guide: TroubleshootingGuide) => {
      try {
        await deleteMutation.mutateAsync(guide);
        return true;
      } catch (error) {
        notifyError(error, "No se pudo eliminar la falla.");
        return false;
      }
    },
    [deleteMutation, notifyError]
  );

  return {
    createGuide,
    updateGuide,
    deleteGuide,
    isSaving: createMutation.isPending || updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
