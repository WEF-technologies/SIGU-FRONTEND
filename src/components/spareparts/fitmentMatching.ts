import { SparePartFitmentPayload, Vehicle, VehicleSpecification } from "@/types";

/**
 * Replica de las reglas que aplica el backend en `_fitment_match_condition`.
 *
 * Tres detalles que definen todo el diseño de la pantalla:
 *  - Un campo vacío en la regla significa "cualquiera".
 *  - Un campo lleno se compara EXACTO (sin distinguir mayúsculas), no por
 *    fragmento: "Hino" no cubre a "HINO MOTORS DE VENEZUELA". Por eso la UI
 *    hace elegir de la flota en vez de escribir.
 *  - Si la unidad no tiene ese dato cargado, la regla que sí lo exige NO la
 *    cubre. De ahí el aviso sobre unidades sin ficha técnica.
 */
const textMatches = (ruleValue: string | null | undefined, vehicleValue: string | null | undefined) => {
  const rule = (ruleValue ?? "").trim();
  if (!rule) return true;

  const vehicle = (vehicleValue ?? "").trim();
  if (!vehicle) return false;

  return rule.toLowerCase() === vehicle.toLowerCase();
};

const yearMatches = (fitment: SparePartFitmentPayload, vehicleYear: number | undefined) => {
  if (fitment.year_from == null && fitment.year_to == null) return true;
  if (typeof vehicleYear !== "number" || !Number.isFinite(vehicleYear)) return false;

  if (fitment.year_from != null && vehicleYear < fitment.year_from) return false;
  if (fitment.year_to != null && vehicleYear > fitment.year_to) return false;

  return true;
};

/** Campos de la regla que se validan contra la ficha técnica de cada unidad. */
export const SPEC_CONDITION_FIELDS = [
  { key: "engine_type", label: "Motor" },
  { key: "engine_code", label: "Código de motor" },
  { key: "fuel_type", label: "Combustible" },
  { key: "transmission_type", label: "Transmisión" },
] as const;

export type SpecConditionField = (typeof SPEC_CONDITION_FIELDS)[number]["key"];

export const hasSpecConditions = (fitment: SparePartFitmentPayload) =>
  SPEC_CONDITION_FIELDS.some(({ key }) => Boolean(fitment[key]?.trim()));

export const isFitmentEmpty = (fitment: SparePartFitmentPayload) =>
  !fitment.brand?.trim() &&
  !fitment.model?.trim() &&
  fitment.year_from == null &&
  fitment.year_to == null &&
  !hasSpecConditions(fitment);

/** Coincidencia por marca, modelo y año: lo que se puede saber sin la ficha. */
export const matchesVehicleBasics = (fitment: SparePartFitmentPayload, vehicle: Vehicle) =>
  textMatches(fitment.brand, vehicle.brand) &&
  textMatches(fitment.model, vehicle.model) &&
  yearMatches(fitment, vehicle.year);

/** Coincidencia de las condiciones que dependen de la ficha técnica. */
export const matchesVehicleSpecification = (
  fitment: SparePartFitmentPayload,
  specification: VehicleSpecification | null | undefined
) =>
  SPEC_CONDITION_FIELDS.every(({ key }) =>
    textMatches(fitment[key], specification ? specification[key] : null)
  );

/**
 * Unidades de la flota que cubre la regla.
 *
 * Sin el mapa de fichas técnicas el resultado es un máximo (solo marca,
 * modelo y año); con él, es la cobertura real.
 */
export const getVehiclesCoveredByFitment = (
  fitment: SparePartFitmentPayload,
  vehicles: Vehicle[],
  specifications?: Map<string, VehicleSpecification | null>
): Vehicle[] => {
  if (isFitmentEmpty(fitment)) return [];

  return vehicles.filter((vehicle) => {
    if (!matchesVehicleBasics(fitment, vehicle)) return false;
    if (!specifications) return true;

    return matchesVehicleSpecification(fitment, specifications.get(vehicle.plate_number));
  });
};

/** Marcas presentes en la flota, tal cual están escritas en cada unidad. */
export const getFleetBrands = (vehicles: Vehicle[]) =>
  Array.from(
    new Set(
      vehicles.map((vehicle) => vehicle.brand?.trim()).filter((brand): brand is string => Boolean(brand))
    )
  ).sort((a, b) => a.localeCompare(b, "es"));

/** Modelos de una marca concreta, tal cual están escritos en cada unidad. */
export const getFleetModels = (vehicles: Vehicle[], brand: string | null | undefined) => {
  const normalizedBrand = (brand ?? "").trim().toLowerCase();

  return Array.from(
    new Set(
      vehicles
        .filter(
          (vehicle) =>
            !normalizedBrand || (vehicle.brand ?? "").trim().toLowerCase() === normalizedBrand
        )
        .map((vehicle) => vehicle.model?.trim())
        .filter((model): model is string => Boolean(model))
    )
  ).sort((a, b) => a.localeCompare(b, "es"));
};

/** Valores distintos de un campo técnico entre las fichas ya cargadas. */
export const getSpecificationOptions = (
  specifications: Array<VehicleSpecification | null | undefined>,
  field: SpecConditionField
) =>
  Array.from(
    new Set(
      specifications
        .map((specification) => specification?.[field]?.trim())
        .filter((value): value is string => Boolean(value))
    )
  ).sort((a, b) => a.localeCompare(b, "es"));
