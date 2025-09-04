import { useState, useEffect } from 'react';
import { VehiclePart, PartAlert, Vehicle } from '@/types';
import { useAuthenticatedFetch } from './useAuthenticatedFetch';
import { toast } from 'sonner';

const API_BASE_URL = 'http://localhost:8000';

export const useVehicleParts = () => {
  const [parts, setParts] = useState<VehiclePart[]>([]);
  const [alerts, setAlerts] = useState<PartAlert[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const authenticatedFetch = useAuthenticatedFetch();

  const fetchVehicles = async () => {
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/vehicles/`, {
        method: 'GET',
      });
      if (response.ok) {
        const data = await response.json();
        setVehicles(data);
      }
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      toast.error('Error al cargar vehículos');
    }
  };

  const fetchParts = async (vehiclePlate?: string) => {
    try {
      let url = `${API_BASE_URL}/vehicle_parts/`;
      if (vehiclePlate) {
        url = `${API_BASE_URL}/vehicle_parts/vehicle/${vehiclePlate}`;
      }
      
      const response = await authenticatedFetch(url, {
        method: 'GET',
      });
      
      if (response.ok) {
        const data = await response.json();
        setParts(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching vehicle parts:', error);
      toast.error('Error al cargar partes de vehículos');
    }
  };

  const fetchAlerts = async () => {
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/vehicle_parts/alerts`, {
        method: 'GET',
      });
      
      if (response.ok) {
        const data = await response.json();
        setAlerts(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching part alerts:', error);
      toast.error('Error al cargar alertas de partes');
    }
  };

  const createPart = async (partData: Partial<VehiclePart>) => {
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/vehicle_parts/`, {
        method: 'POST',
        body: JSON.stringify(partData),
      });

      if (response.ok) {
        const newPart = await response.json();
        setParts(prev => [...prev, newPart]);
        toast.success('Parte agregada exitosamente');
        return newPart;
      } else {
        const error = await response.json();
        throw new Error(error.detail || 'Error al crear parte');
      }
    } catch (error) {
      console.error('Error creating part:', error);
      toast.error(error instanceof Error ? error.message : 'Error al crear parte');
      throw error;
    }
  };

  const updatePart = async (partId: string, partData: Partial<VehiclePart>) => {
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/vehicle_parts/${partId}`, {
        method: 'PUT',
        body: JSON.stringify(partData),
      });

      if (response.ok) {
        const updatedPart = await response.json();
        setParts(prev => prev.map(p => p.id === partId ? updatedPart : p));
        toast.success('Parte actualizada exitosamente');
        return updatedPart;
      } else {
        const error = await response.json();
        throw new Error(error.detail || 'Error al actualizar parte');
      }
    } catch (error) {
      console.error('Error updating part:', error);
      toast.error(error instanceof Error ? error.message : 'Error al actualizar parte');
      throw error;
    }
  };

  const deletePart = async (part: VehiclePart) => {
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/vehicle_parts/${part.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setParts(prev => prev.filter(p => p.id !== part.id));
        toast.success('Parte eliminada exitosamente');
      } else {
        const error = await response.json();
        throw new Error(error.detail || 'Error al eliminar parte');
      }
    } catch (error) {
      console.error('Error deleting part:', error);
      toast.error(error instanceof Error ? error.message : 'Error al eliminar parte');
      throw error;
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([
        fetchVehicles(),
        fetchParts(),
        fetchAlerts()
      ]);
      setIsLoading(false);
    };

    loadData();
  }, []);

  return {
    parts,
    alerts,
    vehicles,
    isLoading,
    fetchParts,
    createPart,
    updatePart,
    deletePart,
    refreshAlerts: fetchAlerts,
  };
};