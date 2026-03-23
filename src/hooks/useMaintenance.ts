import { useState, useEffect, useRef, useCallback } from "react";
import { Maintenance as MaintenanceType, Vehicle, MaintenanceAlert } from "@/types";
import { useAuthenticatedFetch } from "@/hooks/useAuthenticatedFetch";
import { useToast } from "@/hooks/use-toast";

const API_URL = import.meta.env.VITE_API_URL || "https://sigu-back.vercel.app";

/**
 * Enriquece un vehículo con los datos de M3 calculados a partir del historial
 * de mantenimiento ya disponible. Garantiza que "Último M3" y "Próximo M3"
 * sean siempre consistentes con los registros reales.
 */
function enrichWithM3(vehicle: any, maintenances: MaintenanceType[]) {
  const m3List = maintenances
    .filter((m) => m.vehicle_plate === vehicle.plate_number && m.type === "m3")
    .sort((a, b) => (b.kilometers ?? 0) - (a.kilometers ?? 0));
  const lastM3 = m3List[0];
  return {
    ...vehicle,
    current_kilometers: vehicle.kilometers || vehicle.current_kilometers || 0,
    last_m3_date: vehicle.last_m3_date ?? lastM3?.date ?? null,
    last_m3_kilometers: vehicle.last_m3_kilometers ?? lastM3?.kilometers ?? null,
    next_m3_kilometers:
      vehicle.next_m3_kilometers ??
      (lastM3?.kilometers != null ? lastM3.kilometers + 7000 : null),
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
  const computeLocalM3Alerts = (enrichedVehicles: Vehicle[]): MaintenanceAlert[] => {
    return enrichedVehicles.flatMap((v) => {
      const effectiveKm = Math.max(
        v.current_kilometers || (v as any).kilometers || 0,
        v.last_m3_kilometers || 0
      );
      const nextM3Km = v.next_m3_kilometers;
      if (!effectiveKm || !nextM3Km) return [];
      const remaining = nextM3Km - effectiveKm;
      const M3_INTERVAL = 7000;
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
      // Próximo: menos del 15% del intervalo restante
      if (remaining <= M3_INTERVAL * 0.15) {
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
    const fetchData = async () => {
      try {
        const maintenanceResponse = await fetchRef.current(`${API_URL}/api/v1/maintenances/`);
        let maintenanceData: MaintenanceType[] = [];
        if (maintenanceResponse.ok) {
          maintenanceData = await maintenanceResponse.json();
          setMaintenance(Array.isArray(maintenanceData) ? maintenanceData : []);
        } else {
          setMaintenance([]);
        }

        const vehiclesResponse = await fetchRef.current(`${API_URL}/api/v1/vehicles/`);
        if (vehiclesResponse.ok) {
          const vehiclesData = await vehiclesResponse.json();
          // Enriquecer con M3 usando los datos de mantenimiento recién cargados
          const mapped = (Array.isArray(vehiclesData) ? vehiclesData : []).map(
            (v: any) => enrichWithM3(v, maintenanceData)
          );
          setVehicles(mapped);
          await fetchAlerts(mapped);
        } else {
          setVehicles([]);
          await fetchAlerts([]);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setMaintenance([]);
        setVehicles([]);
      }
    };

    fetchData();
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

  /** Construye el body para POST/PUT de mantenimiento. Envía tanto plate_number
   *  como vehicle_plate para cubrir distintas versiones del backend. */
  const buildMaintenancePayload = (formData: any) => ({
    plate_number: formData.plate_number,
    vehicle_plate: formData.plate_number,  // alias que puede esperar el backend
    description: formData.description,
    type: formData.type,
    date: formData.date,
    kilometers: formData.kilometers || null,
    location: formData.location || null,
    performed_by: formData.performed_by || null,
    spare_part_id: formData.spare_part_id || null,
    spare_part_description: formData.spare_part_description || null,
  });

  /** Extrae el mensaje de error legible de una respuesta HTTP fallida. */
  const extractErrorMessage = async (response: Response): Promise<string> => {
    try {
      const body = await response.json();
      return body.detail ?? body.message ?? body.error ?? JSON.stringify(body);
    } catch {
      return `Error ${response.status}`;
    }
  };

  const createMaintenance = async (formData: any) => {
    const response = await fetchRef.current(`${API_URL}/api/v1/maintenances/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildMaintenancePayload(formData)),
    });

    if (response.ok) {
      const newMaintenance = await response.json();
      const updatedList = [...maintenance, newMaintenance];
      setMaintenance(updatedList);
      await reloadVehicles(updatedList);
      toast({
        title: "Mantenimiento registrado",
        description: `El mantenimiento ${formData.type} ha sido registrado correctamente.`,
      });
      return true;
    } else {
      const msg = await extractErrorMessage(response);
      console.error("Error al crear mantenimiento:", msg);
      toast({ title: "Error al registrar", description: msg, variant: "destructive" });
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
      const updatedList = maintenance.map(m => m.id === id ? updated : m);
      setMaintenance(updatedList);
      await reloadVehicles(updatedList); // ya llama fetchAlerts internamente
      toast({ title: "Mantenimiento actualizado", description: `El mantenimiento ${formData.type} ha sido actualizado.` });
      return true;
    } else {
      const msg = await extractErrorMessage(response);
      console.error("Error al actualizar mantenimiento:", msg);
      toast({ title: "Error al actualizar", description: msg, variant: "destructive" });
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
