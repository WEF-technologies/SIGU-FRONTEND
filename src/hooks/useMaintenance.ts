import { useState, useEffect, useRef, useCallback } from "react";
import {
  Maintenance as MaintenanceType,
  MaintenanceAlert,
  MaintenanceFailureReason,
  MaintenanceFormData,
  MaintenanceMutationResult,
  Vehicle,
} from "@/types";
import { useAuthenticatedFetch } from "@/hooks/useAuthenticatedFetch";
import { useToast } from "@/hooks/use-toast";
import { localizeApiErrorPayload } from "@/lib/errorI18n";
import { isRecord, isSessionExpiredError } from "@/lib/apiClient";
import { toNullableNumber } from "@/lib/kilometers";

const API_URL = import.meta.env.VITE_API_URL ?? "";
const M3_INTERVAL_KM = 5000;
const MAINTENANCE_PAGE_SIZE = 200;
const MAX_MAINTENANCE_PAGES = 40;
const DISMISSED_ALERTS_KEY = "dismissedMaintenanceAlerts";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * El backend valida `spare_part_id` como UUID: cualquier otro texto (un
 * código, "none") responde 422. Se manda el UUID o null.
 */
const toSparePartId = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return UUID_PATTERN.test(trimmed) ? trimmed : null;
};

const toNullableText = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

/** "M3" y "m3" son el mismo tipo para el backend; aquí se guardan en minúsculas. */
const normalizeMaintenanceType = (value: unknown) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

/** Llave de una alerta descartada; sin distinguir mayúsculas en el tipo. */
const getAlertKey = (alert: Pick<MaintenanceAlert, "vehicle_plate" | "type">) =>
  `${alert.vehicle_plate}-${alert.type}`.toLowerCase();

const readErrorResponse = async (response: Response) => {
  const fallback = `No se pudo completar la solicitud (${response.status}).`;
  let payload: unknown = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  return {
    status: response.status,
    /** Texto original del backend, para distinguir casos que comparten código. */
    rawDetail: isRecord(payload) && typeof payload.detail === "string" ? payload.detail : "",
    message: localizeApiErrorPayload(payload, fallback),
  };
};

const classifyMaintenanceError = (status: number, rawDetail: string): MaintenanceFailureReason => {
  if (status === 404 && /maintenance with id/i.test(rawDetail)) return "not_found";
  if (status === 400 && /spare part with id .+ does not exist/i.test(rawDetail)) return "spare_part_missing";
  if (status === 400 || status === 404 || status === 422) return "invalid";
  return "error";
};

const getMaintenanceErrorTitle = (
  reason: MaintenanceFailureReason,
  rawDetail: string,
  status: number,
  action: "registrar" | "actualizar"
) => {
  if (reason === "not_found") return "Mantenimiento no encontrado";
  if (reason === "spare_part_missing") return "Repuesto no disponible";
  if (reason === "invalid") {
    return /kilomet/i.test(rawDetail) ? "Validación de kilometraje" : "Datos inválidos";
  }
  return `Error ${status} al ${action}`;
};

const normalizeIdValue = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

const normalizePlateValue = (value: unknown): string => {
  if (typeof value !== "string") return "";
  return value.trim().toUpperCase();
};

const toPositiveNumber = (value: unknown): number | null => {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
};

const extractMaintenanceItems = (payload: any): any[] => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.maintenances)) return payload.maintenances;
  if (Array.isArray(payload?.payload)) return payload.payload;
  return [];
};

const resolveMaintenancePlate = (entry: any, vehiclesById: Map<string, any>) => {
  const directPlate =
    entry?.vehicle_plate ||
    entry?.plate_number ||
    entry?.vehicle?.plate_number;

  if (typeof directPlate === "string" && directPlate.trim().length > 0) {
    return directPlate;
  }

  const vehicleId = normalizeIdValue(entry?.vehicle_id ?? entry?.vehicle?.id);
  if (vehicleId) {
    return vehiclesById.get(vehicleId)?.plate_number;
  }

  return (
    entry?.vehicle_plate ||
    entry?.plate_number ||
    entry?.vehicle?.plate_number ||
    undefined
  );
};

