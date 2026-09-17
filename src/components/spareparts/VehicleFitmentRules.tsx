import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SparePartFitmentPayload, Vehicle } from "@/types";
import {
  getFleetBrands,
  getFleetModels,
  getUnverifiableConditions,
  getVehiclesCoveredByFitment,
} from "./fitmentMatching";
import { AlertTriangle, CheckCircle2, Plus, Trash2 } from "lucide-react";

interface VehicleFitmentRulesProps {
  fitments: SparePartFitmentPayload[];
  vehicles: Vehicle[];
  onChange: (fitments: SparePartFitmentPayload[]) => void;
}

const ANY_MODEL = "__ANY__";

const selectClassName =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

const createEmptyRule = (): SparePartFitmentPayload => ({
  brand: null,
  model: null,
  year_from: null,
  year_to: null,
});

const parseYear = (value: string) => {
  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isFinite(parsed) ? parsed : null;
};

/**
 * "Modelos que usan este repuesto": la alternativa a marcar unidad por unidad.
 *
 * Marca y modelo se eligen de la flota, nunca se escriben: el backend compara
 * el texto exacto, así que una marca tecleada a mano ("Hino" frente a "HINO
 * MOTORS DE VENEZUELA") daría una regla que no cubre nada. Cada regla muestra
 * al momento qué unidades cubre, para que nadie guarde una regla vacía sin
 * darse cuenta.
 */
export function VehicleFitmentRules({ fitments, vehicles, onChange }: VehicleFitmentRulesProps) {
  const brands = useMemo(() => getFleetBrands(vehicles), [vehicles]);

  const updateRule = (index: number, patch: Partial<SparePartFitmentPayload>) => {
    onChange(fitments.map((rule, position) => (position === index ? { ...rule, ...patch } : rule)));
  };

  const removeRule = (index: number) => {
    onChange(fitments.filter((_, position) => position !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Label>Modelos que usan este repuesto</Label>
          <p className="text-sm text-gray-500">
            Opcional. En vez de marcar unidad por unidad, cubre un modelo completo: las unidades
            nuevas de ese modelo quedan cubiertas solas.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 border-primary-200 text-primary hover:bg-primary-50"
          onClick={() => onChange([...fitments, createEmptyRule()])}
          disabled={brands.length === 0}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Agregar modelo
        </Button>
      </div>

      {brands.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500">
          Aún no hay vehículos cargados, así que no hay modelos que elegir.
        </p>
      ) : null}

      {fitments.map((rule, index) => {
        const models = getFleetModels(vehicles, rule.brand);
        const covered = getVehiclesCoveredByFitment(rule, vehicles);
        const extraConditions = getUnverifiableConditions(rule);
        const hasBrand = Boolean(rule.brand?.trim());

        return (
          <div key={index} className="space-y-3 rounded-lg border border-gray-200 p-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor={`rule-brand-${index}`}>Marca</Label>
                <select
                  id={`rule-brand-${index}`}
                  className={selectClassName}
                  value={rule.brand ?? ""}
                  onChange={(event) =>
                    // Cambiar de marca invalida el modelo elegido antes.
                    updateRule(index, { brand: event.target.value || null, model: null })
                  }
                >
                  <option value="">Selecciona una marca...</option>
                  {brands.map((brand) => (
                    <option key={brand} value={brand}>
                      {brand}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor={`rule-model-${index}`}>Modelo</Label>
                <select
                  id={`rule-model-${index}`}
                  className={selectClassName}
                  value={rule.model?.trim() ? rule.model : ANY_MODEL}
                  onChange={(event) =>
                    updateRule(index, {
                      model: event.target.value === ANY_MODEL ? null : event.target.value,
                    })
                  }
                  disabled={!hasBrand}
                >
                  <option value={ANY_MODEL}>Todos los modelos de la marca</option>
                  {models.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor={`rule-year-from-${index}`}>Desde el año</Label>
                <Input
                  id={`rule-year-from-${index}`}
                  type="number"
                  inputMode="numeric"
                  min="1900"
                  value={rule.year_from ?? ""}
                  onChange={(event) => updateRule(index, { year_from: parseYear(event.target.value) })}
                  placeholder="Cualquiera"
                />
              </div>
              <div>
                <Label htmlFor={`rule-year-to-${index}`}>Hasta el año</Label>
                <Input
                  id={`rule-year-to-${index}`}
                  type="number"
                  inputMode="numeric"
                  min="1900"
                  value={rule.year_to ?? ""}
                  onChange={(event) => updateRule(index, { year_to: parseYear(event.target.value) })}
                  placeholder="Cualquiera"
                />
              </div>
            </div>

            {/*
              Condiciones heredadas de reglas creadas con el formulario anterior.
              No se editan aquí porque dependen de la ficha técnica de cada
              unidad, pero se muestran para que nadie las dé por perdidas.
            */}
            {extraConditions.length > 0 ? (
              <p className="text-xs text-gray-500">
                Esta regla además exige {extraConditions.join(", ")}. Se conserva tal cual.
              </p>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-2">
              {!hasBrand ? (
                <p className="text-sm text-gray-500">Elige una marca para ver a qué unidades cubre.</p>
              ) : covered.length > 0 ? (
                <p className="flex items-start gap-1.5 text-sm text-emerald-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    Cubre {extraConditions.length > 0 ? "hasta " : ""}
                    {covered.length} unidad{covered.length !== 1 ? "es" : ""}:{" "}
                    <span className="font-medium">
                      {covered
                        .slice(0, 4)
                        .map((vehicle) => vehicle.plate_number)
                        .join(", ")}
                    </span>
                    {covered.length > 4 ? ` y ${covered.length - 4} más` : ""}
                  </span>
                </p>
              ) : (
                <p className="flex items-start gap-1.5 text-sm text-amber-700">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  Ninguna unidad de la flota coincide con estos datos.
                </p>
              )}

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-red-600 hover:bg-red-50"
                onClick={() => removeRule(index)}
              >
                <Trash2 className="mr-1.5 h-4 w-4" />
                Quitar
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
