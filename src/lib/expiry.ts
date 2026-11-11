import { AlertTone, formatDayCount } from "@/lib/alertTone";

/** Dias de anticipacion con los que algo pasa a "por vencer". */
export const DEFAULT_NEAR_DAYS = 30;

export type ExpiryStatus = "vencida" | "por_vencer" | "vigente";

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Dias que faltan hasta una fecha (negativo si ya paso), contando dias de
 * calendario en hora local. `null` si no hay fecha valida.
 */
export const getDaysUntil = (value?: string | null, today: Date = new Date()): number | null => {
  if (!value) return null;

  const match = DATE_ONLY_PATTERN.exec(value.trim());
  if (!match) return null;

  const target = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const base = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((target - base) / MS_PER_DAY);
};

/** Vencida antes de hoy, por vencer dentro de `nearDays`, si no vigente. */
export const getExpiryStatus = (daysToExpiry: number, nearDays: number): ExpiryStatus => {
  if (daysToExpiry < 0) return "vencida";
  if (daysToExpiry <= nearDays) return "por_vencer";
  return "vigente";
};

export const isExpiryAlert = (status: string) => status === "vencida" || status === "por_vencer";

const EXPIRY_TONE: Record<ExpiryStatus, AlertTone> = {
  vencida: "critical",
  por_vencer: "warning",
  vigente: "ok",
};

export const getExpiryTone = (status: ExpiryStatus): AlertTone => EXPIRY_TONE[status];

/** Texto corto: "Vencida hace 3 días", "Vence hoy", "Vence en 5 días", "Vigente". */
export const describeExpiry = (status: ExpiryStatus, daysToExpiry: number, vigenteLabel = "Vigente") => {
  switch (status) {
    case "vencida":
      return `Vencida hace ${formatDayCount(Math.abs(daysToExpiry))}`;
    case "por_vencer":
      return daysToExpiry === 0 ? "Vence hoy" : `Vence en ${formatDayCount(daysToExpiry)}`;
    case "vigente":
      return vigenteLabel;
  }
};
