import { useState, useEffect, useMemo, useCallback } from "react";
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
import { localizeApiErrorPayload } from "@/lib/errorI18n";

const BASE_URL = import.meta.env.VITE_API_URL ?? "";
const API_URL = BASE_URL.endsWith("/") ? BASE_URL : BASE_URL + "/";
const TRIPS_PAGE_SIZE = 500;
const MAX_TRIPS_PAGES = 20;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isTripUpdatePayload = (value: unknown): value is Partial<Trip> & { id: string } =>
  isRecord(value) && typeof value.id === "string";

const pickArray = <T,>(value: unknown): T[] | null =>
  Array.isArray(value) ? (value as T[]) : null;

const extractTripsFromPayload = (payload: unknown): Trip[] => {
  const direct = pickArray<Trip>(payload);
  if (direct) return direct;

  if (!isRecord(payload)) return [];

  const directCandidates = [payload.items, payload.results, payload.trips, payload.data];
  for (const candidate of directCandidates) {
    const found = pickArray<Trip>(candidate);
    if (found) return found;
  }

  const nestedData = payload.data;
  if (isRecord(nestedData)) {
    const nested = pickArray<Trip>(nestedData.items) ?? pickArray<Trip>(nestedData.results);
    if (nested) return nested;
  }

  return [];
};

const extractTripsTotal = (payload: unknown): number | null => {
  if (!isRecord(payload)) return null;

  if (typeof payload.total === "number") return payload.total;
  if (typeof payload.count === "number") return payload.count;

  if (isRecord(payload.pagination)) {
    if (typeof payload.pagination.total === "number") return payload.pagination.total;
    if (typeof payload.pagination.count === "number") return payload.pagination.count;
  }

  if (isRecord(payload.meta)) {
    if (typeof payload.meta.total === "number") return payload.meta.total;
    if (typeof payload.meta.count === "number") return payload.meta.count;
  }

  return null;
};

const dedupeTripsById = (items: Trip[]): Trip[] => {
  const byId = new Map<string, Trip>();
  for (const trip of items) {
    byId.set(trip.id, trip);
  }
  return Array.from(byId.values());
};

const parseBooleanLike = (value: unknown): boolean | undefined => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
    return undefined;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "si", "sí"].includes(normalized)) return true;
    if (["false", "0", "no"].includes(normalized)) return false;
  }
  return undefined;
};

const isTripApplied = (trip: Trip): boolean =>
  parseBooleanLike(trip.applied_kilometers) === true;

