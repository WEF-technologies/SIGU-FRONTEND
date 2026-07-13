type AnyRecord = Record<string, unknown>;

const ENGLISH_HINTS = /\b(not|invalid|required|missing|field|vehicle|fuel|reading|maintenance|tool|part|already|exists|found|permission|unauthorized|forbidden|must|should|greater|less|unable|failed|timeout|network|server|request|details|date|number|string|value|input)\b/i;
const SPANISH_HINTS = /\b(no|vehiculo|combustible|lectura|mantenimiento|herramienta|parte|campo|obligatorio|invalido|sesion|permiso|placa|kilometr|fecha|costo|descripcion|error|actualizar|registrar)\b/i;
const TECHNICAL_HINTS = /\b(traceback|stack trace|sqlalchemy|psycopg|sqlite|mongodb|objectid|integrityerror|validationerror|pydantic|typeerror|valueerror|keyerror|indexerror|attributeerror|foreign key|duplicate key|constraint|syntax error|internal server error|unhandled|request_id|timestamp|debug|line\s+\d+|file\s+".+")\b/i;
const TECHNICAL_JSON_HINTS = /("request_id"|"timestamp"|"traceback"|"stack"|"loc"\s*:|"ctx"\s*:|"detail"\s*:|"error"\s*:|"status"\s*:\s*\d+)/i;

const FIELD_LABELS: Record<string, string> = {
  vehicle_id: "Unidad",
  plate_number: "Placa",
  kilometers: "Kilometraje",
  current_kilometers: "Kilometraje",
  odometer_km: "Kilometraje",
  fuel_type: "Tipo de combustible",
  reading_value: "Lectura",
  reading_unit: "Unidad de medida",
  liters: "Litros",
  total_cost: "Costo total",
  date: "Fecha",
  description: "Descripcion",
  type: "Tipo",
  location: "Ubicacion",
  performed_by: "Responsable",
  spare_part_id: "Repuesto",
  spare_part_description: "Descripcion del repuesto",
  code: "Codigo",
  name: "Nombre",
  year: "Ano",
  status: "Estado",
};

const cleanText = (value: string) => value.replace(/\s+/g, " ").trim();

const isTechnicalMessage = (value: string): boolean => {
  if (!value) return false;

  if (TECHNICAL_HINTS.test(value)) return true;
  if (TECHNICAL_JSON_HINTS.test(value)) return true;

  // Evita exponer blobs técnicos largos (payloads completos o trazas).
  if (value.length > 220 && /[{}\[\]]/.test(value)) return true;

  return false;
};

const capitalize = (value: string) => {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
};

const getFieldKey = (loc: unknown): string | null => {
  if (typeof loc === "string") return loc;

  if (Array.isArray(loc) && loc.length > 0) {
    const last = loc[loc.length - 1];
    if (typeof last === "string") return last;
  }

  return null;
};

const getFieldLabel = (fieldKey: string | null): string => {
  if (!fieldKey) return "";

  const normalized = fieldKey.replace(/\[\d+\]/g, "").trim().toLowerCase();
  if (!normalized) return "";

  return FIELD_LABELS[normalized] || capitalize(normalized.replace(/_/g, " "));
};

