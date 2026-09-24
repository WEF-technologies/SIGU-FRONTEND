import { useMemo, useState } from "react";
import { VehiclePicker } from "@/components/shared/VehiclePicker";
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
import { Textarea } from "@/components/ui/textarea";
import { FLUID_TYPE_LABELS } from "@/components/fluids/fluidConstants";
import {
  CreateFluidServicePayload,
  CreateFuelLogPayload,
  FluidProduct,
  FuelType,
  Vehicle,
} from "@/types";
import { AlertTriangle, Droplets, Fuel } from "lucide-react";

export type ConsumptionKind = "fuel" | "fluid";

interface RegisterConsumptionFormProps {
  vehicles: Vehicle[];
  /** Catálogo de fluidos; vacío deshabilita esa opción. */
  fluidProducts?: FluidProduct[];
  /** Último kilometraje conocido por unidad, para precargar el odómetro. */
  lastOdometerByVehicleId?: Map<string, number>;
  defaultKind?: ConsumptionKind;
  isLoadingProducts?: boolean;
  onSubmitFuel: (payload: CreateFuelLogPayload) => Promise<boolean>;
  onSubmitFluid: (payload: CreateFluidServicePayload) => Promise<boolean>;
  onCancel: () => void;
}

const FUEL_TYPE_OPTIONS: Array<{ value: FuelType; label: string }> = [
  { value: "gasoil", label: "Gasoil" },
  { value: "gasolina", label: "Gasolina" },
];

const STATION_MAX_LENGTH = 120;
const NOTES_MAX_LENGTH = 500;

const toLocalDatetimeValue = (date: Date = new Date()) => {
  const pad = (value: number) => String(value).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
};

