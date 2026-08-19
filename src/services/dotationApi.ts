import { localizeApiErrorPayload } from "@/lib/errorI18n";
import {
  DotationAlert,
  DotationAlertFilters,
  DotationDelivery,
  DotationDeliveryFilters,
  DotationDeliveryPayload,
  DotationItem,
  DotationItemFilters,
  DotationItemPayload,
  DotationStaffFilters,
  DotationStaffMember,
  DotationStaffMemberPayload,
} from "@/types";

const API_BASE_URL = `${import.meta.env.VITE_API_URL ?? ""}/api/v1/dotation`;

type AuthenticatedFetch = (url: string, options?: RequestInit) => Promise<Response>;

interface BackendErrorPayload {
  status?: number;
  message?: unknown;
  detail?: unknown;
  error?: unknown;
  code?: string;
  details?: unknown;
}

export class DotationApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(status: number, message: string, code?: string, details?: unknown) {
    super(message);
    this.name = "DotationApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

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

const parseDotationApiError = async (
  response: Response,
  fallbackMessage: string
): Promise<DotationApiError> => {
  let payload: BackendErrorPayload | null = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  const message = localizeApiErrorPayload(payload, fallbackMessage);
  return new DotationApiError(response.status, message, payload?.code, payload?.details);
};

const requestJson = async <T>(
  authenticatedFetch: AuthenticatedFetch,
  url: string,
  options: RequestInit,
  fallbackMessage: string
): Promise<T> => {
  const response = await authenticatedFetch(url, options);

  if (!response.ok) {
    throw await parseDotationApiError(response, fallbackMessage);
  }

  return response.json();
};

const buildStaffPayload = (payload: DotationStaffMemberPayload) => ({
  name: payload.name.trim(),
  last_name: payload.last_name.trim(),
  document_number: payload.document_number.trim(),
  department: normalizeText(payload.department),
  position: normalizeText(payload.position),
  status: normalizeText(payload.status) ?? "active",
  hire_date: normalizeText(payload.hire_date),
  notes: normalizeText(payload.notes),
});

const buildItemPayload = (payload: DotationItemPayload) => ({
  code: payload.code.trim().toUpperCase(),
  name: payload.name.trim(),
  category: payload.category.trim(),
  renewal_months: Math.max(1, Math.trunc(payload.renewal_months)),
  status: normalizeText(payload.status) ?? "active",
  description: normalizeText(payload.description),
});

const buildDeliveryPayload = (payload: DotationDeliveryPayload) => ({
  staff_member_id: payload.staff_member_id,
  dotation_item_id: payload.dotation_item_id,
  delivered_at: payload.delivered_at,
  quantity: Math.max(1, Math.trunc(payload.quantity)),
  delivered_by: normalizeText(payload.delivered_by),
  notes: normalizeText(payload.notes),
});

export const dotationApi = {
  listStaffMembers: async (
    authenticatedFetch: AuthenticatedFetch,
    filters: DotationStaffFilters = {}
  ): Promise<DotationStaffMember[]> => {
    const query = buildQueryString({
      status: normalizeText(filters.status) ?? undefined,
      department: normalizeText(filters.department) ?? undefined,
      position: normalizeText(filters.position) ?? undefined,
    });

    return requestJson<DotationStaffMember[]>(
      authenticatedFetch,
      `${API_BASE_URL}/staff-members/${query}`,
      { method: "GET" },
      "No se pudo cargar el personal de dotación."
    );
  },

  createStaffMember: async (
    authenticatedFetch: AuthenticatedFetch,
    payload: DotationStaffMemberPayload
  ): Promise<DotationStaffMember> => {
    return requestJson<DotationStaffMember>(
      authenticatedFetch,
      `${API_BASE_URL}/staff-members/`,
      {
        method: "POST",
        body: JSON.stringify(buildStaffPayload(payload)),
      },
      "No se pudo registrar el personal de dotación."
    );
  },

  updateStaffMember: async (
    authenticatedFetch: AuthenticatedFetch,
    documentNumber: string,
    payload: DotationStaffMemberPayload
  ): Promise<DotationStaffMember> => {
    return requestJson<DotationStaffMember>(
      authenticatedFetch,
      `${API_BASE_URL}/staff-members/${encodeURIComponent(documentNumber.trim())}`,
      {
        method: "PUT",
        body: JSON.stringify(buildStaffPayload(payload)),
      },
      "No se pudo actualizar el personal de dotación."
    );
  },

  deleteStaffMember: async (authenticatedFetch: AuthenticatedFetch, documentNumber: string): Promise<void> => {
    const response = await authenticatedFetch(
      `${API_BASE_URL}/staff-members/${encodeURIComponent(documentNumber.trim())}`,
      { method: "DELETE" }
    );

    if (!response.ok) {
      throw await parseDotationApiError(response, "No se pudo eliminar el personal de dotación.");
    }
  },

  listItems: async (
    authenticatedFetch: AuthenticatedFetch,
    filters: DotationItemFilters = {}
  ): Promise<DotationItem[]> => {
    const query = buildQueryString({
      status: normalizeText(filters.status) ?? undefined,
      category: normalizeText(filters.category) ?? undefined,
    });

    return requestJson<DotationItem[]>(
      authenticatedFetch,
      `${API_BASE_URL}/catalog/${query}`,
      { method: "GET" },
      "No se pudo cargar el catálogo de dotación."
    );
  },

  createItem: async (
    authenticatedFetch: AuthenticatedFetch,
    payload: DotationItemPayload
  ): Promise<DotationItem> => {
    return requestJson<DotationItem>(
      authenticatedFetch,
      `${API_BASE_URL}/catalog/`,
      {
        method: "POST",
        body: JSON.stringify(buildItemPayload(payload)),
      },
      "No se pudo crear el item de dotación."
    );
  },

  updateItem: async (
    authenticatedFetch: AuthenticatedFetch,
    itemCode: string,
    payload: DotationItemPayload
  ): Promise<DotationItem> => {
    return requestJson<DotationItem>(
      authenticatedFetch,
      `${API_BASE_URL}/catalog/${encodeURIComponent(itemCode.trim())}`,
      {
        method: "PUT",
        body: JSON.stringify(buildItemPayload(payload)),
      },
      "No se pudo actualizar el item de dotación."
    );
  },

  deleteItem: async (authenticatedFetch: AuthenticatedFetch, itemCode: string): Promise<void> => {
    const response = await authenticatedFetch(
      `${API_BASE_URL}/catalog/${encodeURIComponent(itemCode.trim())}`,
      { method: "DELETE" }
    );

    if (!response.ok) {
      throw await parseDotationApiError(response, "No se pudo eliminar el item de dotación.");
    }
  },

  listDeliveries: async (
    authenticatedFetch: AuthenticatedFetch,
    filters: DotationDeliveryFilters = {}
  ): Promise<DotationDelivery[]> => {
    const query = buildQueryString({
      staff_document_number: normalizeText(filters.staff_document_number) ?? undefined,
      item_code: normalizeText(filters.item_code) ?? undefined,
      alert_status: normalizeText(filters.alert_status) ?? undefined,
      delivered_from: normalizeText(filters.delivered_from) ?? undefined,
      delivered_to: normalizeText(filters.delivered_to) ?? undefined,
      near_days: filters.near_days,
    });

    return requestJson<DotationDelivery[]>(
      authenticatedFetch,
      `${API_BASE_URL}/deliveries/${query}`,
      { method: "GET" },
      "No se pudo cargar el historial de entregas de dotación."
    );
  },

  createDelivery: async (
    authenticatedFetch: AuthenticatedFetch,
    payload: DotationDeliveryPayload
  ): Promise<DotationDelivery> => {
    return requestJson<DotationDelivery>(
      authenticatedFetch,
      `${API_BASE_URL}/deliveries/`,
      {
        method: "POST",
        body: JSON.stringify(buildDeliveryPayload(payload)),
      },
      "No se pudo registrar la entrega de dotación."
    );
  },

  listAlerts: async (
    authenticatedFetch: AuthenticatedFetch,
    filters: DotationAlertFilters = {}
  ): Promise<DotationAlert[]> => {
    const query = buildQueryString({
      near_days: filters.near_days,
      include_vigente: filters.include_vigente,
      staff_document_number: normalizeText(filters.staff_document_number) ?? undefined,
      item_code: normalizeText(filters.item_code) ?? undefined,
      alert_status: normalizeText(filters.alert_status) ?? undefined,
    });

    return requestJson<DotationAlert[]>(
      authenticatedFetch,
      `${API_BASE_URL}/alerts${query}`,
      { method: "GET" },
      "No se pudieron cargar las alertas de dotación."
    );
  },
};