import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MAX_SPECIFICATION_LOOKUPS, useVehicleSpecifications } from "@/hooks/useVehicleSpecifications";
import { SparePartFitmentPayload, Vehicle } from "@/types";
import {
  SPEC_CONDITION_FIELDS,
  getFleetBrands,
  getFleetModels,
  getSpecificationOptions,
  hasSpecConditions,
  matchesVehicleBasics,
  matchesVehicleSpecification,
} from "./fitmentMatching";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";

interface VehicleFitmentRulesProps {
  fitments: SparePartFitmentPayload[];
  vehicles: Vehicle[];
  onChange: (fitments: SparePartFitmentPayload[]) => void;
}

const ANY_VALUE = "__ANY__";

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

interface FitmentRuleCardProps {
  rule: SparePartFitmentPayload;
  index: number;
  vehicles: Vehicle[];
  onUpdate: (patch: Partial<SparePartFitmentPayload>) => void;
  onRemove: () => void;
}

function FitmentRuleCard({ rule, index, vehicles, onUpdate, onRemove }: FitmentRuleCardProps) {
  // Una regla que ya trae condiciones de ficha abre ese bloque, para que nadie
  // las tenga escondidas sin saberlo.
  const [showSpecFilters, setShowSpecFilters] = useState(() => hasSpecConditions(rule));

  const brands = useMemo(() => getFleetBrands(vehicles), [vehicles]);
  const models = useMemo(() => getFleetModels(vehicles, rule.brand), [rule.brand, vehicles]);
  const hasBrand = Boolean(rule.brand?.trim());

  /** Unidades que cubre mirando solo marca, modelo y año. */
  const basicMatches = useMemo(
    () => (hasBrand ? vehicles.filter((vehicle) => matchesVehicleBasics(rule, vehicle)) : []),
    [hasBrand, rule, vehicles]
  );

  const plates = useMemo(
    () => basicMatches.map((vehicle) => vehicle.plate_number),
    [basicMatches]
  );

  const ruleHasSpecConditions = hasSpecConditions(rule);
  const needsSpecifications = showSpecFilters || ruleHasSpecConditions;

  const { specifications, isLoading, isTruncated } = useVehicleSpecifications(
    plates,
    needsSpecifications && plates.length > 0 && plates.length <= MAX_SPECIFICATION_LOOKUPS
  );

  const specificationsReady =
    needsSpecifications && !isLoading && !isTruncated && specifications.size === plates.length;

  const covered = useMemo(() => {
    if (!ruleHasSpecConditions || !specificationsReady) return basicMatches;

    return basicMatches.filter((vehicle) =>
      matchesVehicleSpecification(rule, specifications.get(vehicle.plate_number))
    );
  }, [basicMatches, rule, ruleHasSpecConditions, specifications, specificationsReady]);

  /** Sin las fichas cargadas el conteo es un máximo, no la cobertura real. */
  const isUpperBound = ruleHasSpecConditions && !specificationsReady;

  const vehiclesWithoutSpecification = useMemo(
    () =>
      specificationsReady
        ? basicMatches.filter((vehicle) => !specifications.get(vehicle.plate_number))
        : [],
    [basicMatches, specifications, specificationsReady]
  );

  const loadedSpecifications = useMemo(() => Array.from(specifications.values()), [specifications]);

  return (
    <div className="space-y-3 rounded-lg border border-gray-200 p-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor={`rule-brand-${index}`}>Marca</Label>
          <select
            id={`rule-brand-${index}`}
            className={selectClassName}
            value={rule.brand ?? ""}
            onChange={(event) =>
              // Cambiar de marca invalida el modelo elegido antes.
              onUpdate({ brand: event.target.value || null, model: null })
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
            value={rule.model?.trim() ? rule.model : ANY_VALUE}
            onChange={(event) =>
              onUpdate({ model: event.target.value === ANY_VALUE ? null : event.target.value })
            }
            disabled={!hasBrand}
          >
            <option value={ANY_VALUE}>Todos los modelos de la marca</option>
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
            onChange={(event) => onUpdate({ year_from: parseYear(event.target.value) })}
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
            onChange={(event) => onUpdate({ year_to: parseYear(event.target.value) })}
            placeholder="Cualquiera"
          />
        </div>
      </div>

      {hasBrand ? (
        <div className="rounded-lg bg-gray-50 p-3">
          <button
            type="button"
            className="flex w-full items-center gap-1.5 text-left text-sm font-medium text-gray-700"
            onClick={() => setShowSpecFilters((open) => !open)}
            aria-expanded={showSpecFilters}
          >
            {showSpecFilters ? (
              <ChevronDown className="h-4 w-4 shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0" />
            )}
            Afinar por ficha técnica
            <span className="font-normal text-gray-500">(opcional)</span>
          </button>

          {showSpecFilters ? (
            <div className="mt-3 space-y-3">
              <p className="text-sm text-gray-500">
                Úsalo solo si el repuesto no sirve para todas las unidades de ese modelo. Las
                opciones salen de las fichas técnicas de las unidades que cubre la regla.
              </p>

              {isLoading ? (
                <p className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cargando fichas técnicas...
                </p>
              ) : isTruncated ? (
                <p className="flex items-start gap-1.5 text-sm text-amber-700">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  La regla cubre demasiadas unidades para revisar sus fichas. Acota primero la
                  marca, el modelo o los años.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {SPEC_CONDITION_FIELDS.map(({ key, label }) => {
                      const fleetOptions = getSpecificationOptions(loadedSpecifications, key);
                      const currentValue = rule[key]?.trim() ?? "";
                      // El valor guardado se ofrece aunque ninguna ficha cargada lo tenga.
                      const options = currentValue && !fleetOptions.includes(currentValue)
                        ? [currentValue, ...fleetOptions]
                        : fleetOptions;

                      return (
                        <div key={key}>
                          <Label htmlFor={`rule-${key}-${index}`}>{label}</Label>
                          <select
                            id={`rule-${key}-${index}`}
                            className={selectClassName}
                            value={currentValue || ANY_VALUE}
                            onChange={(event) =>
                              onUpdate({
                                [key]: event.target.value === ANY_VALUE ? null : event.target.value,
                              })
                            }
                            disabled={options.length === 0}
                          >
                            <option value={ANY_VALUE}>
                              {options.length === 0 ? "Sin datos en las fichas" : "Cualquiera"}
                            </option>
                            {options.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>

                  {vehiclesWithoutSpecification.length > 0 ? (
                    <p className="flex items-start gap-1.5 text-sm text-amber-700">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      {vehiclesWithoutSpecification.length} de {basicMatches.length} unidades no
                      tienen ficha técnica cargada ({vehiclesWithoutSpecification
                        .slice(0, 3)
                        .map((vehicle) => vehicle.plate_number)
                        .join(", ")}
                      ). Si afinas por ficha, quedan fuera.
                    </p>
                  ) : null}
                </>
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        {!hasBrand ? (
          <p className="text-sm text-gray-500">Elige una marca para ver a qué unidades cubre.</p>
        ) : covered.length > 0 ? (
          <p className="flex items-start gap-1.5 text-sm text-emerald-700">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Cubre {isUpperBound ? "hasta " : ""}
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
          onClick={onRemove}
        >
          <Trash2 className="mr-1.5 h-4 w-4" />
          Quitar
        </Button>
      </div>
    </div>
  );
}

/**
 * "Modelos que usan este repuesto": la alternativa a marcar unidad por unidad.
 *
 * Nada se escribe a mano: el backend compara el texto exacto, así que una marca
 * tecleada ("Hino" frente a "HINO MOTORS DE VENEZUELA") daría una regla que no
 * cubre nada. Cada regla muestra al momento qué unidades cubre.
 */
export function VehicleFitmentRules({ fitments, vehicles, onChange }: VehicleFitmentRulesProps) {
  const brands = useMemo(() => getFleetBrands(vehicles), [vehicles]);

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

      {fitments.map((rule, index) => (
        <FitmentRuleCard
          key={index}
          rule={rule}
          index={index}
          vehicles={vehicles}
          onUpdate={(patch) =>
            onChange(
              fitments.map((item, position) => (position === index ? { ...item, ...patch } : item))
            )
          }
          onRemove={() => onChange(fitments.filter((_, position) => position !== index))}
        />
      ))}
    </div>
  );
}
