import {
  CreateFluidMovementPayload,
  CreateFluidProductPayload,
  CreateFluidRulePayload,
  CreateFluidServicePayload,
  FluidAlert,
  FluidAlertSeverity,
  FluidMovement,
  FluidMovementType,
  FluidProduct,
  FluidRule,
  FluidService,
  FluidType,
  UpdateFluidProductPayload,
  UpdateFluidRulePayload,
} from "@/types";
import { localizeApiErrorPayload } from "@/lib/errorI18n";

const RAW_BASE_URL = import.meta.env.VITE_API_URL ?? "";
const API_BASE_URL = `${RAW_BASE_URL.replace(/\/$/, "")}/api/v1/fluids`;
const PAGE_LIMIT = 500;
const MAX_PAGES = 20;

type AuthenticatedFetch = (url: string, options?: RequestInit) => Promise<Response>;
type AnyRecord = Record<string, unknown>;

interface BackendErrorPayload {
  status?: number;
  message?: unknown;
  detail?: unknown;
  error?: unknown;
  code?: string;
  details?: unknown;
}

const FLUID_TYPES: FluidType[] = [
  "engine_oil",
  "transmission_oil",
  "brake_fluid",
  "hydraulic_oil",
  "coolant",
  "other",
];

const MOVEMENT_TYPES: FluidMovementType[] = [
  "opening_balance",
  "purchase",
  "adjustment_in",
  "adjustment_out",
  "service_use",
];

export class FluidsApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(status: number, message: string, code?: string, details?: unknown) {
    super(message);
    this.name = "FluidsApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const isRecord = (value: unknown): value is AnyRecord =>
  typeof value === "object" && value !== null;

const toNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
};

const toStringValue = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

const toDateString = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return new Date(parsed).toISOString();
};

const readString = (node: AnyRecord, keys: string[]): string | undefined => {
  for (const key of keys) {
    const value = toStringValue(node[key]);
    if (value !== undefined && value !== "") return value;
  }
  return undefined;
};

const readNumber = (node: AnyRecord, keys: string[]): number | undefined => {
  for (const key of keys) {
    const value = toNumber(node[key]);
    if (value !== undefined) return value;
  }
  return undefined;
};

const parseFluidType = (value: unknown): FluidType => {
  if (typeof value !== "string") return "other";
  const normalized = value.toLowerCase() as FluidType;
  return FLUID_TYPES.includes(normalized) ? normalized : "other";
};

const parseMovementType = (value: unknown): FluidMovementType => {
  if (typeof value !== "string") return "purchase";
  const normalized = value.toLowerCase() as FluidMovementType;
  return MOVEMENT_TYPES.includes(normalized) ? normalized : "purchase";
};

const parseAlertSeverity = (value: unknown): FluidAlertSeverity => {
  if (typeof value !== "string") return "warning";
  const normalized = value.toLowerCase();
  if (normalized === "critical" || normalized === "error" || normalized === "high") return "critical";
  if (normalized === "info" || normalized === "ok" || normalized === "normal") return "info";
  return "warning";
};

const extractItemsFromPayload = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) return payload;
  if (!isRecord(payload)) return [];

  const directCandidates = [payload.items, payload.results, payload.data, payload.products, payload.rules, payload.services, payload.movements];
  for (const candidate of directCandidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  if (isRecord(payload.data)) {
    if (Array.isArray(payload.data.items)) return payload.data.items;
    if (Array.isArray(payload.data.results)) return payload.data.results;
  }

  return [];
};

const extractTotalFromPayload = (payload: unknown): number | null => {
  if (!isRecord(payload)) return null;

  const direct = toNumber(payload.total) ?? toNumber(payload.count);
  if (direct !== undefined) return direct;

  if (isRecord(payload.pagination)) {
    const paginationTotal = toNumber(payload.pagination.total) ?? toNumber(payload.pagination.count);
    if (paginationTotal !== undefined) return paginationTotal;
  }

  if (isRecord(payload.meta)) {
    const metaTotal = toNumber(payload.meta.total) ?? toNumber(payload.meta.count);
    if (metaTotal !== undefined) return metaTotal;
  }

  return null;
};