const normalizeMaintenanceEntries = (entries: any[], vehiclesPool: any[]): MaintenanceType[] => {
  const vehiclesById = new Map(
    (Array.isArray(vehiclesPool) ? vehiclesPool : []).map((vehicle) => [normalizeIdValue(vehicle.id), vehicle])
  );

  return entries.map((entry) => {
    const resolvedPlate = resolveMaintenancePlate(entry, vehiclesById);
    const normalizedVehicleId = normalizeIdValue(entry?.vehicle_id ?? entry?.vehicle?.id);
    const normalizedPlate = normalizePlateValue(resolvedPlate ?? entry?.vehicle_plate ?? entry?.plate_number);

    return {
      ...entry,
      vehicle_id: normalizedVehicleId || entry?.vehicle_id,
      vehicle_plate: normalizedPlate || (resolvedPlate ?? entry?.vehicle_plate),
      type: normalizeMaintenanceType(entry?.type),
      // Decimal en el backend: puede llegar con fracción (o como texto).
      kilometers: toNullableNumber(entry?.kilometers),
      spare_part_id: toSparePartId(entry?.spare_part_id),
    } as MaintenanceType;
  });
};

const buildMaintenancePageUrl = (page: number) =>
  `${API_URL}/api/v1/maintenances/?all=true&page=${page}&limit=${MAINTENANCE_PAGE_SIZE}&page_size=${MAINTENANCE_PAGE_SIZE}&per_page=${MAINTENANCE_PAGE_SIZE}&size=${MAINTENANCE_PAGE_SIZE}`;

const buildMaintenanceOffsetUrl = (page: number) => {
  const offset = (page - 1) * MAINTENANCE_PAGE_SIZE;
  return `${API_URL}/api/v1/maintenances/?all=true&skip=${offset}&offset=${offset}&limit=${MAINTENANCE_PAGE_SIZE}&page_size=${MAINTENANCE_PAGE_SIZE}&per_page=${MAINTENANCE_PAGE_SIZE}&size=${MAINTENANCE_PAGE_SIZE}`;
};

const getMaintenanceDedupKey = (item: Partial<MaintenanceType>) => {
  return (
    item.id ||
    `${normalizeIdValue(item.vehicle_id)}-${normalizePlateValue(item.vehicle_plate)}-${item.date}-${item.type}-${item.kilometers ?? "na"}-${item.description ?? ""}`
  );
};

/**
 * Enriquece un vehículo con datos de M3. El backend mantiene last_m3_date y
 * next_m3_kilometers: los recalcula al crear, editar o borrar un M3 (toma el
 * de mayor km) y los deja en null cuando ya no queda ninguno. Por eso son la
 * fuente primaria. El historial local solo cubre unidades cuyos M3 son
 * anteriores a ese recálculo; si tampoco ahí hay un M3, el resultado es null
 * ("Sin M3 registrado").
 */
function enrichWithM3(vehicle: any, maintenances: MaintenanceType[]) {
  const normalizedVehiclePlate = normalizePlateValue(vehicle.plate_number);
  const normalizedVehicleId = normalizeIdValue(vehicle.id);

  const vehicleMaintenances = maintenances.filter(
    (m) =>
      normalizePlateValue(m.vehicle_plate) === normalizedVehiclePlate ||
      normalizeIdValue(m.vehicle_id) === normalizedVehicleId
  );
  const maxMaintenanceKm = Math.max(
    0,
    ...vehicleMaintenances.map((m) => m.kilometers ?? 0)
  );

  // Fallback: último M3 por mayor kilometraje (y fecha descendente como desempate),
  // el mismo criterio del backend. El tipo ya viene en minúsculas.
  const lastM3 = vehicleMaintenances
    .filter((m) => m.type === "m3")
    .sort((a, b) => {
      const kmDiff = (b.kilometers ?? 0) - (a.kilometers ?? 0);
      if (kmDiff !== 0) return kmDiff;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    })[0];

  const effectiveCurrentKm = Math.max(
    vehicle.kilometers || 0,
    vehicle.current_kilometers || 0,
    maxMaintenanceKm
  );

  return {
    ...vehicle,
    current_kilometers: effectiveCurrentKm,
    last_m3_date: vehicle.last_m3_date ?? lastM3?.date ?? null,
    last_m3_kilometers: toNullableNumber(vehicle.last_m3_kilometers) ?? lastM3?.kilometers ?? null,
    next_m3_kilometers:
      toNullableNumber(vehicle.next_m3_kilometers) ??
      (lastM3?.kilometers != null ? lastM3.kilometers + M3_INTERVAL_KM : null),
  };
}

