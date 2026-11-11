import { DOTATION_DELIVERY_STATUS_OPTIONS } from "@/constants/filterOptions";
import { AlertTone } from "@/lib/alertTone";
import { ExpiryStatus, describeExpiry, getExpiryStatus, getExpiryTone } from "@/lib/expiry";
import { getOptionLabel } from "@/lib/filtering";
import { DotationDelivery, DotationItem, DotationStaffMember } from "@/types";

export { DEFAULT_NEAR_DAYS } from "@/lib/expiry";

export type DotationExpiryStatus = ExpiryStatus | "renovada";

export interface DotationDeliveryRow extends DotationDelivery {
  /** Estado calculado en pantalla a partir de `days_to_expiry`. */
  expiry_status: DotationExpiryStatus;
  /** true si es la entrega mas reciente de ese item a esa persona. */
  is_current: boolean;
}

const pairKey = (delivery: DotationDelivery) => `${delivery.staff_member_id}::${delivery.dotation_item_id}`;

const isNewerDelivery = (candidate: DotationDelivery, current: DotationDelivery) => {
  if (candidate.delivered_at !== current.delivered_at) return candidate.delivered_at > current.delivered_at;
  return candidate.created_at > current.created_at;
};

/**
 * El backend calcula el vencimiento de cada entrega por separado, asi que una
 * entrega vieja sigue figurando como vencida aunque la persona ya recibio la
 * renovacion. Aqui solo cuenta la ultima entrega de cada persona e item; las
 * anteriores quedan como "renovada".
 */
export const buildDeliveryRows = (deliveries: DotationDelivery[], nearDays: number): DotationDeliveryRow[] => {
  const latestByPair = new Map<string, DotationDelivery>();

  deliveries.forEach((delivery) => {
    const key = pairKey(delivery);
    const current = latestByPair.get(key);
    if (!current || isNewerDelivery(delivery, current)) latestByPair.set(key, delivery);
  });

  return deliveries.map((delivery) => {
    const isCurrent = latestByPair.get(pairKey(delivery)) === delivery;
    return {
      ...delivery,
      is_current: isCurrent,
      expiry_status: isCurrent ? getExpiryStatus(Number(delivery.days_to_expiry ?? 0), nearDays) : "renovada",
    };
  });
};

const isActive = (entity?: { status?: string | null }) =>
  // Si no se encuentra el registro (lista sin cargar) no se oculta la alerta.
  !entity || (entity.status ?? "active").trim().toLowerCase() === "active";

/**
 * Entregas vigentes de personal e items activos: el personal inactivo ya no
 * recibe dotacion y el backend no permite entregar items inactivos.
 */
export const selectCurrentDeliveries = (
  rows: DotationDeliveryRow[],
  staffMembers: DotationStaffMember[],
  items: DotationItem[]
): DotationDeliveryRow[] => {
  const staffById = new Map(staffMembers.map((staff) => [staff.id, staff]));
  const itemById = new Map(items.map((item) => [item.id, item]));

  return rows.filter(
    (row) =>
      row.is_current &&
      isActive(staffById.get(row.staff_member_id)) &&
      isActive(itemById.get(row.dotation_item_id))
  );
};

export const getExpiryStatusLabel = (status: DotationExpiryStatus) =>
  getOptionLabel(DOTATION_DELIVERY_STATUS_OPTIONS, status);

export const getDeliveryTone = (status: DotationExpiryStatus): AlertTone =>
  status === "renovada" ? "muted" : getExpiryTone(status);

/** Texto corto del vencimiento: "Vencida hace 3 días", "Vence en 5 días"... */
export const getExpiryDetail = (row: Pick<DotationDeliveryRow, "expiry_status" | "days_to_expiry">) =>
  row.expiry_status === "renovada"
    ? "Renovada"
    : describeExpiry(row.expiry_status, Number(row.days_to_expiry ?? 0));
