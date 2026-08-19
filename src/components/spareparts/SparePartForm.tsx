
import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SparePart, SparePartPayload, Vehicle } from "@/types";
import { VehicleSelector } from "./VehicleSelector";

interface SparePartFormProps {
  sparePart?: SparePart | null;
  vehicles: Vehicle[];
  onSubmit: (sparePart: SparePartPayload) => void;
  onCancel: () => void;
}

interface SparePartFitmentFormData {
  brand: string;
  model: string;
  year_from: string;
  year_to: string;
  engine_type: string;
  engine_code: string;
  fuel_type: string;
  transmission_type: string;
}

interface SparePartFormData {
  code: string;
  description: string;
  quantity: number;
  company_location: string;
  compatible_vehicles: string[];
  unit_price: string;
  fitments: SparePartFitmentFormData[];
}

const createEmptyFitment = (): SparePartFitmentFormData => ({
  brand: "",
  model: "",
  year_from: "",
  year_to: "",
  engine_type: "",
  engine_code: "",
  fuel_type: "",
  transmission_type: "",
});

const createEmptyFormData = (): SparePartFormData => ({
  code: "",
  description: "",
  quantity: 0,
  company_location: "",
  compatible_vehicles: [],
  unit_price: "",
  fitments: [],
});

const mapSparePartToFormData = (sparePart: SparePart): SparePartFormData => ({
  code: sparePart.code,
  description: sparePart.description,
  quantity: sparePart.quantity,
  company_location: sparePart.company_location || "",
  compatible_vehicles: sparePart.compatible_vehicles || [],
  unit_price: sparePart.unit_price != null ? String(sparePart.unit_price) : "",
  fitments:
    sparePart.fitments?.map((fitment) => ({
      brand: fitment.brand || "",
      model: fitment.model || "",
      year_from: fitment.year_from != null ? String(fitment.year_from) : "",
      year_to: fitment.year_to != null ? String(fitment.year_to) : "",
      engine_type: fitment.engine_type || "",
      engine_code: fitment.engine_code || "",
      fuel_type: fitment.fuel_type || "",
      transmission_type: fitment.transmission_type || "",
    })) || [],
});