const parseFluidsApiError = async (response: Response, fallback: string): Promise<FluidsApiError> => {
  let payload: BackendErrorPayload | null = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  const message = localizeApiErrorPayload(payload, fallback);
  return new FluidsApiError(response.status, message, payload?.code, payload?.details);
};

const requestJson = async <T>(
  authenticatedFetch: AuthenticatedFetch,
  url: string,
  options: RequestInit,
  fallbackMessage: string,
  parser?: (payload: unknown) => T
): Promise<T> => {
  const response = await authenticatedFetch(url, options);

  if (!response.ok) {
    throw await parseFluidsApiError(response, fallbackMessage);
  }

  if (response.status === 204) {
    return (undefined as unknown) as T;
  }

  const payload = await response.json();
  return parser ? parser(payload) : (payload as T);
};

const requestVoid = async (
  authenticatedFetch: AuthenticatedFetch,
  url: string,
  options: RequestInit,
  fallbackMessage: string
): Promise<void> => {
  const response = await authenticatedFetch(url, options);

  if (!response.ok) {
    throw await parseFluidsApiError(response, fallbackMessage);
  }
};

const fetchPaginatedCollection = async <T extends { id: string }>(
  authenticatedFetch: AuthenticatedFetch,
  path: string,
  fallbackMessage: string,
  normalizeItem: (payload: unknown) => T | null
): Promise<T[]> => {
  const collected: T[] = [];
  let offset = 0;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const separator = path.includes("?") ? "&" : "?";
    const url = `${API_BASE_URL}${path}${separator}limit=${PAGE_LIMIT}&offset=${offset}`;

    const response = await authenticatedFetch(url, { method: "GET" });
    if (!response.ok) {
      throw await parseFluidsApiError(response, fallbackMessage);
    }

    const payload = await response.json();
    const rawItems = extractItemsFromPayload(payload);
    if (rawItems.length === 0) break;

    const normalizedItems = rawItems
      .map(normalizeItem)
      .filter((item): item is T => item !== null);

    collected.push(...normalizedItems);

    if (Array.isArray(payload)) break;

    offset += rawItems.length;

    const total = extractTotalFromPayload(payload);
    if (total !== null && offset >= total) break;
    if (rawItems.length < PAGE_LIMIT) break;
  }

  const uniqueById = new Map<string, T>();
  collected.forEach((item) => {
    uniqueById.set(item.id, item);
  });

  return Array.from(uniqueById.values());
};

const normalizeProduct = (payload: unknown): FluidProduct | null => {
  if (!isRecord(payload)) return null;

  const id = readString(payload, ["id", "_id"]);
  const code = readString(payload, ["code"]);
  if (!id || !code) return null;

  return {
    id,
    code,
    name: readString(payload, ["name"]),
    description: readString(payload, ["description"]),
    fluid_type: parseFluidType(payload.fluid_type),
    stock_quantity: readNumber(payload, ["stock_quantity", "stock", "quantity"]) ?? 0,
    min_stock_quantity: readNumber(payload, ["min_stock_quantity", "min_stock", "minimum_stock"]) ?? 0,
    unit: readString(payload, ["unit", "unit_name"]),
    notes: readString(payload, ["notes"]),
    created_at: readString(payload, ["created_at"]),
    updated_at: readString(payload, ["updated_at"]),
  };
};

const normalizeRule = (payload: unknown): FluidRule | null => {
  if (!isRecord(payload)) return null;

  const id = readString(payload, ["id", "_id"]);
  if (!id) return null;

  return {
    id,
    vehicle_id: readString(payload, ["vehicle_id", "unit_id"]),
    vehicle_plate: readString(payload, ["vehicle_plate", "plate_number"]),
    fluid_type: parseFluidType(payload.fluid_type),
    product_id: readString(payload, ["product_id", "fluid_product_id"]),
    product_code: readString(payload, ["product_code", "code"]),
    capacity_liters: readNumber(payload, ["capacity_liters", "capacity", "capacity_l"]) ?? 0,
    interval_km: readNumber(payload, ["interval_km", "change_interval_km", "service_interval_km"]),
    interval_days: readNumber(payload, ["interval_days", "change_interval_days", "service_interval_days"]),
    last_service_km: readNumber(payload, ["last_service_km", "last_km"]),
    last_service_at: toDateString(payload.last_service_at) ?? toDateString(payload.last_service_date),
    next_due_km: readNumber(payload, ["next_due_km", "next_change_km"]),
    next_due_date: toDateString(payload.next_due_date) ?? toDateString(payload.next_change_date),
    notes: readString(payload, ["notes"]),
    created_at: readString(payload, ["created_at"]),
    updated_at: readString(payload, ["updated_at"]),
  };
};

