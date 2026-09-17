import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SparePart, SparePartFitmentPayload, SparePartPayload, Vehicle } from "@/types";
import { VehicleSelector } from "./VehicleSelector";
import { VehicleFitmentRules } from "./VehicleFitmentRules";
import { isFitmentEmpty } from "./fitmentMatching";

interface SparePartFormProps {
  sparePart?: SparePart | null;
  vehicles: Vehicle[];
  onSubmit: (sparePart: SparePartPayload) => void;
  onCancel: () => void;
}

interface SparePartFormData {
  code: string;
  description: string;
  quantity: string;
  company_location: string;
  compatible_vehicles: string[];
  unit_price: string;
  fitments: SparePartFitmentPayload[];
}

const createEmptyFormData = (): SparePartFormData => ({
  code: "",
  description: "",
  quantity: "",
  company_location: "",
  compatible_vehicles: [],
  unit_price: "",
  fitments: [],
});

const mapSparePartToFormData = (sparePart: SparePart): SparePartFormData => ({
  code: sparePart.code,
  description: sparePart.description,
  quantity: String(sparePart.quantity ?? 0),
  company_location: sparePart.company_location || "",
  compatible_vehicles: sparePart.compatible_vehicles || [],
  unit_price: sparePart.unit_price != null ? String(sparePart.unit_price) : "",
  fitments: sparePart.fitments ?? [],
});

const RequiredMark = () => (
  <span className="ml-0.5 text-red-500" aria-hidden="true">
    *
  </span>
);

/** Selecciona el contenido al enfocar para no tener que borrar el valor previo. */
const selectOnFocus = (event: React.FocusEvent<HTMLInputElement>) => event.target.select();

export function SparePartForm({ sparePart, vehicles, onSubmit, onCancel }: SparePartFormProps) {
  const [formData, setFormData] = useState<SparePartFormData>(createEmptyFormData);

  useEffect(() => {
    setFormData(sparePart ? mapSparePartToFormData(sparePart) : createEmptyFormData());
  }, [sparePart]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const parsedQuantity = Number.parseInt(formData.quantity, 10);
    const parsedUnitPrice = formData.unit_price.trim()
      ? Number.parseFloat(formData.unit_price)
      : null;

    onSubmit({
      code: formData.code,
      description: formData.description,
      quantity: Number.isFinite(parsedQuantity) ? parsedQuantity : 0,
      company_location: formData.company_location,
      compatible_vehicles: formData.compatible_vehicles,
      unit_price:
        parsedUnitPrice !== null && Number.isFinite(parsedUnitPrice) ? parsedUnitPrice : null,
      // Una regla a medio llenar no cubre nada: mejor no guardarla.
      fitments: formData.fitments.filter((fitment) => !isFitmentEmpty(fitment)),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="code">
            Código
            <RequiredMark />
          </Label>
          <Input
            id="code"
            value={formData.code}
            onChange={(event) => setFormData((prev) => ({ ...prev, code: event.target.value }))}
            placeholder="Ej. WCA-2548"
            required
          />
        </div>
        <div>
          <Label htmlFor="quantity">
            Cantidad en inventario
            <RequiredMark />
          </Label>
          <Input
            id="quantity"
            type="number"
            inputMode="numeric"
            min="0"
            value={formData.quantity}
            onChange={(event) => setFormData((prev) => ({ ...prev, quantity: event.target.value }))}
            onFocus={selectOnFocus}
            placeholder="0"
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="description">
          Descripción
          <RequiredMark />
        </Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(event) =>
            setFormData((prev) => ({ ...prev, description: event.target.value }))
          }
          placeholder="Ej. Filtro de aire para motor Hino serie 500"
          rows={3}
          required
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="company_location">Ubicación en el depósito</Label>
          <Input
            id="company_location"
            value={formData.company_location}
            onChange={(event) =>
              setFormData((prev) => ({ ...prev, company_location: event.target.value }))
            }
            placeholder="Ej. Estante A-3"
          />
        </div>
        <div>
          <Label htmlFor="unit_price">Precio unitario</Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
              $
            </span>
            <Input
              id="unit_price"
              className="pl-7"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={formData.unit_price}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, unit_price: event.target.value }))
              }
              onFocus={selectOnFocus}
              placeholder="0.00"
            />
          </div>
        </div>
      </div>

      <div className="space-y-5 rounded-xl border border-gray-200 p-4">
        <p className="text-sm font-medium text-gray-700">
          ¿A qué unidades les sirve este repuesto?
        </p>

        <div>
          <Label htmlFor="vehicle-search">Unidades concretas</Label>
          <p className="mb-2 text-sm text-gray-500">
            Opcional. Sirve para encontrar el repuesto desde la ficha de cada unidad.
          </p>
          <VehicleSelector
            inputId="vehicle-search"
            vehicles={vehicles}
            selectedVehicles={formData.compatible_vehicles}
            onSelectionChange={(selected) =>
              setFormData((prev) => ({ ...prev, compatible_vehicles: selected }))
            }
          />
        </div>

        <VehicleFitmentRules
          fitments={formData.fitments}
          vehicles={vehicles}
          onChange={(fitments) => setFormData((prev) => ({ ...prev, fitments }))}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" className="bg-primary hover:bg-primary-600">
          {sparePart ? "Guardar cambios" : "Crear repuesto"}
        </Button>
      </div>
    </form>
  );
}
