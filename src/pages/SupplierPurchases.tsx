import { useCallback, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { FormModal } from "@/components/shared/FormModal";
import { SearchFilter } from "@/components/shared/SearchFilter";
import { SupplierPurchaseForm } from "@/components/suppliers/SupplierPurchaseForm";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useConfirm } from "@/hooks/useConfirm";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  isNotFoundError,
  useSupplierDetail,
  useSupplierPurchaseMutations,
  useSupplierPurchases,
} from "@/hooks/useSupplierPurchases";
import { formatDateOnly, toDateOnlyLocalValue } from "@/lib/dates";
import { formatAmount, parseDecimalToCents } from "@/lib/money";
import { SupplierPurchase, SupplierPurchaseFilters, SupplierPurchasePayload } from "@/types";
import { ArrowLeft, Ban, Edit, Plus, RefreshCw, Trash2 } from "lucide-react";

/**
 * Periodo del historial. Los rangos se calculan con la fecha local, no UTC
 * (ver lib/dates). "custom" muestra los campos Desde/Hasta; el resto no los
 * necesita y asi la pantalla queda con un solo control de periodo.
 */
type Period = "all" | "month" | "quarter" | "year" | "custom";

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "all", label: "Todo" },
  { value: "month", label: "Este mes" },
  { value: "quarter", label: "3 meses" },
  { value: "year", label: "Este año" },
  { value: "custom", label: "Personalizado" },
];

const getPeriodRange = (period: Exclude<Period, "custom">) => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  switch (period) {
    case "month":
      return {
        date_from: toDateOnlyLocalValue(new Date(year, month, 1)),
        date_to: toDateOnlyLocalValue(new Date(year, month + 1, 0)),
      };
    case "quarter":
      return {
        date_from: toDateOnlyLocalValue(new Date(year, month - 2, 1)),
        date_to: toDateOnlyLocalValue(new Date(year, month + 1, 0)),
      };
    case "year":
      return {
        date_from: toDateOnlyLocalValue(new Date(year, 0, 1)),
        date_to: toDateOnlyLocalValue(new Date(year, 11, 31)),
      };
    default:
      return { date_from: "", date_to: "" };
  }
};

/** El titulo del total dice a que periodo corresponde, asi no hace falta repetirlo en cada dato. */
const getTotalLabel = (period: Period, dateFrom: string, dateTo: string) => {
  switch (period) {
    case "month":
      return "Total comprado este mes";
    case "quarter":
      return "Total comprado en los últimos 3 meses";
    case "year":
      return "Total comprado este año";
    case "custom":
      if (dateFrom && dateTo) return `Total comprado del ${formatDateOnly(dateFrom)} al ${formatDateOnly(dateTo)}`;
      if (dateFrom) return `Total comprado desde el ${formatDateOnly(dateFrom)}`;
      if (dateTo) return `Total comprado hasta el ${formatDateOnly(dateTo)}`;
      return "Total comprado en todo el historial";
    default:
      return "Total comprado en todo el historial";
  }
};

const isInactiveStatus = (status?: string | null) => {
  const normalized = (status ?? "").trim().toLowerCase();
  return normalized === "inactive" || normalized === "inactivo";
};

const getAmountCents = (purchase: SupplierPurchase) => parseDecimalToCents(purchase.amount) ?? 0n;

