import { FluidProduct, FluidRule, FluidType, Vehicle } from "@/types";
import { ManualFluidMovementType, toDateOnlyLocalValue } from "./fluidConstants";

/**
 * Valores de los formularios de fluidos, con sus defectos y sus mapeos desde
 * la entidad. Viven aparte de los componentes para que cada archivo de
 * formulario exporte solo su componente (requisito de Fast Refresh).
 *
 * Todos los campos son texto: es lo que devuelven los inputs, y la conversión
 * a número ocurre al construir el payload.
 */

export interface FluidProductFormValues {
  code: string;
  fluid_type: FluidType;
  name: string;
  description: string;
  stock_quantity: string;
  min_stock_quantity: string;
  unit: string;
  notes: string;
}

export const DEFAULT_PRODUCT_FORM: FluidProductFormValues = {
  code: "",
  fluid_type: "engine_oil",
  name: "",
  description: "",
  stock_quantity: "",
  min_stock_quantity: "",
  unit: "litros",
  notes: "",
};

export const mapProductToFormValues = (product: FluidProduct): FluidProductFormValues => ({
  code: product.code,
  fluid_type: product.fluid_type,
  name: product.name ?? "",
  description: product.description ?? "",
  stock_quantity: product.stock_quantity.toString(),
  min_stock_quantity: product.min_stock_quantity.toString(),
  unit: product.unit ?? "",
  notes: product.notes ?? "",
});

export interface FluidRuleFormValues {
  vehicle_id: string;
  fluid_type: FluidType;
  product_id: string;
  capacity_liters: string;
  interval_km: string;
  interval_days: string;
  notes: string;
}

export const DEFAULT_RULE_FORM: FluidRuleFormValues = {
  vehicle_id: "",
  fluid_type: "engine_oil",
  product_id: "",
  capacity_liters: "",
  interval_km: "",
  interval_days: "",
  notes: "",
};

export const mapRuleToFormValues = (rule: FluidRule, vehicles: Vehicle[]): FluidRuleFormValues => ({
  // La regla puede venir identificada por id o solo por placa.
  vehicle_id:
    rule.vehicle_id ??
    vehicles.find((vehicle) => vehicle.plate_number === rule.vehicle_plate)?.id ??
    "",
  fluid_type: rule.fluid_type,
  product_id: rule.product_id ?? "",
  capacity_liters: rule.capacity_liters ? String(rule.capacity_liters) : "",
  interval_km: rule.interval_km ? String(rule.interval_km) : "",
  interval_days: rule.interval_days ? String(rule.interval_days) : "",
  notes: rule.notes ?? "",
});

export interface FluidMovementFormValues {
  product_id: string;
  movement_type: ManualFluidMovementType;
  quantity: string;
  occurred_at: string;
  reference: string;
  notes: string;
}

export const createDefaultMovementForm = (): FluidMovementFormValues => ({
  product_id: "",
  movement_type: "purchase",
  quantity: "",
  occurred_at: toDateOnlyLocalValue(),
  reference: "",
  notes: "",
});
