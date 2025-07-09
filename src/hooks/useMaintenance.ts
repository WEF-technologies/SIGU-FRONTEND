
import { useState, useEffect } from "react";
import { Maintenance as MaintenanceType, Vehicle } from "@/types";
import { useAuthenticatedFetch } from "@/hooks/useAuthenticatedFetch";
import { useToast } from "@/hooks/use-toast";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export function useMaintenance() {
  const { toast } = useToast();
  const authenticatedFetch = useAuthenticatedFetch();
  const [maintenance, setMaintenance] = useState<MaintenanceType[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  // Función para calcular los datos M3 de un vehículo
  const calculateM3Data = (vehicle: Vehicle, maintenanceHistory: MaintenanceType[]) => {
    const vehicleMaintenances = maintenanceHistory.filter(m => m.vehicle_plate === vehicle.plate_number);
    const m3Maintenances = vehicleMaintenances.filter(m => m.type === 'M3').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    const lastM3 = m3Maintenances[0];
    const lastM3Date = lastM3 ? lastM3.date : null;
    const lastM3Km = lastM3 ? lastM3.kilometers || 0 : 0;
    
    // Calcular próximo M3 (cada 10,000 km después del último M3)
    const nextM3Km = lastM3Km + 10000;
    
    return {
      last_m3_date: lastM3Date,
      last_m3_km: lastM3Km,
      next_m3_km: nextM3Km
    };
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

        // Fetch vehicles
        const vehiclesResponse = await authenticatedFetch(`${API_URL}/api/v1/vehicles/`);
        console.log('Vehicles response status:', vehiclesResponse.status);
        if (vehiclesResponse.ok) {
          const vehiclesData = await vehiclesResponse.json();
          console.log('Vehicles data received:', vehiclesData);
          
          // Enriquecer vehículos con datos M3 calculados
          const enrichedVehicles = vehiclesData.map((vehicle: Vehicle) => {
            const m3Data = calculateM3Data(vehicle, maintenanceData);
            return {
              ...vehicle,
              ...m3Data
            };
          });
          
          setVehicles(Array.isArray(enrichedVehicles) ? enrichedVehicles : []);
        } else {
          console.log('Vehicles fetch failed:', vehiclesResponse.status);
          setVehicles([]);
        }
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
      next_maintenance_km: formData.next_maintenance_km || null,
      location: formData.location || null,
      performed_by: formData.performed_by || null
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
      setMaintenance(prev => [...prev, newMaintenance]);
      
      // Recalcular datos M3 para todos los vehículos
      const updatedMaintenanceList = [...maintenance, newMaintenance];
      setVehicles(prev => prev.map(vehicle => {
        const m3Data = calculateM3Data(vehicle, updatedMaintenanceList);
        return { ...vehicle, ...m3Data };
      }));
      
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
      next_maintenance_km: formData.next_maintenance_km || null,
      location: formData.location || null,
      performed_by: formData.performed_by || null
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
      setMaintenance(prev => prev.map(m => m.id === id ? updated : m));
      
      // Recalcular datos M3 para todos los vehículos
      const updatedMaintenanceList = maintenance.map(m => m.id === id ? updated : m);
      setVehicles(prev => prev.map(vehicle => {
        const m3Data = calculateM3Data(vehicle, updatedMaintenanceList);
        return { ...vehicle, ...m3Data };
      }));
      
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
        setMaintenance(prev => prev.filter(m => m.id !== maintenanceItem.id));
        
        // Recalcular datos M3 para todos los vehículos
        const updatedMaintenanceList = maintenance.filter(m => m.id !== maintenanceItem.id);
        setVehicles(prev => prev.map(vehicle => {
          const m3Data = calculateM3Data(vehicle, updatedMaintenanceList);
          return { ...vehicle, ...m3Data };
        }));
        
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
    createMaintenance,
    updateMaintenance,
    deleteMaintenance,
    calculateM3Data
  };
}
