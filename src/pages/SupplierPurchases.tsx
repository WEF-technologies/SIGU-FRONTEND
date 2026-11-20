import { useCallback, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { FilterField, FilterPanel } from "@/components/shared/FilterPanel";
import { FormModal } from "@/components/shared/FormModal";
import { SearchFilter } from "@/components/shared/SearchFilter";
import { SupplierPurchaseForm } from "@/components/suppliers/SupplierPurchaseForm";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import {
  ArrowLeft,
  Ban,
  CalendarDays,
  Edit,
  Plus,
  Receipt,
  RefreshCw,
  Trash2,
  TrendingUp,
  Wallet,
} from "lucide-react";

/** Rangos rapidos. Se calculan con la fecha local, no UTC (ver lib/dates). */
type RangePreset = "all" | "month" | "quarter" | "year";

const RANGE_PRESETS: { value: RangePreset; label: string }[] = [
  { value: "all", label: "Todo el historial" },
  { value: "month", label: "Este mes" },
  { value: "quarter", label: "Ultimos 3 meses" },
  { value: "year", label: "Este año" },
];

const getPresetRange = (preset: RangePreset): { date_from: string; date_to: string } => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  switch (preset) {
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

const getActivePreset = (dateFrom: string, dateTo: string): RangePreset | null =>
  RANGE_PRESETS.find(({ value }) => {
    const range = getPresetRange(value);
    return range.date_from === dateFrom && range.date_to === dateTo;
  })?.value ?? null;

const isInactiveStatus = (status?: string | null) => {
  const normalized = (status ?? "").trim().toLowerCase();
  return normalized === "inactive" || normalized === "inactivo";
};

const getAmountCents = (purchase: SupplierPurchase) => parseDecimalToCents(purchase.amount) ?? 0n;

export default function SupplierPurchases() {
  const { supplierId } = useParams<{ supplierId: string }>();
  const confirm = useConfirm();

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<SupplierPurchase | null>(null);

  // Una peticion por pausa de tecleo, no por tecla.
  const debouncedSearch = useDebouncedValue(searchTerm.trim());

  const isRangeInvalid = Boolean(dateFrom && dateTo && dateFrom > dateTo);

  const filters = useMemo<SupplierPurchaseFilters>(
    () => ({ date_from: dateFrom, date_to: dateTo, search: debouncedSearch }),
    [dateFrom, dateTo, debouncedSearch]
  );

  const supplierQuery = useSupplierDetail(supplierId);
  const purchasesQuery = useSupplierPurchases({ supplierId, filters, enabled: !isRangeInvalid });
  const { createPurchase, updatePurchase, deletePurchase } = useSupplierPurchaseMutations(supplierId);

  const supplier = supplierQuery.data;
  const purchases = useMemo(() => purchasesQuery.data ?? [], [purchasesQuery.data]);
  const isSupplierMissing = isNotFoundError(supplierQuery.error) || isNotFoundError(purchasesQuery.error);
  const isSupplierInactive = isInactiveStatus(supplier?.status);
  const activePreset = getActivePreset(dateFrom, dateTo);
  const hasFilters = Boolean(dateFrom || dateTo || searchTerm.trim());

  const summary = useMemo(() => {
    const totalCents = purchases.reduce((sum, purchase) => sum + getAmountCents(purchase), 0n);
    const count = purchases.length;
    const lastPurchaseDate = purchases.reduce<string | null>(
      (latest, purchase) => (!latest || purchase.purchase_date > latest ? purchase.purchase_date : latest),
      null
    );
    // Promedio redondeado al centimo (mitad hacia arriba).
    const averageCents = count > 0 ? (totalCents * 2n + BigInt(count)) / (BigInt(count) * 2n) : null;
    const withoutInvoice = purchases.filter((purchase) => !purchase.invoice_number).length;

    return { totalCents, count, lastPurchaseDate, averageCents, withoutInvoice };
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
        description: `Se eliminara la compra del ${formatDateOnly(purchase.purchase_date)} por ${formatAmount(
          purchase.amount
        )}${invoice}. Esta accion no se puede deshacer.`,
      });
      if (confirmed) await deletePurchase(purchase);
    },
    [confirm, deletePurchase]
  );

  const applyPreset = (preset: RangePreset) => {
    const range = getPresetRange(preset);
    setDateFrom(range.date_from);
    setDateTo(range.date_to);
  };

  const clearFilters = () => {
    setDateFrom("");
    setDateTo("");
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
        key: "invoice_number",
        header: "Factura",
        sortValue: (purchase) => purchase.invoice_number ?? "",
        render: (_, purchase) =>
          purchase.invoice_number ? (
            <span className="font-mono text-sm text-gray-900">{purchase.invoice_number}</span>
          ) : (
            <span className="text-sm text-gray-400">Sin factura</span>
          ),
      },
      {
        key: "description",
        header: "Descripcion",
        sortable: false,
        render: (_, purchase) => (
          <p className="max-w-md whitespace-pre-line break-words text-sm text-gray-700">{purchase.description}</p>
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
        header: "Acciones",
        sortable: false,
        render: (_, purchase) => (
          <div className="flex flex-nowrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-primary-200 text-primary hover:bg-primary-50"
              onClick={() => openEdit(purchase)}
              aria-label={`Editar la compra del ${formatDateOnly(purchase.purchase_date)}`}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-red-200 text-red-600 hover:bg-red-50"
              onClick={() => void handleDelete(purchase)}
              aria-label={`Eliminar la compra del ${formatDateOnly(purchase.purchase_date)}`}
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

  const periodLabel = hasFilters ? "con los filtros aplicados" : "en todo el historial";

  const summaryCards = [
    { title: "Total comprado", value: formatAmount(summary.totalCents), hint: periodLabel, icon: Wallet },
    {
      title: "Compras",
      value: summary.count.toLocaleString("es-VE"),
      hint: summary.withoutInvoice > 0 ? `${summary.withoutInvoice} sin factura` : "Todas con factura",
      icon: Receipt,
    },
    {
      title: "Promedio por compra",
      value: summary.averageCents === null ? "-" : formatAmount(summary.averageCents),
      hint: periodLabel,
      icon: TrendingUp,
    },
    {
      title: "Ultima compra",
      value: summary.lastPurchaseDate ? formatDateOnly(summary.lastPurchaseDate) : "-",
      hint: periodLabel,
      icon: CalendarDays,
    },
  ];

  const isRefreshing = purchasesQuery.isFetching || supplierQuery.isFetching;

  return (
    <div className="space-y-6 p-6">
      <BackLink />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium uppercase tracking-wide text-secondary-dark">Historial de compras</p>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold text-primary-900">
              {supplier?.name || (supplierQuery.isLoading ? "Cargando proveedor..." : "Proveedor")}
            </h1>
            {supplier ? (
              <Badge
                variant="outline"
                className={
                  isSupplierInactive
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                }
              >
                {isSupplierInactive ? "Inactivo" : "Activo"}
              </Badge>
            ) : null}
          </div>
          {supplier ? (
            <p className="text-sm text-gray-500">
              {[supplier.contact_phone, supplier.email, supplier.location].filter(Boolean).join(" · ") ||
                "Sin datos de contacto"}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              void purchasesQuery.refetch();
              void supplierQuery.refetch();
            }}
            disabled={isRefreshing}
            className="border-primary-200 text-primary hover:bg-primary-50"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
          <Button
            onClick={openCreate}
            // Sin proveedor cargado no se sabe si esta activo; el backend rechaza los inactivos.
            disabled={!supplier || isSupplierInactive}
            className="bg-primary text-white hover:bg-primary-600"
          >
            <Plus className="h-4 w-4" />
            Registrar compra
          </Button>
        </div>
      </div>

      {isSupplierInactive ? (
        <Alert className="border-amber-200 bg-amber-50 text-amber-900">
          <Ban className="h-4 w-4 !text-amber-700" />
          <AlertTitle>Proveedor inactivo</AlertTitle>
          <AlertDescription>
            No se pueden registrar compras nuevas. Las compras existentes se pueden corregir o eliminar. Para registrar
            compras, vuelve a activarlo desde el listado de proveedores.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <Card key={card.title}>
            <CardContent className="flex items-center justify-between gap-3 p-6">
              <div className="min-w-0">
                <p className="text-sm text-secondary-dark">{card.title}</p>
                {/* Montos grandes parten linea en lugar de cortarse con "...". */}
                <p className="mt-2 text-2xl font-bold tabular-nums text-primary-900 [overflow-wrap:anywhere]">

                  {purchasesQuery.isLoading ? "..." : card.value}
                </p>
                <p className="mt-1 text-xs text-gray-500">{card.hint}</p>
              </div>
              {/* Con 4 columnas (xl) el icono le quita espacio a los montos grandes. */}
              <div className="shrink-0 rounded-full bg-primary-50 p-3 text-primary xl:hidden 2xl:block">
                <card.icon className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <FilterPanel
        title="Filtros"
        activeCount={[dateFrom || dateTo, searchTerm.trim()].filter(Boolean).length}
        onClear={clearFilters}
        gridClassName="xl:grid-cols-3"
        headerExtra={
          purchasesQuery.isFetching && !purchasesQuery.isLoading ? (
            <span className="text-xs text-secondary-dark">Actualizando...</span>
          ) : null
        }
        footer={
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-primary-900">Periodo:</span>
              {RANGE_PRESETS.map((preset) => (
                <Button
                  key={preset.value}
                  type="button"
                  size="sm"
                  variant={activePreset === preset.value ? "default" : "outline"}
                  className={
                    activePreset === preset.value
                      ? "bg-primary text-white hover:bg-primary-600"
                      : "border-primary-200 text-primary hover:bg-primary-50"
                  }
                  onClick={() => applyPreset(preset.value)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            {isRangeInvalid ? (
              <p className="text-sm text-red-600">La fecha "Desde" debe ser anterior o igual a la fecha "Hasta".</p>
            ) : null}
          </div>
        }
      >
        <FilterField label="Buscar" htmlFor="purchase-search">
          <SearchFilter
            id="purchase-search"
            className="w-full"
            placeholder="Descripcion o numero de factura..."
            value={searchTerm}
            onChange={setSearchTerm}
          />
        </FilterField>
        <FilterField label="Desde" htmlFor="purchase-date-from">
          <Input
            id="purchase-date-from"
            type="date"
            value={dateFrom}
            max={dateTo || undefined}
            onChange={(event) => setDateFrom(event.target.value)}
            aria-invalid={isRangeInvalid}
          />
        </FilterField>
        <FilterField label="Hasta" htmlFor="purchase-date-to">
          <Input
            id="purchase-date-to"
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(event) => setDateTo(event.target.value)}
            aria-invalid={isRangeInvalid}
          />
        </FilterField>
      </FilterPanel>

      <DataTable
        title="Compras registradas"
        data={isRangeInvalid ? [] : purchases}
        columns={columns}
        isLoading={purchasesQuery.isLoading || supplierQuery.isLoading}
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

      {!purchasesQuery.isLoading && purchases.length > 0 && !isRangeInvalid ? (
        <div className="flex justify-end">
          <p className="rounded-lg border border-primary-100 bg-primary-50 px-4 py-2 text-sm text-primary-900">
            Total {periodLabel}:{" "}
            <span className="font-semibold tabular-nums">{formatAmount(summary.totalCents)}</span>
          </p>
        </div>
      ) : null}

      <FormModal
        isOpen={isFormOpen}
        onClose={closeForm}
        title={editingPurchase ? "Editar compra" : `Registrar compra${supplier ? ` · ${supplier.name}` : ""}`}
      >
        <SupplierPurchaseForm editingPurchase={editingPurchase} onSubmit={handleSubmit} onCancel={closeForm} />
      </FormModal>
    </div>
  );
}

function BackLink() {
  return (
    <Button asChild variant="ghost" size="sm" className="-ml-2 text-primary hover:bg-primary-50">
      <Link to="/proveedores">
        <ArrowLeft className="h-4 w-4" />
        Volver a proveedores
      </Link>
    </Button>
  );
}