export function useMaintenance() {
  const { toast } = useToast();
  const authenticatedFetch = useAuthenticatedFetch();

  /**
   * Ref que siempre apunta a la versión más reciente de authenticatedFetch.
   * Esto evita que el useEffect principal se re-ejecute cada vez que el
   * token se renueva (lo que causaba un "reinicio de pantalla" innecesario).
   */
  const fetchRef = useRef(authenticatedFetch);
  fetchRef.current = authenticatedFetch;

  const [maintenance, setMaintenance] = useState<MaintenanceType[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [alerts, setAlerts] = useState<MaintenanceAlert[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  /**
   * Los dismissed se leen directamente del localStorage al filtrar alerts,
   * sin guardarlos en estado de React para no re-disparar el useEffect.
   */
  const getDismissedAlerts = (): Set<string> => {
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(DISMISSED_ALERTS_KEY) || "[]");
      // Las llaves viejas podían traer el tipo en mayúsculas ("ABC-123-M3").
      return new Set(
        Array.isArray(stored) ? stored.map((key) => String(key).toLowerCase()) : []
      );
    } catch {
      return new Set();
    }
  };

  /**
   * Calcula alertas M3 vencidas o próximas directamente desde los vehículos
   * enriquecidos. Esto garantiza que siempre se muestren aunque el backend
   * no las devuelva o hayan sido descartadas previamente en localStorage.
   */
  // Umbral "near" alineado con el backend (near_threshold default = 500 km)
  const M3_NEAR_THRESHOLD = 500;
  const M3_INTERVAL = M3_INTERVAL_KM;

  const computeLocalM3Alerts = (enrichedVehicles: Vehicle[]): MaintenanceAlert[] => {
    // El retorno se anota explícitamente: sin ello TypeScript fija el tipo del
    // callback con la primera rama (status: 'due') y rechaza la segunda ('near').
    return enrichedVehicles.flatMap((v): MaintenanceAlert[] => {
      const effectiveKm = Math.max(
        v.current_kilometers || (v as any).kilometers || 0,
        v.last_m3_kilometers || 0
      );
      const nextM3Km = v.next_m3_kilometers;
      if (!effectiveKm || !nextM3Km) return [];
      const remaining = nextM3Km - effectiveKm;
      // Vencido: km >= próximo M3
      if (remaining <= 0) {
        return [{
          vehicle_plate: v.plate_number,
          type: 'm3',
          last_km: v.last_m3_kilometers ?? null,
          current_km: effectiveKm,
          interval: M3_INTERVAL,
          remaining_km: remaining,
          status: 'due' as const,
          severity: 3,
        }];
      }
      // Próximo: ≤ 500 km restantes (alineado con near_threshold del backend)
      if (remaining <= M3_NEAR_THRESHOLD) {
        return [{
          vehicle_plate: v.plate_number,
          type: 'm3',
          last_km: v.last_m3_kilometers ?? null,
          current_km: effectiveKm,
          interval: M3_INTERVAL,
          remaining_km: remaining,
          status: 'near' as const,
          severity: 2,
        }];
      }
      return [];
    });
  };

  /**
   * Combina alertas del backend con las calculadas localmente.
   * Las locales tienen precedencia para evitar duplicados.
   */
  const mergeAlerts = (backend: MaintenanceAlert[], local: MaintenanceAlert[]): MaintenanceAlert[] => {
    const seen = new Set(local.map(getAlertKey));
    const deduped = backend.filter((a) => !seen.has(getAlertKey(a)));
    return [...local, ...deduped];
  };

  const fetchMaintenanceRecords = useCallback(async (vehiclesData: any[]): Promise<MaintenanceType[]> => {
    const collectWithBuilder = async (
      buildUrl: (page: number) => string
    ): Promise<MaintenanceType[]> => {
      const allItems: MaintenanceType[] = [];
      const seenKeys = new Set<string>();
      let nextUrl: string | null = buildUrl(1);
      let currentPage = 1;

      while (nextUrl && currentPage <= MAX_MAINTENANCE_PAGES) {
        const response = await fetchRef.current(nextUrl);
        if (!response.ok) break;

        const payload = await response.json();
        const pageItems = normalizeMaintenanceEntries(extractMaintenanceItems(payload), vehiclesData);
        if (pageItems.length === 0) break;

        let added = 0;
        for (const item of pageItems) {
          const dedupeKey = getMaintenanceDedupKey(item);
          if (seenKeys.has(dedupeKey)) continue;
          seenKeys.add(dedupeKey);
          allItems.push(item);
          added += 1;
        }

        const nextFromPayload =
          (typeof (payload as any)?.next === "string" && (payload as any).next.length > 0
            ? (payload as any).next
            : null) ||
          (typeof (payload as any)?.links?.next === "string" && (payload as any).links.next.length > 0
            ? (payload as any).links.next
            : null);

        if (nextFromPayload) {
          nextUrl = nextFromPayload;
          currentPage += 1;
          continue;
        }

        const hasNext =
          (payload as any)?.has_next === true ||
          (payload as any)?.hasNext === true ||
          (payload as any)?.pagination?.has_next === true ||
          (payload as any)?.pagination?.hasNext === true;

        const totalPages =
          toPositiveNumber((payload as any)?.total_pages) ||
          toPositiveNumber((payload as any)?.pages) ||
          toPositiveNumber((payload as any)?.last_page) ||
          toPositiveNumber((payload as any)?.pagination?.total_pages) ||
          toPositiveNumber((payload as any)?.pagination?.pages) ||
          null;

        const totalItems =
          toPositiveNumber((payload as any)?.total) ||
          toPositiveNumber((payload as any)?.count) ||
          toPositiveNumber((payload as any)?.total_count) ||
          toPositiveNumber((payload as any)?.pagination?.total) ||
          toPositiveNumber((payload as any)?.pagination?.count) ||
          null;

        const serverPage =
          toPositiveNumber((payload as any)?.page) ||
          toPositiveNumber((payload as any)?.current_page) ||
          toPositiveNumber((payload as any)?.pagination?.page) ||
          toPositiveNumber((payload as any)?.pagination?.current_page) ||
          currentPage;

        const serverPageSize =
          toPositiveNumber((payload as any)?.page_size) ||
          toPositiveNumber((payload as any)?.per_page) ||
          toPositiveNumber((payload as any)?.size) ||
          toPositiveNumber((payload as any)?.limit) ||
          toPositiveNumber((payload as any)?.pagination?.page_size) ||
          toPositiveNumber((payload as any)?.pagination?.per_page) ||
          toPositiveNumber((payload as any)?.pagination?.size) ||
          toPositiveNumber((payload as any)?.pagination?.limit) ||
          MAINTENANCE_PAGE_SIZE;

        if (hasNext) {
          currentPage = serverPage + 1;
          nextUrl = buildUrl(currentPage);
          continue;
        }

        if (totalPages && serverPage < totalPages) {
          currentPage = serverPage + 1;
          nextUrl = buildUrl(currentPage);
          continue;
        }

        if (totalItems && allItems.length < totalItems && added > 0) {
          currentPage = serverPage + 1;
          nextUrl = buildUrl(currentPage);
          continue;
        }

        if (pageItems.length >= serverPageSize && added > 0) {
          currentPage = serverPage + 1;
          nextUrl = buildUrl(currentPage);
          continue;
        }

        if (added > 0 && currentPage < MAX_MAINTENANCE_PAGES) {
          currentPage += 1;
          nextUrl = buildUrl(currentPage);
          continue;
        }

        nextUrl = null;
      }

      return allItems;
    };

    try {
      const pageBasedItems = await collectWithBuilder(buildMaintenancePageUrl);
      const offsetBasedItems = await collectWithBuilder(buildMaintenanceOffsetUrl);

      const merged = [...pageBasedItems, ...offsetBasedItems];
      const dedupedById = new Map<string, MaintenanceType>();
      for (const item of merged) {
        dedupedById.set(getMaintenanceDedupKey(item), item);
      }

      if (dedupedById.size > 0) {
        return Array.from(dedupedById.values());
      }

      const fallbackResponse = await fetchRef.current(`${API_URL}/api/v1/maintenances/`);
      if (!fallbackResponse.ok) return [];

      const fallbackPayload = await fallbackResponse.json();
      return normalizeMaintenanceEntries(extractMaintenanceItems(fallbackPayload), vehiclesData);
    } catch (error) {
      console.error("Error fetching maintenance records:", error);
      return [];
    }
  }, []);

  const fetchAlerts = useCallback(async (enrichedVehicles?: Vehicle[]) => {
    try {
      const response = await fetchRef.current(`${API_URL}/api/v1/maintenances/alerts`);
      const dismissed = getDismissedAlerts();
      let backendAlerts: MaintenanceAlert[] = [];
      if (response.ok) {
        const alertsData = await response.json();
        // /alerts devuelve el tipo en minúsculas; se normaliza igual por si acaso,
        // para que "M3" y "m3" no salgan como dos alertas distintas.
        backendAlerts = Array.isArray(alertsData)
          ? alertsData
              .map((a: MaintenanceAlert) => ({ ...a, type: normalizeMaintenanceType(a.type) }))
              .filter((a: MaintenanceAlert) => !dismissed.has(getAlertKey(a)))
          : [];
      }
      // Combinar con alertas calculadas localmente (siempre visibles, sin filtro dismissed)
      const currentVehicles = enrichedVehicles ?? vehicles;
      const localAlerts = computeLocalM3Alerts(currentVehicles);
      setAlerts(mergeAlerts(backendAlerts, localAlerts));
    } catch (error) {
      console.error('Error fetching alerts:', error);
      setAlerts([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // fetchRef y vehicles son accedidos por ref/closure estable

  useEffect(() => {
    let isActive = true;

    const fetchData = async () => {
      if (isActive) {
        setIsLoadingData(true);
      }

      try {
        const vehiclesResponse = await fetchRef.current(`${API_URL}/api/v1/vehicles/`);
        const vehiclesData = vehiclesResponse.ok ? await vehiclesResponse.json() : [];
        const normalizedVehicles = Array.isArray(vehiclesData) ? vehiclesData : [];

        const maintenanceData = await fetchMaintenanceRecords(normalizedVehicles);

        if (isActive) {
          setMaintenance(maintenanceData);
        }

        if (vehiclesResponse.ok) {
          // Enriquecer con M3 usando los datos de mantenimiento recién cargados
          const mapped = normalizedVehicles.map((v: any) => enrichWithM3(v, maintenanceData));
          if (isActive) {
            setVehicles(mapped);
            await fetchAlerts(mapped);
          }
        } else {
          if (isActive) {
            setVehicles([]);
            await fetchAlerts([]);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        if (isActive) {
          setMaintenance([]);
          setVehicles([]);
          setAlerts([]);
        }
      } finally {
        if (isActive) {
          setIsLoadingData(false);
        }
      }
    };

    fetchData();

    return () => {
      isActive = false;
    };
  // Solo se ejecuta al montar el componente.
  // fetchRef y fetchAlerts son estables y no necesitan ser deps.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Rehidrata vehículos desde el backend usando la lista de mantenimientos proporcionada. */
  const reloadVehicles = async (currentMaintenances: MaintenanceType[]) => {
    const vehiclesResponse = await fetchRef.current(`${API_URL}/api/v1/vehicles/`);
    if (vehiclesResponse.ok) {
      const vehiclesData = await vehiclesResponse.json();
      const mapped = (Array.isArray(vehiclesData) ? vehiclesData : []).map((v: any) =>
        enrichWithM3(v, currentMaintenances)
      );
      setVehicles(mapped);
      await fetchAlerts(mapped);
    }
  };

  const refreshVehicles = async () => {
    await reloadVehicles(maintenance);
  };

  const updateVehicleInState = (updatedVehicle: any) => {
    try {
      const mapped = enrichWithM3(updatedVehicle, maintenance);
      setVehicles(prev => {
        const exists = prev.some(v => v.id === mapped.id || v.plate_number === mapped.plate_number);
        if (exists) {
          return prev.map(v => (v.id === mapped.id || v.plate_number === mapped.plate_number) ? mapped : v);
        }
        return [mapped, ...prev];
      });
    } catch (error) {
      console.error('Error updating vehicle in state:', error);
    }
  };

  /** Elimina un vehículo del estado local sin necesidad de refetch. */
  const removeVehicleFromState = (plateNumber: string) => {
    setVehicles(prev => prev.filter(v => v.plate_number !== plateNumber));
  };

  /** Construye el body para POST/PUT de mantenimiento. */
  const buildMaintenancePayload = (formData: MaintenanceFormData) => ({
    plate_number: formData.plate_number,
    description: formData.description.trim(),
    type: formData.type,
    date: formData.date,
    // null solo si no hay dato: así el backend usa el km actual de la unidad.
    kilometers: toNullableNumber(formData.kilometers),
    location: toNullableText(formData.location),
    performed_by: toNullableText(formData.performed_by),
    spare_part_id: toSparePartId(formData.spare_part_id),
    spare_part_description: toNullableText(formData.spare_part_description),
  });

  const notifyNetworkError = (error: unknown, action: "registrar" | "actualizar" | "eliminar") => {
    // La sesión vencida ya la avisa useAuthenticatedFetch.
    if (isSessionExpiredError(error)) return;
    toast({
      title: `Error de red al ${action}`,
      description: "No se pudo conectar con el servidor. Verifica tu conexión o contacta al administrador.",
      variant: "destructive",
    });
  };

  /**
   * Tras crear, editar o borrar, el backend pudo recalcular el M3 de una o dos
   * unidades (si se cambió el vehículo). Se vuelven a pedir las unidades y las
   * alertas para no mostrar el M3 anterior.
   */
  const commitMaintenanceList = async (updatedList: MaintenanceType[]) => {
    setMaintenance(updatedList);
    await reloadVehicles(updatedList); // ya llama fetchAlerts internamente
  };

  const handleMaintenanceError = async (
    response: Response,
    action: "registrar" | "actualizar",
    maintenanceId?: string
  ): Promise<MaintenanceMutationResult> => {
    const { status, rawDetail, message } = await readErrorResponse(response);
    const reason = classifyMaintenanceError(status, rawDetail);
    console.error(`[${action}Maintenance] error status:`, status, "| detail:", rawDetail || message);

    // Otro usuario lo borró: se quita de la lista para que no se pueda volver a editar.
    if (reason === "not_found" && maintenanceId) {
      await commitMaintenanceList(maintenance.filter((m) => m.id !== maintenanceId));
    }

    toast({
      title: getMaintenanceErrorTitle(reason, rawDetail, status, action),
      description:
        reason === "spare_part_missing"
          ? `${message} Se actualizó la lista de repuestos: elige otro o guarda solo la descripción.`
          : message,
      variant: "destructive",
    });

    return { ok: false, reason };
  };

  const createMaintenance = async (formData: MaintenanceFormData): Promise<MaintenanceMutationResult> => {
    const payload = buildMaintenancePayload(formData);
    let response: Response;
    try {
      response = await fetchRef.current(`${API_URL}/api/v1/maintenances/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (networkErr) {
      console.error('[createMaintenance] network/CORS error:', networkErr, '| payload:', payload);
      notifyNetworkError(networkErr, "registrar");
      return { ok: false, reason: "error" };
    }

    if (!response.ok) {
      return handleMaintenanceError(response, "registrar");
    }

    const newMaintenance = await response.json();
    const normalizedNew = normalizeMaintenanceEntries([newMaintenance], vehicles)[0] ?? newMaintenance;
    await commitMaintenanceList([...maintenance, normalizedNew]);
    toast({
      title: "Mantenimiento registrado",
      description: `El mantenimiento ${formData.type.toUpperCase()} ha sido registrado correctamente.`,
    });
    return { ok: true };
  };

  const updateMaintenance = async (
    id: string,
    formData: MaintenanceFormData
  ): Promise<MaintenanceMutationResult> => {
    let response: Response;
    try {
      response = await fetchRef.current(`${API_URL}/api/v1/maintenances/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildMaintenancePayload(formData)),
      });
    } catch (networkErr) {
      console.error('[updateMaintenance] network/CORS error:', networkErr);
      notifyNetworkError(networkErr, "actualizar");
      return { ok: false, reason: "error" };
    }

    if (!response.ok) {
      return handleMaintenanceError(response, "actualizar", id);
    }

    const updated = await response.json();
    const normalizedUpdated = normalizeMaintenanceEntries([updated], vehicles)[0] ?? updated;
    await commitMaintenanceList(maintenance.map(m => m.id === id ? normalizedUpdated : m));
    toast({
      title: "Mantenimiento actualizado",
      description: `El mantenimiento ${formData.type.toUpperCase()} ha sido actualizado.`,
    });
    return { ok: true };
  };

  const deleteMaintenance = async (maintenanceItem: MaintenanceType): Promise<boolean> => {
    let response: Response;
    try {
      response = await fetchRef.current(`${API_URL}/api/v1/maintenances/${encodeURIComponent(maintenanceItem.id)}`, {
        method: "DELETE",
      });
    } catch (error) {
      console.error('Error deleting maintenance:', error);
      notifyNetworkError(error, "eliminar");
      return false;
    }

    const updatedList = maintenance.filter(m => m.id !== maintenanceItem.id);

    if (response.ok) {
      await commitMaintenanceList(updatedList);
      toast({ title: "Mantenimiento eliminado", description: "El registro ha sido eliminado correctamente." });
      return true;
    }

    const { status, message } = await readErrorResponse(response);

    if (status === 404) {
      // Ya no estaba en el backend: el resultado es el mismo que si se hubiera borrado.
      await commitMaintenanceList(updatedList);
      toast({ title: "Mantenimiento no encontrado", description: message });
      return true;
    }

    toast({ title: "Error al eliminar", description: message, variant: "destructive" });
    return false;
  };

  const dismissAlert = (alert: MaintenanceAlert) => {
    const alertKey = getAlertKey(alert);
    // Actualizar localStorage directamente (sin estado de React)
    const current = getDismissedAlerts();
    current.add(alertKey);
    localStorage.setItem(DISMISSED_ALERTS_KEY, JSON.stringify([...current]));
    // Filtrar solo el estado local de alerts sin refetch
    setAlerts(prev => prev.filter(a => getAlertKey(a) !== alertKey));
  };

  /**
   * Crea registros de mantenimiento base para un vehículo recién registrado.
   * Recibe un arreglo de { plate_number, type, kilometers, date } y los envía al backend.
   * Esto evita que el sistema genere decenas de alertas falsas al registrar una unidad
   * con kilómetros existentes sin historial previo.
   */
  const createBaselineMaintenances = async (
    baselines: Array<{
      plate_number: string;
      type: string;
      kilometers: number;
      date: string;
    }>
  ) => {
    const results = await Promise.all(
      baselines.map((b) =>
        fetchRef.current(`${API_URL}/api/v1/maintenances/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plate_number: b.plate_number,
            type: b.type,
            kilometers: b.kilometers,
            date: b.date,
            description: `Baseline inicial — registro de último mantenimiento ${b.type.toUpperCase()} al ingresar la unidad al sistema`,
            location: null,
            performed_by: null,
            spare_part_id: null,
            spare_part_description: null,
          }),
        })
      )
    );

    const allOk = results.every((r) => r.ok);

    if (allOk) {
      // Refrescar alerts para que el backend recalcule desde el nuevo baseline
      await fetchAlerts();
      toast({
        title: "Baseline configurado",
        description: "El historial de mantenimiento inicial ha sido registrado. Las alertas ahora reflejan el estado real del vehículo.",
      });
    } else {
      toast({
        title: "Error parcial en baseline",
        description: "Algunos registros de baseline no se pudieron crear. Revisa los mantenimientos del vehículo.",
        variant: "destructive",
      });
    }

    return allOk;
  };

  return {
    maintenance,
    vehicles,
    alerts,
    isLoadingData,
    refreshVehicles,
    updateVehicleInState,
    removeVehicleFromState,
    createMaintenance,
    updateMaintenance,
    deleteMaintenance,
    fetchAlerts,
    dismissAlert,
    createBaselineMaintenances,
  };
}
