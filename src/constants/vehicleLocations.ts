import { normalizeSearchText } from "@/lib/filtering";
import { VEHICLE_SEDE_STATUS_OPTIONS } from "@/constants/filterOptions";

/**
 * Cómo se ve el `status` de un vehículo. El backend guarda la sede en `status`
 * ("Barcelona", "Puerto Ordaz"...), y una unidad con sede cuenta como
 * operativa. Cada sede tiene su propio color para que se distinga de un
 * vistazo en la lista y en el detalle; los estados operativos (operativa,
 * mantenimiento, inactiva) usan un punto en vez del pin de ubicación.
 */
export interface VehicleStatusAppearance {
  kind: "status" | "sede";
  /** Texto de la etiqueta. */
  label: string;
  /** Frase completa, p. ej. "Operativa en Barcelona". */
  description: string;
  /** Fondo, texto y borde de la etiqueta. */
  badgeClassName: string;
  /** Color sólido de la sede o estado (punto, franja lateral, barra). */
  accentClassName: string;
  /** Fondo muy suave para cabeceras. */
  tintClassName: string;
}

const SEDE_APPEARANCE: Record<string, Omit<VehicleStatusAppearance, "kind" | "label" | "description">> = {
  // Río Caroní / Orinoco: azul de río.
  "puerto ordaz": {
    badgeClassName: "bg-sky-50 text-sky-900 border-sky-300",
    accentClassName: "bg-sky-600",
    tintClassName: "bg-sky-50",
  },
  // Costa de Anzoátegui: magenta.
  barcelona: {
    badgeClassName: "bg-fuchsia-50 text-fuchsia-900 border-fuchsia-300",
    accentClassName: "bg-fuchsia-600",
    tintClassName: "bg-fuchsia-50",
  },
  // Zona minera de hierro: tierra.
  "ciudad piar": {
    badgeClassName: "bg-orange-50 text-orange-900 border-orange-300",
    accentClassName: "bg-orange-700",
    tintClassName: "bg-orange-50",
  },
};

const UNKNOWN_SEDE_APPEARANCE = {
  badgeClassName: "bg-slate-50 text-slate-800 border-slate-300",
  accentClassName: "bg-slate-500",
  tintClassName: "bg-slate-50",
};

const STATUS_APPEARANCE: Record<string, Omit<VehicleStatusAppearance, "kind">> = {
  available: {
    label: "Operativa",
    description: "Operativa, sin sede asignada",
    badgeClassName: "bg-emerald-50 text-emerald-900 border-emerald-300",
    accentClassName: "bg-emerald-600",
    tintClassName: "bg-emerald-50",
  },
  maintenance: {
    label: "En mantenimiento",
    description: "En mantenimiento",
    badgeClassName: "bg-amber-50 text-amber-900 border-amber-300",
    accentClassName: "bg-amber-500",
    tintClassName: "bg-amber-50",
  },
  out_of_service: {
    label: "Inactiva",
    description: "Inactiva, fuera de servicio",
    badgeClassName: "bg-red-50 text-red-900 border-red-300",
    accentClassName: "bg-red-600",
    tintClassName: "bg-red-50",
  },
};

export const isSedeStatus = (status: string) => !(status in STATUS_APPEARANCE);

export const getVehicleStatusAppearance = (status: string): VehicleStatusAppearance => {
  const known = STATUS_APPEARANCE[status];
  if (known) return { kind: "status", ...known };

  const key = normalizeSearchText(status);
  const knownSede = VEHICLE_SEDE_STATUS_OPTIONS.find((option) => normalizeSearchText(option.value) === key);
  const label = knownSede?.label ?? (status.trim() || "Sin estado");

  return {
    kind: "sede",
    label,
    description: `Operativa en ${label}`,
    ...(SEDE_APPEARANCE[key] ?? UNKNOWN_SEDE_APPEARANCE),
  };
};