export default function SupplierPurchases() {
  const { supplierId } = useParams<{ supplierId: string }>();
  const confirm = useConfirm();

  const [period, setPeriod] = useState<Period>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<SupplierPurchase | null>(null);

  // Una peticion por pausa de tecleo, no por tecla.
  const debouncedSearch = useDebouncedValue(searchTerm.trim());

  const { date_from: dateFrom, date_to: dateTo } =
    period === "custom" ? { date_from: customFrom, date_to: customTo } : getPeriodRange(period);
  const isRangeInvalid = Boolean(dateFrom && dateTo && dateFrom > dateTo);

  const filters = useMemo<SupplierPurchaseFilters>(
    () => ({ date_from: dateFrom, date_to: dateTo, search: debouncedSearch }),
    [dateFrom, dateTo, debouncedSearch]
  );

  const supplierQuery = useSupplierDetail(supplierId);
  const purchasesQuery = useSupplierPurchases({ supplierId, filters, enabled: !isRangeInvalid });
  const { createPurchase, updatePurchase, deletePurchase } = useSupplierPurchaseMutations(supplierId);

  const supplier = supplierQuery.data;
  const purchases = useMemo(() => (isRangeInvalid ? [] : purchasesQuery.data ?? []), [isRangeInvalid, purchasesQuery.data]);
  // Solo el GET del proveedor decide si el proveedor no existe. Un 404 del
  // historial con el proveedor cargado significa que el backend desplegado aun
  // no tiene el endpoint de compras (FastAPI responde "Not Found" a la ruta).
  const isSupplierMissing = isNotFoundError(supplierQuery.error);
  const isHistoryUnavailable = Boolean(supplier) && isNotFoundError(purchasesQuery.error);
  const isSupplierInactive = isInactiveStatus(supplier?.status);
  const hasFilters = period !== "all" || Boolean(searchTerm.trim());
  const isLoading = purchasesQuery.isLoading || supplierQuery.isLoading;
  const canRegister = Boolean(supplier) && !isSupplierInactive && !isHistoryUnavailable;
  // Sin ninguna compra no hay nada que resumir ni filtrar: solo se muestra el estado vacio.
  const hasNoPurchasesAtAll = !isLoading && !hasFilters && purchases.length === 0;

  const summary = useMemo(() => {
    const totalCents = purchases.reduce((sum, purchase) => sum + getAmountCents(purchase), 0n);
    const count = purchases.length;
    const lastPurchaseDate = purchases.reduce<string | null>(
      (latest, purchase) => (!latest || purchase.purchase_date > latest ? purchase.purchase_date : latest),
      null
    );
    // Promedio redondeado al centimo (mitad hacia arriba).
    const averageCents = count > 0 ? (totalCents * 2n + BigInt(count)) / (BigInt(count) * 2n) : null;

    return { totalCents, count, lastPurchaseDate, averageCents };
  }, [purchases]);

  const openCreate = useCallback(() => {
    setEditingPurchase(null);
    setIsFormOpen(true);
  }, []);

  const openEdit = useCallback((purchase: SupplierPurchase) => {
    setEditingPurchase(purchase);
    setIsFormOpen(true);
  }, []);

  const closeForm = useCallback(() => {
    setIsFormOpen(false);
    setEditingPurchase(null);
  }, []);

  const handleSubmit = useCallback(
    async (payload: SupplierPurchasePayload) => {
      const ok = editingPurchase ? await updatePurchase(editingPurchase, payload) : await createPurchase(payload);
      if (ok) closeForm();
      return ok;
    },
    [closeForm, createPurchase, editingPurchase, updatePurchase]
  );

  const handleDelete = useCallback(
    async (purchase: SupplierPurchase) => {
      const invoice = purchase.invoice_number ? ` (factura ${purchase.invoice_number})` : "";
      const confirmed = await confirm({
        title: "Eliminar compra",
        description: `Se eliminará la compra del ${formatDateOnly(purchase.purchase_date)} por ${formatAmount(
          purchase.amount
        )}${invoice}. Esta acción no se puede deshacer.`,
      });
      if (confirmed) await deletePurchase(purchase);
    },
    [confirm, deletePurchase]
  );

  const changePeriod = (next: string) => {
    // Radix devuelve "" al volver a pulsar la opcion activa: se mantiene la actual.
    if (!next) return;
    if (next === "custom" && period !== "custom") {
      // Parte del rango que se estaba viendo, para no empezar de cero.
      setCustomFrom(dateFrom);
      setCustomTo(dateTo);
    }
    setPeriod(next as Period);
  };

  const clearFilters = () => {
    setPeriod("all");
    setCustomFrom("");
    setCustomTo("");
    setSearchTerm("");
  };

  const columns = useMemo<Column<SupplierPurchase>[]>(
    () => [
      {
        key: "purchase_date",
        header: "Fecha",
        // En movil la fecha y el monto ya van en el titulo de la tarjeta.
        hideOnMobile: true,
        sortValue: (purchase) => purchase.purchase_date,
        render: (_, purchase) => (
          <span className="whitespace-nowrap text-sm text-gray-900">{formatDateOnly(purchase.purchase_date)}</span>
        ),
      },
      {
        key: "description",
        header: "Descripción",
        sortable: false,
        render: (_, purchase) => (
          <p className="max-w-md whitespace-pre-line break-words text-sm text-gray-900">{purchase.description}</p>
        ),
      },
      {
        key: "invoice_number",
        header: "Factura",
        sortValue: (purchase) => purchase.invoice_number ?? "",
        render: (_, purchase) =>
          purchase.invoice_number ? (
            <span className="text-sm text-gray-700">{purchase.invoice_number}</span>
          ) : (
            <span className="text-sm text-gray-400">Sin factura</span>
          ),
      },
      {
        key: "amount",
        header: "Monto",
        hideOnMobile: true,
        // Para ordenar basta un number; para sumar se usa BigInt (ver lib/money).
        sortValue: (purchase) => Number(purchase.amount),
        render: (_, purchase) => (
          <span className="whitespace-nowrap font-semibold tabular-nums text-primary-900">
            {formatAmount(purchase.amount)}
          </span>
        ),
      },
      {
        key: "actions",
        header: "",
        sortable: false,
        render: (_, purchase) => (
          // Acciones discretas: la fila se lee por sus datos, no por sus botones.
          <div className="flex flex-nowrap items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-500 hover:bg-primary-50 hover:text-primary"
              onClick={() => openEdit(purchase)}
              aria-label={`Editar la compra del ${formatDateOnly(purchase.purchase_date)}`}
              title="Editar"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-500 hover:bg-red-50 hover:text-red-600"
              onClick={() => void handleDelete(purchase)}
              aria-label={`Eliminar la compra del ${formatDateOnly(purchase.purchase_date)}`}
              title="Eliminar"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [handleDelete, openEdit]
  );

  if (isSupplierMissing) {
    return (
      <div className="space-y-6 p-6">
        <BackLink />
        <Card>
          <CardContent className="space-y-2 p-8 text-center">
            <p className="text-lg font-semibold text-primary-900">Proveedor no encontrado</p>
            <p className="text-sm text-secondary-dark">Es posible que haya sido eliminado.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isRefreshing = purchasesQuery.isFetching || supplierQuery.isFetching;

  return (
    <div className="space-y-6 p-6">
      <header className="space-y-3">
        <BackLink />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-bold text-primary-900">
                {supplier?.name || (supplierQuery.isLoading ? "Cargando proveedor..." : "Proveedor")}
              </h1>
              {isSupplierInactive ? (
                <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
                  Inactivo
                </Badge>
              ) : null}
            </div>
            <p className="text-sm text-secondary-dark">
              {isSupplierInactive
                ? "No se le pueden registrar compras nuevas. Las existentes se pueden corregir o eliminar."
                : "Historial de compras"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                void purchasesQuery.refetch();
                void supplierQuery.refetch();
              }}
              disabled={isRefreshing}
              className="border-primary-200 text-primary hover:bg-primary-50"
              aria-label="Actualizar"
              title="Actualizar"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
            {/* Un proveedor inactivo no puede recibir compras: en vez de un boton deshabilitado, se explica arriba. */}
            {canRegister && !hasNoPurchasesAtAll ? (
              <Button onClick={openCreate} className="bg-primary text-white hover:bg-primary-600">
                <Plus className="h-4 w-4" />
                Registrar compra
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      {isHistoryUnavailable ? (
        <Alert variant="destructive">
          <Ban className="h-4 w-4" />
          <AlertTitle>El historial de compras no está disponible</AlertTitle>
          <AlertDescription>
            El servidor no reconoce esta función todavía. Es probable que la versión del backend con el historial de
            compras aún no esté desplegada. Intenta de nuevo más tarde o avisa al administrador del sistema.
          </AlertDescription>
        </Alert>
      ) : hasNoPurchasesAtAll ? (
        <EmptyState hasFilters={false} canRegister={canRegister} onRegister={openCreate} onClearFilters={clearFilters} />
      ) : (
        <>
          <SummaryPanel
            label={getTotalLabel(period, dateFrom, dateTo)}
            searchTerm={debouncedSearch}
            isLoading={purchasesQuery.isLoading}
            totalCents={summary.totalCents}
            count={summary.count}
            averageCents={summary.averageCents}
            lastPurchaseDate={summary.lastPurchaseDate}
          />

          <section className="space-y-3" aria-label="Compras">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <Label htmlFor="purchase-period" className="sr-only">
                Período
              </Label>
              {/* En movil los cinco botones no caben: se usa un desplegable. */}
              <select
                id="purchase-period"
                value={period}
                onChange={(event) => changePeriod(event.target.value)}
                className="h-10 w-full rounded-md border border-input bg-white px-3 text-base sm:hidden"
              >
                {PERIOD_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ToggleGroup
                type="single"
                value={period}
                onValueChange={changePeriod}
                aria-label="Período"
                className="hidden w-fit justify-start rounded-lg border border-secondary-medium bg-white p-1 sm:flex"
              >
                {PERIOD_OPTIONS.map((option) => (
                  <ToggleGroupItem
                    key={option.value}
                    value={option.value}
                    className="h-8 shrink-0 whitespace-nowrap px-3 text-gray-600 hover:bg-primary-50 hover:text-primary data-[state=on]:bg-primary data-[state=on]:text-white"
                  >
                    {option.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>

              <div className="flex items-center gap-2">
                <Label htmlFor="purchase-search" className="sr-only">
                  Buscar compras
                </Label>
                <SearchFilter
                  id="purchase-search"
                  className="w-full lg:w-72"
                  placeholder="Descripción o factura"
                  value={searchTerm}
                  onChange={setSearchTerm}
                />
                {hasFilters ? (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="shrink-0 text-gray-600">
                    Limpiar
                  </Button>
                ) : null}
              </div>
            </div>

            {period === "custom" ? (
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="purchase-date-from">Desde</Label>
                  <Input
                    id="purchase-date-from"
                    type="date"
                    value={customFrom}
                    max={customTo || undefined}
                    onChange={(event) => setCustomFrom(event.target.value)}
                    aria-invalid={isRangeInvalid}
                    className="w-44"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="purchase-date-to">Hasta</Label>
                  <Input
                    id="purchase-date-to"
                    type="date"
                    value={customTo}
                    min={customFrom || undefined}
                    onChange={(event) => setCustomTo(event.target.value)}
                    aria-invalid={isRangeInvalid}
                    className="w-44"
                  />
                </div>
                {isRangeInvalid ? (
                  <p className="pb-2 text-sm text-red-600">La fecha "Desde" debe ser anterior a "Hasta".</p>
                ) : null}
              </div>
            ) : null}

            {!isLoading && purchases.length === 0 ? (
              <EmptyState
                hasFilters={hasFilters}
                canRegister={canRegister}
                onRegister={openCreate}
                onClearFilters={clearFilters}
              />
            ) : (
              <DataTable
                data={purchases}
                columns={columns}
                isLoading={isLoading}
                defaultSort={{ key: "purchase_date", direction: "desc" }}
                initialPageSize={20}
                hideAddButton
                mobileTitle={(purchase) => (
                  <div className="flex items-baseline justify-between gap-3">
                    <span>{formatDateOnly(purchase.purchase_date)}</span>
                    <span className="tabular-nums text-primary-900">{formatAmount(purchase.amount)}</span>
                  </div>
                )}
              />
            )}
          </section>
        </>
      )}

      <FormModal isOpen={isFormOpen} onClose={closeForm} title={editingPurchase ? "Editar compra" : "Registrar compra"}>
        <SupplierPurchaseForm editingPurchase={editingPurchase} onSubmit={handleSubmit} onCancel={closeForm} />
      </FormModal>
    </div>
  );
}

interface SummaryPanelProps {
  label: string;
  searchTerm: string;
  isLoading: boolean;
  totalCents: bigint;
  count: number;
  averageCents: bigint | null;
  lastPurchaseDate: string | null;
}

/**
 * El total es el dato principal de la pantalla; el resto acompaña en pequeño.
 * Un solo panel en lugar de cuatro tarjetas con iconos.
 */
function SummaryPanel({
  label,
  searchTerm,
  isLoading,
  totalCents,
  count,
  averageCents,
  lastPurchaseDate,
}: SummaryPanelProps) {
  const placeholder = isLoading ? "..." : "-";

  const details = [
    { term: "Compras", value: isLoading ? placeholder : count.toLocaleString("es-VE") },
    { term: "Promedio por compra", value: averageCents === null ? placeholder : formatAmount(averageCents) },
    { term: "Última compra", value: lastPurchaseDate ? formatDateOnly(lastPurchaseDate) : placeholder },
  ];

  return (
    <Card>
      <CardContent className="flex flex-col gap-6 p-6 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="text-sm text-secondary-dark">{label}</p>
          <p className="mt-1 text-4xl font-bold tabular-nums text-primary-900 [overflow-wrap:anywhere]">
            {isLoading ? placeholder : formatAmount(totalCents)}
          </p>
          {searchTerm ? (
            <p className="mt-1 text-sm text-secondary-dark">Solo compras que coinciden con "{searchTerm}"</p>
          ) : null}
        </div>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 md:flex md:gap-8">
          {details.map((detail) => (
            <div key={detail.term} className="min-w-0">
              <dt className="text-xs text-secondary-dark">{detail.term}</dt>
              <dd className="mt-0.5 whitespace-nowrap font-semibold tabular-nums text-gray-900">
                {detail.value}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

interface EmptyStateProps {
  hasFilters: boolean;
  canRegister: boolean;
  onRegister: () => void;
  onClearFilters: () => void;
}

/** Un listado vacio dice que hacer a continuacion, no solo "No hay datos". */
function EmptyState({ hasFilters, canRegister, onRegister, onClearFilters }: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-secondary-medium bg-white px-6 py-12 text-center">
      {hasFilters ? (
        <>
          <p className="font-medium text-primary-900">Ninguna compra coincide con los filtros</p>
          <p className="mt-1 text-sm text-secondary-dark">Prueba con otro período u otra búsqueda.</p>
          <Button variant="outline" onClick={onClearFilters} className="mt-4 border-primary-200 text-primary hover:bg-primary-50">
            Limpiar filtros
          </Button>
        </>
      ) : (
        <>
          <p className="font-medium text-primary-900">Aún no hay compras registradas</p>
          <p className="mt-1 text-sm text-secondary-dark">
            {canRegister
              ? "Registra la primera compra para empezar el historial de este proveedor."
              : "Este proveedor no tiene compras en su historial."}
          </p>
          {canRegister ? (
            <Button onClick={onRegister} className="mt-4 bg-primary text-white hover:bg-primary-600">
              <Plus className="h-4 w-4" />
              Registrar compra
            </Button>
          ) : null}
        </>
      )}
    </div>
  );
}

function BackLink() {
  return (
    <Link
      to="/proveedores"
      className="inline-flex items-center gap-1.5 rounded text-sm text-secondary-dark hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ArrowLeft className="h-4 w-4" />
      Proveedores
    </Link>
  );
}
