import { useState, useEffect, useMemo } from "react";
import { DataTable, Column } from "@/components/shared/DataTable";
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

  // --- Fetch inicial de datos ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tripsRes, routesRes, vehiclesRes, driversRes] = await Promise.all([
          authenticatedFetch(`${API_URL}/api/v1/trips/`),
          authenticatedFetch(`${API_URL}/api/v1/routes/`),
          authenticatedFetch(`${API_URL}/api/v1/vehicles/`),
          authenticatedFetch(`${API_URL}/api/v1/drivers/`)
        ]);

        if (tripsRes.ok) setTrips(await tripsRes.json());
        if (routesRes.ok) setRoutes(await routesRes.json());
        if (vehiclesRes.ok) setVehicles(await vehiclesRes.json());
        if (driversRes.ok) setDrivers(await driversRes.json());
      } catch (error) {
        toast({ title: "Error cargando datos", description: "No se pudieron cargar viajes, rutas, vehículos o conductores.", variant: "destructive" });
        console.error(error);
      }
    };
    fetchData();
  }, [authenticatedFetch, toast]);

  // --- Mapas para relaciones rápidas ---
  const routesMap = useMemo(() => new Map(routes.map(r => [r.id, r])), [routes]);
  const vehiclesMap = useMemo(() => new Map(vehicles.map(v => [v.id, v])), [vehicles]);
  const driversMap = useMemo(() => new Map(drivers.map(d => [d.id, d])), [drivers]);

  // --- Columnas de la tabla ---
  const columns: Column<Trip>[] = [
    { key: 'route', header: 'Ruta', render: (_, trip) => {
      const route = routesMap.get(trip.route_id);
      return route ? `${route.from_location} → ${route.to_location}` : 'N/A';
    }},
    { key: 'vehicle', header: 'Vehículo', render: (_, trip) => {
      const vehicle = vehiclesMap.get(trip.vehicle_id);
      return vehicle ? `${vehicle.plate_number} (${vehicle.brand} ${vehicle.model})` : 'N/A';
    }},
    { key: 'driver', header: 'Conductor', render: (_, trip) => {
      const driver = driversMap.get(trip.driver_id);
      return driver ? `${driver.name} ${driver.last_name}` : 'N/A';
    }},
    { key: 'start_date', header: 'Fecha Inicio', render: (_, trip) => trip.start_date ? new Date(trip.start_date).toLocaleDateString() : '-' },
    { key: 'end_date', header: 'Fecha Fin', render: (_, trip) => trip.end_date ? new Date(trip.end_date).toLocaleDateString() : 'En progreso' },
    { key: 'total_kilometers', header: 'Kilómetros', render: (_, trip) => {
      if (trip.total_kilometers) return `${trip.total_kilometers} km`;
      if (trip.end_kilometers && trip.start_kilometers) return `${trip.end_kilometers - trip.start_kilometers} km`;
      return 'En progreso';
    }},
    { key: 'status', header: 'Estado', render: (_, trip) => <StatusBadge status={trip.status} /> },
    { key: 'actions', header: 'Acciones', render: () => null } // DataTable manejará los botones
  ];

  // --- Abrir modal para crear ---
  const handleAdd = () => {
    setEditingTrip(null);
    setFormData({ route_id: "", vehicle_id: "", driver_id: "", start_date: "", end_date: "", status: "in_progress", observations: "" });
    setIsModalOpen(true);
  };

  // --- Abrir modal para editar ---
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

  // --- Eliminar viaje ---
  const handleDelete = async (trip: Trip) => {
    try {
      const response = await authenticatedFetch(`${API_URL}/api/v1/trips/${trip.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" }
      });
      if (response.ok) {
        setTrips(trips.filter(t => t.id !== trip.id));
        toast({ title: "Viaje eliminado", description: "El viaje ha sido eliminado correctamente." });
      } else {
        toast({ title: "Error", description: "No se pudo eliminar el viaje.", variant: "destructive" });
      }
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Ocurrió un error al eliminar el viaje.", variant: "destructive" });
    }
  };

  // --- Refrescar vehículos desde backend ---
  const refreshVehicleData = async () => {
    try {
      const res = await authenticatedFetch(`${API_URL}/api/v1/vehicles/`);
      if (res.ok) setVehicles(await res.json());
    } catch (error) { console.error(error); }
  };

  // --- Submit de modal (crear o editar) ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...formData, end_date: formData.end_date || null };

    try {
      if (editingTrip) {
        const response = await authenticatedFetch(`${API_URL}/api/v1/trips/${editingTrip.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (response.ok) {
          const updatedTrip = await response.json();
          setTrips(trips.map(t => t.id === editingTrip.id ? updatedTrip : t));
          if (payload.status === 'completed') await refreshVehicleData();
          toast({ title: "Viaje actualizado", description: "El viaje ha sido actualizado correctamente." });
        }
      } else {
        const response = await authenticatedFetch(`${API_URL}/api/v1/trips/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (response.ok) {
          const newTrip = await response.json();
          setTrips([...trips, newTrip]);
          if (payload.status === 'completed') await refreshVehicleData();
          toast({ title: "Viaje creado", description: "El viaje ha sido creado correctamente." });
        }
      }
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Ocurrió un error al procesar el viaje.", variant: "destructive" });
    }

    setIsModalOpen(false);
  };

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-primary-900">Gestión de Viajes</h2>
        <Button onClick={handleAdd} className="bg-primary hover:bg-primary-600 text-white font-medium px-4 py-2 rounded-lg shadow-sm flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Registrar Viaje
        </Button>
      </div>

      <DataTable
        data={trips}
        columns={columns}
        onEdit={handleEdit}
        onDelete={handleDelete}
        searchField="observations"
        searchPlaceholder="Buscar viaje..."
      />

      <FormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingTrip ? "Editar Viaje" : "Registrar Nuevo Viaje"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Rutas */}
          <div>
            <Label htmlFor="route_id">Ruta</Label>
            <Select value={formData.route_id} onValueChange={(v) => setFormData({ ...formData, route_id: v })}>
              <SelectTrigger><SelectValue placeholder="Seleccionar ruta" /></SelectTrigger>
              <SelectContent>
                {routes.map(r => <SelectItem key={r.id} value={r.id}><MapPin className="w-4 h-4 mr-2"/>{r.from_location} → {r.to_location}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Vehículos y conductores */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="vehicle_id">Vehículo</Label>
              <Select value={formData.vehicle_id} onValueChange={(v) => setFormData({ ...formData, vehicle_id: v })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar vehículo" /></SelectTrigger>
                <SelectContent>
                  {vehicles.map(v => <SelectItem key={v.id} value={v.id}><Car className="w-4 h-4 mr-2"/>{v.plate_number} - {v.brand} {v.model}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="driver_id">Conductor</Label>
              <Select value={formData.driver_id} onValueChange={(v) => setFormData({ ...formData, driver_id: v })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar conductor" /></SelectTrigger>
                <SelectContent>
                  {drivers.map(d => <SelectItem key={d.id} value={d.id}><User className="w-4 h-4 mr-2"/>{d.name} {d.last_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start_date">Fecha de Inicio</Label>
              <Input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} required/>
            </div>
            <div>
              <Label htmlFor="end_date">Fecha de Fin (Opcional)</Label>
              <Input type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}/>
            </div>
          </div>

          {/* Estado y observaciones */}
          <div>
            <Label htmlFor="status">Estado</Label>
            <Select value={formData.status} onValueChange={(v: Trip['status']) => setFormData({ ...formData, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="in_progress">En Progreso</SelectItem>
                <SelectItem value="completed">Completado</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="observations">Observaciones</Label>
            <Textarea value={formData.observations} onChange={(e) => setFormData({ ...formData, observations: e.target.value })} placeholder="Observaciones del viaje (opcional)"/>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button type="submit">{editingTrip ? "Actualizar Viaje" : "Registrar Viaje"}</Button>
          </div>
        </form>
      </FormModal>
    </div>
  );
}