const normalizeService = (payload: unknown): FluidService | null => {
  if (!isRecord(payload)) return null;

  const id = readString(payload, ["id", "_id"]);
  const productId = readString(payload, ["product_id", "fluid_product_id"]);
  if (!id || !productId) return null;

  return {
    id,
    vehicle_id: readString(payload, ["vehicle_id", "unit_id"]),
    vehicle_plate: readString(payload, ["vehicle_plate", "plate_number"]),
    product_id: productId,
    product_code: readString(payload, ["product_code", "code"]),
    fluid_type: parseFluidType(payload.fluid_type),
    quantity: readNumber(payload, ["quantity_used", "quantity", "quantity_liters", "liters"]) ?? 0,
    odometer_km: readNumber(payload, ["odometer_km", "kilometers", "odometer"]),
    performed_by: readString(payload, ["performed_by"]),
    location: readString(payload, ["location"]),
    serviced_at:
      toDateString(payload.serviced_at) ??
      toDateString(payload.service_date) ??
      toDateString(payload.date) ??
      readString(payload, ["created_at"]),
    notes: readString(payload, ["notes"]),
    created_at: readString(payload, ["created_at"]),
    updated_at: readString(payload, ["updated_at"]),
  };
};

const normalizeMovement = (payload: unknown): FluidMovement | null => {
  if (!isRecord(payload)) return null;

  const id = readString(payload, ["id", "_id"]);
  const productId = readString(payload, ["product_id", "fluid_product_id"]);
  if (!id || !productId) return null;

  return {
    id,
    product_id: productId,
    product_code: readString(payload, ["product_code", "code"]),
    fluid_type: payload.fluid_type ? parseFluidType(payload.fluid_type) : undefined,
    movement_type: parseMovementType(payload.movement_type ?? payload.type),
    quantity: readNumber(payload, ["quantity", "quantity_liters", "liters"]) ?? 0,
    stock_after: readNumber(payload, ["stock_after", "stock_balance", "new_stock", "current_stock"]),
    reference: readString(payload, ["reference", "reference_code"]),
    notes: readString(payload, ["notes"]),
    moved_at:
      toDateString(payload.moved_at) ??
      toDateString(payload.occurred_at) ??
      toDateString(payload.date) ??
      readString(payload, ["created_at"]),
    created_at: readString(payload, ["created_at"]),
    updated_at: readString(payload, ["updated_at"]),
  };
};

const normalizeAlert = (payload: unknown, forcedKind?: "stock" | "service", index?: number): FluidAlert | null => {
  if (!isRecord(payload)) return null;

  const kindRaw = readString(payload, ["kind", "alert_kind", "type", "source"]);
  const kind: "stock" | "service" =
    forcedKind ?? (kindRaw && kindRaw.toLowerCase().includes("stock") ? "stock" : "service");

  const id =
    readString(payload, ["id", "_id"]) ??
    `${kind}-${readString(payload, ["vehicle_plate", "plate_number", "product_code", "code"]) ?? "item"}-${index ?? 0}`;

  const title =
    readString(payload, ["title"]) ??
    (kind === "stock" ? "Alerta de stock" : "Alerta de servicio");

  const message =
    readString(payload, ["message", "detail", "description"]) ??
    (kind === "stock"
      ? "Revisa niveles de inventario de fluidos."
      : "Revisa vencimientos de servicio de fluidos.");

  return {
    id,
    kind,
    severity: parseAlertSeverity(payload.severity ?? payload.level ?? payload.status),
    title,
    message,
    fluid_type: payload.fluid_type ? parseFluidType(payload.fluid_type) : undefined,
    vehicle_plate: readString(payload, ["vehicle_plate", "plate_number"]),
    product_code: readString(payload, ["product_code", "code"]),
    current_stock: readNumber(payload, ["current_stock", "stock_quantity", "stock"]),
    min_stock: readNumber(payload, ["min_stock", "min_stock_quantity", "minimum_stock"]),
    due_km: readNumber(payload, ["due_km", "remaining_km", "next_due_km"]),
    due_days: readNumber(payload, ["due_days", "remaining_days"]),
    due_date: toDateString(payload.due_date) ?? toDateString(payload.next_due_date),
    source: readString(payload, ["source", "origin"]),
  };
};

