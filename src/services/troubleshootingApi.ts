import {
  ApiError,
  AuthenticatedFetch,
  buildQueryString,
  clampText,
  extractEntity,
  extractItems,
  isRecord,
  normalizeText,
  readBoolean,
  readNullableString,
  readString,
  requestJson,
  requestVoid,
} from "@/lib/apiClient";
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

/** Tope duro del backend para `limit`; se respeta al pedir una pagina. */
const MAX_BACKEND_LIMIT = 500;

export interface GuidePageRequest {
  filters?: TroubleshootingGuideFilters;
  page?: number;
  pageSize?: number;
  signal?: AbortSignal;
}

export interface GuidePage {
  items: TroubleshootingGuide[];
  /** El backend no devuelve total, asi que se deduce pidiendo un registro extra. */
  hasMore: boolean;
  page: number;
  pageSize: number;
}

const SEVERITY_VALUES: readonly string[] = GUIDE_SEVERITY_OPTIONS.map((option) => option.value);
const STATUS_VALUES: readonly string[] = GUIDE_STATUS_OPTIONS.map((option) => option.value);

const readSeverity = (record: Record<string, unknown>): GuideSeverity => {
  const raw = readString(record, ["severity"]).trim().toLowerCase();
  return SEVERITY_VALUES.includes(raw) ? (raw as GuideSeverity) : "media";
};

const readStatus = (record: Record<string, unknown>): GuideStatus => {
  const raw = readString(record, ["status"]).trim().toLowerCase();
  return STATUS_VALUES.includes(raw) ? (raw as GuideStatus) : "activa";
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

    // Tolera un backend que devuelva los pasos como texto con saltos de linea.
    if (typeof value === "string") {
      return value
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
};

export const normalizeGuide = (value: unknown): TroubleshootingGuide => {
  const guide = isRecord(value) ? value : {};

  const code = readString(guide, ["code", "guide_code"]).trim().toUpperCase();
  const explicitId = readString(guide, ["id", "guide_id", "_id"]);

  return {
    // El codigo es unico en el backend, asi que sirve de identidad si falta el id.
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
  extractItems(value, ["guides"]).map((item) => normalizeGuide(item));

/**
 * Aplica las mismas normalizaciones y limites del backend (codigo en mayusculas,
 * etiquetas en minusculas, textos recortados, pasos sin vacios). Es defensa en
 * profundidad: evita 4xx previsibles y que un pegado enorme viaje completo.
 */
const sanitizeGuidePayload = (payload: TroubleshootingGuidePayload) => {
  const longText = (value?: string | null) => {
    const normalized = normalizeText(value);
    return normalized ? clampText(normalized, TROUBLESHOOTING_LIMITS.longText) : null;
  };

  return {
    code: clampText(payload.code.trim().toUpperCase(), TROUBLESHOOTING_LIMITS.code),
    title: clampText(payload.title.trim(), TROUBLESHOOTING_LIMITS.title),
    category: clampText(payload.category.trim().toLowerCase(), TROUBLESHOOTING_LIMITS.category),
    symptom: clampText(payload.symptom.trim(), TROUBLESHOOTING_LIMITS.longText),
    probable_causes: longText(payload.probable_causes),
    resolution_steps: payload.resolution_steps
      .map((step) => clampText(step.trim(), TROUBLESHOOTING_LIMITS.longText))
      .filter(Boolean)
      .slice(0, TROUBLESHOOTING_LIMITS.maxSteps),
    severity: payload.severity,
    requires_workshop: Boolean(payload.requires_workshop),
    safety_notes: longText(payload.safety_notes),
    prevention_tips: longText(payload.prevention_tips),
    status: payload.status,
    notes: longText(payload.notes),
  };
};

const buildFilterParams = (filters: TroubleshootingGuideFilters) => ({
  q: normalizeText(filters.search) ?? undefined,
  category: normalizeText(filters.category)?.toLowerCase() ?? undefined,
  severity: normalizeText(filters.severity) ?? undefined,
  status: normalizeText(filters.status) ?? undefined,
  requires_workshop: filters.requires_workshop,
});

export const troubleshootingApi = {
  /**
   * Trae una pagina del manual. Pide `pageSize + 1` registros para saber si hay
   * pagina siguiente sin que el backend exponga un total.
   */
  list: async (
    authenticatedFetch: AuthenticatedFetch,
    { filters = {}, page = 0, pageSize = 20, signal }: GuidePageRequest = {}
  ): Promise<GuidePage> => {
    const safePageSize = Math.min(Math.max(pageSize, 1), MAX_BACKEND_LIMIT - 1);
    const safePage = Math.max(page, 0);

    const query = buildQueryString({
      ...buildFilterParams(filters),
      limit: safePageSize + 1,
      offset: safePage * safePageSize,
    });

    const payload = await requestJson(
      authenticatedFetch,
      `${API_BASE_URL}/${query}`,
      { method: "GET", signal },
      "No se pudo cargar el manual de fallas."
    );

    const items = normalizeGuideList(payload);

    return {
      items: items.slice(0, safePageSize),
      hasMore: items.length > safePageSize,
      page: safePage,
      pageSize: safePageSize,
    };
  },

  getById: async (
    authenticatedFetch: AuthenticatedFetch,
    guideId: string,
    signal?: AbortSignal
  ): Promise<TroubleshootingGuide> => {
    const payload = await requestJson(
      authenticatedFetch,
      `${API_BASE_URL}/${encodeURIComponent(guideId)}`,
      { method: "GET", signal },
      "No se pudo cargar la falla solicitada."
    );

    return normalizeGuide(extractEntity(payload));
  },

  create: async (
    authenticatedFetch: AuthenticatedFetch,
    payload: TroubleshootingGuidePayload
  ): Promise<TroubleshootingGuide> => {
    const response = await requestJson(
      authenticatedFetch,
      `${API_BASE_URL}/`,
      { method: "POST", body: JSON.stringify(sanitizeGuidePayload(payload)) },
      "No se pudo registrar la falla."
    );

    return normalizeGuide(extractEntity(response));
  },

  update: async (
    authenticatedFetch: AuthenticatedFetch,
    guideId: string,
    payload: TroubleshootingGuidePayload
  ): Promise<TroubleshootingGuide> => {
    const response = await requestJson(
      authenticatedFetch,
      `${API_BASE_URL}/${encodeURIComponent(guideId)}`,
      { method: "PUT", body: JSON.stringify(sanitizeGuidePayload(payload)) },
      "No se pudo actualizar la falla."
    );

    return normalizeGuide(extractEntity(response));
  },

  remove: async (authenticatedFetch: AuthenticatedFetch, guideId: string): Promise<void> => {
    await requestVoid(
      authenticatedFetch,
      `${API_BASE_URL}/${encodeURIComponent(guideId)}`,
      { method: "DELETE" },
      "No se pudo eliminar la falla."
    );
  },
};

/** Un 404 significa que el modulo aun no esta desplegado: se muestra vacio. */
export const isModuleNotDeployed = (error: unknown) =>
  error instanceof ApiError && error.status === 404;
