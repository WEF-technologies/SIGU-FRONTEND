type AnyRecord = Record<string, unknown>;

const ENGLISH_HINTS = /\b(not|invalid|required|missing|field|vehicle|fuel|reading|maintenance|tool|part|already|exists|found|permission|unauthorized|forbidden|must|should|greater|less|unable|failed|timeout|network|server|request|details|date|number|string|value|input)\b/i;
const SPANISH_HINTS = /\b(no|vehiculo|combustible|lectura|mantenimiento|herramienta|parte|campo|obligatorio|invalido|sesion|permiso|placa|kilometr|fecha|costo|descripcion|error|actualizar|registrar)\b/i;
const TECHNICAL_HINTS = /\b(traceback|stack trace|sqlalchemy|psycopg|sqlite|mongodb|objectid|integrityerror|validationerror|pydantic|typeerror|valueerror|keyerror|indexerror|attributeerror|foreign key|duplicate key|constraint|syntax error|internal server error|unhandled|request_id|timestamp|debug|line\s+\d+|file\s+".+")\b/i;
const TECHNICAL_JSON_HINTS = /("request_id"|"timestamp"|"traceback"|"stack"|"loc"\s*:|"ctx"\s*:|"detail"\s*:|"error"\s*:|"status"\s*:\s*\d+)/i;

const FIELD_LABELS: Record<string, string> = {
  vehicle_id: "Unidad",
  vehicle_plate: "Placa",
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
  compatible_vehicles: "Vehiculos compatibles",
  fitments: "Compatibilidad tecnica",
  year_from: "Año desde",
  year_to: "Año hasta",
  quantity: "Cantidad",
  unit_price: "Precio unitario",
  code: "Codigo",
  name: "Nombre",
  last_name: "Apellido",
  document_number: "Documento",
  specification: "Especificacion",
  engine_type: "Tipo de motor",
  engine_code: "Codigo de motor",
  transmission_type: "Transmision",
  drive_type: "Traccion",
  // La clave es el nombre del campo en el backend; la etiqueta, cómo lo llama la UI.
  vin: "Serial",
  chassis_number: "Numero de chasis",
  fluid_product_id: "Producto de fluido",
  quantity_used: "Cantidad usada",
  occurred_at: "Fecha y hora",
  department: "Departamento",
  position: "Cargo",
  hire_date: "Fecha de ingreso",
  staff_member_id: "Personal",
  staff_document_number: "Documento del personal",
  dotation_item_id: "Item de dotacion",
  item_code: "Codigo del item",
  renewal_months: "Meses de renovacion",
  delivered_at: "Fecha de entrega",
  delivered_by: "Entregado por",
  year: "Ano",
  status: "Estado",
  supplier_id: "Proveedor",
  address: "Direccion",
  contact_person: "Contacto",
  contact_name: "Contacto",
  delivery_time_notes: "Notas de entrega",
  phone: "Telefono",
  contact_phone: "Telefono",
  phone_number: "Telefono",
  email: "Correo",
  contact_email: "Correo",
  categories: "Categorias",
  category: "Categoria",
  destacado: "Destacado",
  chat_url: "Enlace de chat",
  notes: "Notas",
  // Manual de fallas
  title: "Titulo",
  symptom: "Sintoma",
  probable_causes: "Causas probables",
  resolution_steps: "Pasos de resolucion",
  severity: "Severidad",
  requires_workshop: "Requiere taller",
  safety_notes: "Notas de seguridad",
  prevention_tips: "Recomendaciones de prevencion",
};

const cleanText = (value: string) => value.replace(/\s+/g, " ").trim();

