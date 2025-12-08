
import { useState, useEffect } from "react";
import { DataTable } from "@/components/shared/DataTable";
import { FormModal } from "@/components/shared/FormModal";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trip, Route, Vehicle, Driver } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useAuthenticatedFetch } from "@/hooks/useAuthenticatedFetch";
import { Plus, MapPin, User, Car } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "https://sigu-back.vercel.app";

export default function Trips() {
  const { toast } = useToast();
  const authenticatedFetch = useAuthenticatedFetch();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [formData, setFormData] = useState({
    route_id: "",
    vehicle_id: "",
    driver_id: "",
    start_date: "",
    end_date: "",
    status: "in_progress" as Trip['status'],
    observations: ""
  });

  // Cargar datos desde el backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tripsRes, routesRes, vehiclesRes, driversRes] = await Promise.all([
          authenticatedFetch(`${API_URL}/api/v1/trips/`),
          authenticatedFetch(`${API_URL}/api/v1/routes/`),
          authenticatedFetch(`${API_URL}/api/v1/vehicles/`),
          authenticatedFetch(`${API_URL}/api/v1/drivers/`)
        ]);

        if (tripsRes.ok) {
          const tripsData = await tripsRes.json();
          setTrips(Array.isArray(tripsData) ? tripsData : []);
        }

        if (routesRes.ok) {
          const routesData = await routesRes.json();
          setRoutes(Array.isArray(routesData) ? routesData : []);
        }

        if (vehiclesRes.ok) {
          const vehiclesData = await vehiclesRes.json();
          setVehicles(Array.isArray(vehiclesData) ? vehiclesData : []);
        }

        if (driversRes.ok) {
          const driversData = await driversRes.json();
          setDrivers(Array.isArray(driversData) ? driversData : []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, [authenticatedFetch]);

  const columns = [
    { 
      key: 'route' as keyof Trip, 
      header: 'Ruta',
      render: (value: any, trip: Trip) => {
        const route = routes.find(r => r.id === trip.route_id);
        return route ? `${route.from_location} → ${route.to_location}` : 'N/A';
      }
    },
    {
      key: 'vehicle' as keyof Trip,
      header: 'Vehículo',
      render: (value: any, trip: Trip) => {
        const vehicle = vehicles.find(v => v.id === trip.vehicle_id);
        return vehicle ? `${vehicle.plate_number} (${vehicle.brand} ${vehicle.model})` : 'N/A';
      }
    },
    {
      key: 'driver' as keyof Trip,
      header: 'Conductor',
      render: (value: any, trip: Trip) => {
        const driver = drivers.find(d => d.id === trip.driver_id);
        return driver ? `${driver.name} ${driver.last_name}` : 'N/A';
      }
    },
    { 
      key: 'start_date' as keyof Trip, 
      header: 'Fecha Inicio',
      render: (value: any) => value ? new Date(value).toLocaleDateString() : '-'
    },
    { 
      key: 'end_date' as keyof Trip, 
      header: 'Fecha Fin',
      render: (value: any) => value ? new Date(value).toLocaleDateString() : 'En progreso'
    },
    { 
      key: 'total_kilometers' as keyof Trip, 
      header: 'Kilómetros',
      render: (value: any, trip: Trip) => {
        if (trip.total_kilometers) return `${trip.total_kilometers} km`;
        if (trip.end_kilometers && trip.start_kilometers) {
          return `${trip.end_kilometers - trip.start_kilometers} km`;
        }
        return 'En progreso';
      }
    },
    {
      key: 'status' as keyof Trip,
      header: 'Estado',
      render: (value: any) => <StatusBadge status={value} />
    }
  ];

  const handleAdd = () => {
    setEditingTrip(null);
    setFormData({
      route_id: "",
      vehicle_id: "",
      driver_id: "",
      start_date: "",
      end_date: "",
      status: "in_progress",
      observations: ""
    });
    setIsModalOpen(true);
  };

  const handleEdit = (trip: Trip) => {
    setEditingTrip(trip);
    setFormData({
      route_id: trip.route_id,
      vehicle_id: trip.vehicle_id,
      driver_id: trip.driver_id,
      start_date: trip.start_date.split('T')[0],
      end_date: trip.end_date ? trip.end_date.split('T')[0] : "",
      status: trip.status,
      observations: trip.observations || ""
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (trip: Trip) => {
    try {
      const response = await authenticatedFetch(`${API_URL}/api/v1/trips/${trip.id}`, {
        method: "DELETE",
      });
      
      if (response.ok) {
        setTrips(trips.filter(t => t.id !== trip.id));
        toast({
          title: "Viaje eliminado",
          description: "El viaje ha sido eliminado correctamente.",
        });
      }
    } catch (error) {
      console.error('Error deleting trip:', error);
    }
  };

  const refreshVehicleData = async () => {
    try {
      const vehiclesRes = await authenticatedFetch(`${API_URL}/api/v1/vehicles/`);
      if (vehiclesRes.ok) {
        const vehiclesData = await vehiclesRes.json();
        setVehicles(Array.isArray(vehiclesData) ? vehiclesData : []);
      }
    } catch (error) {
      console.error('Error refreshing vehicle data:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      route_id: formData.route_id,
      vehicle_id: formData.vehicle_id,
      driver_id: formData.driver_id,
      start_date: formData.start_date,
      end_date: formData.end_date || null,
      status: formData.status,
      observations: formData.observations
    };

    try {
      if (editingTrip) {
        // PUT
        const response = await authenticatedFetch(`${API_URL}/api/v1/trips/${editingTrip.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        
        if (response.ok) {
          const updatedTrip = await response.json();
          setTrips(trips.map(t => t.id === editingTrip.id ? updatedTrip : t));
          
          // Refresh vehicle data if trip status changed to completed
          if (payload.status === 'completed') {
            await refreshVehicleData();
          }
          
          toast({
            title: "Viaje actualizado",
            description: "El viaje ha sido actualizado correctamente.",
          });
        }
      } else {
        // POST
        const response = await authenticatedFetch(`${API_URL}/api/v1/trips/`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        
        if (response.ok) {
          const newTrip = await response.json();
          setTrips([...trips, newTrip]);
          
          // Refresh vehicle data if trip was created as completed
          if (payload.status === 'completed') {
            await refreshVehicleData();
          }
          
          toast({
            title: "Viaje creado",
            description: "El viaje ha sido creado correctamente.",
          });
        }
      }
    } catch (error) {
      console.error('Error with trip operation:', error);
    }

    setIsModalOpen(false);
  };

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-primary-900">Gestión de Viajes</h2>
        <Button 
          onClick={handleAdd} 
          className="bg-primary hover:bg-primary-600 text-white font-medium px-4 py-2 rounded-lg shadow-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Registrar Viaje
        </Button>
      </div>

      <DataTable
        data={trips}
        columns={columns}
        onEdit={handleEdit}
        onDelete={handleDelete}
        title=""
        addButtonText=""
        searchField="observations"
        searchPlaceholder="Buscar viaje..."
        hideAddButton={true}
      />

      <FormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTrip ? "Editar Viaje" : "Registrar Nuevo Viaje"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="route_id">Ruta</Label>
            <Select
              value={formData.route_id}
              onValueChange={(value) => setFormData({...formData, route_id: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar ruta" />
              </SelectTrigger>
              <SelectContent>
                {routes.map((route) => (
                  <SelectItem key={route.id} value={route.id}>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      {route.from_location} → {route.to_location}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="vehicle_id">Vehículo</Label>
              <Select
                value={formData.vehicle_id}
                onValueChange={(value) => setFormData({...formData, vehicle_id: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar vehículo" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      <div className="flex items-center gap-2">
                        <Car className="w-4 h-4" />
                        {vehicle.plate_number} - {vehicle.brand} {vehicle.model}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="driver_id">Conductor</Label>
              <Select
                value={formData.driver_id}
                onValueChange={(value) => setFormData({...formData, driver_id: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar conductor" />
                </SelectTrigger>
                <SelectContent>
                  {drivers.map((driver) => (
                    <SelectItem key={driver.id} value={driver.id}>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        {driver.name} {driver.last_name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start_date">Fecha de Inicio</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                required
              />
            </div>

            <div>
              <Label htmlFor="end_date">Fecha de Fin (Opcional)</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({...formData, end_date: e.target.value})}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="status">Estado del Viaje</Label>
            <Select
              value={formData.status}
              onValueChange={(value: Trip['status']) => setFormData({...formData, status: value})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="in_progress">En Progreso</SelectItem>
                <SelectItem value="completed">Completado</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="observations">Observaciones</Label>
            <Textarea
              id="observations"
              value={formData.observations}
              onChange={(e) => setFormData({...formData, observations: e.target.value})}
              placeholder="Observaciones del viaje (opcional)"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit">
              {editingTrip ? "Actualizar Viaje" : "Registrar Viaje"}
            </Button>
          </div>
        </form>
      </FormModal>
    </div>
  );
}