const parseBackendErrorMessage = async (response: Response, fallback: string) => {
  try {
    const body = await response.json();
    return localizeApiErrorPayload(body, fallback);
  } catch {
    return fallback;
  }
};

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

  const fetchTrips = useCallback(async (): Promise<Trip[]> => {
    let offset = 0;
    const collected: Trip[] = [];

    for (let page = 0; page < MAX_TRIPS_PAGES; page += 1) {
      const response = await authenticatedFetch(
        `${API_URL}/api/v1/trips/?limit=${TRIPS_PAGE_SIZE}&offset=${offset}`
      );

      if (!response.ok) {
        const message = await parseBackendErrorMessage(response, "No se pudieron cargar los viajes.");
        throw new Error(message);
      }

      const payload = await response.json();
      const pageItems = extractTripsFromPayload(payload);
      const total = extractTripsTotal(payload);

      if (pageItems.length === 0) break;

      collected.push(...pageItems);

      // Soporta backend sin estructura paginada (lista plana).
      if (Array.isArray(payload)) break;

      offset += pageItems.length;

      if (total !== null && offset >= total) break;
      if (pageItems.length < TRIPS_PAGE_SIZE) break;
    }

    return dedupeTripsById(collected);
  }, [authenticatedFetch]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [tripsData, routesRes, vehiclesRes, driversRes] = await Promise.all([
          fetchTrips(),
          authenticatedFetch(`${API_URL}api/v1/routes/`),
          authenticatedFetch(`${API_URL}api/v1/vehicles/`),
          authenticatedFetch(`${API_URL}api/v1/drivers/`),
        ]);
        setTrips(tripsData);
        if (routesRes.ok) setRoutes(await routesRes.json());
        if (vehiclesRes.ok) setVehicles(await vehiclesRes.json());
        if (driversRes.ok) setDrivers(await driversRes.json());
      } catch (error) {
        const message =
          error instanceof Error && error.message
            ? error.message
            : "No se pudieron cargar los datos.";
        toast({ title: "Error cargando datos", description: message, variant: "destructive" });
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [fetchTrips, authenticatedFetch, toast]);

  const routesMap = useMemo(() => new Map(routes.map((r) => [r.id, r])), [routes]);
  const vehiclesMap = useMemo(() => new Map(vehicles.map((v) => [v.id, v])), [vehicles]);
  const driversMap = useMemo(() => new Map(drivers.map((d) => [d.id, d])), [drivers]);

  /**
   * Re-dispara la lógica backend de completado para aplicar km una sola vez
   * cuando applied_kilometers está en false.
   */
  const handleApplyKilometers = async (trip: Trip) => {
    const vehicle = vehiclesMap.get(trip.vehicle_id);

    setApplyingKm(trip.id);
    try {
      const encodedTripId = encodeURIComponent(trip.id);
      const response = await authenticatedFetch(`${API_URL}/api/v1/trips/${encodedTripId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "completed",
          ...(trip.end_kilometers != null ? { end_kilometers: trip.end_kilometers } : {}),
        }),
      });

      if (response.ok) {
        let updatedTrip: (Partial<Trip> & { id: string }) | null = null;
        try {
          const payload = await response.clone().json();
          if (isTripUpdatePayload(payload)) {
            updatedTrip = payload;
          }
        } catch {
          // El backend puede devolver 204 sin body.
        }

        setTrips((prev) =>
          prev.map((t) => {
            if (t.id !== trip.id) return t;
            if (updatedTrip) {
              return {
                ...t,
                ...updatedTrip,
                status: "completed",
                applied_kilometers: true,
              };
            }
            return {
              ...t,
              status: "completed",
              applied_kilometers: true,
            };
          })
        );

        // Refrescar vehículos para mostrar km actualizado
        const vehiclesRes = await authenticatedFetch(`${API_URL}api/v1/vehicles/`);
        if (vehiclesRes.ok) setVehicles(await vehiclesRes.json());

        toast({
          title: "Kilómetros aplicados",
          description: vehicle
            ? `Se aplicaron los kilómetros pendientes del viaje a ${vehicle.plate_number}.`
            : "Se aplicaron los kilómetros pendientes del viaje.",
        });
      } else {
        const fallbackMessage =
          response.status === 404
            ? "No se encontró el viaje a actualizar."
            : "No se pudieron aplicar los kilómetros de este viaje.";
        const message = await parseBackendErrorMessage(response, fallbackMessage);

        toast({
          title: "Error al aplicar kilómetros",
          description: message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Error de conexión",
        description: "No se pudo conectar al servidor para aplicar el kilometraje.",
        variant: "destructive",
      });
    } finally {
      setApplyingKm(null);
    }
  };

  const columns: Column<Trip>[] = [
    {
      key: "route_id",
      header: "Ruta",
      sortValue: (trip) => {
        const route = routesMap.get(trip.route_id);
        return route ? `${route.from_location} ${route.to_location}` : trip.route_id;
      },
      render: (_, trip) => {
        const route = routesMap.get(trip.route_id);
        return route ? `${route.from_location} → ${route.to_location}` : "N/A";
      },
    },
    {
      key: "vehicle_id",
      header: "Vehículo",
      sortValue: (trip) => {
        const vehicle = vehiclesMap.get(trip.vehicle_id);
        return vehicle ? `${vehicle.plate_number} ${vehicle.brand} ${vehicle.model}` : trip.vehicle_id;
      },
      render: (_, trip) => {
        const vehicle = vehiclesMap.get(trip.vehicle_id);
        return vehicle ? `${vehicle.plate_number} (${vehicle.brand} ${vehicle.model})` : "N/A";
      },
    },
    {
      key: "driver_id",
      header: "Conductor",
      sortValue: (trip) => {
        const driver = driversMap.get(trip.driver_id);
        return driver ? `${driver.name} ${driver.last_name}` : trip.driver_id;
      },
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
      sortValue: (trip) => trip.total_kilometers ?? ((trip.end_kilometers ?? 0) - (trip.start_kilometers ?? 0)),
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
      sortable: false,
      render: (_, trip) => {
        if (trip.status !== "completed") return <span className="text-gray-400 text-xs">—</span>;
        if (isTripApplied(trip)) {
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
      const response = await authenticatedFetch(`${API_URL}/api/v1/trips/${encodeURIComponent(trip.id)}`, { method: "DELETE" });
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
    const basePayload = {
      route_id: data.route_id,
      vehicle_id: data.vehicle_id,
      driver_id: data.driver_id,
      start_date: data.start_date,
      end_date: data.end_date || null,
      status: data.status,
      observations: data.observations || "",
    };

    const updatePayload = {
      ...basePayload,
      ...(data.start_kilometers != null ? { start_kilometers: data.start_kilometers } : {}),
      ...(data.end_kilometers != null ? { end_kilometers: data.end_kilometers } : {}),
    };

    const createPayload = {
      route_id: data.route_id,
      vehicle_id: data.vehicle_id,
      driver_id: data.driver_id,
      start_date: data.start_date,
      status: data.status,
      ...(data.end_date ? { end_date: data.end_date } : {}),
      ...(data.observations ? { observations: data.observations } : {}),
    };

    let operationSucceeded = false;

    try {
      if (editingTrip) {
        const response = await authenticatedFetch(`${API_URL}/api/v1/trips/${encodeURIComponent(editingTrip.id)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatePayload),
        });
        if (response.ok) {
          const updated = await response.json();
          setTrips((prev) => prev.map((t) => (t.id === editingTrip.id ? updated : t)));
          toast({ title: "Viaje actualizado" });
          operationSucceeded = true;
        } else {
          const message = await parseBackendErrorMessage(
            response,
            "No se pudo actualizar el viaje."
          );
          toast({ title: "Error al actualizar", description: message, variant: "destructive" });
        }
      } else {
        const response = await authenticatedFetch(`${API_URL}api/v1/trips/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(createPayload),
        });
        if (response.ok) {
          const newTrip = await response.json();
          setTrips((prev) => [...prev, newTrip]);
          toast({ title: "Viaje creado" });
          operationSucceeded = true;
        } else {
          const message = await parseBackendErrorMessage(
            response,
            "No se pudo crear el viaje."
          );
          toast({ title: "Error al crear", description: message, variant: "destructive" });
        }
      }

      // Refrescar vehículos al completar un viaje para ver los km actualizados
      if (operationSucceeded && data.status === "completed") {
        const res = await authenticatedFetch(`${API_URL}api/v1/vehicles/`);
        if (res.ok) setVehicles(await res.json());
      }
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Ocurrió un error al procesar el viaje.", variant: "destructive" });
    }

    if (operationSucceeded) {
      setIsModalOpen(false);
    }
  };

  // Contar viajes con KM pendientes de aplicar
  const pendingKmCount = trips.filter(
    (t) => t.status === "completed" && !isTripApplied(t)
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
        searchFields={["observations", "status", "start_date", "end_date"]}
        searchAccessor={(trip) => {
          const route = routesMap.get(trip.route_id);
          const vehicle = vehiclesMap.get(trip.vehicle_id);
          const driver = driversMap.get(trip.driver_id);

          return [
            route ? `${route.from_location} ${route.to_location} ${route.description ?? ""}` : "",
            vehicle ? `${vehicle.plate_number} ${vehicle.brand} ${vehicle.model}` : "",
            driver ? `${driver.name} ${driver.last_name}` : "",
            trip.observations ?? "",
            trip.status,
          ].join(" ");
        }}
        searchPlaceholder="Buscar por unidad, ruta, conductor, estado u observación..."
        defaultSort={{ key: "start_date", direction: "desc" }}
        initialPageSize={20}
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
