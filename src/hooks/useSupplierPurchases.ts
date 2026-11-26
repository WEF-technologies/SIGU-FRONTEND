import { useCallback } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthenticatedFetch } from "@/hooks/useAuthenticatedFetch";
import { useToast } from "@/hooks/use-toast";
import { useApiErrorToast } from "@/hooks/useTroubleshooting";
import { ApiError, isSessionExpiredError } from "@/lib/apiClient";
import { formatAmount } from "@/lib/money";
import { suppliersApi } from "@/services/suppliersApi";
import { buildPurchaseChanges, supplierPurchasesApi } from "@/services/supplierPurchasesApi";
import { SupplierPurchase, SupplierPurchaseFilters, SupplierPurchasePayload } from "@/types";

/**
 * Llaves jerarquicas: invalidar `supplier(id)` refresca el historial de ese
 * proveedor con cualquier combinacion de filtros.
 */
export const supplierPurchaseKeys = {
  all: ["supplier-purchases"] as const,
  supplier: (supplierId: string) => [...supplierPurchaseKeys.all, supplierId] as const,
  list: (supplierId: string, filters: SupplierPurchaseFilters) =>
    [...supplierPurchaseKeys.supplier(supplierId), "list", filters] as const,
};

export const supplierDetailKey = (supplierId: string) => ["suppliers", "detail", supplierId] as const;

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

export const isNotFoundError = (error: unknown) => error instanceof ApiError && error.status === 404;

/** Datos del proveedor para la cabecera del historial (nombre, estado, contacto). */
export const useSupplierDetail = (supplierId: string | undefined) => {
  const authenticatedFetch = useAuthenticatedFetch();

  const query = useQuery({
    queryKey: supplierDetailKey(supplierId ?? ""),
    queryFn: () => suppliersApi.getById(authenticatedFetch, supplierId as string),
    enabled: Boolean(supplierId),
    staleTime: 60_000,
    // Sin recarga al volver a la pestaña: el nombre y el estado casi no cambian
    // y la pantalla ya tiene el boton "Actualizar".
    refetchOnWindowFocus: false,
  });

  // Un 404 se muestra en la pagina como "proveedor no encontrado", no como aviso.
  useApiErrorToast(isNotFoundError(query.error) ? null : query.error, "No se pudo cargar el proveedor.");

  return query;
};

interface UseSupplierPurchasesOptions {
  supplierId: string | undefined;
  filters: SupplierPurchaseFilters;
  /** Falso mientras el rango de fechas sea invalido, para no pedir un 400 seguro. */
  enabled?: boolean;
}

/** Historial completo del proveedor con los filtros aplicados en el servidor. */
export const useSupplierPurchases = ({ supplierId, filters, enabled = true }: UseSupplierPurchasesOptions) => {
  const authenticatedFetch = useAuthenticatedFetch();

  const query = useQuery({
    queryKey: supplierPurchaseKeys.list(supplierId ?? "", filters),
    queryFn: ({ signal }) =>
      supplierPurchasesApi.listAll(authenticatedFetch, supplierId as string, filters, signal),
    enabled: Boolean(supplierId) && enabled,
    // Mantiene la lista anterior en pantalla mientras llega la filtrada.
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    // React Query vuelve a pedir los datos cada vez que la pestaña recupera el
    // foco. Con el servidor fallando eran 3 peticiones (con reintentos) por
    // cada vuelta a la pestaña, y la pantalla parecia recargarse sola. Se
    // actualiza con "Actualizar", "Reintentar" o tras registrar/editar/eliminar.
    refetchOnWindowFocus: false,
  });

  // Sin aviso emergente: la pantalla muestra el error en su lugar, con "Reintentar".

  return query;
};

/**
 * Altas, correcciones y bajas de compras. Devuelven boolean para que la UI
 * sepa si cerrar el formulario; los avisos se emiten aqui, en un solo lugar.
 */
export const useSupplierPurchaseMutations = (supplierId: string | undefined) => {
  const authenticatedFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const invalidatePurchases = useCallback(
    () =>
      supplierId
        ? queryClient.invalidateQueries({ queryKey: supplierPurchaseKeys.supplier(supplierId) })
        : Promise.resolve(),
    [queryClient, supplierId]
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
    mutationFn: (payload: SupplierPurchasePayload) =>
      supplierPurchasesApi.create(authenticatedFetch, supplierId as string, payload),
    onSuccess: async (purchase) => {
      toast({
        title: "Compra registrada",
        description: `Se registro una compra por ${formatAmount(purchase.amount)}.`,
      });
      await invalidatePurchases();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ purchaseId, changes }: { purchaseId: string; changes: Partial<SupplierPurchasePayload> }) =>
      supplierPurchasesApi.update(authenticatedFetch, supplierId as string, purchaseId, changes),
    onSuccess: async () => {
      toast({ title: "Compra actualizada", description: "Los cambios se guardaron correctamente." });
      await invalidatePurchases();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (purchase: SupplierPurchase) =>
      supplierPurchasesApi.remove(authenticatedFetch, supplierId as string, purchase.id),
    onSuccess: async () => {
      toast({ title: "Compra eliminada", description: "La compra se quito del historial." });
      await invalidatePurchases();
    },
  });

  const createPurchase = useCallback(
    async (payload: SupplierPurchasePayload) => {
      if (!supplierId) return false;
      try {
        await createMutation.mutateAsync(payload);
        return true;
      } catch (error) {
        notifyError(error, "No se pudo registrar la compra.");
        return false;
      }
    },
    [createMutation, notifyError, supplierId]
  );

  const updatePurchase = useCallback(
    async (original: SupplierPurchase, payload: SupplierPurchasePayload) => {
      if (!supplierId) return false;

      const changes = buildPurchaseChanges(original, payload);
      // Sin cambios no hace falta ir al backend: se cierra el formulario.
      if (Object.keys(changes).length === 0) return true;

      try {
        await updateMutation.mutateAsync({ purchaseId: original.id, changes });
        return true;
      } catch (error) {
        notifyError(error, "No se pudo actualizar la compra.");
        // La compra pudo haberse borrado desde otra sesion: se refresca la lista.
        if (isNotFoundError(error)) void invalidatePurchases();
        return false;
      }
    },
    [invalidatePurchases, notifyError, supplierId, updateMutation]
  );

  const deletePurchase = useCallback(
    async (purchase: SupplierPurchase) => {
      if (!supplierId) return false;
      try {
        await deleteMutation.mutateAsync(purchase);
        return true;
      } catch (error) {
        notifyError(error, "No se pudo eliminar la compra.");
        if (isNotFoundError(error)) void invalidatePurchases();
        return false;
      }
    },
    [deleteMutation, invalidatePurchases, notifyError, supplierId]
  );

  return {
    createPurchase,
    updatePurchase,
    deletePurchase,
    isSaving: createMutation.isPending || updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
