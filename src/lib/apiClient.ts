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

/**
 * Regla de reintento por defecto de React Query. Una sesion caida ya redirige
 * al login y un 4xx no mejora al repetirlo; los fallos de red y los 5xx se
 * reintentan hasta dos veces.
 */
export const shouldRetryRequest = (failureCount: number, error: unknown) => {
  if (isSessionExpiredError(error) || isClientError(error)) return false;
  return failureCount < 2;
};

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

/** El máximo `limit` que aceptan los listados del backend. */
export const LIST_PAGE_SIZE = 500;
/** Tope de páginas por listado: 20.000 registros, para no quedar en un bucle. */
const MAX_LIST_PAGES = 40;

const withPagination = (url: string, limit: number, offset: number) =>
  `${url}${url.includes("?") ? "&" : "?"}limit=${limit}&offset=${offset}`;

/**
 * Los listados del backend devuelven 100 registros si no se pide otro `limit`
 * (y como máximo 500). Esta función pide todas las páginas con `limit` y
 * `offset` y devuelve una sola respuesta con la lista completa, así que
 * reemplaza a `authenticatedFetch(url)` sin tocar el resto del código.
 *
 * La URL no debe traer ya `limit` ni `offset`. Si una página falla, se
 * devuelve esa respuesta tal cual para que quien llama vea el error.
 */
export const fetchAllPages = async (
  authenticatedFetch: AuthenticatedFetch,
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  const items: unknown[] = [];

  for (let page = 0; page < MAX_LIST_PAGES; page += 1) {
    const response = await authenticatedFetch(
      withPagination(url, LIST_PAGE_SIZE, page * LIST_PAGE_SIZE),
      options
    );
    if (!response.ok) return response;

    const payload: unknown = await response.json();
    if (!Array.isArray(payload)) {
      // No es un listado paginado: se devuelve lo que llegó.
      return new Response(JSON.stringify(page === 0 ? payload : items), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    items.push(...payload);
    if (payload.length < LIST_PAGE_SIZE) break;
  }

  return new Response(JSON.stringify(items), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

/** Variante de `authenticatedFetch` que pagina sola; útil para pasarla a `requestJson`. */
export const withAllPages =
  (authenticatedFetch: AuthenticatedFetch): AuthenticatedFetch =>
  (url, options) =>
    fetchAllPages(authenticatedFetch, url, options);

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
