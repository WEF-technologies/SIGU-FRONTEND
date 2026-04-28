import { useEffect, useRef, useState } from "react";
import { Tool, ToolAlert, ToolFilters, ToolAlertFilters, ToolPayload } from "@/types";
import { useAuthenticatedFetch } from "@/hooks/useAuthenticatedFetch";
import { useToast } from "@/hooks/use-toast";

const API_BASE_URL = `${import.meta.env.VITE_API_URL ?? ""}/api/v1`;

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
    return payload?.message || payload?.detail || fallback;
  } catch {
    return fallback;
  }
};

export const useTools = () => {
  const authenticatedFetch = useAuthenticatedFetch();
  const { toast } = useToast();

  const [tools, setTools] = useState<Tool[]>([]);
  const [alerts, setAlerts] = useState<ToolAlert[]>([]);
  const [isLoadingTools, setIsLoadingTools] = useState(false);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(false);

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
      });

      const response = await authenticatedFetch(`${API_BASE_URL}/tools/${query}`);
      if (!response.ok) {
        const message = await extractErrorMessage(response, "No se pudo cargar la lista de herramientas.");
        toast({ title: "Error", description: message, variant: "destructive" });
        setTools([]);
        return;
      }

      const data = await response.json();
      setTools(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching tools:", error);
      toast({ title: "Error", description: "No se pudo cargar la lista de herramientas.", variant: "destructive" });
      setTools([]);
    } finally {
      setIsLoadingTools(false);
    }
  };

  const fetchAlerts = async (filters?: ToolAlertFilters) => {
    const normalized = {
      near_days: filters?.near_days ?? 30,
      include_ok: filters?.include_ok ?? false,
      category: normalizeValue(filters?.category),
      location: normalizeValue(filters?.location),
      status: normalizeValue(filters?.status as string),
    };

    setIsLoadingAlerts(true);

    try {
      const query = buildQueryString({
        near_days: normalized.near_days,
        include_ok: normalized.include_ok,
        category: normalized.category,
        location: normalized.location,
        status: normalized.status,
      });

      const response = await authenticatedFetch(`${API_BASE_URL}/tools/alerts${query}`);
      if (!response.ok) {
        const message = await extractErrorMessage(response, "No se pudieron cargar las alertas de vencimiento.");
        toast({ title: "Error", description: message, variant: "destructive" });
        setAlerts([]);
        return;
      }

      const data = await response.json();
      setAlerts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching tools alerts:", error);
      toast({ title: "Error", description: "No se pudieron cargar las alertas de vencimiento.", variant: "destructive" });
      setAlerts([]);
    } finally {
      setIsLoadingAlerts(false);
    }
  };

  const fetchToolById = async (toolId: string) => {
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/tools/${toolId}`);

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
      const response = await authenticatedFetch(`${API_BASE_URL}/tools/${toolId}`, {
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
      const response = await authenticatedFetch(`${API_BASE_URL}/tools/${tool.id}`, {
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
    fetchAlerts({ near_days: 30, include_ok: false });
  }, []);

  return {
    tools,
    alerts,
    isLoadingTools,
    isLoadingAlerts,
    fetchTools,
    fetchAlerts,
    fetchToolById,
    createTool,
    updateTool,
    deleteTool,
  };
};
