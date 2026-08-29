import { localizeApiErrorPayload } from "@/lib/errorI18n";
import {
  SparePart,
  SparePartFitment,
  SparePartFitmentPayload,
  SparePartPayload,
} from "@/types";

const API_BASE_URL = `${import.meta.env.VITE_API_URL ?? ""}/api/v1/spare_parts`;

type AuthenticatedFetch = (url: string, options?: RequestInit) => Promise<Response>;

interface BackendErrorPayload {
  status?: number;
  message?: unknown;
  detail?: unknown;
  error?: unknown;
  code?: string;
  details?: unknown;
}

export class SparePartsApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(status: number, message: string, code?: string, details?: unknown) {
    super(message);
    this.name = "SparePartsApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const buildQueryString = (params: Record<string, string | number | undefined>) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    query.append(key, String(value));
  });

  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
};

const parseSparePartsApiError = async (
  response: Response,
  fallback: string
): Promise<SparePartsApiError> => {
  let payload: BackendErrorPayload | null = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  const message = localizeApiErrorPayload(payload, fallback);
  return new SparePartsApiError(response.status, message, payload?.code, payload?.details);
};

const readString = (record: Record<string, unknown>, key: string) => {
  const value = record[key];
  return typeof value === "string" ? value : "";
};

const readNullableString = (record: Record<string, unknown>, key: string) => {
  const value = record[key];
  if (typeof value === "string") return value;
  if (value === null) return null;
  return undefined;
};

const readNumber = (record: Record<string, unknown>, key: string) => {
  const value = record[key];

  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return undefined;
};

const readStringArray = (record: Record<string, unknown>, key: string) => {
  const value = record[key];
  if (!Array.isArray(value)) return [];

  return value.filter((item): item is string => typeof item === "string");
};

const normalizeSparePartFitment = (value: unknown): SparePartFitment => {
  const fitment = isRecord(value) ? value : {};

  return {
    id: readString(fitment, "id"),
    created_at: readString(fitment, "created_at"),
    updated_at: readString(fitment, "updated_at"),
    brand: readNullableString(fitment, "brand"),
    model: readNullableString(fitment, "model"),
    year_from: readNumber(fitment, "year_from") ?? null,
    year_to: readNumber(fitment, "year_to") ?? null,
    engine_type: readNullableString(fitment, "engine_type"),
    engine_code: readNullableString(fitment, "engine_code"),
    fuel_type: readNullableString(fitment, "fuel_type"),
    transmission_type: readNullableString(fitment, "transmission_type"),
  };
};

export const normalizeSparePart = (value: unknown): SparePart => {
  const part = isRecord(value) ? value : {};
  const fitmentsValue = part.fitments;

  return {
    id: readString(part, "id"),
    created_at: readString(part, "created_at"),
    updated_at: readString(part, "updated_at"),
    code: readString(part, "code"),
    description: readString(part, "description"),
    quantity: readNumber(part, "quantity") ?? 0,
    company_location: readNullableString(part, "company_location") ?? null,
    store_location: readNullableString(part, "store_location") ?? null,
    compatible_vehicles: readStringArray(part, "compatible_vehicles"),
    vehicle_plates: readNullableString(part, "vehicle_plates") ?? undefined,
    min_stock: readNumber(part, "min_stock") ?? readNumber(part, "minimum_stock") ?? null,
    unit_price: readNumber(part, "unit_price") ?? null,
    fitments: Array.isArray(fitmentsValue)
      ? fitmentsValue.map((fitment) => normalizeSparePartFitment(fitment))
      : [],
  };
};

const normalizeSparePartList = (value: unknown): SparePart[] => {
  if (!Array.isArray(value)) return [];
  return value.map((item) => normalizeSparePart(item));
};

const requestJson = async (
  authenticatedFetch: AuthenticatedFetch,
  url: string,
  options: RequestInit,
  fallbackMessage: string
) => {
  const response = await authenticatedFetch(url, options);

  if (!response.ok) {
    throw await parseSparePartsApiError(response, fallbackMessage);
  }

  return response.json();
};