const parseAlertsPayload = (payload: unknown): FluidAlert[] => {
  if (Array.isArray(payload)) {
    return payload
      .map((item, index) => normalizeAlert(item, undefined, index))
      .filter((item): item is FluidAlert => item !== null);
  }

  if (!isRecord(payload)) return [];

  const stockArrays = [payload.stock_alerts, payload.stock, payload.low_stock_alerts].filter(Array.isArray) as unknown[][];
  const serviceArrays = [payload.service_alerts, payload.service, payload.due_service_alerts].filter(Array.isArray) as unknown[][];

  const stockAlerts = stockArrays.flatMap((group) =>
    group
      .map((item, index) => normalizeAlert(item, "stock", index))
      .filter((item): item is FluidAlert => item !== null)
  );

  const serviceAlerts = serviceArrays.flatMap((group) =>
    group
      .map((item, index) => normalizeAlert(item, "service", index))
      .filter((item): item is FluidAlert => item !== null)
  );

  if (stockAlerts.length > 0 || serviceAlerts.length > 0) {
    return [...stockAlerts, ...serviceAlerts];
  }

  const items = extractItemsFromPayload(payload);
  return items
    .map((item, index) => normalizeAlert(item, undefined, index))
    .filter((item): item is FluidAlert => item !== null);
};

const withBody = (method: "POST" | "PUT", payload: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});

const requestWithPayloadVariants = async <T>(
  authenticatedFetch: AuthenticatedFetch,
  url: string,
  method: "POST" | "PUT",
  payloads: unknown[],
  fallbackMessage: string,
  parser: (payload: unknown) => T
): Promise<T> => {
  let lastError: FluidsApiError | null = null;

  for (const payload of payloads) {
    const response = await authenticatedFetch(url, withBody(method, payload));

    if (response.ok) {
      if (response.status === 204) {
        return parser({});
      }
      const body = await response.json();
      return parser(body);
    }

    if (response.status === 400 || response.status === 422) {
      lastError = await parseFluidsApiError(response, fallbackMessage);
      continue;
    }

    throw await parseFluidsApiError(response, fallbackMessage);
  }

  if (lastError) throw lastError;
  throw new FluidsApiError(400, fallbackMessage);
};

const buildProductPayloadVariants = (payload: CreateFluidProductPayload | UpdateFluidProductPayload) => {
  const base: AnyRecord = {
    ...payload,
  };

  if (base.code && typeof base.code === "string") {
    base.code = base.code.toUpperCase();
  }

  const variants: AnyRecord[] = [base];

  if ("min_stock_quantity" in base) {
    const minValue = base.min_stock_quantity;
    const withMinStock = { ...base };
    delete withMinStock.min_stock_quantity;
    withMinStock.min_stock = minValue;
    variants.push(withMinStock);

    const withMinimumStock = { ...base };
    delete withMinimumStock.min_stock_quantity;
    withMinimumStock.minimum_stock = minValue;
    variants.push(withMinimumStock);
  }

  const specificationText =
    (typeof base.specification === "string" && base.specification.trim()) ||
    (typeof base.description === "string" && base.description.trim()) ||
    (typeof base.name === "string" && base.name.trim()) ||
    (typeof base.code === "string" && base.code.trim()) ||
    undefined;

  const withSpecificationVariants: AnyRecord[] = [];
  for (const variant of variants) {
    withSpecificationVariants.push(variant);

    if (specificationText && !("specification" in variant)) {
      withSpecificationVariants.push({ ...variant, specification: specificationText });

      const specificationObject: AnyRecord = {
        summary: specificationText,
      };

      if (typeof variant.name === "string" && variant.name.trim()) {
        specificationObject.name = variant.name.trim();
      }

      if (typeof variant.description === "string" && variant.description.trim()) {
        specificationObject.description = variant.description.trim();
      }

      if (typeof variant.unit === "string" && variant.unit.trim()) {
        specificationObject.unit = variant.unit.trim();
      }

      withSpecificationVariants.push({
        ...variant,
        specification: specificationObject,
      });
    }
  }

  const uniqueVariants: AnyRecord[] = [];
  const seen = new Set<string>();
  for (const candidate of withSpecificationVariants) {
    const key = JSON.stringify(candidate);
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueVariants.push(candidate);
  }

  return uniqueVariants;
};

