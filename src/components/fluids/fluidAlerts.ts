import { AlertTone, formatDayCount } from "@/lib/alertTone";
import { FluidAlert, FluidProduct } from "@/types";
import { FLUID_TYPE_LABELS, formatNumber } from "./fluidConstants";

export interface FluidAlertView {
  /** Problema en pocas palabras: "Servicio vencido", "Stock bajo"... */
  label: string;
  /** Numeros que explican el problema: "Excedido por 1.200 km", "Quedan 2 L"... */
  detail: string;
  tone: AlertTone;
}

const formatKm = (km: number) => `${formatNumber(Math.abs(km))} km`;

const describeService = (alert: FluidAlert): FluidAlertView => {
  const km = alert.due_km;
  const days = alert.due_days;

  if (alert.status === "missing") {
    return { label: "Sin servicio registrado", detail: "No hay ningún cambio registrado para esta unidad.", tone: "critical" };
  }

  // Sin `status` (respuesta antigua) se decide por la severidad.
  if (alert.status === "due" || (!alert.status && alert.severity === "critical")) {
    const parts: string[] = [];
    if (typeof km === "number" && km <= 0) parts.push(`excedido por ${formatKm(km)}`);
    if (typeof days === "number" && days <= 0) parts.push(`atrasado ${formatDayCount(Math.abs(days))}`);
    const detail = parts.length > 0 ? parts.join(" · ") : "Ya pasó el intervalo de cambio.";
    return { label: "Servicio vencido", detail: detail.charAt(0).toUpperCase() + detail.slice(1), tone: "critical" };
  }

  const parts: string[] = [];
  if (typeof km === "number" && km > 0) parts.push(formatKm(km));
  if (typeof days === "number" && days > 0) parts.push(formatDayCount(days));
  const detail = parts.length > 0 ? `Faltan ${parts.join(" o ")}` : "Cerca del intervalo de cambio.";
  return { label: "Servicio próximo", detail, tone: "warning" };
};

const describeStock = (alert: FluidAlert, product?: FluidProduct): FluidAlertView => {
  const unit = product?.unit ? ` ${product.unit}` : "";
  const current = alert.current_stock ?? product?.stock_quantity;
  const minimum = alert.min_stock ?? product?.min_stock_quantity;
  const isOut = alert.status === "out_of_stock" || (typeof current === "number" && current <= 0);

  const detail =
    typeof current === "number"
      ? `Quedan ${formatNumber(current)}${unit}${typeof minimum === "number" ? ` (mínimo ${formatNumber(minimum)}${unit})` : ""}`
      : "Por debajo del mínimo.";

  return isOut
    ? { label: "Sin stock", detail, tone: "critical" }
    : { label: "Stock bajo", detail, tone: "warning" };
};

/** Traduce la alerta del backend a algo que se lee de un vistazo. */
export const describeFluidAlert = (alert: FluidAlert, product?: FluidProduct): FluidAlertView =>
  alert.kind === "stock" ? describeStock(alert, product) : describeService(alert);

/** A que se refiere la alerta: la unidad (servicio) o el producto (stock). */
export const getFluidAlertSubject = (alert: FluidAlert, product?: FluidProduct) => {
  const fluidLabel = alert.fluid_type ? FLUID_TYPE_LABELS[alert.fluid_type] : "Fluido";

  if (alert.kind === "stock") {
    const name = alert.product_name || product?.name || alert.product_code || "Producto";
    return { primary: name, secondary: `Inventario · ${alert.product_code ?? fluidLabel}` };
  }

  return {
    primary: alert.vehicle_plate || "Unidad",
    secondary: alert.product_code ? `${fluidLabel} · ${alert.product_code}` : fluidLabel,
  };
};

export const isFluidAlertActive = (alert: FluidAlert) => alert.severity === "critical" || alert.severity === "warning";
