import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Vehicle } from "@/types";
import { Search, Truck, X } from "lucide-react";

interface VehiclePickerProps {
  vehicles: Vehicle[];
  /** Id de la unidad seleccionada, o "" si no hay ninguna. */
  value: string;
  onChange: (vehicleId: string) => void;
  /** Id del buscador, para que la etiqueta del formulario lo enfoque al pulsarla. */
  id?: string;
  disabled?: boolean;
  placeholder?: string;
}

/** Tope de resultados: la lista es para elegir, no para recorrer la flota. */
const MAX_RESULTS = 8;

/**
 * Selector de una unidad, compartido por todos los formularios que piden
 * vehículo.
 *
 * Sustituye a los desplegables que listaban la flota entera: con cien unidades
 * había que bajar a mano por una lista sin buscador. Aquí se escribe la placa
 * (o la marca, o el modelo) y se elige.
 */
export function VehiclePicker({
  vehicles,
  value,
  onChange,
  id,
  disabled = false,
  placeholder = "Escribe una placa, marca o modelo...",
}: VehiclePickerProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const selectedVehicle = useMemo(
    () => vehicles.find((vehicle) => vehicle.id === value) ?? null,
    [value, vehicles]
  );

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const matches = useMemo(() => {
    if (!normalizedSearch) return [];

    return vehicles
      .filter((vehicle) =>
        `${vehicle.plate_number} ${vehicle.brand} ${vehicle.model}`
          .toLowerCase()
          .includes(normalizedSearch)
      )
      .slice(0, MAX_RESULTS);
  }, [normalizedSearch, vehicles]);

  const selectVehicle = (vehicleId: string) => {
    onChange(vehicleId);
    setSearchTerm("");
  };

  if (selectedVehicle) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-md border border-primary-200 bg-primary-50 px-3 py-2">
        <span className="flex min-w-0 items-center gap-2">
          <Truck className="h-4 w-4 shrink-0 text-primary" />
          <span className="truncate">
            <span className="font-medium text-primary-900">{selectedVehicle.plate_number}</span>
            <span className="ml-2 text-sm text-primary-800/70">
              {selectedVehicle.brand} {selectedVehicle.model}
            </span>
          </span>
        </span>
        {!disabled ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 shrink-0 text-primary hover:bg-primary-100"
            onClick={() => selectVehicle("")}
          >
            <X className="mr-1 h-3.5 w-3.5" />
            Cambiar
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          id={id}
          className="pl-9"
          placeholder={placeholder}
          value={searchTerm}
          disabled={disabled}
          onChange={(event) => setSearchTerm(event.target.value)}
          onKeyDown={(event) => {
            // Enter elige la primera coincidencia sin soltar el teclado.
            if (event.key === "Enter" && matches.length > 0) {
              event.preventDefault();
              selectVehicle(matches[0].id);
              return;
            }
            if (event.key === "Escape") setSearchTerm("");
          }}
        />
      </div>

      {/*
        Resultados en el flujo normal y no flotando: estos formularios viven
        dentro de un modal con scroll, donde un panel absoluto se recorta.
      */}
      {normalizedSearch ? (
        <div className="overflow-hidden rounded-lg border border-gray-200">
          {matches.length > 0 ? (
            <ul className="max-h-48 divide-y divide-gray-100 overflow-y-auto">
              {matches.map((vehicle) => (
                <li key={vehicle.id}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left transition-colors hover:bg-primary-50"
                    onClick={() => selectVehicle(vehicle.id)}
                  >
                    <span className="font-medium text-gray-900">{vehicle.plate_number}</span>
                    <span className="ml-2 text-sm text-gray-500">
                      {vehicle.brand} {vehicle.model}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-3 py-3 text-sm text-gray-500">
              Ninguna unidad coincide con "{searchTerm.trim()}".
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
