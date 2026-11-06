import { useMemo, useState } from "react";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { FilterField, FilterPanel, FilterSelect } from "@/components/shared/FilterPanel";
import { FormModal } from "@/components/shared/FormModal";
import { DotationAlertBanner } from "@/components/dotation/DotationAlertBanner";
import { DotationDeliveryForm } from "@/components/dotation/DotationDeliveryForm";
import { DotationItemForm } from "@/components/dotation/DotationItemForm";
import { DotationStaffForm } from "@/components/dotation/DotationStaffForm";
import {
  DEFAULT_NEAR_DAYS,
  DotationDeliveryRow,
  buildDeliveryRows,
  getExpiryBadgeClass,
  getExpiryDetail,
  getExpiryStatusLabel,
  isAlertStatus,
  selectCurrentDeliveries,
} from "@/components/dotation/dotationStatus";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDotation } from "@/hooks/useDotation";
import { useConfirm } from "@/hooks/useConfirm";
import { ACTIVE_STATUS_OPTIONS, DOTATION_DELIVERY_STATUS_OPTIONS } from "@/constants/filterOptions";
import { formatDateOnly } from "@/lib/dates";
import {
  FilterOption,
  buildOptionsFromValues,
  countActiveFilters,
  getOptionLabel,
  matchesOption,
  mergeKnownOptions,
  normalizeSearchText,
} from "@/lib/filtering";
import {
  DotationItem,
  DotationItemPayload,
  DotationStaffMember,
  DotationStaffMemberPayload,
} from "@/types";
import { RefreshCw, RotateCw } from "lucide-react";

type DotationTab = "alerts" | "deliveries" | "staff" | "catalog";

/** Todos los filtros se aplican en el cliente; "" = sin filtro. */
const EMPTY_STAFF_FILTERS = { status: "", department: "", position: "" };
const EMPTY_ITEM_FILTERS = { status: "", category: "" };
const EMPTY_DELIVERY_FILTERS = {
  status: "",
  staff_document_number: "",
  item_code: "",
  delivered_from: "",
  delivered_to: "",
};
/** Sin estado elegido, la pestaña Alertas muestra vencidas y por vencer. */
const EMPTY_ALERT_FILTERS = { status: "", near_days: DEFAULT_NEAR_DAYS };

const ALERT_STATUS_OPTIONS: FilterOption[] = [
  { value: "vencida", label: "Vencidas" },
  { value: "por_vencer", label: "Por vencer" },
  { value: "vigente", label: "Vigentes (al día)" },
];

const getActiveStatusLabel = (status?: string | null) =>
  getOptionLabel(ACTIVE_STATUS_OPTIONS, status ?? "active") || "-";

function ActiveStatusBadge({ status }: { status?: string | null }) {
  const isActive = normalizeSearchText(status ?? "active") === "active";
  return (
    <Badge
      variant="outline"
      className={
        isActive
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-slate-100 text-slate-600"
      }
    >
      {getActiveStatusLabel(status)}
    </Badge>
  );
}

function TwoLineCell({ primary, secondary }: { primary: string; secondary?: string | null }) {
  return (
    <div>
      <p className="font-medium text-gray-900">{primary}</p>
      {secondary ? <p className="text-xs text-gray-500">{secondary}</p> : null}
    </div>
  );
}

/** Fecha de vencimiento y, debajo, su estado en una sola columna. */
function ExpiryCell({ row }: { row: DotationDeliveryRow }) {
  return (
    <div className="space-y-1">
      <p className="text-gray-900">{formatDateOnly(row.expires_at)}</p>
      <Badge variant="outline" className={getExpiryBadgeClass(row.expiry_status)}>
        {getExpiryDetail(row)}
      </Badge>
    </div>
  );
}

const staffCell = (row: DotationDeliveryRow) => (
  <TwoLineCell primary={row.staff_full_name} secondary={row.staff_document_number} />
);

const itemCell = (row: DotationDeliveryRow) => (
  <TwoLineCell primary={row.item_name} secondary={`${row.item_code} · ${row.item_category}`} />
);

