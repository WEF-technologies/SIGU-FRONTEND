import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, X } from "lucide-react";

interface Vehicle {
  plate_number: string;
  brand: string;
  model: string;
}

interface VehicleSelectorProps {
  vehicles: Vehicle[];
  selectedVehicles: string[];
  onSelectionChange: (selected: string[]) => void;
  /** Id del buscador, para que la etiqueta del formulario lo enfoque al pulsarla. */
  inputId?: string;
}

/** Tope de resultados visibles: la lista es para elegir, no para navegar la flota. */
const MAX_RESULTS = 8;

export function VehicleSelector({
  vehicles,
  selectedVehicles,
  onSelectionChange,
  inputId,
}: VehicleSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const matches = useMemo(() => {
    if (!normalizedSearch) return [];

    return vehicles
      .filter(
        (vehicle) =>
          !selectedVehicles.includes(vehicle.plate_number) &&
          `${vehicle.plate_number} ${vehicle.brand} ${vehicle.model}`
            .toLowerCase()
            .includes(normalizedSearch)
      )
      .slice(0, MAX_RESULTS);
  }, [normalizedSearch, selectedVehicles, vehicles]);

  const addVehicle = (plateNumber: string) => {
    onSelectionChange([...selectedVehicles, plateNumber]);
    setSearchTerm("");
  };

  const removeVehicle = (plateNumber: string) => {
    onSelectionChange(selectedVehicles.filter((plate) => plate !== plateNumber));
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          id={inputId}
          className="pl-9"
          placeholder="Escribe una placa, marca o modelo..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          onKeyDown={(event) => {
            // Enter elige la primera coincidencia sin salir del teclado.
            if (event.key === "Enter" && matches.length > 0) {
              event.preventDefault();
              addVehicle(matches[0].plate_number);
              return;
            }
            if (event.key === "Escape") setSearchTerm("");
          }}
        />
      </div>

      {/*
        Resultados en el flujo normal, no en un dropdown flotante: dentro del
        modal (que ya hace scroll) un panel absoluto se recortaba y dejaba las
        últimas opciones fuera de vista.
      */}
      {normalizedSearch ? (
        <div className="overflow-hidden rounded-lg border border-gray-200">
          {matches.length > 0 ? (
            <ul className="max-h-56 divide-y divide-gray-100 overflow-y-auto">
              {matches.map((vehicle) => (
                <li key={vehicle.plate_number}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors hover:bg-primary-50"
                    onClick={() => addVehicle(vehicle.plate_number)}
                  >
                    <span className="min-w-0">
                      <span className="font-medium text-gray-900">{vehicle.plate_number}</span>
                      <span className="ml-2 text-sm text-gray-500">
                        {vehicle.brand} {vehicle.model}
                      </span>
                    </span>
                    <Plus className="h-4 w-4 shrink-0 text-primary" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-3 py-3 text-sm text-gray-500">
              Ningún vehículo coincide con "{searchTerm.trim()}".
            </p>
          )}
        </div>
      ) : null}

      {selectedVehicles.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selectedVehicles.map((plateNumber) => {
            const vehicle = vehicles.find((item) => item.plate_number === plateNumber);

            return (
              <Badge
                key={plateNumber}
                variant="outline"
                className="border-primary-200 bg-primary-50 py-1 pl-2.5 pr-1 text-primary-800"
              >
                <span className="font-medium">{plateNumber}</span>
                {vehicle ? (
                  <span className="ml-1.5 font-normal text-primary-800/70">
                    {vehicle.brand} {vehicle.model}
                  </span>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="ml-1 h-5 w-5 p-0 hover:bg-primary-100"
                  onClick={() => removeVehicle(plateNumber)}
                  aria-label={`Quitar ${plateNumber}`}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-gray-500">
          Aún no has asociado vehículos. Búscalos arriba para agregarlos.
        </p>
      )}
    </div>
  );
}