const isTechnicalMessage = (value: string): boolean => {
  if (!value) return false;

  if (TECHNICAL_HINTS.test(value)) return true;
  if (TECHNICAL_JSON_HINTS.test(value)) return true;

  // Evita exponer blobs técnicos largos (payloads completos o trazas).
  if (value.length > 220 && /[{}[\]]/.test(value)) return true;

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

/**
 * Mensajes concretos del modulo de vehiculos. Van antes que las reglas
 * genericas: "does not exist" o "not found" por si solos se traducirian a un
 * "No se encontro el recurso" que no le dice al usuario que corregir.
 */
const translateVehicleModuleMessage = (raw: string): string | null => {
  if (/spare part with id \S+ does not exist/i.test(raw)) {
    return "El repuesto seleccionado ya no existe en el inventario.";
  }

  if (/sparepart with id \S+ not found/i.test(raw)) {
    return "El repuesto ya no existe. Es posible que otro usuario lo haya eliminado.";
  }

  if (/maintenance with id \S+ not found/i.test(raw)) {
    return "El mantenimiento ya no existe. Es posible que otro usuario lo haya eliminado.";
  }

  let match = raw.match(/vehicle with plate number (.+?) does not exist/i);
  if (match) return `La unidad con placa ${match[1]} no existe.`;

  if (/^vehicle not found$/i.test(raw)) {
    return "La unidad no existe.";
  }

  match = raw.match(/year must be between (\d+) and (\d+)/i);
  if (match) return `El año debe estar entre ${match[1]} y ${match[2]}.`;

  match = raw.match(/vehicle kilometers cannot be lower than the highest recorded kilometers for this unit \((\d+)\)/i);
  if (match) {
    return `El kilometraje no puede ser menor al mayor registrado para la unidad (${Number(match[1]).toLocaleString()} km).`;
  }

  match = raw.match(/maintenance kilometers cannot be lower than the highest already recorded maintenance kilometers for this unit \((\d+)\)/i);
  if (match) {
    return `El kilometraje no puede ser menor al del mantenimiento con mayor kilometraje de la unidad (${Number(match[1]).toLocaleString()} km).`;
  }

  if (/kilometers must be a non-negative number/i.test(raw)) {
    return "El kilometraje no puede ser negativo.";
  }

  if (/at least one spare part fitment criterion must be provided/i.test(raw)) {
    return "Cada regla de compatibilidad necesita al menos un dato (marca, modelo, año o ficha técnica).";
  }

  if (/year_from cannot be greater than year_to/i.test(raw)) {
    return "En una regla de compatibilidad, el año inicial no puede ser mayor que el año final.";
  }

  match = raw.match(/(year_from|year_to) must be greater than or equal to (\d+)/i);
  if (match) {
    const label = match[1].toLowerCase() === "year_from" ? "inicial" : "final";
    return `El año ${label} de una regla de compatibilidad debe ser ${match[2]} o posterior.`;
  }

  if (/quantity must be a non-negative integer/i.test(raw)) {
    return "La cantidad debe ser un numero entero mayor o igual a 0.";
  }

  if (/unit price must be non-negative/i.test(raw)) {
    return "El precio unitario no puede ser negativo.";
  }

  if (/^description must be a non-empty string$/i.test(raw)) {
    return "La descripcion es obligatoria.";
  }

  if (/^type must be a non-empty string$/i.test(raw)) {
    return "El tipo de mantenimiento es obligatorio.";
  }

  if (/spare_part_description must be non-empty when provided/i.test(raw)) {
    return "La descripcion del repuesto no puede estar vacia.";
  }

  if (/input should be a valid uuid/i.test(raw)) {
    return "No es un identificador valido.";
  }

  return translateContractMessage(raw);
};

/** Mensajes del modulo de contratos (validaciones de valuacion y estados). */
const translateContractMessage = (raw: string): string | null => {
  if (/contract number already exists/i.test(raw)) {
    return "Ya existe un contrato con ese numero.";
  }
  if (/start date must be before end date/i.test(raw)) {
    return "La fecha de inicio debe ser anterior a la fecha de fin.";
  }
  if (/new contracts must be borrador or activo/i.test(raw)) {
    return "Un contrato nuevo solo puede crearse como borrador o activo.";
  }
  if (/thresholds must satisfy/i.test(raw)) {
    return "Los umbrales deben cumplir: 0 < advertencia < critico <= 100.";
  }
  if (/contract amount cannot be negative/i.test(raw)) {
    return "El monto del contrato no puede ser negativo.";
  }
  if (/valuation frequency must be a positive integer/i.test(raw)) {
    return "La frecuencia de valuacion debe ser un numero entero de dias mayor a 0.";
  }
  if (/approval lead time must be a positive integer/i.test(raw)) {
    return "Los dias de anticipacion para aprobar deben ser un numero entero mayor a 0.";
  }
  if (/currency must be ves or usd/i.test(raw)) {
    return "La moneda debe ser VES o USD.";
  }
  return null;
};

const translateKnownEnglish = (message: string): string | null => {
  const raw = cleanText(message);

  const vehicleModuleMessage = translateVehicleModuleMessage(raw);
  if (vehicleModuleMessage) return vehicleModuleMessage;

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

  if (/datetimes provided to dates should have zero time|exact dates/i.test(raw)) {
    return "Debe ingresar solo una fecha, sin hora.";
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