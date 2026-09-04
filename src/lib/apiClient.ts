import { localizeApiErrorPayload } from "@/lib/errorI18n";

/**
 * Primitivas compartidas para hablar con el backend.
 *
 * Cada servicio venia repitiendo su propia clase de error, su armado de query
 * string y sus lectores defensivos de payload. Estas versiones son las mismas
 * pero en un solo lugar, para que un modulo nuevo no tenga que copiarlas.
 */

export type AuthenticatedFetch = (url: string, options?: RequestInit) => Promise<Response>;

interface BackendErrorPayload {
  message?: unknown;
  detail?: unknown;
  error?: unknown;
  code?: string;
  details?: unknown;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(status: number, message: string, code?: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/** `useAuthenticatedFetch` lanza este mensaje cuando la sesion ya no sirve. */
export const SESSION_EXPIRED_MESSAGE = "Sesión expirada";

export const isSessionExpiredError = (error: unknown) =>
  error instanceof Error && error.message === SESSION_EXPIRED_MESSAGE;

export const isAbortError = (error: unknown) =>
  error instanceof DOMException && error.name === "AbortError";

/** Un 4xx no se reintenta: el problema es la peticion, no la red. */
export const isClientError = (error: unknown) =>
  error instanceof ApiError && error.status >= 400 && error.status < 500;

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const normalizeText = (value?: string | null) => {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

/** Recorta a lo que acepta el backend para no gastar un round-trip en un 422. */
export const clampText = (value: string, maxLength: number) => value.slice(0, maxLength);

export const buildQueryString = (
  params: Record<string, string | number | boolean | undefined | null>
) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    query.append(key, String(value));
  });

  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
};

/**
 * Traduce el payload de error y descarta el detalle tecnico: al usuario le
 * llega un mensaje en español, nunca una traza del backend.
 */
export const parseApiError = async (
  response: Response,
  fallbackMessage: string
): Promise<ApiError> => {
  let payload: BackendErrorPayload | null = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  return new ApiError(
    response.status,
    localizeApiErrorPayload(payload, fallbackMessage),
    payload?.code,
    payload?.details
  );
};

export const requestJson = async (
  authenticatedFetch: AuthenticatedFetch,
  url: string,
  options: RequestInit,
  fallbackMessage: string
): Promise<unknown> => {
  const response = await authenticatedFetch(url, options);

  if (!response.ok) {
    throw await parseApiError(response, fallbackMessage);
  }

  return response.json();
};

/** Para respuestas sin cuerpo, como el 204 de un DELETE. */
export const requestVoid = async (
  authenticatedFetch: AuthenticatedFetch,
  url: string,
  options: RequestInit,
  fallbackMessage: string
): Promise<void> => {
  const response = await authenticatedFetch(url, options);

  if (!response.ok) {
    throw await parseApiError(response, fallbackMessage);
  }
};

export const readString = (record: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string") return value;
  }

  return "";
};

export const readNullableString = (record: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string") return value;
    if (value === null) return null;
  }

  return undefined;
};

export const readBoolean = (record: Record<string, unknown>, keys: string[]) => {
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

/** Acepta un arreglo plano o las envolturas habituales (`items`, `results`, `data`). */
export const extractItems = (payload: unknown, extraKeys: string[] = []): unknown[] => {
  if (Array.isArray(payload)) return payload;
  if (!isRecord(payload)) return [];

  const keys = ["items", "results", "data", ...extraKeys];

  for (const key of keys) {
    const candidate = payload[key];
    if (Array.isArray(candidate)) return candidate;
  }

  if (isRecord(payload.data)) {
    for (const key of keys) {
      const candidate = payload.data[key];
      if (Array.isArray(candidate)) return candidate;
    }
  }

  return [];
};

export const extractEntity = (payload: unknown): unknown => {
  if (isRecord(payload) && isRecord(payload.data)) {
    return payload.data;
  }

  return payload;
};
