import { useState, useEffect } from "react";
import { Maintenance as MaintenanceType, Vehicle, MaintenanceAlert } from "@/types";
import { useAuthenticatedFetch } from "@/hooks/useAuthenticatedFetch";
import { useToast } from "@/hooks/use-toast";

const API_URL = import.meta.env.VITE_API_URL || "https://sigu-back-e39xv5vbt-enmanuelalxs-projects.vercel.app";

export function useMaintenance() {
  const { toast } = useToast();
  const authenticatedFetch = useAuthenticatedFetch();
  const [maintenance, setMaintenance] = useState<MaintenanceType[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [alerts, setAlerts] = useState<MaintenanceAlert[]>([]);

  const fetchAlerts = async () => {
    try {
      const response = await authenticatedFetch(`${API_URL}/api/v1/maintenances/alerts`);
      if (response.ok) {
        const alertsData = await response.json();
        setAlerts(Array.isArray(alertsData) ? alertsData : []);
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
            current_kilometers: vehicle.kilometers || 0
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
  }, [authenticatedFetch]);

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
          current_kilometers: vehicle.kilometers || 0
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
          current_kilometers: vehicle.kilometers || 0
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
            current_kilometers: vehicle.kilometers || 0
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

  return {
    maintenance,
    vehicles,
    alerts,
    createMaintenance,
    updateMaintenance,
    deleteMaintenance,
    fetchAlerts
  };
}