const buildRulePayloadVariants = (payload: CreateFluidRulePayload | UpdateFluidRulePayload) => {
  const base: AnyRecord = { ...payload };
  const variants: AnyRecord[] = [base];

  const withFluidProductId = { ...base };
  if (typeof withFluidProductId.product_id === "string" && withFluidProductId.product_id) {
    withFluidProductId.fluid_product_id = withFluidProductId.product_id;
  }
  variants.push(withFluidProductId);

  const onlyFluidProductId = { ...withFluidProductId };
  delete onlyFluidProductId.product_id;
  variants.push(onlyFluidProductId);

  if ("vehicle_id" in base && typeof base.vehicle_id === "string" && base.vehicle_id) {
    const vehiclePlateCandidate = base.vehicle_plate;

    const onlyVehiclePlate = { ...base };
    delete onlyVehiclePlate.vehicle_id;
    if (typeof vehiclePlateCandidate === "string" && vehiclePlateCandidate) {
      onlyVehiclePlate.vehicle_plate = vehiclePlateCandidate;
    }
    variants.push(onlyVehiclePlate);

    const onlyVehicleId = { ...base };
    delete onlyVehicleId.vehicle_plate;
    variants.push(onlyVehicleId);

    const withPlateNumber = { ...base };
    if (typeof vehiclePlateCandidate === "string" && vehiclePlateCandidate) {
      withPlateNumber.plate_number = vehiclePlateCandidate;
    }
    variants.push(withPlateNumber);
  }

  if ("interval_km" in base && base.interval_km === undefined) {
    const withoutIntervalKm = { ...base };
    delete withoutIntervalKm.interval_km;
    variants.push(withoutIntervalKm);
  }

  if ("interval_days" in base && base.interval_days === undefined) {
    const withoutIntervalDays = { ...base };
    delete withoutIntervalDays.interval_days;
    variants.push(withoutIntervalDays);
  }

  const uniqueVariants: AnyRecord[] = [];
  const seen = new Set<string>();
  for (const candidate of variants) {
    const key = JSON.stringify(candidate);
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueVariants.push(candidate);
  }

  return uniqueVariants;
};

const buildServicePayloadVariants = (payload: CreateFluidServicePayload) => {
  const servicedAtValue = payload.serviced_at?.trim() || new Date().toISOString().slice(0, 10);

  return [
    {
      vehicle_plate: payload.vehicle_plate,
      fluid_product_id: payload.fluid_product_id,
      serviced_at: servicedAtValue,
      quantity_used: payload.quantity_used,
      ...(typeof payload.odometer_km === "number" ? { odometer_km: payload.odometer_km } : {}),
      ...(payload.performed_by?.trim() ? { performed_by: payload.performed_by.trim() } : {}),
      ...(payload.location?.trim() ? { location: payload.location.trim() } : {}),
      ...(payload.notes?.trim() ? { notes: payload.notes.trim() } : {}),
    },
  ];
};

const buildMovementPayloadVariants = (payload: CreateFluidMovementPayload) => {
  const base: AnyRecord = { ...payload };

  const occurredAtValue =
    (typeof base.occurred_at === "string" && base.occurred_at.trim()) ||
    new Date().toISOString();

  base.occurred_at = occurredAtValue;

  const variants: AnyRecord[] = [base];

  const withFluidProductId = { ...base };
  if (typeof withFluidProductId.product_id === "string" && withFluidProductId.product_id) {
    withFluidProductId.fluid_product_id = withFluidProductId.product_id;
  }
  variants.push(withFluidProductId);

  const onlyFluidProductId = { ...withFluidProductId };
  delete onlyFluidProductId.product_id;
  variants.push(onlyFluidProductId);

  // Compatibilidad por si backend usa nombres alternativos de timestamp.
  const withMovedAt = { ...base };
  withMovedAt.moved_at = occurredAtValue;
  variants.push(withMovedAt);

  const uniqueVariants: AnyRecord[] = [];
  const seen = new Set<string>();
  for (const candidate of variants) {
    const key = JSON.stringify(candidate);
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueVariants.push(candidate);
  }

  return uniqueVariants;
};

