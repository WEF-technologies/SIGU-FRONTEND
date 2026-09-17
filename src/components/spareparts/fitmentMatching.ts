import { SparePartFitmentPayload, Vehicle } from "@/types";

/**
 * Replica de las reglas que aplica el backend en `_fitment_match_condition`.
 *
 * Dos detalles que definen todo el diseño de la pantalla:
 *  - Un campo vacío en la regla significa "cualquiera".
 *  - Un campo lleno se compara EXACTO (sin distinguir mayúsculas), no por
 *    fragmento: "Hino" no cubre a "HINO MOTORS DE VENEZUELA". Por eso la UI
 *    hace elegir marca y modelo de la flota en vez de escribirlos.
 */
const textMatches = (ruleValue: string | null | undefined, vehicleValue: string | undefined) => {
  const rule = (ruleValue ?? "").trim();
  if (!rule) return true;

  return rule.toLowerCase() === (vehicleValue ?? "").trim().toLowerCase();
};

const yearMatches = (fitment: SparePartFitmentPayload, vehicleYear: number | undefined) => {
  if (fitment.year_from == null && fitment.year_to == null) return true;
  if (typeof vehicleYear !== "number" || !Number.isFinite(vehicleYear)) return false;

  if (fitment.year_from != null && vehicleYear < fitment.year_from) return false;
  if (fitment.year_to != null && vehicleYear > fitment.year_to) return false;

  return true;
};

/** Condiciones que dependen de la ficha técnica y no se pueden verificar aquí. */
export const getUnverifiableConditions = (fitment: SparePartFitmentPayload) =>
  (
    [
      ["motor", fitment.engine_type],
      ["código de motor", fitment.engine_code],
      ["combustible", fitment.fuel_type],
      ["transmisión", fitment.transmission_type],
    ] as const
  )
    .filter(([, value]) => Boolean(value && String(value).trim()))
    .map(([label, value]) => `${label} ${String(value).trim()}`);

export const isFitmentEmpty = (fitment: SparePartFitmentPayload) =>
  !fitment.brand?.trim() &&
  !fitment.model?.trim() &&
  fitment.year_from == null &&
  fitment.year_to == null &&
  getUnverifiableConditions(fitment).length === 0;

/**
 * Unidades de la flota que cubre la regla, mirando marca, modelo y año.
 * Si la regla además exige motor o transmisión, el resultado es un máximo:
 * el backend lo afina contra la ficha técnica de cada unidad.
 */
export const getVehiclesCoveredByFitment = (
  fitment: SparePartFitmentPayload,
  vehicles: Vehicle[]
): Vehicle[] => {
  if (isFitmentEmpty(fitment)) return [];

  return vehicles.filter(
    (vehicle) =>
      textMatches(fitment.brand, vehicle.brand) &&
      textMatches(fitment.model, vehicle.model) &&
      yearMatches(fitment, vehicle.year)
  );
};

/** Marcas presentes en la flota, tal cual están escritas en cada unidad. */
export const getFleetBrands = (vehicles: Vehicle[]) =>
  Array.from(
    new Set(vehicles.map((vehicle) => vehicle.brand?.trim()).filter((brand): brand is string => Boolean(brand)))
  ).sort((a, b) => a.localeCompare(b, "es"));

/** Modelos de una marca concreta, tal cual están escritos en cada unidad. */
export const getFleetModels = (vehicles: Vehicle[], brand: string | null | undefined) => {
  const normalizedBrand = (brand ?? "").trim().toLowerCase();

  return Array.from(
    new Set(
      vehicles
        .filter(
          (vehicle) => !normalizedBrand || (vehicle.brand ?? "").trim().toLowerCase() === normalizedBrand
        )
        .map((vehicle) => vehicle.model?.trim())
        .filter((model): model is string => Boolean(model))
    )
  ).sort((a, b) => a.localeCompare(b, "es"));
};
