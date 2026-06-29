import {
  CreateFuelLogPayload,
  CreateFuelReadingPayload,
  FuelAnomalyFilters,
  FuelConsumptionAnomaly,
  FuelListFilters,
  FuelLog,
  FuelReading,
  FuelVehicleStatus,
} from "@/types";

const API_BASE_URL = `${import.meta.env.VITE_API_URL ?? ""}/api/v1/fuel`;

type AuthenticatedFetch = (url: string, options?: RequestInit) => Promise<Response>;

interface BackendErrorPayload {
  status?: number;
  message?: string;
  detail?: string;
  code?: string;
  details?: unknown;
}

export class FuelApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(status: number, message: string, code?: string, details?: unknown) {
    super(message);
    this.name = "FuelApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const buildQueryString = (params: Record<string, string | number | boolean | undefined>) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "" || value === "all") return;
    query.append(key, String(value));
  });

  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
};

const parseFuelApiError = async (response: Response, fallback: string): Promise<FuelApiError> => {
  let payload: BackendErrorPayload | null = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  const message = payload?.message || payload?.detail || fallback;
  return new FuelApiError(response.status, message, payload?.code, payload?.details);
};

const requestJson = async <T>(
  authenticatedFetch: AuthenticatedFetch,
  url: string,
  options: RequestInit,
  fallbackMessage: string
): Promise<T> => {
  const response = await authenticatedFetch(url, options);

  if (!response.ok) {
    throw await parseFuelApiError(response, fallbackMessage);
  }

  return response.json();
};

export const fuelApi = {
  listLogs: async (authenticatedFetch: AuthenticatedFetch, filters: FuelListFilters): Promise<FuelLog[]> => {
    const query = buildQueryString({
      vehicle_id: filters.vehicle_id,
      fuel_type: filters.fuel_type,
      date_from: filters.date_from,
      date_to: filters.date_to,
    });

    return requestJson<FuelLog[]>(
      authenticatedFetch,
      `${API_BASE_URL}/logs/${query}`,
      { method: "GET" },
      "No se pudo cargar el historial de cargas."
    );
  },

  getLogById: async (authenticatedFetch: AuthenticatedFetch, logId: string): Promise<FuelLog> => {
    return requestJson<FuelLog>(
      authenticatedFetch,
      `${API_BASE_URL}/logs/${logId}`,
      { method: "GET" },
      "No se pudo cargar el detalle de la carga."
    );
  },

  createLog: async (authenticatedFetch: AuthenticatedFetch, payload: CreateFuelLogPayload): Promise<FuelLog> => {
    return requestJson<FuelLog>(
      authenticatedFetch,
      `${API_BASE_URL}/logs/`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      "No se pudo registrar la carga de combustible."
    );
  },

  listReadings: async (
    authenticatedFetch: AuthenticatedFetch,
    filters: FuelListFilters
  ): Promise<FuelReading[]> => {
    const query = buildQueryString({
      vehicle_id: filters.vehicle_id,
      fuel_type: filters.fuel_type,
      date_from: filters.date_from,
      date_to: filters.date_to,
    });

    return requestJson<FuelReading[]>(
      authenticatedFetch,
      `${API_BASE_URL}/readings/${query}`,
      { method: "GET" },
      "No se pudo cargar el historial de lecturas."
    );
  },

  getReadingById: async (authenticatedFetch: AuthenticatedFetch, readingId: string): Promise<FuelReading> => {
    return requestJson<FuelReading>(
      authenticatedFetch,
      `${API_BASE_URL}/readings/${readingId}`,
      { method: "GET" },
      "No se pudo cargar el detalle de la lectura."
    );
  },

  createReading: async (
    authenticatedFetch: AuthenticatedFetch,
    payload: CreateFuelReadingPayload
  ): Promise<FuelReading> => {
    return requestJson<FuelReading>(
      authenticatedFetch,
      `${API_BASE_URL}/readings/`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      "No se pudo registrar la lectura de combustible."
    );
  },

  getVehicleStatus: async (
    authenticatedFetch: AuthenticatedFetch,
    vehicleId: string,
    fuelType?: FuelListFilters["fuel_type"]
  ): Promise<FuelVehicleStatus> => {
    const query = buildQueryString({ fuel_type: fuelType });

    return requestJson<FuelVehicleStatus>(
      authenticatedFetch,
      `${API_BASE_URL}/vehicles/${vehicleId}/status${query}`,
      { method: "GET" },
      "No se pudo consultar el estado de combustible de la unidad."
    );
  },

  listAnomalies: async (
    authenticatedFetch: AuthenticatedFetch,
    filters: FuelAnomalyFilters
  ): Promise<FuelConsumptionAnomaly[]> => {
    const query = buildQueryString({
      vehicle_id: filters.vehicle_id,
      fuel_type: filters.fuel_type,
      lookback: filters.lookback,
      min_history: filters.min_history,
      threshold_percent: filters.threshold_percent,
      min_distance_km: filters.min_distance_km,
    });

    return requestJson<FuelConsumptionAnomaly[]>(
      authenticatedFetch,
      `${API_BASE_URL}/anomalies${query}`,
      { method: "GET" },
      "No se pudo cargar la vista de anomalias de combustible."
    );
  },
};