const DELIVERY_SEARCH_FIELDS: Array<keyof DotationDeliveryRow> = [
  "staff_document_number",
  "staff_full_name",
  "item_code",
  "item_name",
  "item_category",
  "delivered_by",
];

export default function Dotation() {
  const {
    staffMembers,
    items,
    deliveries,
    hasDeliveriesError,
    isLoadingStaff,
    isLoadingItems,
    isLoadingDeliveries,
    createStaffMember,
    updateStaffMember,
    deleteStaffMember,
    createItem,
    updateItem,
    deleteItem,
    createDelivery,
    refreshAll,
  } = useDotation();
  const confirm = useConfirm();

  const handleDeleteStaffMember = async (staffMember: DotationStaffMember) => {
    if (!(await confirm({
      title: "Eliminar personal",
      description: `Se eliminará a ${staffMember.name} ${staffMember.last_name} (${staffMember.document_number}). Esta acción no se puede deshacer.`,
    }))) return;
    await deleteStaffMember(staffMember);
  };

  const handleDeleteItem = async (item: DotationItem) => {
    if (!(await confirm({
      title: "Eliminar ítem de dotación",
      description: `Se eliminará ${item.code} - ${item.name}. Esta acción no se puede deshacer.`,
    }))) return;
    await deleteItem(item);
  };

  const [activeTab, setActiveTab] = useState<DotationTab>("alerts");

  const [staffFilters, setStaffFilters] = useState(EMPTY_STAFF_FILTERS);
  const [itemFilters, setItemFilters] = useState(EMPTY_ITEM_FILTERS);
  const [deliveryFilters, setDeliveryFilters] = useState(EMPTY_DELIVERY_FILTERS);
  const [alertFilters, setAlertFilters] = useState(EMPTY_ALERT_FILTERS);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [editingStaffMember, setEditingStaffMember] = useState<DotationStaffMember | null>(null);
  const [editingItem, setEditingItem] = useState<DotationItem | null>(null);
  const [renewalTarget, setRenewalTarget] = useState<DotationDeliveryRow | null>(null);

  const nearDays = alertFilters.near_days;

  const deliveryRows = useMemo(() => buildDeliveryRows(deliveries, nearDays), [deliveries, nearDays]);

  const currentDeliveries = useMemo(
    () => selectCurrentDeliveries(deliveryRows, staffMembers, items),
    [deliveryRows, items, staffMembers]
  );

  const expiredCount = currentDeliveries.filter((row) => row.expiry_status === "vencida").length;
  const nearCount = currentDeliveries.filter((row) => row.expiry_status === "por_vencer").length;
  const alertCount = expiredCount + nearCount;
  const isLoadingAlerts = isLoadingDeliveries || isLoadingStaff || isLoadingItems;

  const alertRows = useMemo(
    () =>
      currentDeliveries.filter((row) =>
        alertFilters.status ? row.expiry_status === alertFilters.status : isAlertStatus(row.expiry_status)
      ),
    [alertFilters.status, currentDeliveries]
  );

  const filterOptions = useMemo(
    () => ({
      staffStatus: mergeKnownOptions(ACTIVE_STATUS_OPTIONS, staffMembers.map((staff) => staff.status)),
      department: buildOptionsFromValues(staffMembers.map((staff) => staff.department)),
      position: buildOptionsFromValues(staffMembers.map((staff) => staff.position)),
      itemStatus: mergeKnownOptions(ACTIVE_STATUS_OPTIONS, items.map((item) => item.status)),
      category: buildOptionsFromValues(items.map((item) => item.category)),
      staff: staffMembers
        .map((staff) => ({
          value: staff.document_number,
          label: `${staff.name} ${staff.last_name} · ${staff.document_number}`,
        }))
        .sort((a, b) => a.label.localeCompare(b.label, "es", { sensitivity: "base" })),
      item: items
        .map((item) => ({ value: item.code, label: `${item.code} · ${item.name}` }))
        .sort((a, b) => a.label.localeCompare(b.label, "es", { sensitivity: "base", numeric: true })),
    }),
    [items, staffMembers]
  );

  const filteredStaffMembers = useMemo(
    () =>
      staffMembers.filter(
        (staff) =>
          matchesOption(staffFilters.status, staff.status ?? "active") &&
          matchesOption(staffFilters.department, staff.department) &&
          matchesOption(staffFilters.position, staff.position)
      ),
    [staffFilters, staffMembers]
  );

  const filteredItems = useMemo(
    () =>
      items.filter(
        (item) =>
          matchesOption(itemFilters.status, item.status ?? "active") &&
          matchesOption(itemFilters.category, item.category)
      ),
    [itemFilters, items]
  );

  const filteredDeliveryRows = useMemo(
    () =>
      deliveryRows.filter((row) => {
        const deliveredAt = (row.delivered_at ?? "").slice(0, 10);
        return (
          matchesOption(deliveryFilters.status, row.expiry_status) &&
          matchesOption(deliveryFilters.staff_document_number, row.staff_document_number) &&
          matchesOption(deliveryFilters.item_code, row.item_code) &&
          (!deliveryFilters.delivered_from || deliveredAt >= deliveryFilters.delivered_from) &&
          (!deliveryFilters.delivered_to || deliveredAt <= deliveryFilters.delivered_to)
        );
      }),
    [deliveryFilters, deliveryRows]
  );

  const openNewDelivery = () => {
    setRenewalTarget(null);
    setIsDeliveryModalOpen(true);
  };

  const openRenewal = (row: DotationDeliveryRow) => {
    setRenewalTarget(row);
    setIsDeliveryModalOpen(true);
  };

  const showAlertsTab = () => {
    setAlertFilters((prev) => ({ ...prev, status: "" }));
    setActiveTab("alerts");
  };

  const staffColumns = useMemo<Column<DotationStaffMember>[]>(
    () => [
      {
        key: "name",
        header: "Personal",
        sortValue: (item) => `${item.name} ${item.last_name}`,
        render: (_, item) => (
          <TwoLineCell
            primary={`${item.name} ${item.last_name}`}
            secondary={`${item.document_number} · ${item.position || "Sin cargo"}`}
          />
        ),
      },
      { key: "department", header: "Departamento", render: (value) => String(value || "-") },
      {
        key: "status",
        header: "Estado",
        render: (value) => <ActiveStatusBadge status={typeof value === "string" ? value : null} />,
      },
      {
        key: "hire_date",
        header: "Ingreso",
        render: (value) => formatDateOnly(typeof value === "string" ? value : null),
        sortValue: (item) => item.hire_date ?? null,
      },
      { key: "actions", header: "Acciones", sortable: false },
    ],
    []
  );

  const itemColumns = useMemo<Column<DotationItem>[]>(
    () => [
      {
        key: "name",
        header: "Ítem",
        render: (_, item) => <TwoLineCell primary={item.name} secondary={item.code} />,
      },
      { key: "category", header: "Categoría" },
      {
        key: "renewal_months",
        header: "Renovación",
        render: (value) => {
          const months = Number(value);
          return `Cada ${months} ${months === 1 ? "mes" : "meses"}`;
        },
      },
      {
        key: "status",
        header: "Estado",
        render: (value) => <ActiveStatusBadge status={typeof value === "string" ? value : null} />,
      },
      { key: "actions", header: "Acciones", sortable: false },
    ],
    []
  );

  const deliveryColumns = useMemo<Column<DotationDeliveryRow>[]>(
    () => [
      { key: "staff_full_name", header: "Personal", render: (_, row) => staffCell(row) },
      { key: "item_name", header: "Ítem", render: (_, row) => itemCell(row) },
      { key: "quantity", header: "Cant." },
      {
        key: "delivered_at",
        header: "Entregado",
        render: (value) => formatDateOnly(typeof value === "string" ? value : null),
        sortValue: (row) => row.delivered_at,
      },
      {
        key: "expires_at",
        header: "Vencimiento",
        render: (_, row) => <ExpiryCell row={row} />,
        sortValue: (row) => row.expires_at,
      },
    ],
    []
  );

  const alertColumns = useMemo<Column<DotationDeliveryRow>[]>(
    () => [
      { key: "staff_full_name", header: "Personal", render: (_, row) => staffCell(row) },
      { key: "item_name", header: "Ítem", render: (_, row) => itemCell(row) },
      {
        key: "expires_at",
        header: "Vencimiento",
        render: (_, row) => <ExpiryCell row={row} />,
        sortValue: (row) => row.expires_at,
      },
      {
        key: "actions",
        header: "",
        sortable: false,
        render: (_, row) => (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => openRenewal(row)}
            className="border-primary-200 text-primary hover:bg-primary-50"
          >
            <RotateCw className="mr-1.5 h-4 w-4" />
            Renovar
          </Button>
        ),
      },
    ],
    []
  );

  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    try {
      await refreshAll();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleStaffSubmit = async (payload: DotationStaffMemberPayload) => {
    const ok = editingStaffMember
      ? await updateStaffMember(editingStaffMember.document_number, payload)
      : await createStaffMember(payload);

    if (ok) {
      setIsStaffModalOpen(false);
      setEditingStaffMember(null);
    }

    return ok;
  };

  const handleItemSubmit = async (payload: DotationItemPayload) => {
    const ok = editingItem
      ? await updateItem(editingItem.code, payload)
      : await createItem(payload);

    if (ok) {
      setIsItemModalOpen(false);
      setEditingItem(null);
    }

    return ok;
  };

  const handleDeliverySubmit = async (payload: Parameters<typeof createDelivery>[0]) => {
    const ok = await createDelivery(payload);

    if (ok) {
      setIsDeliveryModalOpen(false);
    }

    return ok;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary-900">Dotación</h1>
          <p className="text-sm text-gray-500">Entregas al personal y control de vencimientos.</p>
        </div>
        <Button variant="outline" onClick={handleRefreshAll} disabled={isRefreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      <DotationAlertBanner
        expiredCount={expiredCount}
        nearCount={nearCount}
        nearDays={nearDays}
        isLoading={isLoadingAlerts && deliveries.length === 0}
        hasError={hasDeliveriesError}
        onShowAlerts={activeTab !== "alerts" ? showAlertsTab : undefined}
      />

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as DotationTab)} className="w-full">
        <TabsList className="grid w-full grid-cols-2 gap-2 md:grid-cols-4">
          <TabsTrigger value="alerts" className="gap-2">
            Alertas
            {alertCount > 0 && (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  expiredCount > 0 ? "bg-red-600 text-white" : "bg-amber-400 text-amber-950"
                }`}
              >
                {alertCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="deliveries">Entregas</TabsTrigger>
          <TabsTrigger value="staff">Personal</TabsTrigger>
          <TabsTrigger value="catalog">Catálogo</TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="space-y-4">
          <FilterPanel
            title="Filtros"
            activeCount={countActiveFilters([alertFilters.status, alertFilters.near_days !== DEFAULT_NEAR_DAYS])}
            onClear={() => setAlertFilters(EMPTY_ALERT_FILTERS)}
            advanced={
              <FilterField label="Avisar con (días de anticipación)" htmlFor="alerts-filter-near">
                <Input
                  id="alerts-filter-near"
                  type="number"
                  min="0"
                  max="365"
                  value={alertFilters.near_days}
                  onChange={(event) =>
                    setAlertFilters((prev) => ({
                      ...prev,
                      near_days: Math.max(0, Number(event.target.value) || 0),
                    }))
                  }
                />
              </FilterField>
            }
          >
            <FilterSelect
              id="alerts-status-filter"
              label="Estado"
              value={alertFilters.status}
              onChange={(value) => setAlertFilters((prev) => ({ ...prev, status: value }))}
              options={ALERT_STATUS_OPTIONS}
              allLabel="Vencidas y por vencer"
            />
          </FilterPanel>

          <DataTable
            data={alertRows}
            columns={alertColumns}
            title="Alertas de vencimiento"
            hideAddButton
            isLoading={isLoadingAlerts}
            searchFields={DELIVERY_SEARCH_FIELDS}
            searchAccessor={(row) => getExpiryStatusLabel(row.expiry_status)}
            searchPlaceholder="Buscar por personal, documento o ítem..."
            defaultSort={{ key: "expires_at", direction: "asc" }}
            initialPageSize={20}
          />
        </TabsContent>

        <TabsContent value="deliveries" className="space-y-4">
          <FilterPanel
            title="Filtros"
            activeCount={countActiveFilters(Object.values(deliveryFilters))}
            onClear={() => setDeliveryFilters(EMPTY_DELIVERY_FILTERS)}
            advanced={
              <>
                <FilterSelect
                  id="delivery-staff-filter"
                  label="Personal"
                  value={deliveryFilters.staff_document_number}
                  onChange={(value) => setDeliveryFilters((prev) => ({ ...prev, staff_document_number: value }))}
                  options={filterOptions.staff}
                />
                <FilterSelect
                  id="delivery-item-filter"
                  label="Ítem"
                  value={deliveryFilters.item_code}
                  onChange={(value) => setDeliveryFilters((prev) => ({ ...prev, item_code: value }))}
                  options={filterOptions.item}
                />
                <FilterField label="Entregado desde" htmlFor="delivery-filter-from">
                  <Input
                    id="delivery-filter-from"
                    type="date"
                    value={deliveryFilters.delivered_from}
                    onChange={(event) =>
                      setDeliveryFilters((prev) => ({ ...prev, delivered_from: event.target.value }))
                    }
                  />
                </FilterField>
                <FilterField label="Entregado hasta" htmlFor="delivery-filter-to">
                  <Input
                    id="delivery-filter-to"
                    type="date"
                    value={deliveryFilters.delivered_to}
                    onChange={(event) =>
                      setDeliveryFilters((prev) => ({ ...prev, delivered_to: event.target.value }))
                    }
                  />
                </FilterField>
              </>
            }
          >
            <FilterSelect
              id="delivery-status-filter"
              label="Estado"
              value={deliveryFilters.status}
              onChange={(value) => setDeliveryFilters((prev) => ({ ...prev, status: value }))}
              options={DOTATION_DELIVERY_STATUS_OPTIONS}
            />
          </FilterPanel>

          <DataTable
            data={filteredDeliveryRows}
            columns={deliveryColumns}
            title="Historial de entregas"
            addButtonText="Registrar entrega"
            onAdd={openNewDelivery}
            isLoading={isLoadingDeliveries}
            searchFields={DELIVERY_SEARCH_FIELDS}
            searchAccessor={(row) => getExpiryStatusLabel(row.expiry_status)}
            searchPlaceholder="Buscar por personal, documento o ítem..."
            defaultSort={{ key: "delivered_at", direction: "desc" }}
            initialPageSize={20}
          />
        </TabsContent>

        <TabsContent value="staff" className="space-y-4">
          <FilterPanel
            title="Filtros"
            activeCount={countActiveFilters(Object.values(staffFilters))}
            onClear={() => setStaffFilters(EMPTY_STAFF_FILTERS)}
            advanced={
              <>
                <FilterSelect
                  id="staff-department-filter"
                  label="Departamento"
                  value={staffFilters.department}
                  onChange={(value) => setStaffFilters((prev) => ({ ...prev, department: value }))}
                  options={filterOptions.department}
                />
                <FilterSelect
                  id="staff-position-filter"
                  label="Cargo"
                  value={staffFilters.position}
                  onChange={(value) => setStaffFilters((prev) => ({ ...prev, position: value }))}
                  options={filterOptions.position}
                />
              </>
            }
          >
            <FilterSelect
              id="staff-status-filter"
              label="Estado"
              value={staffFilters.status}
              onChange={(value) => setStaffFilters((prev) => ({ ...prev, status: value }))}
              options={filterOptions.staffStatus}
            />
          </FilterPanel>

          <DataTable
            data={filteredStaffMembers}
            columns={staffColumns}
            title="Personal"
            addButtonText="Registrar personal"
            onAdd={() => {
              setEditingStaffMember(null);
              setIsStaffModalOpen(true);
            }}
            onEdit={(staffMember) => {
              setEditingStaffMember(staffMember);
              setIsStaffModalOpen(true);
            }}
            onDelete={handleDeleteStaffMember}
            isLoading={isLoadingStaff}
            searchFields={["document_number", "name", "last_name", "department", "position"]}
            searchAccessor={(staff) => getActiveStatusLabel(staff.status)}
            searchPlaceholder="Buscar por documento, nombre, departamento o cargo..."
            defaultSort={{ key: "name", direction: "asc" }}
            initialPageSize={20}
          />
        </TabsContent>

        <TabsContent value="catalog" className="space-y-4">
          <FilterPanel
            title="Filtros"
            activeCount={countActiveFilters(Object.values(itemFilters))}
            onClear={() => setItemFilters(EMPTY_ITEM_FILTERS)}
            advanced={
              <FilterSelect
                id="item-category-filter"
                label="Categoría"
                value={itemFilters.category}
                onChange={(value) => setItemFilters((prev) => ({ ...prev, category: value }))}
                options={filterOptions.category}
                allLabel="Todas"
              />
            }
          >
            <FilterSelect
              id="item-status-filter"
              label="Estado"
              value={itemFilters.status}
              onChange={(value) => setItemFilters((prev) => ({ ...prev, status: value }))}
              options={filterOptions.itemStatus}
            />
          </FilterPanel>

          <DataTable
            data={filteredItems}
            columns={itemColumns}
            title="Catálogo"
            addButtonText="Crear ítem"
            onAdd={() => {
              setEditingItem(null);
              setIsItemModalOpen(true);
            }}
            onEdit={(item) => {
              setEditingItem(item);
              setIsItemModalOpen(true);
            }}
            onDelete={handleDeleteItem}
            isLoading={isLoadingItems}
            searchFields={["code", "name", "category", "description"]}
            searchAccessor={(item) => getActiveStatusLabel(item.status)}
            searchPlaceholder="Buscar por código, nombre o categoría..."
            defaultSort={{ key: "name", direction: "asc" }}
            initialPageSize={20}
          />
        </TabsContent>
      </Tabs>

      <FormModal
        isOpen={isStaffModalOpen}
        onClose={() => {
          setIsStaffModalOpen(false);
          setEditingStaffMember(null);
        }}
        title={editingStaffMember ? "Editar Personal de Dotación" : "Registrar Personal de Dotación"}
      >
        <DotationStaffForm
          editingStaffMember={editingStaffMember}
          onSubmit={handleStaffSubmit}
          onCancel={() => {
            setIsStaffModalOpen(false);
            setEditingStaffMember(null);
          }}
        />
      </FormModal>

      <FormModal
        isOpen={isItemModalOpen}
        onClose={() => {
          setIsItemModalOpen(false);
          setEditingItem(null);
        }}
        title={editingItem ? "Editar Item de Dotación" : "Crear Item de Dotación"}
      >
        <DotationItemForm
          editingItem={editingItem}
          onSubmit={handleItemSubmit}
          onCancel={() => {
            setIsItemModalOpen(false);
            setEditingItem(null);
          }}
        />
      </FormModal>

      {/* renewalTarget no se limpia al cerrar para que el titulo no cambie durante la animacion. */}
      <FormModal
        isOpen={isDeliveryModalOpen}
        onClose={() => setIsDeliveryModalOpen(false)}
        title={renewalTarget ? "Renovar dotación" : "Registrar entrega de dotación"}
      >
        <DotationDeliveryForm
          staffMembers={staffMembers}
          items={items}
          initialSelection={renewalTarget}
          onSubmit={handleDeliverySubmit}
          onCancel={() => setIsDeliveryModalOpen(false)}
        />
      </FormModal>
    </div>
  );
}
