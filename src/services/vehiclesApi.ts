import { localizeApiErrorPayload } from "@/lib/errorI18n";
import { VehicleSpecification, VehicleSpecificationPayload } from "@/types";

const API_BASE_URL = `${import.meta.env.VITE_API_URL ?? ""}/api/v1/vehicles`;

type AuthenticatedFetch = (url: string, options?: RequestInit) => Promise<Response>;

interface BackendErrorPayload {
  status?: number;
  message?: unknown;
  detail?: unknown;
  error?: unknown;
  code?: string;
  details?: unknown;
}

export class VehiclesApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(status: number, message: string, code?: string, details?: unknown) {
    super(message);
    this.name = "VehiclesApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const parseVehiclesApiError = async (
  response: Response,
  fallback: string
): Promise<VehiclesApiError> => {
  let payload: BackendErrorPayload | null = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  const message = localizeApiErrorPayload(payload, fallback);
  return new VehiclesApiError(response.status, message, payload?.code, payload?.details);
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

export const normalizeVehicleSpecification = (value: unknown): VehicleSpecification => {
  const specification = isRecord(value) ? value : {};

  return {
    id: readString(specification, "id"),
    vehicle_id: readString(specification, "vehicle_id"),
    created_at: readString(specification, "created_at"),
    updated_at: readString(specification, "updated_at"),
    engine_type: readNullableString(specification, "engine_type") ?? null,
    engine_code: readNullableString(specification, "engine_code") ?? null,
    fuel_type: readNullableString(specification, "fuel_type") ?? null,
    transmission_type: readNullableString(specification, "transmission_type") ?? null,
    drive_type: readNullableString(specification, "drive_type") ?? null,
    vin: readNullableString(specification, "vin") ?? null,
    chassis_number: readNullableString(specification, "chassis_number") ?? null,
    notes: readNullableString(specification, "notes") ?? null,
  };
};

const requestJson = async (
  authenticatedFetch: AuthenticatedFetch,
  url: string,
  options: RequestInit,
  fallbackMessage: string
) => {
  const response = await authenticatedFetch(url, options);

  if (!response.ok) {
    throw await parseVehiclesApiError(response, fallbackMessage);
  }

  return response.json();
};

const normalizeSpecField = (value: string | null | undefined) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const sanitizeVehicleSpecificationPayload = (payload: VehicleSpecificationPayload) => ({
  engine_type: normalizeSpecField(payload.engine_type),
  engine_code: normalizeSpecField(payload.engine_code),
  fuel_type: normalizeSpecField(payload.fuel_type),
  transmission_type: normalizeSpecField(payload.transmission_type),
  drive_type: normalizeSpecField(payload.drive_type),
  vin: normalizeSpecField(payload.vin),
  chassis_number: normalizeSpecField(payload.chassis_number),
  notes: normalizeSpecField(payload.notes),
});

export const vehiclesApi = {
  getSpecification: async (
    authenticatedFetch: AuthenticatedFetch,
    plateNumber: string
  ): Promise<VehicleSpecification | null> => {
    const response = await authenticatedFetch(
      `${API_BASE_URL}/${encodeURIComponent(plateNumber.trim())}/specs`,
      { method: "GET" }
    );

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw await parseVehiclesApiError(response, "No se pudo cargar la ficha técnica de la unidad.");
    }

    return normalizeVehicleSpecification(await response.json());
  },

  upsertSpecification: async (
    authenticatedFetch: AuthenticatedFetch,
    plateNumber: string,
    payload: VehicleSpecificationPayload
  ): Promise<VehicleSpecification> => {
    const response = await requestJson(
      authenticatedFetch,
      `${API_BASE_URL}/${encodeURIComponent(plateNumber.trim())}/specs`,
      {
        method: "PUT",
        body: JSON.stringify(sanitizeVehicleSpecificationPayload(payload)),
      },
      "No se pudo guardar la ficha técnica de la unidad."
    );

    return normalizeVehicleSpecification(response);
  },
};