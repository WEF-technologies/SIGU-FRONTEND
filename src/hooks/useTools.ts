import { useEffect, useRef, useState } from "react";
import { Tool, ToolFilters, ToolPayload } from "@/types";
import { useAuthenticatedFetch } from "@/hooks/useAuthenticatedFetch";
import { useToast } from "@/hooks/use-toast";
import { localizeApiErrorPayload } from "@/lib/errorI18n";
import { isSessionExpiredError } from "@/lib/apiClient";

const API_BASE_URL = `${import.meta.env.VITE_API_URL ?? ""}/api/v1`;

/** Maximo que acepta el backend: la pantalla filtra sobre el catalogo completo. */
const TOOLS_LIST_LIMIT = 500;

const normalizeValue = (value?: string) => {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === "all") return undefined;
  return trimmed;
};

const buildQueryString = (params: Record<string, string | number | boolean | undefined>) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    query.append(key, String(value));
  });
  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
};

const extractErrorMessage = async (response: Response, fallback: string) => {
  try {
    const payload = await response.json();
    return localizeApiErrorPayload(payload, fallback);
  } catch {
    return fallback;
  }
};

export const useTools = () => {
  const authenticatedFetch = useAuthenticatedFetch();
  const { toast } = useToast();

  const [tools, setTools] = useState<Tool[]>([]);
  // Empieza en true porque la primera carga arranca al montar.
  const [isLoadingTools, setIsLoadingTools] = useState(true);
  const [hasToolsError, setHasToolsError] = useState(false);

  const lastToolFiltersRef = useRef<ToolFilters>({});

  const fetchTools = async (filters?: ToolFilters) => {
    const normalizedFilters: ToolFilters = {
      category: normalizeValue(filters?.category),
      location: normalizeValue(filters?.location),
      status: normalizeValue(filters?.status as string) as ToolFilters["status"],
      assigned_to: normalizeValue(filters?.assigned_to),
    };

    lastToolFiltersRef.current = normalizedFilters;
    setIsLoadingTools(true);

    try {
      const query = buildQueryString({
        category: normalizedFilters.category,
        location: normalizedFilters.location,
        status: normalizedFilters.status,
        assigned_to: normalizedFilters.assigned_to,
        limit: TOOLS_LIST_LIMIT,
      });

      const response = await authenticatedFetch(`${API_BASE_URL}/tools/${query}`);
      if (!response.ok) {
        const message = await extractErrorMessage(response, "No se pudo cargar la lista de herramientas.");
        toast({ title: "Error", description: message, variant: "destructive" });
        setTools([]);
        setHasToolsError(true);
        return;
      }

      const data = await response.json();
      setTools(Array.isArray(data) ? data : []);
      setHasToolsError(false);
    } catch (error) {
      console.error("Error fetching tools:", error);
      setTools([]);
      setHasToolsError(true);
      if (isSessionExpiredError(error)) return;
      toast({ title: "Error", description: "No se pudo cargar la lista de herramientas.", variant: "destructive" });
    } finally {
      setIsLoadingTools(false);
    }
  };

  /**
   * Las alertas de vencimiento se calculan en pantalla sobre esta misma lista
   * (ver toolExpiry.ts), asi que no hace falta una segunda consulta.
   */
  const refreshTools = () => fetchTools(lastToolFiltersRef.current);

  const fetchToolById = async (toolId: string) => {
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/tools/${encodeURIComponent(toolId)}`);

      if (response.ok) {
        return (await response.json()) as Tool;
      }

      if (response.status === 404) {
        toast({
          title: "Herramienta no encontrada",
          description: "El recurso ya no existe. Se actualizó la lista.",
          variant: "destructive",
        });
        await fetchTools(lastToolFiltersRef.current);
        return null;
      }

      const message = await extractErrorMessage(response, "No se pudo cargar el detalle de la herramienta.");
      toast({ title: "Error", description: message, variant: "destructive" });
      return null;
    } catch (error) {
      console.error("Error fetching tool detail:", error);
      toast({ title: "Error", description: "No se pudo cargar el detalle de la herramienta.", variant: "destructive" });
      return null;
    }
  };

  const createTool = async (payload: ToolPayload) => {
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/tools/`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast({ title: "Herramienta creada", description: `${payload.code} registrada correctamente.` });
        await fetchTools(lastToolFiltersRef.current);
        return true;
      }

      if (response.status === 400) {
        const message = await extractErrorMessage(response, "Datos inválidos en el formulario.");
        toast({ title: "Validación", description: message, variant: "destructive" });
        return false;
      }

      const message = await extractErrorMessage(response, "No se pudo crear la herramienta.");
      toast({ title: "Error", description: message, variant: "destructive" });
      return false;
    } catch (error) {
      console.error("Error creating tool:", error);
      toast({ title: "Error", description: "No se pudo crear la herramienta.", variant: "destructive" });
      return false;
    }
  };

  const updateTool = async (toolId: string, payload: ToolPayload) => {
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/tools/${encodeURIComponent(toolId)}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast({ title: "Herramienta actualizada", description: `${payload.code} actualizada correctamente.` });
        await fetchTools(lastToolFiltersRef.current);
        return true;
      }

      if (response.status === 400) {
        const message = await extractErrorMessage(response, "Datos inválidos en el formulario.");
        toast({ title: "Validación", description: message, variant: "destructive" });
        return false;
      }

      if (response.status === 404) {
        toast({
          title: "Herramienta no encontrada",
          description: "El recurso no existe. Se actualizó la lista.",
          variant: "destructive",
        });
        await fetchTools(lastToolFiltersRef.current);
        return false;
      }

      const message = await extractErrorMessage(response, "No se pudo actualizar la herramienta.");
      toast({ title: "Error", description: message, variant: "destructive" });
      return false;
    } catch (error) {
      console.error("Error updating tool:", error);
      toast({ title: "Error", description: "No se pudo actualizar la herramienta.", variant: "destructive" });
      return false;
    }
  };

  const deleteTool = async (tool: Tool) => {
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/tools/${encodeURIComponent(tool.id)}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast({ title: "Herramienta eliminada", description: `${tool.code} eliminada correctamente.` });
        await fetchTools(lastToolFiltersRef.current);
        return true;
      }

      if (response.status === 404) {
        toast({
          title: "Herramienta no encontrada",
          description: "El recurso ya no existe. Se actualizó la lista.",
          variant: "destructive",
        });
        await fetchTools(lastToolFiltersRef.current);
        return false;
      }

      const message = await extractErrorMessage(response, "No se pudo eliminar la herramienta.");
      toast({ title: "Error", description: message, variant: "destructive" });
      return false;
    } catch (error) {
      console.error("Error deleting tool:", error);
      toast({ title: "Error", description: "No se pudo eliminar la herramienta.", variant: "destructive" });
      return false;
    }
  };

  useEffect(() => {
    fetchTools({});
  }, []);

  return {
    tools,
    isLoadingTools,
    hasToolsError,
    fetchTools,
    refreshTools,
    fetchToolById,
    createTool,
    updateTool,
    deleteTool,
  };
};