const parseOptionalYear = (value: string) => {
  const trimmedValue = value.trim();
  if (!trimmedValue) return null;

  const parsed = Number.parseInt(trimmedValue, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

export function SparePartForm({ sparePart, vehicles, onSubmit, onCancel }: SparePartFormProps) {
  const [formData, setFormData] = useState<SparePartFormData>(createEmptyFormData);

  useEffect(() => {
    if (sparePart) {
      setFormData(mapSparePartToFormData(sparePart));
    } else {
      setFormData(createEmptyFormData());
    }
  }, [sparePart]);

  const updateFitment = <K extends keyof SparePartFitmentFormData>(
    index: number,
    field: K,
    value: SparePartFitmentFormData[K]
  ) => {
    setFormData((prev) => ({
      ...prev,
      fitments: prev.fitments.map((fitment, fitmentIndex) =>
        fitmentIndex === index ? { ...fitment, [field]: value } : fitment
      ),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const unitPriceValue = formData.unit_price.trim();
    const parsedUnitPrice =
      unitPriceValue.length > 0 ? Number.parseFloat(unitPriceValue) : null;

    const fitments = formData.fitments
      .map((fitment) => {
        const normalizedFitment = {
          brand: fitment.brand.trim() || null,
          model: fitment.model.trim() || null,
          year_from: parseOptionalYear(fitment.year_from),
          year_to: parseOptionalYear(fitment.year_to),
          engine_type: fitment.engine_type.trim() || null,
          engine_code: fitment.engine_code.trim() || null,
          fuel_type: fitment.fuel_type.trim() || null,
          transmission_type: fitment.transmission_type.trim() || null,
        };

        return Object.values(normalizedFitment).some((value) => value !== null)
          ? normalizedFitment
          : null;
      })
      .filter((fitment): fitment is NonNullable<(typeof fitments)[number]> => fitment !== null);

    onSubmit({
      code: formData.code,
      description: formData.description,
      quantity: formData.quantity,
      company_location: formData.company_location,
      compatible_vehicles: formData.compatible_vehicles,
      unit_price: parsedUnitPrice !== null && Number.isFinite(parsedUnitPrice) ? parsedUnitPrice : null,
      fitments,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="code">Código</Label>
          <Input
            id="code"
            value={formData.code}
            onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="quantity">Cantidad</Label>
          <Input
            id="quantity"
            type="number"
            min="0"
            value={formData.quantity}
            onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="description">Descripción</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="company_location">Ubicación en Empresa</Label>
          <Input
            id="company_location"
            value={formData.company_location}
            onChange={(e) => setFormData(prev => ({ ...prev, company_location: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="unit_price">Precio Unitario</Label>
          <Input
            id="unit_price"
            type="number"
            step="0.01"
            min="0"
            value={formData.unit_price}
            onChange={(e) => setFormData(prev => ({ ...prev, unit_price: e.target.value }))}
          />
        </div>
      </div>

      <div>
        <Label>Vehículos Compatibles por Placa</Label>
        <VehicleSelector
          vehicles={vehicles}
          selectedVehicles={formData.compatible_vehicles}
          onSelectionChange={(selected) => setFormData(prev => ({ ...prev, compatible_vehicles: selected }))}
        />
      </div>

      <div className="space-y-3 rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Label>Compatibilidad Técnica</Label>
            <p className="text-sm text-gray-500">
              Define marca, modelo, años, motor o transmisión para que el backend calcule compatibilidad automática.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setFormData((prev) => ({ ...prev, fitments: [...prev.fitments, createEmptyFitment()] }))}
          >
            <Plus className="mr-2 h-4 w-4" />
            Agregar regla
          </Button>
        </div>

        {formData.fitments.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500">
            Sin reglas técnicas. El repuesto solo quedará asociado a las placas seleccionadas manualmente.
          </div>
        ) : (
          <div className="space-y-3">
            {formData.fitments.map((fitment, index) => (
              <div key={`${index}-${fitment.brand}-${fitment.model}`} className="rounded-lg border border-gray-200 p-3">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-gray-700">Regla técnica {index + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        fitments: prev.fitments.filter((_, fitmentIndex) => fitmentIndex !== index),
                      }))
                    }
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Quitar
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <Label htmlFor={`fitment-brand-${index}`}>Marca</Label>
                    <Input
                      id={`fitment-brand-${index}`}
                      value={fitment.brand}
                      onChange={(e) => updateFitment(index, "brand", e.target.value)}
                      placeholder="Ej. Toyota"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`fitment-model-${index}`}>Modelo</Label>
                    <Input
                      id={`fitment-model-${index}`}
                      value={fitment.model}
                      onChange={(e) => updateFitment(index, "model", e.target.value)}
                      placeholder="Ej. Hilux"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`fitment-year-from-${index}`}>Año Desde</Label>
                    <Input
                      id={`fitment-year-from-${index}`}
                      type="number"
                      min="1900"
                      value={fitment.year_from}
                      onChange={(e) => updateFitment(index, "year_from", e.target.value)}
                      placeholder="Ej. 2018"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`fitment-year-to-${index}`}>Año Hasta</Label>
                    <Input
                      id={`fitment-year-to-${index}`}
                      type="number"
                      min="1900"
                      value={fitment.year_to}
                      onChange={(e) => updateFitment(index, "year_to", e.target.value)}
                      placeholder="Ej. 2024"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`fitment-engine-type-${index}`}>Tipo de Motor</Label>
                    <Input
                      id={`fitment-engine-type-${index}`}
                      value={fitment.engine_type}
                      onChange={(e) => updateFitment(index, "engine_type", e.target.value)}
                      placeholder="Ej. 2.8 Diesel"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`fitment-engine-code-${index}`}>Código de Motor</Label>
                    <Input
                      id={`fitment-engine-code-${index}`}
                      value={fitment.engine_code}
                      onChange={(e) => updateFitment(index, "engine_code", e.target.value)}
                      placeholder="Ej. 1GD-FTV"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`fitment-fuel-type-${index}`}>Combustible</Label>
                    <Input
                      id={`fitment-fuel-type-${index}`}
                      value={fitment.fuel_type}
                      onChange={(e) => updateFitment(index, "fuel_type", e.target.value)}
                      placeholder="Ej. gasoil"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`fitment-transmission-type-${index}`}>Transmisión</Label>
                    <Input
                      id={`fitment-transmission-type-${index}`}
                      value={fitment.transmission_type}
                      onChange={(e) => updateFitment(index, "transmission_type", e.target.value)}
                      placeholder="Ej. manual"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" className="bg-primary hover:bg-primary-600">
          {sparePart ? "Actualizar" : "Crear"}
        </Button>
      </div>
    </form>
  );
}
