import { localizeApiErrorPayload } from "@/lib/errorI18n";
import {
  GUIDE_SEVERITY_OPTIONS,
  GUIDE_STATUS_OPTIONS,
  GuideSeverity,
  GuideStatus,
  TROUBLESHOOTING_LIMITS,
  TroubleshootingGuide,
  TroubleshootingGuideFilters,
  TroubleshootingGuidePayload,
} from "@/types";

const API_BASE_URL = `${import.meta.env.VITE_API_URL ?? ""}/api/v1/troubleshooting`;

type AuthenticatedFetch = (url: string, options?: RequestInit) => Promise<Response>;

interface BackendErrorPayload {
  status?: number;
  message?: unknown;
  detail?: unknown;
  error?: unknown;
  code?: string;
  details?: unknown;
}

export class TroubleshootingApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(status: number, message: string, code?: string, details?: unknown) {
    super(message);
    this.name = "TroubleshootingApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const normalizeText = (value?: string | null) => {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const buildQueryString = (params: Record<string, string | number | boolean | undefined>) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    query.append(key, String(value));
  });

  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
};

const parseTroubleshootingApiError = async (
  response: Response,
  fallbackMessage: string
): Promise<TroubleshootingApiError> => {
  let payload: BackendErrorPayload | null = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  const message = localizeApiErrorPayload(payload, fallbackMessage);
  return new TroubleshootingApiError(response.status, message, payload?.code, payload?.details);
};

const requestJson = async (
  authenticatedFetch: AuthenticatedFetch,
  url: string,
  options: RequestInit,
  fallbackMessage: string
) => {
  const response = await authenticatedFetch(url, options);

  if (!response.ok) {
    throw await parseTroubleshootingApiError(response, fallbackMessage);
  }

  return response.json();
};

const readString = (record: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string") return value;
  }

  return "";
};

const readNullableString = (record: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string") return value;
    if (value === null) return null;
  }

  return undefined;
};

const readBoolean = (record: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value > 0;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (["true", "1", "si", "yes"].includes(normalized)) return true;
      if (["false", "0", "no"].includes(normalized)) return false;
    }
  }

  return false;
};

const readSteps = (record: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = record[key];

    if (Array.isArray(value)) {
      return value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean);
    }

    // Tolera backends que devuelvan los pasos como texto con saltos de línea.
    if (typeof value === "string") {
      return value
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
};

const SEVERITY_VALUES = GUIDE_SEVERITY_OPTIONS.map((option) => option.value);
const STATUS_VALUES = GUIDE_STATUS_OPTIONS.map((option) => option.value);

const readSeverity = (record: Record<string, unknown>): GuideSeverity => {
  const raw = readString(record, ["severity"]).trim().toLowerCase();
  return (SEVERITY_VALUES as readonly string[]).includes(raw) ? (raw as GuideSeverity) : "media";
};

const readStatus = (record: Record<string, unknown>): GuideStatus => {
  const raw = readString(record, ["status"]).trim().toLowerCase();
  return (STATUS_VALUES as readonly string[]).includes(raw) ? (raw as GuideStatus) : "activa";
};

const extractItemsFromPayload = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) return payload;
  if (!isRecord(payload)) return [];

  const directCandidates = [payload.items, payload.results, payload.data, payload.guides];
  for (const candidate of directCandidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  if (isRecord(payload.data)) {
    if (Array.isArray(payload.data.items)) return payload.data.items;
    if (Array.isArray(payload.data.results)) return payload.data.results;
    if (Array.isArray(payload.data.guides)) return payload.data.guides;
  }

  return [];
};

const extractEntityFromPayload = (payload: unknown) => {
  if (isRecord(payload) && isRecord(payload.data)) {
    return payload.data;
  }

  return payload;
};