const parsePositiveNumber = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const sanitizeOptionalText = (value: string) => {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

/**
 * Registrar consumo: una sola pantalla para lo que antes eran dos formularios
 * con dos vocabularios.
 *
 * Una carga de combustible y un servicio de fluido son la misma frase —"a esta
 * unidad se le echó tanto de esto, a tal kilometraje, tal día"—, así que se
 * piden igual y solo cambia el destino al guardar.
 *
 * El kilometraje llega precargado con el último conocido de la unidad: antes
 * era un campo opcional y vacío, y sin él no hay consumo por kilómetro, que es
 * el número por el que existe el módulo.
 */
export function RegisterConsumptionForm({
  vehicles,
  fluidProducts = [],
  lastOdometerByVehicleId,
  defaultKind = "fuel",
  isLoadingProducts = false,
  onSubmitFuel,
  onSubmitFluid,
  onCancel,
}: RegisterConsumptionFormProps) {
  const [kind, setKind] = useState<ConsumptionKind>(defaultKind);
  const [vehicleId, setVehicleId] = useState("");
  const [fuelType, setFuelType] = useState<FuelType>("gasoil");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [totalCost, setTotalCost] = useState("");
  const [odometerKm, setOdometerKm] = useState("");
  const [occurredAt, setOccurredAt] = useState(() => toLocalDatetimeValue());
  const [station, setStation] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedVehicle = useMemo(
    () => vehicles.find((vehicle) => vehicle.id === vehicleId) ?? null,
    [vehicleId, vehicles]
  );

  const lastKnownKm = vehicleId ? lastOdometerByVehicleId?.get(vehicleId) ?? 0 : 0;

  const handleVehicleChange = (nextVehicleId: string) => {
    setVehicleId(nextVehicleId);
    setError(null);

    // Precarga el odómetro con lo último conocido; si se deselecciona, se limpia.
    const nextKm = nextVehicleId ? lastOdometerByVehicleId?.get(nextVehicleId) ?? 0 : 0;
    setOdometerKm(nextKm > 0 ? String(nextKm) : "");
  };

  const typedKm = Number(odometerKm);
  const goesBackwards =
    Boolean(odometerKm.trim()) &&
    Number.isFinite(typedKm) &&
    lastKnownKm > 0 &&
    typedKm < lastKnownKm;

  const canUseFluids = fluidProducts.length > 0 || isLoadingProducts;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedVehicle) {
      setError("Selecciona la unidad.");
      return;
    }

    const parsedQuantity = parsePositiveNumber(quantity);
    if (parsedQuantity === null) {
      setError("La cantidad debe ser mayor que cero.");
      return;
    }

    if (!occurredAt) {
      setError("Indica la fecha.");
      return;
    }

    const parsedOdometer = odometerKm.trim() ? Number(odometerKm) : undefined;
    if (parsedOdometer !== undefined && (!Number.isFinite(parsedOdometer) || parsedOdometer < 0)) {
      setError("El kilometraje no puede ser negativo.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      if (kind === "fuel") {
        const parsedCost = Number(totalCost);
        if (!totalCost.trim() || !Number.isFinite(parsedCost) || parsedCost < 0) {
          setError("Indica el costo total de la carga.");
          return;
        }

        await onSubmitFuel({
          vehicle_id: selectedVehicle.id,
          fuel_type: fuelType,
          liters: parsedQuantity,
          total_cost: parsedCost,
          fueled_at: new Date(occurredAt).toISOString(),
          odometer_km: parsedOdometer,
          station: sanitizeOptionalText(station),
          notes: sanitizeOptionalText(notes),
        });
        return;
      }

      if (!productId) {
        setError("Selecciona el producto de fluido.");
        return;
      }

      await onSubmitFluid({
        vehicle_plate: selectedVehicle.plate_number,
        fluid_product_id: productId,
        quantity_used: parsedQuantity,
        // El servicio de fluido se guarda por día; la hora solo aplica a combustible.
        serviced_at: occurredAt.slice(0, 10),
        odometer_km: parsedOdometer,
        notes: sanitizeOptionalText(notes),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <Label>¿Qué se le echó?</Label>
        <div className="mt-1.5 grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={kind === "fuel" ? "default" : "outline"}
            className={kind === "fuel" ? "bg-primary text-white hover:bg-primary-600" : ""}
            onClick={() => {
              setKind("fuel");
              setError(null);
            }}
          >
            <Fuel className="mr-1.5 h-4 w-4" />
            Combustible
          </Button>
          <Button
            type="button"
            variant={kind === "fluid" ? "default" : "outline"}
            className={kind === "fluid" ? "bg-primary text-white hover:bg-primary-600" : ""}
            onClick={() => {
              setKind("fluid");
              setError(null);
            }}
            disabled={!canUseFluids}
          >
            <Droplets className="mr-1.5 h-4 w-4" />
            Fluido
          </Button>
        </div>
      </div>

      <div>
        <Label htmlFor="consumption-vehicle">Unidad</Label>
        <VehiclePicker
          id="consumption-vehicle"
          vehicles={vehicles}
          value={vehicleId}
          onChange={handleVehicleChange}
        />
      </div>

      {kind === "fuel" ? (
        <div>
          <Label htmlFor="consumption-fuel-type">Tipo de combustible</Label>
          <Select value={fuelType} onValueChange={(value) => setFuelType(value as FuelType)}>
            <SelectTrigger id="consumption-fuel-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FUEL_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <div>
          <Label htmlFor="consumption-product">Producto</Label>
          <Select value={productId} onValueChange={setProductId}>
            <SelectTrigger id="consumption-product">
              <SelectValue
                placeholder={isLoadingProducts ? "Cargando productos..." : "Selecciona producto"}
              />
            </SelectTrigger>
            <SelectContent>
              {fluidProducts.map((product) => (
                <SelectItem key={product.id} value={product.id}>
                  {product.code} · {FLUID_TYPE_LABELS[product.fluid_type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="consumption-quantity">Cantidad (litros)</Label>
          <Input
            id="consumption-quantity"
            type="number"
            inputMode="decimal"
            min={0.01}
            step="0.01"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            onFocus={(event) => event.target.select()}
            placeholder="0"
            required
          />
        </div>

        {kind === "fuel" ? (
          <div>
            <Label htmlFor="consumption-cost">Costo total</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                $
              </span>
              <Input
                id="consumption-cost"
                className="pl-7"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={totalCost}
                onChange={(event) => setTotalCost(event.target.value)}
                onFocus={(event) => event.target.select()}
                placeholder="0.00"
                required
              />
            </div>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="consumption-odometer">Kilometraje</Label>
          <Input
            id="consumption-odometer"
            type="number"
            inputMode="numeric"
            min={0}
            value={odometerKm}
            onChange={(event) => setOdometerKm(event.target.value)}
            onFocus={(event) => event.target.select()}
            placeholder={selectedVehicle ? "0" : "Elige la unidad primero"}
          />
          {selectedVehicle && lastKnownKm > 0 ? (
            <p className="mt-1 text-xs text-secondary-dark">
              Último registrado: {lastKnownKm.toLocaleString("es-ES")} km
            </p>
          ) : null}
          {goesBackwards ? (
            <p className="mt-1 flex items-start gap-1.5 text-xs text-amber-700">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Es menor que el último registrado. Revísalo antes de guardar.
            </p>
          ) : null}
        </div>

        <div>
          <Label htmlFor="consumption-date">
            {kind === "fuel" ? "Fecha y hora de la carga" : "Fecha del servicio"}
          </Label>
          <Input
            id="consumption-date"
            type="datetime-local"
            value={occurredAt}
            onChange={(event) => setOccurredAt(event.target.value)}
            required
          />
        </div>
      </div>

      {kind === "fuel" ? (
        <div>
          <Label htmlFor="consumption-station">Estación (opcional)</Label>
          <Input
            id="consumption-station"
            value={station}
            onChange={(event) => setStation(event.target.value)}
            maxLength={STATION_MAX_LENGTH}
            placeholder="Nombre de la estación"
          />
        </div>
      ) : null}

      <div>
        <Label htmlFor="consumption-notes">Notas (opcional)</Label>
        <Textarea
          id="consumption-notes"
          rows={2}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          maxLength={NOTES_MAX_LENGTH}
          placeholder="Observaciones"
        />
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" className="bg-primary hover:bg-primary-600" disabled={isSubmitting}>
          {isSubmitting ? "Registrando..." : "Registrar"}
        </Button>
      </div>
    </form>
  );
}
