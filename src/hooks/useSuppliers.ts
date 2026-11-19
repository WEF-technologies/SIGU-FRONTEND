import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthenticatedFetch } from "@/hooks/useAuthenticatedFetch";
import { useToast } from "@/hooks/use-toast";
import { suppliersApi, SuppliersApiError } from "@/services/suppliersApi";
import { Supplier, SupplierFilters, SupplierPayload } from "@/types";
import { isSessionExpiredError } from "@/lib/apiClient";

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof SuppliersApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

export type DeleteSupplierResult = "deleted" | "has-purchases" | "error";

const isMissingEndpointError = (error: unknown) =>
  error instanceof SuppliersApiError && error.status === 404;

export const useSuppliers = () => {
  const authenticatedFetch = useAuthenticatedFetch();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false);

  const lastFiltersRef = useRef<SupplierFilters>({});

  const fetchSuppliers = async (filters: SupplierFilters = {}) => {
    lastFiltersRef.current = filters;
    setIsLoadingSuppliers(true);

    try {
      const data = await suppliersApi.list(authenticatedFetch, filters);
      setSuppliers(Array.isArray(data) ? data : []);
      return true;
    } catch (error) {
      if (isMissingEndpointError(error)) {
        setSuppliers([]);
      } else if (!isSessionExpiredError(error)) {
        console.error("Error fetching suppliers:", error);
        toast({
          title: "Error",
          description: getErrorMessage(error, "No se pudo cargar el listado de proveedores."),
          variant: "destructive",
        });
      }
      setSuppliers([]);
      return false;
    } finally {
      setIsLoadingSuppliers(false);
    }
  };

  const createSupplier = async (payload: SupplierPayload) => {
    try {
      await suppliersApi.create(authenticatedFetch, payload);
      toast({ title: "Proveedor creado", description: `${payload.name} fue registrado correctamente.` });
      await fetchSuppliers(lastFiltersRef.current);
      return true;
    } catch (error) {
      console.error("Error creating supplier:", error);
      toast({
        title: "Error",
        description: getErrorMessage(error, "No se pudo crear el proveedor."),
        variant: "destructive",
      });
      return false;
    }
  };

  const updateSupplier = async (supplierId: string, payload: SupplierPayload) => {
    try {
      await suppliersApi.update(authenticatedFetch, supplierId, payload);
      // El historial de compras lee el proveedor con React Query (nombre y estado).
      void queryClient.invalidateQueries({ queryKey: ["suppliers", "detail", supplierId] });
      toast({ title: "Proveedor actualizado", description: `${payload.name} fue actualizado correctamente.` });
      await fetchSuppliers(lastFiltersRef.current);
      return true;
    } catch (error) {
      console.error("Error updating supplier:", error);
      toast({
        title: "Error",
        description: getErrorMessage(error, "No se pudo actualizar el proveedor."),
        variant: "destructive",
      });
      return false;
    }
  };

  /**
   * "has-purchases": el backend responde 409 si el proveedor tiene compras
   * registradas (el historial no se borra). No se avisa aqui: la pantalla
   * ofrece marcarlo como inactivo, que es lo que el backend sugiere.
   */
  const deleteSupplier = async (supplier: Supplier): Promise<DeleteSupplierResult> => {
    try {
      await suppliersApi.remove(authenticatedFetch, supplier.id);
      toast({ title: "Proveedor eliminado", description: `${supplier.name} fue eliminado correctamente.` });
      await fetchSuppliers(lastFiltersRef.current);
      return "deleted";
    } catch (error) {
      if (error instanceof SuppliersApiError && error.status === 409) {
        return "has-purchases";
      }
      if (isSessionExpiredError(error)) return "error";

      console.error("Error deleting supplier:", error);
      toast({
        title: "Error",
        description: getErrorMessage(error, "No se pudo eliminar el proveedor."),
        variant: "destructive",
      });
      return "error";
    }
  };

  const refreshAll = async () => {
    await fetchSuppliers(lastFiltersRef.current);
  };

  useEffect(() => {
    void fetchSuppliers({});
  }, []);

  return {
    suppliers,
    isLoadingSuppliers,
    fetchSuppliers,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    refreshAll,
  };
};