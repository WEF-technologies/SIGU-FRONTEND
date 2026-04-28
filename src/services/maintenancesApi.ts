const API_BASE_URL = `${import.meta.env.VITE_API_URL ?? ""}/api/v1`;

export interface BackendErrorPayload {
  status?: number;
  message?: string;
  code?: string;
  details?: unknown;
}

export class ApiRequestError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(status: number, message: string, code?: string, details?: unknown) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('authToken');
  const headers: Record<string, string> = {
    Accept: 'application/pdf',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

const extractFilenameFromContentDisposition = (headerValue: string | null, fallbackPlate: string): string => {
  if (!headerValue) return `${fallbackPlate}_maintenance_history.pdf`;

  const filenameMatch = headerValue.match(/filename\*?=(?:UTF-8''|\")?([^\";]+)/i);
  if (!filenameMatch || !filenameMatch[1]) {
    return `${fallbackPlate}_maintenance_history.pdf`;
  }

  const rawFilename = filenameMatch[1].replace(/\"/g, '').trim();
  try {
    return decodeURIComponent(rawFilename);
  } catch {
    return rawFilename;
  }
};

const parseBackendError = async (response: Response): Promise<ApiRequestError> => {
  let payload: BackendErrorPayload | null = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  const fallbackMessage = `No se pudo descargar el historial (${response.status}).`;
  const message = payload?.message || fallbackMessage;

  return new ApiRequestError(response.status, message, payload?.code, payload?.details);
};

export const maintenancesApi = {
  async downloadVehicleReport(vehiclePlate: string): Promise<{ blob: Blob; filename: string }> {
    const encodedPlate = encodeURIComponent(vehiclePlate.trim());
    const response = await fetch(`${API_BASE_URL}/maintenances/vehicle/${encodedPlate}/report`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw await parseBackendError(response);
    }

    const blob = await response.blob();
    const filename = extractFilenameFromContentDisposition(
      response.headers.get('Content-Disposition'),
      vehiclePlate
    );

    return { blob, filename };
  },
};