const translateKnownEnglish = (message: string): string | null => {
  const raw = cleanText(message);

  let match = raw.match(/input should be greater than or equal to\s*(-?\d+(?:\.\d+)?)/i);
  if (match) return `Debe ser mayor o igual a ${match[1]}.`;

  match = raw.match(/input should be greater than\s*(-?\d+(?:\.\d+)?)/i);
  if (match) return `Debe ser mayor a ${match[1]}.`;

  match = raw.match(/input should be less than or equal to\s*(-?\d+(?:\.\d+)?)/i);
  if (match) return `Debe ser menor o igual a ${match[1]}.`;

  match = raw.match(/input should be less than\s*(-?\d+(?:\.\d+)?)/i);
  if (match) return `Debe ser menor a ${match[1]}.`;

  match = raw.match(/string should have at most\s*(\d+)\s*characters?/i);
  if (match) return `Debe tener como maximo ${match[1]} caracteres.`;

  match = raw.match(/string should have at least\s*(\d+)\s*characters?/i);
  if (match) return `Debe tener al menos ${match[1]} caracteres.`;

  if (/field required|missing required/i.test(raw)) {
    return "Campo obligatorio.";
  }

  if (/failed to fetch|network error|networkerror|timed out|timeout|connection/i.test(raw)) {
    return "No se pudo conectar con el servidor. Verifica tu conexion e intenta nuevamente.";
  }

  if (/not authenticated|unauthorized|invalid token|token.*expired|session expired|could not validate credentials/i.test(raw)) {
    return "Tu sesion expiro o no es valida. Inicia sesion nuevamente.";
  }

  if (/forbidden|permission denied|not enough permissions|access denied/i.test(raw)) {
    return "No tienes permisos para realizar esta accion.";
  }

  if (/not found|does not exist|no such/i.test(raw)) {
    return "No se encontro el recurso solicitado.";
  }

  if (/already exists|duplicate|unique constraint/i.test(raw)) {
    return "El registro ya existe y no se puede duplicar.";
  }

  if (/kilometers?|odometer/i.test(raw) && /(less|lower|below|greater|higher|exceed|decrease|increase)/i.test(raw)) {
    return "El kilometraje ingresado no es valido con respecto al historial de la unidad.";
  }

  if (/input should be a valid integer|input should be a valid number|not a valid integer|not a valid number|type_error\.number/i.test(raw)) {
    return "Debe ingresar un numero valido.";
  }

  if (/input should be a valid string|not a valid string|type_error\.string/i.test(raw)) {
    return "Debe ingresar un texto valido.";
  }

  if (/not a valid date|invalid date|input should be a valid date/i.test(raw)) {
    return "Debe ingresar una fecha valida.";
  }

  if (/not a valid email|valid email/i.test(raw)) {
    return "Debe ingresar un correo electronico valido.";
  }

  if (/validation error|unprocessable entity|invalid input|bad request/i.test(raw)) {
    return "Hay datos invalidos en el formulario. Revisalos e intenta de nuevo.";
  }

  if (/internal server error|server error/i.test(raw)) {
    return "Ocurrio un error interno del servidor. Intenta nuevamente en unos minutos.";
  }

  if (/method not allowed/i.test(raw)) {
    return "La operacion solicitada no esta permitida.";
  }

  if (/too many requests/i.test(raw)) {
    return "Se excedio el numero de intentos. Intenta nuevamente en unos segundos.";
  }

  return null;
};

export const localizeApiErrorText = (message: unknown, fallback: string): string => {
  if (typeof message !== "string") return fallback;

  const clean = cleanText(message);
  if (!clean) return fallback;

  const translated = translateKnownEnglish(clean);
  if (translated) return translated;

  if (isTechnicalMessage(clean)) {
    return fallback;
  }

  if (SPANISH_HINTS.test(clean) || !ENGLISH_HINTS.test(clean)) {
    return clean;
  }

  return fallback;
};

const localizePayloadNode = (node: unknown): string => {
  if (node === null || node === undefined) return "";

  if (typeof node === "string") {
    return localizeApiErrorText(node, "");
  }

  if (Array.isArray(node)) {
    return node
      .map((item) => localizePayloadNode(item))
      .filter((item) => Boolean(item))
      .join(" | ");
  }

  if (typeof node === "object") {
    const obj = node as AnyRecord;

    const fieldLabel = getFieldLabel(
      getFieldKey(obj.loc ?? obj.field ?? obj.path ?? null)
    );

    const nestedMessage =
      localizePayloadNode(obj.msg) ||
      localizePayloadNode(obj.message) ||
      localizePayloadNode(obj.detail) ||
      localizePayloadNode(obj.error) ||
      localizePayloadNode(obj.errors) ||
      localizePayloadNode(obj.details);

    if (fieldLabel && nestedMessage) {
      return `${fieldLabel}: ${nestedMessage}`;
    }

    return nestedMessage;
  }

  return "";
};

export const localizeApiErrorPayload = (payload: unknown, fallback: string): string => {
  const localized = localizePayloadNode(payload);
  if (localized) {
    const cleaned = cleanText(localized);
    if (!cleaned || isTechnicalMessage(cleaned)) return fallback;
    return cleaned;
  }
  return fallback;
};

export const localizeApiError = (error: unknown, fallback: string): string => {
  if (error instanceof Error) {
    return localizeApiErrorText(error.message, fallback);
  }

  if (typeof error === "string") {
    return localizeApiErrorText(error, fallback);
  }

  return fallback;
};