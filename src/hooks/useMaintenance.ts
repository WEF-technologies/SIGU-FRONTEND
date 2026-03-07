import { useState, useEffect, useRef, useCallback } from "react";
import { Maintenance as MaintenanceType, Vehicle, MaintenanceAlert } from "@/types";
import { useAuthenticatedFetch } from "@/hooks/useAuthenticatedFetch";
import { useToast } from "@/hooks/use-toast";

const API_URL = import.meta.env.VITE_API_URL || "https://sigu-back.vercel.app";

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

  const fetchAlerts = useCallback(async () => {
    try {
      const response = await fetchRef.current(`${API_URL}/api/v1/maintenances/alerts`);
      if (response.ok) {
        const alertsData = await response.json();
        const dismissed = getDismissedAlerts();
        const filteredAlerts = Array.isArray(alertsData)
          ? alertsData.filter(alert => !dismissed.has(`${alert.vehicle_plate}-${alert.type}`))
          : [];
        setAlerts(filteredAlerts);
      } else {
        setAlerts([]);
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
      setAlerts([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // fetchRef es estable; getDismissedAlerts lee localStorage directamente

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
        console.log('Vehicles response status:', vehiclesResponse.status);
        if (vehiclesResponse.ok) {
          const vehiclesData = await vehiclesResponse.json();
          const mappedVehicles = vehiclesData.map((vehicle: any) => ({
            ...vehicle,
            current_kilometers: vehicle.kilometers || vehicle.current_kilometers || 0,
            next_m3_kilometers: vehicle.next_m3_kilometers,
            last_m3_date: vehicle.last_m3_date,
            last_m3_kilometers: vehicle.last_m3_kilometers
          }));

          setVehicles(Array.isArray(mappedVehicles) ? mappedVehicles : []);
        } else {
          setVehicles([]);
        }

        await fetchAlerts();
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

  const mapVehicle = (vehicle: any) => ({
    ...vehicle,
    current_kilometers: vehicle.kilometers || vehicle.current_kilometers || 0,
    next_m3_kilometers: vehicle.next_m3_kilometers,
    last_m3_date: vehicle.last_m3_date,
    last_m3_kilometers: vehicle.last_m3_kilometers,
  });

  const refreshVehicles = async () => {
    try {
      const vehiclesResponse = await fetchRef.current(`${API_URL}/api/v1/vehicles/`);
      if (vehiclesResponse.ok) {
        const vehiclesData = await vehiclesResponse.json();
        setVehicles(Array.isArray(vehiclesData) ? vehiclesData.map(mapVehicle) : []);
      } else {
        setVehicles([]);
      }
    } catch (error) {
      console.error('Error refreshing vehicles:', error);
      setVehicles([]);
    }
  };

  const updateVehicleInState = (updatedVehicle: any) => {
    try {
      const mapped = mapVehicle(updatedVehicle);
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

  const createMaintenance = async (formData: any) => {
    const submitData = {
      plate_number: formData.plate_number,
      description: formData.description,
      type: formData.type,
      date: formData.date,
      kilometers: formData.kilometers || null,
      location: formData.location || null,
      performed_by: formData.performed_by || null,
      spare_part_id: formData.spare_part_id || null,
      spare_part_description: formData.spare_part_description || null
    };

    const response = await fetchRef.current(`${API_URL}/api/v1/maintenances/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(submitData),
    });
    
    if (response.ok) {
      const newMaintenance = await response.json();
      setMaintenance([...maintenance, newMaintenance]);

      const vehiclesResponse = await fetchRef.current(`${API_URL}/api/v1/vehicles/`);
      if (vehiclesResponse.ok) {
        const vehiclesData = await vehiclesResponse.json();
        setVehicles(Array.isArray(vehiclesData) ? vehiclesData.map(mapVehicle) : []);
      }
      
      await fetchAlerts();
      
      toast({
        title: "Mantenimiento registrado",
        description: `El mantenimiento ${formData.type} ha sido registrado correctamente.`,
      });
      return true;
    } else {
      toast({ title: "Error", description: "Error al crear el mantenimiento.", variant: "destructive" });
      return false;
    }
  };

  const updateMaintenance = async (id: string, formData: any) => {
    const submitData = {
      plate_number: formData.plate_number,
      description: formData.description,
      type: formData.type,
      date: formData.date,
      kilometers: formData.kilometers || null,
      location: formData.location || null,
      performed_by: formData.performed_by || null,
      spare_part_id: formData.spare_part_id || null,
      spare_part_description: formData.spare_part_description || null
    };

    const response = await fetchRef.current(`${API_URL}/api/v1/maintenances/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(submitData),
    });

    if (response.ok) {
      const updated = await response.json();
      setMaintenance(maintenance.map(m => m.id === id ? updated : m));

      const vehiclesResponse = await fetchRef.current(`${API_URL}/api/v1/vehicles/`);
      if (vehiclesResponse.ok) {
        const vehiclesData = await vehiclesResponse.json();
        setVehicles(Array.isArray(vehiclesData) ? vehiclesData.map(mapVehicle) : []);
      }

      await fetchAlerts();
      toast({ title: "Mantenimiento actualizado", description: `El mantenimiento ${formData.type} ha sido actualizado.` });
      return true;
    } else {
      toast({ title: "Error", description: "Error al actualizar el mantenimiento.", variant: "destructive" });
      return false;
    }
  };

  const deleteMaintenance = async (maintenanceItem: MaintenanceType) => {
    try {
      const response = await fetchRef.current(`${API_URL}/api/v1/maintenances/${maintenanceItem.id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setMaintenance(maintenance.filter(m => m.id !== maintenanceItem.id));

        const vehiclesResponse = await fetchRef.current(`${API_URL}/api/v1/vehicles/`);
        if (vehiclesResponse.ok) {
          const vehiclesData = await vehiclesResponse.json();
          setVehicles(Array.isArray(vehiclesData) ? vehiclesData.map(mapVehicle) : []);
        }

        await fetchAlerts();
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
