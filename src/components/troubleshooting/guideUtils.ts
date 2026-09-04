import { GUIDE_SEVERITY_OPTIONS, GUIDE_STATUS_OPTIONS, GuideSeverity, GuideStatus } from "@/types";

const severityLabels = new Map<string, string>(
  GUIDE_SEVERITY_OPTIONS.map((option) => [option.value, option.label])
);

const statusLabels = new Map<string, string>(
  GUIDE_STATUS_OPTIONS.map((option) => [option.value, option.label])
);

export const formatSeverity = (severity: GuideSeverity | string) =>
  severityLabels.get(severity) ?? severity;

export const formatStatus = (status: GuideStatus | string) => statusLabels.get(status) ?? status;

/** Las categorías se guardan en minúsculas; se capitalizan solo para mostrarlas. */
export const formatCategory = (category: string) => {
  const trimmed = (category ?? "").trim();
  if (!trimmed) return "Sin categoria";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
};

export const getSeverityBadgeClass = (severity: GuideSeverity | string) => {
  switch (severity) {
    case "critica":
      return "border-red-200 bg-red-50 text-red-700";
    case "alta":
      return "border-orange-200 bg-orange-50 text-orange-700";
    case "media":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "baja":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
};

export const getStatusBadgeClass = (status: GuideStatus | string) =>
  status === "inactiva"
    ? "border-slate-200 bg-slate-50 text-slate-600"
    : "border-emerald-200 bg-emerald-50 text-emerald-700";

/** Orden de mayor a menor urgencia, para listar primero lo que frena la unidad. */
const severityWeight: Record<string, number> = {
  critica: 4,
  alta: 3,
  media: 2,
  baja: 1,
};

export const getSeverityWeight = (severity: GuideSeverity | string) => severityWeight[severity] ?? 0;

export const formatGuideDate = (value?: string | null) => {
  if (!value) return "-";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";

  return parsed.toLocaleDateString("es-VE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};
