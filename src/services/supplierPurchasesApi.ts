import {
  ApiError,
  AuthenticatedFetch,
  buildQueryString,
  clampText,
  extractEntity,
  extractItems,
  isRecord,
  normalizeText,
  readNullableString,
  readString,
  requestJson,
  requestVoid,
  withAllPages,
} from "@/lib/apiClient";
import { normalizeDecimalString } from "@/lib/money";
import {
  SUPPLIER_PURCHASE_LIMITS,
  SupplierPurchase,
  SupplierPurchaseFilters,
  SupplierPurchasePayload,
} from "@/types";

const SUPPLIERS_BASE_URL = `${import.meta.env.VITE_API_URL ?? ""}/api/v1/suppliers`;

/**
 * El listado y el alta llevan "/" final y el detalle no: es exactamente como
 * estan declaradas las rutas en el backend. Si no coinciden, FastAPI responde
 * con un 307 que en un POST puede perder el cuerpo o chocar con CORS.
 */
const purchasesUrl = (supplierId: string) =>
  `${SUPPLIERS_BASE_URL}/${encodeURIComponent(supplierId)}/purchases/`;

const purchaseUrl = (supplierId: string, purchaseId: string) =>
  `${SUPPLIERS_BASE_URL}/${encodeURIComponent(supplierId)}/purchases/${encodeURIComponent(purchaseId)}`;

/** Igual que el backend: sin espacios en los extremos, en mayusculas y null si queda vacia. */
export const normalizeInvoiceNumber = (value?: string | null) => {
  const normalized = normalizeText(value);
  return normalized ? clampText(normalized.toUpperCase(), SUPPLIER_PURCHASE_LIMITS.invoiceNumber) : null;
};

export const normalizeSupplierPurchase = (value: unknown): SupplierPurchase => {
  const purchase = isRecord(value) ? value : {};

  return {
    id: readString(purchase, ["id", "purchase_id"]),
    supplier_id: readString(purchase, ["supplier_id"]),
    purchase_date: readString(purchase, ["purchase_date", "date"]).slice(0, 10),
    invoice_number: readNullableString(purchase, ["invoice_number"]) ?? null,
    description: readString(purchase, ["description"]),
    // Puede llegar como texto o, con otro serializador, como numero.
    amount: normalizeDecimalString(purchase.amount) ?? "0.00",
    created_at: readString(purchase, ["created_at"]),
    updated_at: readString(purchase, ["updated_at"]),
  };
};

const sanitizePurchasePayload = (payload: SupplierPurchasePayload) => ({
  purchase_date: payload.purchase_date,
  description: clampText(payload.description.trim(), SUPPLIER_PURCHASE_LIMITS.description),
  amount: payload.amount,
  invoice_number: normalizeInvoiceNumber(payload.invoice_number),
});

/**
 * El PUT del backend es parcial: solo cambia los campos enviados. Se mandan
 * solo los que cambiaron para no pisar lo que otra persona haya editado en
 * otro campo mientras tanto. `invoice_number: null` borra la factura.
 */
export const buildPurchaseChanges = (
  original: SupplierPurchase,
  payload: SupplierPurchasePayload
): Partial<SupplierPurchasePayload> => {
  const next = sanitizePurchasePayload(payload);
  const changes: Partial<SupplierPurchasePayload> = {};

  if (next.purchase_date !== original.purchase_date) changes.purchase_date = next.purchase_date;
  if (next.description !== original.description) changes.description = next.description;
  if (next.amount !== normalizeDecimalString(original.amount)) changes.amount = next.amount;
  if (next.invoice_number !== normalizeInvoiceNumber(original.invoice_number)) {
    changes.invoice_number = next.invoice_number;
  }

  return changes;
};

export const supplierPurchasesApi = {
  /**
   * Todas las compras que cumplen los filtros, ya ordenadas por el backend (la
   * fecha mas reciente primero). Se piden todas las paginas porque el backend
   * no devuelve totales: sumar solo una pagina daria un "total comprado" falso.
   */
  listAll: async (
    authenticatedFetch: AuthenticatedFetch,
    supplierId: string,
    filters: SupplierPurchaseFilters = {},
    signal?: AbortSignal
  ): Promise<SupplierPurchase[]> => {
    const query = buildQueryString({
      date_from: filters.date_from || undefined,
      date_to: filters.date_to || undefined,
      search: normalizeText(filters.search) ?? undefined,
    });

    const payload = await requestJson(
      withAllPages(authenticatedFetch),
      `${purchasesUrl(supplierId)}${query}`,
      { method: "GET", signal },
      "No se pudo cargar el historial de compras."
    );

    return extractItems(payload, ["purchases"]).map((item) => normalizeSupplierPurchase(item));
  },

  create: async (
    authenticatedFetch: AuthenticatedFetch,
    supplierId: string,
    payload: SupplierPurchasePayload
  ): Promise<SupplierPurchase> => {
    const response = await requestJson(
      authenticatedFetch,
      purchasesUrl(supplierId),
      { method: "POST", body: JSON.stringify(sanitizePurchasePayload(payload)) },
      "No se pudo registrar la compra."
    );

    return normalizeSupplierPurchase(extractEntity(response));
  },

  update: async (
    authenticatedFetch: AuthenticatedFetch,
    supplierId: string,
    purchaseId: string,
    changes: Partial<SupplierPurchasePayload>
  ): Promise<SupplierPurchase> => {
    const response = await requestJson(
      authenticatedFetch,
      purchaseUrl(supplierId, purchaseId),
      { method: "PUT", body: JSON.stringify(changes) },
      "No se pudo actualizar la compra."
    );

    return normalizeSupplierPurchase(extractEntity(response));
  },

  remove: async (
    authenticatedFetch: AuthenticatedFetch,
    supplierId: string,
    purchaseId: string
  ): Promise<void> => {
    await requestVoid(
      authenticatedFetch,
      purchaseUrl(supplierId, purchaseId),
      { method: "DELETE" },
      "No se pudo eliminar la compra."
    );
  },
};

export const isConflictError = (error: unknown) => error instanceof ApiError && error.status === 409;
