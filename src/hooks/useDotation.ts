import { useEffect, useRef, useState } from "react";
import { useAuthenticatedFetch } from "@/hooks/useAuthenticatedFetch";
import { useToast } from "@/hooks/use-toast";
import { dotationApi, DotationApiError } from "@/services/dotationApi";
import {
  DotationDelivery,
  DotationDeliveryPayload,
  DotationItem,
  DotationItemFilters,
  DotationItemPayload,
  DotationStaffFilters,
  DotationStaffMember,
  DotationStaffMemberPayload,
} from "@/types";
import { isSessionExpiredError } from "@/lib/apiClient";

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof DotationApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

export const useDotation = () => {
  const authenticatedFetch = useAuthenticatedFetch();
  const { toast } = useToast();

  const [staffMembers, setStaffMembers] = useState<DotationStaffMember[]>([]);
  const [items, setItems] = useState<DotationItem[]>([]);
  const [deliveries, setDeliveries] = useState<DotationDelivery[]>([]);
  const [hasDeliveriesError, setHasDeliveriesError] = useState(false);

  // Empiezan en true porque la primera carga arranca al montar.
  const [isLoadingStaff, setIsLoadingStaff] = useState(true);
  const [isLoadingItems, setIsLoadingItems] = useState(true);
  const [isLoadingDeliveries, setIsLoadingDeliveries] = useState(true);

  const lastStaffFiltersRef = useRef<DotationStaffFilters>({});
  const lastItemFiltersRef = useRef<DotationItemFilters>({});

  const fetchStaffMembers = async (filters: DotationStaffFilters = {}) => {
    lastStaffFiltersRef.current = filters;
    setIsLoadingStaff(true);

    try {
      const data = await dotationApi.listStaffMembers(authenticatedFetch, filters);
      setStaffMembers(Array.isArray(data) ? data : []);
      return true;
    } catch (error) {
      console.error("Error fetching dotation staff:", error);
      if (!isSessionExpiredError(error)) {
        toast({
          title: "Error",
          description: getErrorMessage(error, "No se pudo cargar el personal de dotación."),
          variant: "destructive",
        });
      }
      setStaffMembers([]);
      return false;
    } finally {
      setIsLoadingStaff(false);
    }
  };

  const fetchItems = async (filters: DotationItemFilters = {}) => {
    lastItemFiltersRef.current = filters;
    setIsLoadingItems(true);

    try {
      const data = await dotationApi.listItems(authenticatedFetch, filters);
      setItems(Array.isArray(data) ? data : []);
      return true;
    } catch (error) {
      console.error("Error fetching dotation items:", error);
      if (!isSessionExpiredError(error)) {
        toast({
          title: "Error",
          description: getErrorMessage(error, "No se pudo cargar el catálogo de dotación."),
          variant: "destructive",
        });
      }
      setItems([]);
      return false;
    } finally {
      setIsLoadingItems(false);
    }
  };

  /**
   * Trae el historial completo: las alertas se calculan en pantalla a partir
   * de la ultima entrega de cada persona e item, y los filtros de la pestaña
   * Entregas se aplican en el cliente.
   */
  const fetchDeliveries = async () => {
    setIsLoadingDeliveries(true);

    try {
      const data = await dotationApi.listDeliveries(authenticatedFetch);
      setDeliveries(Array.isArray(data) ? data : []);
      setHasDeliveriesError(false);
      return true;
    } catch (error) {
      console.error("Error fetching dotation deliveries:", error);
      if (!isSessionExpiredError(error)) {
        toast({
          title: "Error",
          description: getErrorMessage(error, "No se pudo cargar el historial de entregas."),
          variant: "destructive",
        });
      }
      setDeliveries([]);
      setHasDeliveriesError(true);
      return false;
    } finally {
      setIsLoadingDeliveries(false);
    }
  };

  const createStaffMember = async (payload: DotationStaffMemberPayload) => {
    try {
      await dotationApi.createStaffMember(authenticatedFetch, payload);
      toast({ title: "Personal registrado", description: `${payload.document_number} creado correctamente.` });
      await fetchStaffMembers(lastStaffFiltersRef.current);
      return true;
    } catch (error) {
      console.error("Error creating dotation staff:", error);
      toast({
        title: "Error",
        description: getErrorMessage(error, "No se pudo registrar el personal de dotación."),
        variant: "destructive",
      });
      return false;
    }
  };

  const updateStaffMember = async (documentNumber: string, payload: DotationStaffMemberPayload) => {
    try {
      await dotationApi.updateStaffMember(authenticatedFetch, documentNumber, payload);
      toast({ title: "Personal actualizado", description: `${payload.document_number} actualizado correctamente.` });
      await fetchStaffMembers(lastStaffFiltersRef.current);
      return true;
    } catch (error) {
      console.error("Error updating dotation staff:", error);
      toast({
        title: "Error",
        description: getErrorMessage(error, "No se pudo actualizar el personal de dotación."),
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteStaffMember = async (staffMember: DotationStaffMember) => {
    try {
      await dotationApi.deleteStaffMember(authenticatedFetch, staffMember.document_number);
      toast({ title: "Personal eliminado", description: `${staffMember.document_number} eliminado correctamente.` });
      await fetchStaffMembers(lastStaffFiltersRef.current);
      return true;
    } catch (error) {
      console.error("Error deleting dotation staff:", error);
      toast({
        title: "Error",
        description: getErrorMessage(error, "No se pudo eliminar el personal de dotación."),
        variant: "destructive",
      });
      return false;
    }
  };

  const createItem = async (payload: DotationItemPayload) => {
    try {
      await dotationApi.createItem(authenticatedFetch, payload);
      toast({ title: "Item creado", description: `${payload.code} creado correctamente.` });
      await fetchItems(lastItemFiltersRef.current);
      return true;
    } catch (error) {
      console.error("Error creating dotation item:", error);
      toast({
        title: "Error",
        description: getErrorMessage(error, "No se pudo crear el item de dotación."),
        variant: "destructive",
      });
      return false;
    }
  };

  const updateItem = async (itemCode: string, payload: DotationItemPayload) => {
    try {
      await dotationApi.updateItem(authenticatedFetch, itemCode, payload);
      toast({ title: "Item actualizado", description: `${payload.code} actualizado correctamente.` });
      await fetchItems(lastItemFiltersRef.current);
      return true;
    } catch (error) {
      console.error("Error updating dotation item:", error);
      toast({
        title: "Error",
        description: getErrorMessage(error, "No se pudo actualizar el item de dotación."),
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteItem = async (item: DotationItem) => {
    try {
      await dotationApi.deleteItem(authenticatedFetch, item.code);
      toast({ title: "Item eliminado", description: `${item.code} eliminado correctamente.` });
      await fetchItems(lastItemFiltersRef.current);
      return true;
    } catch (error) {
      console.error("Error deleting dotation item:", error);
      toast({
        title: "Error",
        description: getErrorMessage(error, "No se pudo eliminar el item de dotación."),
        variant: "destructive",
      });
      return false;
    }
  };

  const createDelivery = async (payload: DotationDeliveryPayload) => {
    try {
      await dotationApi.createDelivery(authenticatedFetch, payload);
      toast({ title: "Entrega registrada", description: "La entrega de dotación se registró correctamente." });
      await fetchDeliveries();
      return true;
    } catch (error) {
      console.error("Error creating dotation delivery:", error);
      toast({
        title: "Error",
        description: getErrorMessage(error, "No se pudo registrar la entrega de dotación."),
        variant: "destructive",
      });
      return false;
    }
  };

  const refreshAll = async () => {
    await Promise.all([
      fetchStaffMembers(lastStaffFiltersRef.current),
      fetchItems(lastItemFiltersRef.current),
      fetchDeliveries(),
    ]);
  };

  useEffect(() => {
    void Promise.all([
      fetchStaffMembers({}),
      fetchItems({}),
      fetchDeliveries(),
    ]);
  }, []);

  return {
    staffMembers,
    items,
    deliveries,
    hasDeliveriesError,
    isLoadingStaff,
    isLoadingItems,
    isLoadingDeliveries,
    fetchStaffMembers,
    fetchItems,
    fetchDeliveries,
    createStaffMember,
    updateStaffMember,
    deleteStaffMember,
    createItem,
    updateItem,
    deleteItem,
    createDelivery,
    refreshAll,
  };
};