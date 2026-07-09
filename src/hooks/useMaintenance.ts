import { useState, useEffect, useRef, useCallback } from "react";
import { Maintenance as MaintenanceType, Vehicle, MaintenanceAlert } from "@/types";
import { useAuthenticatedFetch } from "@/hooks/useAuthenticatedFetch";
import { useToast } from "@/hooks/use-toast";
import { localizeApiErrorPayload } from "@/lib/errorI18n";

const API_URL = import.meta.env.VITE_API_URL ?? "";
const M3_INTERVAL_KM = 5000;
const MAINTENANCE_PAGE_SIZE = 200;
const MAX_MAINTENANCE_PAGES = 40;

const extractMaintenanceItems = (payload: any): any[] => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.maintenances)) return payload.maintenances;
  return [];
};

const resolveMaintenancePlate = (entry: any, vehiclesById: Map<string, any>) => {
  return (
    entry?.vehicle_plate ||
    entry?.plate_number ||
    entry?.vehicle?.plate_number ||
    (entry?.vehicle_id ? vehiclesById.get(entry.vehicle_id)?.plate_number : undefined) ||
    undefined
  );
};

const normalizeMaintenanceEntries = (entries: any[], vehiclesPool: any[]): MaintenanceType[] => {
  const vehiclesById = new Map(
    (Array.isArray(vehiclesPool) ? vehiclesPool : []).map((vehicle) => [vehicle.id, vehicle])
  );

  return entries.map((entry) => {
    const resolvedPlate = resolveMaintenancePlate(entry, vehiclesById);
    return {
      ...entry,
      vehicle_plate: resolvedPlate ?? entry?.vehicle_plate,
    } as MaintenanceType;
  });
};

const buildMaintenancePageUrl = (page: number) =>
  `${API_URL}/api/v1/maintenances/?all=true&page=${page}&limit=${MAINTENANCE_PAGE_SIZE}&page_size=${MAINTENANCE_PAGE_SIZE}&per_page=${MAINTENANCE_PAGE_SIZE}&size=${MAINTENANCE_PAGE_SIZE}`;

/**
 * Enriquece un vehículo con datos de M3. El backend mantiene last_m3_date y
 * next_m3_kilometers automáticamente al registrar mantenimientos tipo "m3",
 * por lo que se usan como fuente primaria. Se calculan desde el historial
 * local sólo como fallback cuando el backend devuelve null.
 */
