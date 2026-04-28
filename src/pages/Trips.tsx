import { useState, useEffect, useMemo } from "react";
import { DataTable, Column } from "@/components/shared/DataTable";
import { FormModal } from "@/components/shared/FormModal";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { TripForm, TripFormData } from "@/components/trips/TripForm";
import { Trip, Route, Vehicle, Driver } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useAuthenticatedFetch } from "@/hooks/useAuthenticatedFetch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Gauge, AlertTriangle } from "lucide-react";

const BASE_URL = import.meta.env.VITE_API_URL ?? "";
const API_URL = BASE_URL.endsWith("/") ? BASE_URL : BASE_URL + "/";

export default function Trips() {
  const { toast } = useToast();
  const authenticatedFetch = useAuthenticatedFetch();

  const [trips, setTrips] = useState<Trip[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [applyingKm, setApplyingKm] = useState<string | null>(null); // trip id en proceso

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [tripsRes, routesRes, vehiclesRes, driversRes] = await Promise.all([
          authenticatedFetch(`${API_URL}api/v1/trips/`),
          authenticatedFetch(`${API_URL}api/v1/routes/`),
          authenticatedFetch(`${API_URL}api/v1/vehicles/`),
          authenticatedFetch(`${API_URL}api/v1/drivers/`),
        ]);
        if (tripsRes.ok) setTrips(await tripsRes.json());
        if (routesRes.ok) setRoutes(await routesRes.json());
        if (vehiclesRes.ok) setVehicles(await vehiclesRes.json());
        if (driversRes.ok) setDrivers(await driversRes.json());
      } catch (error) {
        toast({ title: "Error cargando datos", description: "No se pudieron cargar los datos.", variant: "destructive" });
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [authenticatedFetch, toast]);

  const routesMap = useMemo(() => new Map(routes.map((r) => [r.id, r])), [routes]);
  const vehiclesMap = useMemo(() => new Map(vehicles.map((v) => [v.id, v])), [vehicles]);
  const driversMap = useMemo(() => new Map(drivers.map((d) => [d.id, d])), [drivers]);

  /**
   * Aplica manualmente los km finales al vehículo cuando applied_kilometers es false.
   * Llama al endpoint PUT /api/v1/vehicles/{plate}/kilometers con los km finales del viaje.
   */
  const handleApplyKilometers = async (trip: Trip) => {
    const vehicle = vehiclesMap.get(trip.vehicle_id);
    if (!vehicle) {
      toast({ title: "Vehículo no encontrado", variant: "destructive" });
      return;
    }

    const kmToApply = trip.end_kilometers ?? trip.total_kilometers;
    if (!kmToApply) {
      toast({
        title: "Sin kilómetros registrados",
        description: "Este viaje no tiene km finales para aplicar.",
        variant: "destructive",
      });
      return;
    }

    setApplyingKm(trip.id);
    try {
      const response = await authenticatedFetch(
        `${API_URL}api/v1/vehicles/${vehicle.plate_number}/kilometers`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kilometers: kmToApply }),
        }
      );

      if (response.ok) {
        // Refrescar vehículos para mostrar km actualizado
        const vehiclesRes = await authenticatedFetch(`${API_URL}api/v1/vehicles/`);
        if (vehiclesRes.ok) setVehicles(await vehiclesRes.json());

        // Marcar el viaje como aplicado en el estado local
        setTrips((prev) =>
          prev.map((t) => (t.id === trip.id ? { ...t, applied_kilometers: true } : t))
        );

        toast({
          title: "Kilómetros aplicados",
          description: `Se actualizaron los km del vehículo ${vehicle.plate_number} a ${kmToApply.toLocaleString()} km.`,
        });
      } else {
        toast({ title: "Error al aplicar kilómetros", variant: "destructive" });
      }
    } catch (error) {
      console.error(error);
      toast({ title: "Error de conexión", variant: "destructive" });
    } finally {
      setApplyingKm(null);
    }
  };

  const columns: Column<Trip>[] = [
    {
      key: "route_id",
      header: "Ruta",
      render: (_, trip) => {
        const route = routesMap.get(trip.route_id);
        return route ? `${route.from_location} → ${route.to_location}` : "N/A";
      },
    },
    {
      key: "vehicle_id",
      header: "Vehículo",
      render: (_, trip) => {
        const vehicle = vehiclesMap.get(trip.vehicle_id);
        return vehicle ? `${vehicle.plate_number} (${vehicle.brand} ${vehicle.model})` : "N/A";
      },
    },
    {
      key: "driver_id",
      header: "Conductor",
      render: (_, trip) => {
        const driver = driversMap.get(trip.driver_id);
        return driver ? `${driver.name} ${driver.last_name}` : "N/A";
      },
    },
    {
      key: "start_date",
      header: "Fecha Inicio",
      render: (_, trip) => (trip.start_date ? new Date(trip.start_date).toLocaleDateString() : "-"),
    },
    {
      key: "end_date",
      header: "Fecha Fin",
      render: (_, trip) => (trip.end_date ? new Date(trip.end_date).toLocaleDateString() : "En progreso"),
    },
    {
      key: "total_kilometers",
      header: "Kilómetros",
      render: (_, trip) => {
        if (trip.total_kilometers) return `${trip.total_kilometers} km`;
        if (trip.end_kilometers && trip.start_kilometers)
          return `${(trip.end_kilometers - trip.start_kilometers).toLocaleString()} km`;
        return "En progreso";
      },
    },
    {
      key: "applied_kilometers" as keyof Trip,
      header: "KM Aplicados",
      render: (_, trip) => {
        if (trip.status !== "completed") return <span className="text-gray-400 text-xs">—</span>;
        if (trip.applied_kilometers === true) {
          return (
            <Badge className="bg-green-100 text-green-800 text-xs">
              <Gauge className="w-3 h-3 mr-1" />
              Aplicados
            </Badge>
          );
        }
        // completed pero no aplicados
        return (
          <div className="flex items-center gap-1.5">
            <Badge className="bg-red-100 text-red-700 text-xs">
              <AlertTriangle className="w-3 h-3 mr-1" />
              No aplicados
            </Badge>
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-xs border-red-300 text-red-600 hover:bg-red-50 px-2"
              disabled={applyingKm === trip.id}
              onClick={() => handleApplyKilometers(trip)}
            >
              {applyingKm === trip.id ? "..." : "Aplicar"}
            </Button>
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Estado",
      render: (_, trip) => {
        const labels: Record<string, string> = {
          in_progress: "En Progreso",
          completed: "Completado",
          cancelled: "Cancelado",
        };
        return <StatusBadge status={trip.status} text={labels[trip.status] || trip.status} />;
      },
    },
    { key: "actions" as keyof Trip, header: "Acciones" },
  ];

  const handleAdd = () => {
    setEditingTrip(null);
    setIsModalOpen(true);
  };

  const handleEdit = (trip: Trip) => {
    setEditingTrip(trip);
    setIsModalOpen(true);
  };

  const handleDelete = async (trip: Trip) => {
    if (!confirm("¿Está seguro de eliminar este viaje?")) return;
    try {
      const response = await authenticatedFetch(`${API_URL}api/v1/trips/${trip.id}`, { method: "DELETE" });
      if (response.ok || response.status === 204) {
        setTrips((prev) => prev.filter((t) => t.id !== trip.id));
        toast({ title: "Viaje eliminado" });
      } else {
        toast({ title: "Error", description: "No se pudo eliminar el viaje.", variant: "destructive" });
      }
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Ocurrió un error al eliminar el viaje.", variant: "destructive" });
    }
  };

  const handleSubmit = async (data: TripFormData) => {
    const payload = {
      ...data,
      end_date: data.end_date || null,
      start_kilometers: data.start_kilometers ?? null,
      end_kilometers: data.end_kilometers ?? null,
    };

    try {
      if (editingTrip) {
        const response = await authenticatedFetch(`${API_URL}api/v1/trips/${editingTrip.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (response.ok) {
          const updated = await response.json();
          setTrips((prev) => prev.map((t) => (t.id === editingTrip.id ? updated : t)));
          toast({ title: "Viaje actualizado" });
        } else {
          toast({ title: "Error al actualizar", variant: "destructive" });
        }
      } else {
        const response = await authenticatedFetch(`${API_URL}api/v1/trips/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (response.ok) {
          const newTrip = await response.json();
          setTrips((prev) => [...prev, newTrip]);
          toast({ title: "Viaje creado" });
        } else {
          toast({ title: "Error al crear", variant: "destructive" });
        }
      }

      // Refrescar vehículos al completar un viaje para ver los km actualizados
      if (payload.status === "completed") {
        const res = await authenticatedFetch(`${API_URL}api/v1/vehicles/`);
        if (res.ok) setVehicles(await res.json());
      }
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Ocurrió un error al procesar el viaje.", variant: "destructive" });
    }
    setIsModalOpen(false);
  };

  // Contar viajes con KM pendientes de aplicar
  const pendingKmCount = trips.filter(
    (t) => t.status === "completed" && t.applied_kilometers === false
  ).length;

  return (
    <div className="animate-fade-in space-y-4">
      {/* Banner de KM pendientes */}
      {pendingKmCount > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-300 text-red-800">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-semibold">
            {pendingKmCount} viaje{pendingKmCount !== 1 ? "s" : ""} completado
            {pendingKmCount !== 1 ? "s" : ""} con kilómetros sin aplicar al vehículo.{" "}
            <span className="font-normal">Usa el botón "Aplicar" en cada fila para actualizar el odómetro.</span>
          </p>
        </div>
      )}

      <DataTable
        data={trips}
        columns={columns}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        title="Gestión de Viajes"
        addButtonText="Registrar Viaje"
        searchField="observations"
        searchPlaceholder="Buscar viaje..."
        isLoading={isLoading}
      />

      <FormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTrip ? "Editar Viaje" : "Registrar Nuevo Viaje"}
      >
        <TripForm
          initialData={editingTrip}
          routes={routes}
          vehicles={vehicles}
          drivers={drivers}
          onSubmit={handleSubmit}
          onCancel={() => setIsModalOpen(false)}
        />
      </FormModal>
    </div>
  );
}
