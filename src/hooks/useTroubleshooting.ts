import { useEffect, useRef, useState } from "react";
import { useAuthenticatedFetch } from "@/hooks/useAuthenticatedFetch";
import { useToast } from "@/hooks/use-toast";
import { troubleshootingApi, TroubleshootingApiError } from "@/services/troubleshootingApi";
import {
  TroubleshootingGuide,
  TroubleshootingGuideFilters,
  TroubleshootingGuidePayload,
} from "@/types";

const isSessionExpiredError = (error: unknown) =>
  error instanceof Error && error.message === "Sesión expirada";

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof TroubleshootingApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

// El módulo puede no estar desplegado todavía en el backend: se muestra vacío
// en vez de un toast de error en cada carga.
const isMissingEndpointError = (error: unknown) =>
  error instanceof TroubleshootingApiError && error.status === 404;

export const useTroubleshooting = () => {
  const authenticatedFetch = useAuthenticatedFetch();
  const { toast } = useToast();

  const [guides, setGuides] = useState<TroubleshootingGuide[]>([]);
  const [isLoadingGuides, setIsLoadingGuides] = useState(false);

  const lastFiltersRef = useRef<TroubleshootingGuideFilters>({});

  const fetchGuides = async (filters: TroubleshootingGuideFilters = {}) => {
    lastFiltersRef.current = filters;
    setIsLoadingGuides(true);

    try {
      const data = await troubleshootingApi.list(authenticatedFetch, filters);
      setGuides(Array.isArray(data) ? data : []);
      return true;
    } catch (error) {
      if (!isMissingEndpointError(error) && !isSessionExpiredError(error)) {
        console.error("Error fetching troubleshooting guides:", error);
        toast({
          title: "Error",
          description: getErrorMessage(error, "No se pudo cargar el manual de fallas."),
          variant: "destructive",
        });
      }
      setGuides([]);
      return false;
    } finally {
      setIsLoadingGuides(false);
    }
  };

  const createGuide = async (payload: TroubleshootingGuidePayload) => {
    try {
      await troubleshootingApi.create(authenticatedFetch, payload);
      toast({
        title: "Falla registrada",
        description: `${payload.code} fue agregada al manual.`,
      });
      await fetchGuides(lastFiltersRef.current);
      return true;
    } catch (error) {
      console.error("Error creating troubleshooting guide:", error);
      toast({
        title: "Error",
        description: getErrorMessage(error, "No se pudo registrar la falla."),
        variant: "destructive",
      });
      return false;
    }
  };

  const updateGuide = async (guideId: string, payload: TroubleshootingGuidePayload) => {
    try {
      await troubleshootingApi.update(authenticatedFetch, guideId, payload);
      toast({
        title: "Falla actualizada",
        description: `${payload.code} fue actualizada correctamente.`,
      });
      await fetchGuides(lastFiltersRef.current);
      return true;
    } catch (error) {
      console.error("Error updating troubleshooting guide:", error);
      toast({
        title: "Error",
        description: getErrorMessage(error, "No se pudo actualizar la falla."),
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteGuide = async (guide: TroubleshootingGuide) => {
    try {
      await troubleshootingApi.remove(authenticatedFetch, guide.id);
      toast({
        title: "Falla eliminada",
        description: `${guide.code} fue eliminada del manual.`,
      });
      await fetchGuides(lastFiltersRef.current);
      return true;
    } catch (error) {
      console.error("Error deleting troubleshooting guide:", error);
      toast({
        title: "Error",
        description: getErrorMessage(error, "No se pudo eliminar la falla."),
        variant: "destructive",
      });
      return false;
    }
  };

  const refreshAll = async () => {
    await fetchGuides(lastFiltersRef.current);
  };

  useEffect(() => {
    void fetchGuides({});
  }, []);

  return {
    guides,
    isLoadingGuides,
    fetchGuides,
    createGuide,
    updateGuide,
    deleteGuide,
    refreshAll,
  };
};