function enrichWithM3(vehicle: any, maintenances: MaintenanceType[]) {
  const vehicleMaintenances = maintenances.filter(
    (m) => m.vehicle_plate === vehicle.plate_number || m.vehicle_id === vehicle.id
  );
  const maxMaintenanceKm = Math.max(
    0,
    ...vehicleMaintenances.map((m) => m.kilometers ?? 0)
  );

  // Fallback: último M3 por mayor kilometraje (y fecha descendente como desempate)
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
    last_m3_kilometers: vehicle.last_m3_kilometers ?? lastM3?.kilometers ?? null,
    next_m3_kilometers:
      vehicle.next_m3_kilometers ??
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
  const getDismissedAlerts = (): Set<string> =>
    new Set(JSON.parse(localStorage.getItem('dismissedMaintenanceAlerts') || '[]'));

  /**
   * Calcula alertas M3 vencidas o próximas directamente desde los vehículos
   * enriquecidos. Esto garantiza que siempre se muestren aunque el backend
   * no las devuelva o hayan sido descartadas previamente en localStorage.
   */
  // Umbral "near" alineado con el backend (near_threshold default = 500 km)
  const M3_NEAR_THRESHOLD = 500;
  const M3_INTERVAL = M3_INTERVAL_KM;

  const computeLocalM3Alerts = (enrichedVehicles: Vehicle[]): MaintenanceAlert[] => {
    return enrichedVehicles.flatMap((v) => {
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
    const seen = new Set(local.map((a) => `${a.vehicle_plate}-${a.type}`));
    const deduped = backend.filter((a) => !seen.has(`${a.vehicle_plate}-${a.type}`));
    return [...local, ...deduped];
  };

  const fetchMaintenanceRecords = useCallback(async (vehiclesData: any[]): Promise<MaintenanceType[]> => {
    try {
      const allItems: MaintenanceType[] = [];
      const seenKeys = new Set<string>();
      let nextUrl: string | null = buildMaintenancePageUrl(1);
      let currentPage = 1;

      while (nextUrl && currentPage <= MAX_MAINTENANCE_PAGES) {
        const response = await fetchRef.current(nextUrl);

        if (!response.ok) {
          if (currentPage === 1) {
            const fallbackResponse = await fetchRef.current(`${API_URL}/api/v1/maintenances/`);
            if (!fallbackResponse.ok) return [];

            const fallbackPayload = await fallbackResponse.json();
            return normalizeMaintenanceEntries(extractMaintenanceItems(fallbackPayload), vehiclesData);
          }
          break;
        }

        const payload = await response.json();
        const pageItems = normalizeMaintenanceEntries(extractMaintenanceItems(payload), vehiclesData);

        if (pageItems.length === 0) break;

        let added = 0;
        for (const item of pageItems) {
          const dedupeKey =
            item.id || `${item.vehicle_id}-${item.date}-${item.type}-${item.kilometers ?? "na"}`;

          if (seenKeys.has(dedupeKey)) continue;

          seenKeys.add(dedupeKey);
          allItems.push(item);
          added += 1;
        }

        const nextFromPayload =
          typeof (payload as any)?.next === "string" && (payload as any).next.length > 0
            ? (payload as any).next
            : null;

        if (nextFromPayload) {
          nextUrl = nextFromPayload;
          currentPage += 1;
          continue;
        }

        const totalPages =
          Number((payload as any)?.total_pages) ||
          Number((payload as any)?.pages) ||
          Number((payload as any)?.last_page) ||
          null;

        if (totalPages && currentPage < totalPages) {
          currentPage += 1;
          nextUrl = buildMaintenancePageUrl(currentPage);
          continue;
        }

        if (pageItems.length >= MAINTENANCE_PAGE_SIZE && added > 0) {
          currentPage += 1;
          nextUrl = buildMaintenancePageUrl(currentPage);
          continue;
        }

        nextUrl = null;
      }

      return allItems;
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
        backendAlerts = Array.isArray(alertsData)
          ? alertsData.filter(a => !dismissed.has(`${a.vehicle_plate}-${a.type}`))
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
  const buildMaintenancePayload = (formData: any) => ({
    plate_number: formData.plate_number,
    description: formData.description,
    type: formData.type,
    date: formData.date,
    kilometers: formData.kilometers || null,
    location: formData.location || null,
    performed_by: formData.performed_by || null,
    spare_part_id: formData.spare_part_id && formData.spare_part_id !== "none" ? formData.spare_part_id : null,
    spare_part_description: formData.spare_part_description || null,
  });

  /** Extrae el mensaje de error legible de una respuesta HTTP fallida. */
  const extractErrorMessage = async (response: Response): Promise<string> => {
    const fallback = `No se pudo completar la solicitud (${response.status}).`;

    try {
      const body = await response.json();
      return localizeApiErrorPayload(body, fallback);
    } catch {
      return fallback;
    }
  };

  const createMaintenance = async (formData: any) => {
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
      toast({
        title: "Error de red al registrar",
        description: "No se pudo conectar con el servidor. Verifica tu conexión o contacta al administrador.",
        variant: "destructive",
      });
      return false;
    }

    if (response.ok) {
      const newMaintenance = await response.json();
      const normalizedNew = normalizeMaintenanceEntries([newMaintenance], vehicles)[0] ?? newMaintenance;
      const updatedList = [...maintenance, normalizedNew];
      setMaintenance(updatedList);
      await reloadVehicles(updatedList);
      toast({
        title: "Mantenimiento registrado",
        description: `El mantenimiento ${formData.type} ha sido registrado correctamente.`,
      });
      return true;
    } else {
      const msg = await extractErrorMessage(response);
      console.error('[createMaintenance] error status:', response.status, '| detail:', msg, '| payload:', payload);
      toast({
        title: response.status === 400 || response.status === 422 ? "Validación de kilometraje" : `Error ${response.status} al registrar`,
        description: msg,
        variant: "destructive",
      });
      return false;
    }
  };

  const updateMaintenance = async (id: string, formData: any) => {
    const response = await fetchRef.current(`${API_URL}/api/v1/maintenances/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildMaintenancePayload(formData)),
    });

    if (response.ok) {
      const updated = await response.json();
      const normalizedUpdated = normalizeMaintenanceEntries([updated], vehicles)[0] ?? updated;
      const updatedList = maintenance.map(m => m.id === id ? normalizedUpdated : m);
      setMaintenance(updatedList);
      await reloadVehicles(updatedList); // ya llama fetchAlerts internamente
      toast({ title: "Mantenimiento actualizado", description: `El mantenimiento ${formData.type} ha sido actualizado.` });
      return true;
    } else {
      const msg = await extractErrorMessage(response);
      console.error("Error al actualizar mantenimiento:", msg);
      toast({
        title: response.status === 400 || response.status === 422 ? "Validación de kilometraje" : "Error al actualizar",
        description: msg,
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteMaintenance = async (maintenanceItem: MaintenanceType) => {
    try {
      const response = await fetchRef.current(`${API_URL}/api/v1/maintenances/${maintenanceItem.id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        const updatedList = maintenance.filter(m => m.id !== maintenanceItem.id);
        setMaintenance(updatedList);
        await reloadVehicles(updatedList); // ya llama fetchAlerts internamente
        toast({ title: "Mantenimiento eliminado", description: "El registro ha sido eliminado correctamente." });
      }
    } catch (error) {
      console.error('Error deleting maintenance:', error);
    }
  };

  const dismissAlert = (alert: MaintenanceAlert) => {
    const alertKey = `${alert.vehicle_plate}-${alert.type}`;
    // Actualizar localStorage directamente (sin estado de React)
    const current = getDismissedAlerts();
    current.add(alertKey);
    localStorage.setItem('dismissedMaintenanceAlerts', JSON.stringify([...current]));
    // Filtrar solo el estado local de alerts sin refetch
    setAlerts(prev => prev.filter(a => `${a.vehicle_plate}-${a.type}` !== alertKey));
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