const sanitizeFitmentPayload = (fitment: SparePartFitmentPayload) => {
  const normalized = {
    brand: typeof fitment.brand === "string" ? fitment.brand.trim() || null : null,
    model: typeof fitment.model === "string" ? fitment.model.trim() || null : null,
    year_from: typeof fitment.year_from === "number" && Number.isFinite(fitment.year_from) ? fitment.year_from : null,
    year_to: typeof fitment.year_to === "number" && Number.isFinite(fitment.year_to) ? fitment.year_to : null,
    engine_type: typeof fitment.engine_type === "string" ? fitment.engine_type.trim() || null : null,
    engine_code: typeof fitment.engine_code === "string" ? fitment.engine_code.trim() || null : null,
    fuel_type: typeof fitment.fuel_type === "string" ? fitment.fuel_type.trim() || null : null,
    transmission_type:
      typeof fitment.transmission_type === "string"
        ? fitment.transmission_type.trim() || null
        : null,
  };

  const hasAnyValue = Object.values(normalized).some((field) => field !== null);
  return hasAnyValue ? normalized : null;
};

const sanitizeSparePartPayload = (payload: SparePartPayload) => {
  const compatibleVehicles = Array.from(
    new Set(
      (payload.compatible_vehicles ?? [])
        .map((plate) => plate.trim().toUpperCase())
        .filter(Boolean)
    )
  );

  const fitments = (payload.fitments ?? [])
    .map((fitment) => sanitizeFitmentPayload(fitment))
    .filter((fitment): fitment is NonNullable<ReturnType<typeof sanitizeFitmentPayload>> => fitment !== null);

  return {
    code: payload.code.trim().toUpperCase(),
    description: payload.description.trim(),
    quantity: Number.isFinite(payload.quantity) ? Math.max(0, Math.trunc(payload.quantity)) : 0,
    company_location:
      typeof payload.company_location === "string" ? payload.company_location.trim() || null : null,
    compatible_vehicles: compatibleVehicles,
    unit_price:
      typeof payload.unit_price === "number" && Number.isFinite(payload.unit_price)
        ? payload.unit_price
        : null,
    fitments,
  };
};

export const sparePartsApi = {
  listAll: async (authenticatedFetch: AuthenticatedFetch): Promise<SparePart[]> => {
    const payload = await requestJson(
      authenticatedFetch,
      `${API_BASE_URL}/`,
      { method: "GET" },
      "No se pudo cargar el inventario de repuestos."
    );

    return normalizeSparePartList(payload);
  },

  listByVehicle: async (
    authenticatedFetch: AuthenticatedFetch,
    vehiclePlate: string,
    params: { limit?: number; offset?: number } = {}
  ): Promise<SparePart[]> => {
    const query = buildQueryString({ limit: params.limit, offset: params.offset });
    const payload = await requestJson(
      authenticatedFetch,
      `${API_BASE_URL}/vehicle/${encodeURIComponent(vehiclePlate.trim())}${query}`,
      { method: "GET" },
      "No se pudieron cargar los repuestos compatibles de la unidad."
    );

    return normalizeSparePartList(payload);
  },

  create: async (
    authenticatedFetch: AuthenticatedFetch,
    payload: SparePartPayload
  ): Promise<SparePart> => {
    const response = await requestJson(
      authenticatedFetch,
      `${API_BASE_URL}/`,
      {
        method: "POST",
        body: JSON.stringify(sanitizeSparePartPayload(payload)),
      },
      "No se pudo crear el repuesto."
    );

    return normalizeSparePart(response);
  },

  update: async (
    authenticatedFetch: AuthenticatedFetch,
    sparePartId: string,
    payload: SparePartPayload
  ): Promise<SparePart> => {
    const response = await requestJson(
      authenticatedFetch,
      `${API_BASE_URL}/${encodeURIComponent(sparePartId)}`,
      {
        method: "PUT",
        body: JSON.stringify(sanitizeSparePartPayload(payload)),
      },
      "No se pudo actualizar el repuesto."
    );

    return normalizeSparePart(response);
  },

  remove: async (authenticatedFetch: AuthenticatedFetch, sparePartId: string): Promise<void> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/${encodeURIComponent(sparePartId)}`, { method: "DELETE" });

    if (!response.ok) {
      throw await parseSparePartsApiError(response, "No se pudo eliminar el repuesto.");
    }
  },
};