const sortByDateDesc = <T extends { created_at?: string }>(items: T[]) =>
  [...items].sort((a, b) => {
    const right = Date.parse(b.created_at ?? "");
    const left = Date.parse(a.created_at ?? "");
    return (Number.isNaN(right) ? 0 : right) - (Number.isNaN(left) ? 0 : left);
  });

export const fluidsApi = {
  listProducts: async (authenticatedFetch: AuthenticatedFetch): Promise<FluidProduct[]> => {
    const items = await fetchPaginatedCollection(
      authenticatedFetch,
      "/products/",
      "No se pudo cargar el catalogo de fluidos.",
      normalizeProduct
    );

    return [...items].sort((a, b) => a.code.localeCompare(b.code, "es", { sensitivity: "base" }));
  },

  getProductById: async (authenticatedFetch: AuthenticatedFetch, productId: string): Promise<FluidProduct> => {
    return requestJson(
      authenticatedFetch,
      `${API_BASE_URL}/products/${encodeURIComponent(productId)}`,
      { method: "GET" },
      "No se pudo cargar el producto de fluido.",
      (payload) => {
        const normalized = normalizeProduct(payload);
        if (!normalized) throw new FluidsApiError(500, "Respuesta invalida del servidor.");
        return normalized;
      }
    );
  },

  createProduct: async (
    authenticatedFetch: AuthenticatedFetch,
    payload: CreateFluidProductPayload
  ): Promise<FluidProduct> => {
    return requestWithPayloadVariants(
      authenticatedFetch,
      `${API_BASE_URL}/products/`,
      "POST",
      buildProductPayloadVariants(payload),
      "No se pudo crear el producto de fluido.",
      (responsePayload) => {
        const normalized = normalizeProduct(responsePayload);
        if (!normalized) throw new FluidsApiError(500, "No se recibio el producto creado.");
        return normalized;
      }
    );
  },

  updateProduct: async (
    authenticatedFetch: AuthenticatedFetch,
    productId: string,
    payload: UpdateFluidProductPayload
  ): Promise<FluidProduct> => {
    return requestWithPayloadVariants(
      authenticatedFetch,
      `${API_BASE_URL}/products/${encodeURIComponent(productId)}`,
      "PUT",
      buildProductPayloadVariants(payload),
      "No se pudo actualizar el producto de fluido.",
      (responsePayload) => {
        const normalized = normalizeProduct(responsePayload);
        if (!normalized) throw new FluidsApiError(500, "No se recibio el producto actualizado.");
        return normalized;
      }
    );
  },

  deleteProduct: async (authenticatedFetch: AuthenticatedFetch, productId: string): Promise<void> => {
    return requestVoid(
      authenticatedFetch,
      `${API_BASE_URL}/products/${encodeURIComponent(productId)}`,
      { method: "DELETE" },
      "No se pudo eliminar el producto de fluido."
    );
  },

  listRules: async (authenticatedFetch: AuthenticatedFetch): Promise<FluidRule[]> => {
    const items = await fetchPaginatedCollection(
      authenticatedFetch,
      "/rules/",
      "No se pudieron cargar las reglas de fluidos.",
      normalizeRule
    );

    return sortByDateDesc(items);
  },

  createRule: async (authenticatedFetch: AuthenticatedFetch, payload: CreateFluidRulePayload): Promise<FluidRule> => {
    return requestWithPayloadVariants(
      authenticatedFetch,
      `${API_BASE_URL}/rules/`,
      "POST",
      buildRulePayloadVariants(payload),
      "No se pudo crear la regla de fluido.",
      (responsePayload) => {
        const normalized = normalizeRule(responsePayload);
        if (!normalized) throw new FluidsApiError(500, "No se recibio la regla creada.");
        return normalized;
      }
    );
  },

  updateRule: async (
    authenticatedFetch: AuthenticatedFetch,
    ruleId: string,
    payload: UpdateFluidRulePayload
  ): Promise<FluidRule> => {
    return requestWithPayloadVariants(
      authenticatedFetch,
      `${API_BASE_URL}/rules/${encodeURIComponent(ruleId)}`,
      "PUT",
      buildRulePayloadVariants(payload),
      "No se pudo actualizar la regla de fluido.",
      (responsePayload) => {
        const normalized = normalizeRule(responsePayload);
        if (!normalized) throw new FluidsApiError(500, "No se recibio la regla actualizada.");
        return normalized;
      }
    );
  },

  deleteRule: async (authenticatedFetch: AuthenticatedFetch, ruleId: string): Promise<void> => {
    return requestVoid(
      authenticatedFetch,
      `${API_BASE_URL}/rules/${encodeURIComponent(ruleId)}`,
      { method: "DELETE" },
      "No se pudo eliminar la regla de fluido."
    );
  },

  listServices: async (authenticatedFetch: AuthenticatedFetch): Promise<FluidService[]> => {
    const items = await fetchPaginatedCollection(
      authenticatedFetch,
      "/services/",
      "No se pudo cargar el historial de servicios de fluidos.",
      normalizeService
    );

    return sortByDateDesc(items);
  },

  createService: async (
    authenticatedFetch: AuthenticatedFetch,
    payload: CreateFluidServicePayload
  ): Promise<FluidService> => {
    const [requestPayload] = buildServicePayloadVariants(payload);
    const response = await authenticatedFetch(
      `${API_BASE_URL}/services/`,
      withBody("POST", requestPayload)
    );

    if (!response.ok) {
      throw await parseFluidsApiError(response, "No se pudo registrar el servicio de fluido.");
    }

    if (response.status === 204) {
      return {
        id: `created-${Date.now()}`,
        vehicle_plate: payload.vehicle_plate,
        product_id: payload.fluid_product_id,
        product_code: undefined,
        fluid_type: "other",
        quantity: payload.quantity_used,
        odometer_km: payload.odometer_km,
        performed_by: payload.performed_by,
        location: payload.location,
        serviced_at: payload.serviced_at,
        notes: payload.notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    let responsePayload: unknown = null;
    try {
      responsePayload = await response.json();
    } catch {
      responsePayload = null;
    }

    return (
      normalizeService(responsePayload) ?? {
        id: `created-${Date.now()}`,
        vehicle_plate: payload.vehicle_plate,
        product_id: payload.fluid_product_id,
        product_code: undefined,
        fluid_type: "other",
        quantity: payload.quantity_used,
        odometer_km: payload.odometer_km,
        performed_by: payload.performed_by,
        location: payload.location,
        serviced_at: payload.serviced_at,
        notes: payload.notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    );
  },

  listMovements: async (authenticatedFetch: AuthenticatedFetch): Promise<FluidMovement[]> => {
    const items = await fetchPaginatedCollection(
      authenticatedFetch,
      "/movements/",
      "No se pudo cargar el historial de movimientos de fluidos.",
      normalizeMovement
    );

    return sortByDateDesc(items);
  },

  createMovement: async (
    authenticatedFetch: AuthenticatedFetch,
    payload: CreateFluidMovementPayload
  ): Promise<FluidMovement> => {
    return requestWithPayloadVariants(
      authenticatedFetch,
      `${API_BASE_URL}/movements/`,
      "POST",
      buildMovementPayloadVariants(payload),
      "No se pudo registrar el movimiento de inventario.",
      (responsePayload) => {
        const normalized = normalizeMovement(responsePayload);
        if (!normalized) throw new FluidsApiError(500, "No se recibio el movimiento registrado.");
        return normalized;
      }
    );
  },

  getAlerts: async (authenticatedFetch: AuthenticatedFetch): Promise<FluidAlert[]> => {
    const endpoints = [`${API_BASE_URL}/alerts`, `${API_BASE_URL}/alerts/`];
    let lastError: FluidsApiError | null = null;

    for (const endpoint of endpoints) {
      const response = await authenticatedFetch(endpoint, { method: "GET" });

      if (response.ok) {
        const payload = await response.json();
        return parseAlertsPayload(payload);
      }

      if (response.status === 404) {
        lastError = await parseFluidsApiError(response, "No se encontro el endpoint de alertas de fluidos.");
        continue;
      }

      throw await parseFluidsApiError(response, "No se pudieron cargar las alertas de fluidos.");
    }

    if (lastError) throw lastError;
    throw new FluidsApiError(404, "No se encontro el endpoint de alertas de fluidos.");
  },
};
