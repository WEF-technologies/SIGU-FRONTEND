import { localizeApiErrorPayload } from "@/lib/errorI18n";
import { Supplier, SupplierFilters, SupplierPayload } from "@/types";

const API_BASE_URL = `${import.meta.env.VITE_API_URL ?? ""}/api/v1/suppliers`;

type AuthenticatedFetch = (url: string, options?: RequestInit) => Promise<Response>;

interface BackendErrorPayload {
  status?: number;
  message?: unknown;
  detail?: unknown;
  error?: unknown;
  code?: string;
  details?: unknown;
}

export class SuppliersApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(status: number, message: string, code?: string, details?: unknown) {
    super(message);
    this.name = "SuppliersApiError";
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

const parseSuppliersApiError = async (
  response: Response,
  fallbackMessage: string
): Promise<SuppliersApiError> => {
  let payload: BackendErrorPayload | null = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  const message = localizeApiErrorPayload(payload, fallbackMessage);
  return new SuppliersApiError(response.status, message, payload?.code, payload?.details);
};

const requestJson = async (
  authenticatedFetch: AuthenticatedFetch,
  url: string,
  options: RequestInit,
  fallbackMessage: string
) => {
  const response = await authenticatedFetch(url, options);

  if (!response.ok) {
    throw await parseSuppliersApiError(response, fallbackMessage);
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

const readStringArray = (record: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = record[key];

    if (Array.isArray(value)) {
      return value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean);
    }

    if (typeof value === "string") {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
};

const extractItemsFromPayload = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) return payload;
  if (!isRecord(payload)) return [];

  const directCandidates = [payload.items, payload.results, payload.data, payload.suppliers];
  for (const candidate of directCandidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  if (isRecord(payload.data)) {
    if (Array.isArray(payload.data.items)) return payload.data.items;
    if (Array.isArray(payload.data.results)) return payload.data.results;
    if (Array.isArray(payload.data.suppliers)) return payload.data.suppliers;
  }

  return [];
};

const extractEntityFromPayload = (payload: unknown) => {
  if (isRecord(payload) && isRecord(payload.data)) {
    return payload.data;
  }

  return payload;
};

const buildFallbackId = (supplier: Omit<Supplier, "id">) => {
  const candidate = [supplier.name, supplier.email, supplier.contact_phone, supplier.location]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join("-")
    .toLowerCase()
    .replace(/\s+/g, "-");

  return candidate || "supplier";
};

export const normalizeSupplier = (value: unknown): Supplier => {
  const supplier = isRecord(value) ? value : {};

  const normalizedSupplier: Omit<Supplier, "id"> = {
    name: readString(supplier, ["name", "supplier_name", "business_name"]),
    address: readString(supplier, ["address"]),
    contact_phone: readString(supplier, ["contact_phone", "phone", "phone_number", "telephone"]),
    email: readNullableString(supplier, ["email", "contact_email"]) ?? null,
    location: readString(supplier, ["location", "city"]),
    status: readString(supplier, ["status"]) || "active",
    categories: readStringArray(supplier, ["categories", "category"]),
    destacado: readBoolean(supplier, ["destacado", "featured"]),
    description: readNullableString(supplier, ["description"]) ?? null,
    delivery_time_notes: readNullableString(supplier, ["delivery_time_notes"]) ?? null,
    chat_url: readString(supplier, ["chat_url", "whatsapp_url"]),
    notes: readNullableString(supplier, ["notes"]) ?? null,
    created_at: readString(supplier, ["created_at"]),
    updated_at: readString(supplier, ["updated_at"]),
  };

  const explicitId = readString(supplier, ["id", "supplier_id", "_id"]);

  return {
    id: explicitId || buildFallbackId(normalizedSupplier),
    ...normalizedSupplier,
  };
};

const normalizeSupplierList = (value: unknown): Supplier[] => {
  return extractItemsFromPayload(value).map((item) => normalizeSupplier(item));
};

const sanitizeSupplierPayload = (payload: SupplierPayload) => ({
  name: payload.name.trim(),
  address: payload.address.trim(),
  contact_phone: payload.contact_phone.trim(),
  email: normalizeText(payload.email),
  location: normalizeText(payload.location),
  status: normalizeText(payload.status) ?? "active",
  categories: Array.from(new Set(payload.categories.map((category) => category.trim()).filter(Boolean))),
  destacado: Boolean(payload.destacado),
  description: normalizeText(payload.description),
  delivery_time_notes: normalizeText(payload.delivery_time_notes),
  notes: normalizeText(payload.notes),
});

export const suppliersApi = {
  list: async (
    authenticatedFetch: AuthenticatedFetch,
    filters: SupplierFilters = {}
  ): Promise<Supplier[]> => {
    const query = buildQueryString({
      search: normalizeText(filters.search) ?? undefined,
      status: normalizeText(filters.status) ?? undefined,
      location: normalizeText(filters.location) ?? undefined,
      category: normalizeText(filters.category) ?? undefined,
      destacado: filters.destacado,
      limit: filters.limit,
      offset: filters.offset,
    });

    const payload = await requestJson(
      authenticatedFetch,
      `${API_BASE_URL}/${query}`,
      { method: "GET" },
      "No se pudo cargar el listado de proveedores."
    );

    return normalizeSupplierList(payload);
  },

  getById: async (authenticatedFetch: AuthenticatedFetch, supplierId: string): Promise<Supplier> => {
    const payload = await requestJson(
      authenticatedFetch,
      `${API_BASE_URL}/${encodeURIComponent(supplierId)}`,
      { method: "GET" },
      "No se pudo cargar el proveedor solicitado."
    );

    return normalizeSupplier(extractEntityFromPayload(payload));
  },

  create: async (
    authenticatedFetch: AuthenticatedFetch,
    payload: SupplierPayload
  ): Promise<Supplier> => {
    const response = await requestJson(
      authenticatedFetch,
      `${API_BASE_URL}/`,
      {
        method: "POST",
        body: JSON.stringify(sanitizeSupplierPayload(payload)),
      },
      "No se pudo crear el proveedor."
    );

    return normalizeSupplier(extractEntityFromPayload(response));
  },

  update: async (
    authenticatedFetch: AuthenticatedFetch,
    supplierId: string,
    payload: SupplierPayload
  ): Promise<Supplier> => {
    const response = await requestJson(
      authenticatedFetch,
      `${API_BASE_URL}/${encodeURIComponent(supplierId)}`,
      {
        method: "PUT",
        body: JSON.stringify(sanitizeSupplierPayload(payload)),
      },
      "No se pudo actualizar el proveedor."
    );

    return normalizeSupplier(extractEntityFromPayload(response));
  },

  remove: async (authenticatedFetch: AuthenticatedFetch, supplierId: string): Promise<void> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/${encodeURIComponent(supplierId)}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw await parseSuppliersApiError(response, "No se pudo eliminar el proveedor.");
    }
  },
};