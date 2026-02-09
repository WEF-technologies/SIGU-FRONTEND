import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Trip, Route, Vehicle, Driver } from "@/types";
import { MapPin, User, Car } from "lucide-react";

export interface TripFormData {
  route_id: string;
  vehicle_id: string;
  driver_id: string;
  start_date: string;
  end_date: string;
  start_kilometers?: number | null;
  end_kilometers?: number | null;
  status: Trip["status"];
  observations: string;
}

interface TripFormProps {
  initialData?: Trip | null;
  routes: Route[];
  vehicles: Vehicle[];
  drivers: Driver[];
  onSubmit: (data: TripFormData) => void;
  onCancel: () => void;
}

export function TripForm({ initialData, routes, vehicles, drivers, onSubmit, onCancel }: TripFormProps) {
  const [manualKm, setManualKm] = useState(false);
  const [formData, setFormData] = useState<TripFormData>({
    route_id: "",
    vehicle_id: "",
    driver_id: "",
    start_date: "",
    end_date: "",
    start_kilometers: null,
    end_kilometers: null,
    status: "in_progress",
    observations: "",
  });

  useEffect(() => {
    if (initialData) {
      const hasManualKm = initialData.start_kilometers != null || initialData.end_kilometers != null;
      setManualKm(hasManualKm);
      setFormData({
        route_id: initialData.route_id,
        vehicle_id: initialData.vehicle_id,
        driver_id: initialData.driver_id,
        start_date: initialData.start_date?.split("T")[0] || "",
        end_date: initialData.end_date?.split("T")[0] || "",
        start_kilometers: initialData.start_kilometers ?? null,
        end_kilometers: initialData.end_kilometers ?? null,
        status: initialData.status,
        observations: initialData.observations || "",
      });
    }
  }, [initialData]);

  // Auto-populate start_kilometers from vehicle's current km
  const handleVehicleChange = (vehicleId: string) => {
    setFormData((prev) => ({ ...prev, vehicle_id: vehicleId }));
    if (manualKm && !initialData) {
      const vehicle = vehicles.find((v) => v.id === vehicleId);
      if (vehicle) {
        const currentKm = vehicle.current_kilometers ?? vehicle.kilometers ?? 0;
        setFormData((prev) => ({ ...prev, start_kilometers: currentKm }));
      }
    }
  };

  const calculatedKm = (() => {
    if (manualKm && formData.start_kilometers != null && formData.end_kilometers != null) {
      return formData.end_kilometers - formData.start_kilometers;
    }
    if (!manualKm) {
      const route = routes.find((r) => r.id === formData.route_id);
      return route?.kilometers ?? null;
    }
    return null;
  })();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: TripFormData = {
      ...formData,
      end_date: formData.end_date || "",
      start_kilometers: manualKm ? formData.start_kilometers : undefined,
      end_kilometers: manualKm ? formData.end_kilometers : undefined,
    };
    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Ruta */}
      <div>
        <Label>Ruta</Label>
        <Select value={formData.route_id} onValueChange={(v) => setFormData({ ...formData, route_id: v })}>
          <SelectTrigger><SelectValue placeholder="Seleccionar ruta" /></SelectTrigger>
          <SelectContent>
            {routes.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                <span className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {r.from_location} → {r.to_location} {r.kilometers ? `(${r.kilometers} km)` : ""}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Vehículo y Conductor */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Vehículo</Label>
          <Select value={formData.vehicle_id} onValueChange={handleVehicleChange}>
            <SelectTrigger><SelectValue placeholder="Seleccionar vehículo" /></SelectTrigger>
            <SelectContent>
              {vehicles.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  <span className="flex items-center gap-2">
                    <Car className="w-4 h-4" />
                    {v.plate_number} - {v.brand} {v.model}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Conductor</Label>
          <Select value={formData.driver_id} onValueChange={(v) => setFormData({ ...formData, driver_id: v })}>
            <SelectTrigger><SelectValue placeholder="Seleccionar conductor" /></SelectTrigger>
            <SelectContent>
              {drivers.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  <span className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    {d.name} {d.last_name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Fechas */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Fecha de Inicio</Label>
          <Input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} required />
        </div>
        <div>
          <Label>Fecha de Fin (Opcional)</Label>
          <Input type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} />
        </div>
      </div>

      {/* Kilómetros */}
      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Registro manual de kilómetros</Label>
          <Switch checked={manualKm} onCheckedChange={setManualKm} />
        </div>
        {manualKm ? (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Km Inicial (odómetro)</Label>
              <Input
                type="number"
                value={formData.start_kilometers ?? ""}
                onChange={(e) => setFormData({ ...formData, start_kilometers: e.target.value ? Number(e.target.value) : null })}
                placeholder="Km al salir"
              />
            </div>
            <div>
              <Label>Km Final (odómetro)</Label>
              <Input
                type="number"
                value={formData.end_kilometers ?? ""}
                onChange={(e) => setFormData({ ...formData, end_kilometers: e.target.value ? Number(e.target.value) : null })}
                placeholder="Km al llegar"
              />
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Se usarán los kilómetros planificados de la ruta seleccionada al completar el viaje.
          </p>
        )}
        {calculatedKm != null && (
          <p className="text-sm font-medium text-primary">
            Kilómetros estimados: {calculatedKm} km
          </p>
        )}
      </div>

      {/* Estado */}
      <div>
        <Label>Estado</Label>
        <Select value={formData.status} onValueChange={(v: Trip["status"]) => setFormData({ ...formData, status: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="in_progress">En Progreso</SelectItem>
            <SelectItem value="completed">Completado</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Observaciones */}
      <div>
        <Label>Observaciones</Label>
        <Textarea
          value={formData.observations}
          onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
          placeholder="Observaciones del viaje (opcional)"
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit">{initialData ? "Actualizar Viaje" : "Registrar Viaje"}</Button>
      </div>
    </form>
  );
}