export const normalizeGuide = (value: unknown): TroubleshootingGuide => {
  const guide = isRecord(value) ? value : {};

  const code = readString(guide, ["code", "guide_code"]).trim().toUpperCase();
  const explicitId = readString(guide, ["id", "guide_id", "_id"]);

  return {
    // El código es único en el backend, así que sirve de identidad si falta el id.
    id: explicitId || code || readString(guide, ["title"]) || "guide",
    code,
    title: readString(guide, ["title", "name"]),
    category: readString(guide, ["category"]).trim().toLowerCase(),
    symptom: readString(guide, ["symptom", "symptoms"]),
    probable_causes: readNullableString(guide, ["probable_causes", "causes"]) ?? null,
    resolution_steps: readSteps(guide, ["resolution_steps", "steps"]),
    severity: readSeverity(guide),
    requires_workshop: readBoolean(guide, ["requires_workshop", "needs_workshop"]),
    safety_notes: readNullableString(guide, ["safety_notes"]) ?? null,
    prevention_tips: readNullableString(guide, ["prevention_tips"]) ?? null,
    status: readStatus(guide),
    notes: readNullableString(guide, ["notes"]) ?? null,
    created_at: readString(guide, ["created_at"]),
    updated_at: readString(guide, ["updated_at"]),
  };
};

const normalizeGuideList = (value: unknown): TroubleshootingGuide[] =>
  extractItemsFromPayload(value).map((item) => normalizeGuide(item));

/**
 * Aplica las mismas normalizaciones que hace el backend (código en mayúsculas,
 * etiquetas en minúsculas, pasos sin vacíos) para que lo mostrado tras guardar
 * coincida con lo persistido y para no gastar un round-trip en un 400 evitable.
 */
const sanitizeGuidePayload = (payload: TroubleshootingGuidePayload) => ({
  code: payload.code.trim().toUpperCase(),
  title: payload.title.trim(),
  category: payload.category.trim().toLowerCase(),
  symptom: payload.symptom.trim(),
  probable_causes: normalizeText(payload.probable_causes),
  resolution_steps: payload.resolution_steps
    .map((step) => step.trim())
    .filter(Boolean)
    .slice(0, TROUBLESHOOTING_LIMITS.maxSteps),
  severity: payload.severity,
  requires_workshop: Boolean(payload.requires_workshop),
  safety_notes: normalizeText(payload.safety_notes),
  prevention_tips: normalizeText(payload.prevention_tips),
  status: payload.status,
  notes: normalizeText(payload.notes),
});

export const troubleshootingApi = {
  list: async (
    authenticatedFetch: AuthenticatedFetch,
    filters: TroubleshootingGuideFilters = {}
  ): Promise<TroubleshootingGuide[]> => {
    const query = buildQueryString({
      q: normalizeText(filters.search) ?? undefined,
      category: normalizeText(filters.category)?.toLowerCase() ?? undefined,
      severity: normalizeText(filters.severity) ?? undefined,
      status: normalizeText(filters.status) ?? undefined,
      requires_workshop: filters.requires_workshop,
      limit: filters.limit,
      offset: filters.offset,
    });

    const payload = await requestJson(
      authenticatedFetch,
      `${API_BASE_URL}/${query}`,
      { method: "GET" },
      "No se pudo cargar el manual de fallas."
    );

    return normalizeGuideList(payload);
  },

  getById: async (
    authenticatedFetch: AuthenticatedFetch,
    guideId: string
  ): Promise<TroubleshootingGuide> => {
    const payload = await requestJson(
      authenticatedFetch,
      `${API_BASE_URL}/${encodeURIComponent(guideId)}`,
      { method: "GET" },
      "No se pudo cargar la falla solicitada."
    );

    return normalizeGuide(extractEntityFromPayload(payload));
  },

  create: async (
    authenticatedFetch: AuthenticatedFetch,
    payload: TroubleshootingGuidePayload
  ): Promise<TroubleshootingGuide> => {
    const response = await requestJson(
      authenticatedFetch,
      `${API_BASE_URL}/`,
      {
        method: "POST",
        body: JSON.stringify(sanitizeGuidePayload(payload)),
      },
      "No se pudo registrar la falla."
    );

    return normalizeGuide(extractEntityFromPayload(response));
  },

  update: async (
    authenticatedFetch: AuthenticatedFetch,
    guideId: string,
    payload: TroubleshootingGuidePayload
  ): Promise<TroubleshootingGuide> => {
    const response = await requestJson(
      authenticatedFetch,
      `${API_BASE_URL}/${encodeURIComponent(guideId)}`,
      {
        method: "PUT",
        body: JSON.stringify(sanitizeGuidePayload(payload)),
      },
      "No se pudo actualizar la falla."
    );

    return normalizeGuide(extractEntityFromPayload(response));
  },

  remove: async (authenticatedFetch: AuthenticatedFetch, guideId: string): Promise<void> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/${encodeURIComponent(guideId)}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw await parseTroubleshootingApiError(response, "No se pudo eliminar la falla.");
    }
  },
};
