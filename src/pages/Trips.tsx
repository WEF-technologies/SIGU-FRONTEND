import { useState, useEffect, useMemo } from "react";
import { DataTable } from "@/components/shared/DataTable";
import type { Column } from "@/components/shared/DataTable";
import { FormModal } from "@/components/shared/FormModal";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trip, Route, Vehicle, Driver } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useAuthenticatedFetch } from "@/hooks/useAuthenticatedFetch";
import { Plus } from "lucide-react";

const API_URL =
  import.meta.env.VITE_API_URL || "https://sigu-back.vercel.app";

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
    status: "in_progress" as Trip["status"],
    observations: "",
    start_kilometers: "",
    end_kilometers: "",
  });

  /* ===================== FETCH ===================== */
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tr, rt, vh, dr] = await Promise.all([
          authenticatedFetch(`${API_URL}/api/v1/trips/`),
          authenticatedFetch(`${API_URL}/api/v1/routes/`),
          authenticatedFetch(`${API_URL}/api/v1/vehicles/`),
          authenticatedFetch(`${API_URL}/api/v1/drivers/`),
        ]);

        if (tr.ok) setTrips(await tr.json());
        if (rt.ok) setRoutes(await rt.json());
        if (vh.ok) setVehicles(await vh.json());
        if (dr.ok) setDrivers(await dr.json());
      } catch (e) {
        console.error(e);
      }
    };

    fetchData();
  }, [authenticatedFetch]);

  /* ===================== KM LOGIC ===================== */
  const kmPreview = useMemo(() => {
    const start = Number(formData.start_kilometers);
    const end = Number(formData.end_kilometers);
    if (isNaN(start) || isNaN(end)) return null;
    return end - start;
  }, [formData.start_kilometers, formData.end_kilometers]);

  const kmInvalid =
    formData.status === "completed" &&
    (kmPreview === null || kmPreview <= 0);

  /* ===================== TABLE ===================== */
  const columns: Column<Trip>[] = [
    {
      key: "route_id",
      header: "Ruta",
      render: (_: any, t) => {
        const r = routes.find((x) => x.id === t.route_id);
        return r ? `${r.from_location} → ${r.to_location}` : "N/A";
      },
    },
    {
      key: "vehicle_id",
      header: "Vehículo",
      render: (_: any, t) => {
        const v = vehicles.find((x) => x.id === t.vehicle_id);
        return v ? v.plate_number : "N/A";
      },
    },
    {
      key: "driver_id",
      header: "Conductor",
      render: (_: any, t) => {
        const d = drivers.find((x) => x.id === t.driver_id);
        return d ? `${d.name} ${d.last_name}` : "N/A";
      },
    },
    {
      key: "total_kilometers",
      header: "Kilómetros",
      render: (v) => (v ? `${v} km` : "—"),
    },
    {
      key: "status",
      header: "Estado",
      render: (v) => <StatusBadge status={v} />,
    },
    {
      key: "actions",
      header: "Acciones",
    },
  ];

  /* ===================== HANDLERS ===================== */
  const handleAdd = () => {
    setEditingTrip(null);
    setFormData({
      route_id: "",
      vehicle_id: "",
      driver_id: "",
      start_date: "",
      end_date: "",
      status: "in_progress",
      observations: "",
      start_kilometers: "",
      end_kilometers: "",
    });
    setIsModalOpen(true);
  };

  const handleEdit = (t: Trip) => {
    setEditingTrip(t);
    setFormData({
      route_id: t.route_id,
      vehicle_id: t.vehicle_id,
      driver_id: t.driver_id,
      start_date: t.start_date.split("T")[0],
      end_date: t.end_date?.split("T")[0] || "",
      status: t.status,
      observations: t.observations || "",
      start_kilometers: t.start_kilometers?.toString() || "",
      end_kilometers: t.end_kilometers?.toString() || "",
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (kmInvalid) {
      toast({
        title: "Kilómetros inválidos",
        description:
          "Los kilómetros finales deben ser mayores a los iniciales.",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      ...formData,
      start_kilometers:
        formData.start_kilometers !== ""
          ? Number(formData.start_kilometers)
          : null,
      end_kilometers:
        formData.end_kilometers !== ""
          ? Number(formData.end_kilometers)
          : null,
    };

    const url = editingTrip
      ? `${API_URL}/api/v1/trips/${editingTrip.id}`
      : `${API_URL}/api/v1/trips/`;

    const method = editingTrip ? "PUT" : "POST";

    const res = await authenticatedFetch(url, {
      method,
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      setTrips((prev) =>
        editingTrip
          ? prev.map((t) => (t.id === data.id ? data : t))
          : [...prev, data]
      );
      setIsModalOpen(false);
      toast({ title: "Viaje guardado correctamente" });
    }
  };

  /* ===================== RENDER ===================== */
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gestión de Viajes</h2>
        <Button onClick={handleAdd}>
          <Plus className="w-4 h-4 mr-2" />
          Registrar Viaje
        </Button>
      </div>

      <DataTable
        title="Viajes"
        data={trips}
        columns={columns}
        onEdit={handleEdit}
        hideAddButton
      />

      <FormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTrip ? "Editar Viaje" : "Nuevo Viaje"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Label>Estado</Label>
          <Select
            value={formData.status}
            onValueChange={(v: Trip["status"]) =>
              setFormData({ ...formData, status: v })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="in_progress">En progreso</SelectItem>
              <SelectItem value="completed">Completado</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>

          {formData.status === "completed" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Kilómetros inicio</Label>
                <Input
                  type="number"
                  value={formData.start_kilometers}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      start_kilometers: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label>Kilómetros fin</Label>
                <Input
                  type="number"
                  value={formData.end_kilometers}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      end_kilometers: e.target.value,
                    })
                  }
                />
              </div>

              {kmPreview !== null && (
                <div className="col-span-2 text-sm">
                  <span
                    className={
                      kmPreview > 0
                        ? "text-green-600"
                        : "text-red-600"
                    }
                  >
                    Kilómetros a registrar: {kmPreview} km
                  </span>
                </div>
              )}
            </div>
          )}

          <Button type="submit" disabled={kmInvalid}>
            Guardar
          </Button>
        </form>
      </FormModal>
    </div>
  );
}
