import { useState, useEffect } from "react";
import { Maintenance as MaintenanceType, Vehicle, MaintenanceAlert } from "@/types";
import { useAuthenticatedFetch } from "@/hooks/useAuthenticatedFetch";
import { useToast } from "@/hooks/use-toast";

const API_URL = import.meta.env.VITE_API_URL || "https://sigu-back.vercel.app";

export function useMaintenance() {
  const { toast } = useToast();
  const authenticatedFetch = useAuthenticatedFetch();
  const [maintenance, setMaintenance] = useState<MaintenanceType[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [alerts, setAlerts] = useState<MaintenanceAlert[]>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(
    () => new Set(JSON.parse(localStorage.getItem('dismissedMaintenanceAlerts') || '[]'))
  );

  const fetchAlerts = async () => {
    try {
      const response = await authenticatedFetch(`${API_URL}/api/v1/maintenances/alerts`);
      if (response.ok) {
        const alertsData = await response.json();
        const filteredAlerts = Array.isArray(alertsData) 
          ? alertsData.filter(alert => !dismissedAlerts.has(`${alert.vehicle_plate}-${alert.type}`))
          : [];
        setAlerts(filteredAlerts);
      } else {
        setAlerts([]);
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
      setAlerts([]);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Fetching maintenance data...');
        const maintenanceResponse = await authenticatedFetch(`${API_URL}/api/v1/maintenances/`);
        console.log('Maintenance response status:', maintenanceResponse.status);
        let maintenanceData: MaintenanceType[] = [];
        if (maintenanceResponse.ok) {
          maintenanceData = await maintenanceResponse.json();
          console.log('Maintenance data received:', maintenanceData);
          setMaintenance(Array.isArray(maintenanceData) ? maintenanceData : []);
        } else {
          console.log('Maintenance fetch failed:', maintenanceResponse.status);
          setMaintenance([]);
        }

        console.log('Fetching vehicles data...');
        const vehiclesResponse = await authenticatedFetch(`${API_URL}/api/v1/vehicles/`);
        console.log('Vehicles response status:', vehiclesResponse.status);
        if (vehiclesResponse.ok) {
          const vehiclesData = await vehiclesResponse.json();
          console.log('Vehicles data received:', vehiclesData);
          
          const mappedVehicles = vehiclesData.map((vehicle: any) => ({
            ...vehicle,
            current_kilometers: vehicle.kilometers || vehicle.current_kilometers || 0,
            // Preservar todos los campos calculados del backend
            next_m3_kilometers: vehicle.next_m3_kilometers,
            last_m3_date: vehicle.last_m3_date,
            last_m3_kilometers: vehicle.last_m3_kilometers
          }));
          
          setVehicles(Array.isArray(mappedVehicles) ? mappedVehicles : []);
        } else {
          console.log('Vehicles fetch failed:', vehiclesResponse.status);
          setVehicles([]);
        }

        // Fetch maintenance alerts
        await fetchAlerts();
      } catch (error) {
        console.error('Error fetching data:', error);
        setMaintenance([]);
        setVehicles([]);
      }
    };

    fetchData();
  }, [authenticatedFetch, dismissedAlerts]);

  // Expose a function to refresh vehicles (useful to avoid full page reloads)
  const refreshVehicles = async () => {
    try {
      const vehiclesResponse = await authenticatedFetch(`${API_URL}/api/v1/vehicles/`);
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
    } catch (error) {
      console.error('Error refreshing vehicles:', error);
      setVehicles([]);
    }
  };

  // Update or insert a single vehicle in the local state (used after PUT/POST responses)
  const updateVehicleInState = (updatedVehicle: any) => {
    try {
      const mapped = {
        ...updatedVehicle,
        current_kilometers: updatedVehicle.kilometers || updatedVehicle.current_kilometers || 0,
        next_m3_kilometers: updatedVehicle.next_m3_kilometers,
        last_m3_date: updatedVehicle.last_m3_date,
        last_m3_kilometers: updatedVehicle.last_m3_kilometers
      };

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

    console.log('Submitting maintenance data:', submitData);

    const response = await authenticatedFetch(`${API_URL}/api/v1/maintenances/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(submitData),
    });
    
    console.log('POST response status:', response.status);
    
    if (response.ok) {
      const newMaintenance = await response.json();
      console.log('Created maintenance:', newMaintenance);
      
      setMaintenance([...maintenance, newMaintenance]);
      
      // Refresh vehicles and alerts
      const vehiclesResponse = await authenticatedFetch(`${API_URL}/api/v1/vehicles/`);
      if (vehiclesResponse.ok) {
        const vehiclesData = await vehiclesResponse.json();
        const mappedVehicles = vehiclesData.map((vehicle: any) => ({
          ...vehicle,
          current_kilometers: vehicle.kilometers || vehicle.current_kilometers || 0,
          next_m3_kilometers: vehicle.next_m3_kilometers,
          last_m3_date: vehicle.last_m3_date,
          last_m3_kilometers: vehicle.last_m3_kilometers
        }));
        setVehicles(mappedVehicles);
      }
      
      await fetchAlerts();
      
      toast({
        title: "Mantenimiento registrado",
        description: `El mantenimiento ${formData.type} ha sido registrado correctamente.`,
      });
      return true;
    } else {
      const errorData = await response.text();
      console.error('POST error response:', errorData);
      toast({
        title: "Error",
        description: "Error al crear el mantenimiento.",
        variant: "destructive"
      });
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

    console.log('Updating maintenance data:', submitData);

    const response = await authenticatedFetch(`${API_URL}/api/v1/maintenances/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(submitData),
    });
    
    console.log('PUT response status:', response.status);
    
    if (response.ok) {
      const updated = await response.json();
      console.log('Updated maintenance:', updated);
      
      setMaintenance(maintenance.map(m => m.id === id ? updated : m));
      
      // Refresh vehicles and alerts
      const vehiclesResponse = await authenticatedFetch(`${API_URL}/api/v1/vehicles/`);
      if (vehiclesResponse.ok) {
        const vehiclesData = await vehiclesResponse.json();
        const mappedVehicles = vehiclesData.map((vehicle: any) => ({
          ...vehicle,
          current_kilometers: vehicle.kilometers || vehicle.current_kilometers || 0,
          next_m3_kilometers: vehicle.next_m3_kilometers,
          last_m3_date: vehicle.last_m3_date,
          last_m3_kilometers: vehicle.last_m3_kilometers
        }));
        setVehicles(mappedVehicles);
      }
      
      await fetchAlerts();
      
      toast({
        title: "Mantenimiento actualizado",
        description: `El mantenimiento ${formData.type} ha sido actualizado correctamente.`,
      });
      return true;
    } else {
      const errorData = await response.text();
      console.error('PUT error response:', errorData);
      toast({
        title: "Error",
        description: "Error al actualizar el mantenimiento.",
        variant: "destructive"
      });
      return false;
    }
  };

  const deleteMaintenance = async (maintenanceItem: MaintenanceType) => {
    try {
      const response = await authenticatedFetch(`${API_URL}/api/v1/maintenances/${maintenanceItem.id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setMaintenance(maintenance.filter(m => m.id !== maintenanceItem.id));
        
        // Refresh vehicles and alerts
        const vehiclesResponse = await authenticatedFetch(`${API_URL}/api/v1/vehicles/`);
        if (vehiclesResponse.ok) {
          const vehiclesData = await vehiclesResponse.json();
        const mappedVehicles = vehiclesData.map((vehicle: any) => ({
          ...vehicle,
          current_kilometers: vehicle.kilometers || vehicle.current_kilometers || 0,
          next_m3_kilometers: vehicle.next_m3_kilometers,
          last_m3_date: vehicle.last_m3_date,
          last_m3_kilometers: vehicle.last_m3_kilometers
        }));
        setVehicles(mappedVehicles);
      }
      
      await fetchAlerts();
        
        toast({
          title: "Mantenimiento eliminado",
          description: "El registro de mantenimiento ha sido eliminado correctamente.",
        });
      }
    } catch (error) {
      console.error('Error deleting maintenance:', error);
    }
  };

  const dismissAlert = (alert: MaintenanceAlert) => {
    const alertKey = `${alert.vehicle_plate}-${alert.type}`;
    const newDismissedAlerts = new Set(dismissedAlerts);
    newDismissedAlerts.add(alertKey);
    setDismissedAlerts(newDismissedAlerts);
    localStorage.setItem('dismissedMaintenanceAlerts', JSON.stringify([...newDismissedAlerts]));
    setAlerts(alerts.filter(a => `${a.vehicle_plate}-${a.type}` !== alertKey));
  };

  return {
    maintenance,
    vehicles,
    alerts,
    refreshVehicles,
    updateVehicleInState,
    createMaintenance,
    updateMaintenance,
    deleteMaintenance,
    fetchAlerts,
    dismissAlert
  };
}
