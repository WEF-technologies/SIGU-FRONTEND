import { MaintenanceAlert } from "@/types";

/** Margen en km para avisar que un mantenimiento está próximo (igual que el backend). */
export const MAINTENANCE_NEAR_THRESHOLD_KM = 500;

/** Km en el que toca el mantenimiento. Sin registro previo, el ciclo cuenta desde 0. */
export const getAlertDueKm = (alert: Pick<MaintenanceAlert, "last_km" | "interval">) =>
  (alert.last_km ?? 0) + alert.interval;

/** Km que el vehículo lleva pasado del mantenimiento; 0 si todavía no toca. */
export const getAlertOverdueKm = (alert: Pick<MaintenanceAlert, "remaining_km">) =>
  alert.remaining_km < 0 ? -alert.remaining_km : 0;

/**
 * Recalcula el estado de una alerta de `/maintenances/alerts` a partir de sus
 * kilometrajes, porque el backend la entrega con dos defectos que ensucian la
 * vista:
 *
 * - Un tipo sin ningún registro llega como "missing" con severidad 5 (crítica)
 *   sin mirar el kilometraje: una unidad con 11.000 km sale en rojo por no
 *   tener un M5 que toca a los 45.000. Aquí el primer ciclo cuenta desde 0 km,
 *   así que solo queda como pendiente si el vehículo ya pasó ese kilometraje.
 * - `remaining_km` llega en 0 cuando el mantenimiento está vencido, de modo que
 *   no se sabe por cuánto. Aquí queda negativo: los km excedidos.
 *
 * Estados resultantes: "ok", "near", "due" (vencido, con registro previo) y
 * "missing" (vencido y nunca registrado).
 */
export function normalizeMaintenanceAlert(alert: MaintenanceAlert): MaintenanceAlert {
  const interval = Number(alert.interval);
  const currentKm = Number(alert.current_km);
  if (!Number.isFinite(interval) || interval <= 0 || !Number.isFinite(currentKm)) {
    return alert;
  }

  const lastKm =
    typeof alert.last_km === "number" && Number.isFinite(alert.last_km) ? alert.last_km : null;
  const remaining = (lastKm ?? 0) + interval - currentKm;

  if (remaining > 0) {
    const isNear = remaining <= MAINTENANCE_NEAR_THRESHOLD_KM;
    return {
      ...alert,
      last_km: lastKm,
      remaining_km: remaining,
      status: isNear ? "near" : "ok",
      severity: isNear ? 2 : 1,
    };
  }

  // Misma escala del backend: 3 al vencer y un punto más por cada tercio de
  // intervalo excedido, con tope en 5.
  const overdueSteps = Math.floor(-remaining / Math.max(1, interval / 3));
  return {
    ...alert,
    last_km: lastKm,
    remaining_km: remaining,
    status: lastKm === null ? "missing" : "due",
    severity: Math.min(5, 3 + overdueSteps),
  };
}
