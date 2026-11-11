import { ExpiryStatus, getDaysUntil, getExpiryStatus } from "@/lib/expiry";
import { Tool, ToolStatus } from "@/types";

export const TOOL_STATUS_OPTIONS: Array<{ value: ToolStatus; label: string }> = [
  { value: "disponible", label: "Disponible" },
  { value: "en_uso", label: "En uso" },
  { value: "en_mantenimiento", label: "En mantenimiento" },
  { value: "retirada", label: "Retirada" },
];

export interface ToolRow extends Tool {
  /** Dias hasta `expiry_date` (negativo si ya vencio); null sin fecha. */
  days_to_expiry: number | null;
  /** null si no tiene fecha o esta retirada: no genera alerta. */
  expiry_status: ExpiryStatus | null;
}

/**
 * El vencimiento se calcula aqui sobre la lista completa en lugar de pedir
 * /tools/alerts: una sola consulta, y las herramientas retiradas (que el
 * backend si incluye) no generan alertas.
 */
export const buildToolRows = (tools: Tool[], nearDays: number, today: Date = new Date()): ToolRow[] =>
  tools.map((tool) => {
    const days = getDaysUntil(tool.expiry_date, today);
    const tracksExpiry = days !== null && tool.status !== "retirada";
    return {
      ...tool,
      days_to_expiry: days,
      expiry_status: tracksExpiry ? getExpiryStatus(days, nearDays) : null,
    };
  });
