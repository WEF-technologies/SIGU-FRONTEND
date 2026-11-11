/**
 * Paleta unica para alertas en todos los modulos: rojo = atender ya,
 * ambar = atender pronto, verde = al dia, gris = sin efecto.
 */
export type AlertTone = "critical" | "warning" | "ok" | "muted";

const ALERT_TONE_BADGE_CLASS: Record<AlertTone, string> = {
  critical: "border-red-200 bg-red-50 text-red-700",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  ok: "border-emerald-200 bg-emerald-50 text-emerald-700",
  muted: "border-slate-200 bg-slate-50 text-slate-500",
};

export const getAlertToneBadgeClass = (tone: AlertTone) => ALERT_TONE_BADGE_CLASS[tone];

export const pluralize = (count: number, singular: string, plural: string) => (count === 1 ? singular : plural);

export const formatDayCount = (days: number) => `${days} ${pluralize(days, "día", "días")}`;
