import { FluidMovementType, FluidProduct, FluidType } from "@/types";

/** Constantes y formateadores del módulo de fluidos, compartidos entre la página y sus formularios. */

export const FLUID_TYPE_OPTIONS: Array<{ value: FluidType; label: string }> = [
  { value: "engine_oil", label: "Aceite de motor" },
  { value: "transmission_oil", label: "Aceite de transmisión" },
  { value: "brake_fluid", label: "Líquido de frenos" },
  { value: "hydraulic_oil", label: "Aceite hidráulico" },
  { value: "coolant", label: "Refrigerante" },
  { value: "other", label: "Otro" },
];

export const FLUID_TYPE_LABELS: Record<FluidType, string> = {
  engine_oil: "Aceite motor",
  transmission_oil: "Aceite transmisión",
  brake_fluid: "Líquido frenos",
  hydraulic_oil: "Aceite hidráulico",
  coolant: "Refrigerante",
  other: "Otro",
};

/** Movimientos que se pueden registrar a mano; `service_use` lo genera el sistema. */
export type ManualFluidMovementType = Extract<
  FluidMovementType,
  "purchase" | "adjustment_in" | "adjustment_out"
>;

export const MOVEMENT_OPTIONS: Array<{ value: ManualFluidMovementType; label: string }> = [
  { value: "purchase", label: "Compra" },
  { value: "adjustment_in", label: "Ajuste entrada" },
  { value: "adjustment_out", label: "Ajuste salida" },
];

export const MOVEMENT_LABELS: Record<FluidMovementType, string> = {
  opening_balance: "Saldo inicial",
  purchase: "Compra",
  adjustment_in: "Ajuste entrada",
  adjustment_out: "Ajuste salida",
  service_use: "Uso por servicio",
};

export const toDateOnlyLocalValue = (date: Date = new Date()) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

export const parseNumber = (value: string): number | undefined => {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return parsed;
};

export const formatDate = (value?: string) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

export const formatNumber = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return value.toLocaleString("es-ES", {
    maximumFractionDigits: 2,
  });
};

/** Etiqueta de un producto tal como se muestra en los desplegables. */
export const getProductLabel = (product: FluidProduct) =>
  `${product.code} · ${product.name || product.description || FLUID_TYPE_LABELS[product.fluid_type]}`;
