import { useMemo, useState } from "react";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { FormModal } from "@/components/shared/FormModal";
import { DotationDeliveryForm } from "@/components/dotation/DotationDeliveryForm";
import { DotationItemForm } from "@/components/dotation/DotationItemForm";
import { DotationStaffForm } from "@/components/dotation/DotationStaffForm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDotation } from "@/hooks/useDotation";
import {
  DotationAlert,
  DotationAlertFilters,
  DotationDelivery,
  DotationDeliveryFilters,
  DotationItem,
  DotationItemFilters,
  DotationItemPayload,
  DotationStaffFilters,
  DotationStaffMember,
  DotationStaffMemberPayload,
} from "@/types";
import { AlertTriangle, ClipboardList, Filter, Package, RefreshCw, Users } from "lucide-react";

type DotationTab = "staff" | "catalog" | "deliveries" | "alerts";

const formatDate = (value?: string | null) => {
  if (!value) return "-";

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return value;
  return parsedDate.toLocaleDateString();
};

const normalizeStatus = (value?: string | null) => (value ?? "").trim().toLowerCase();

const getStatusBadgeClass = (status?: string | null) => {
  const normalizedStatus = normalizeStatus(status);

  if (
    normalizedStatus.includes("venc") ||
    normalizedStatus.includes("expired") ||
    normalizedStatus.includes("inactive")
  ) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (
    normalizedStatus.includes("near") ||
    normalizedStatus.includes("warning") ||
    normalizedStatus.includes("por_vencer") ||
    normalizedStatus.includes("por vencer")
  ) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (
    normalizedStatus.includes("vigente") ||
    normalizedStatus.includes("ok") ||
    normalizedStatus.includes("active")
  ) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
};

const getDaysToExpiryLabel = (daysToExpiry: number) => {
  if (daysToExpiry < 0) return `${Math.abs(daysToExpiry)} día(s) vencido`;
  if (daysToExpiry === 0) return "Vence hoy";
  return `${daysToExpiry} día(s)`;
};

export default function Dotation() {
  const {
    staffMembers,
    items,
    deliveries,
    alerts,
    isLoadingStaff,
    isLoadingItems,
    isLoadingDeliveries,
    isLoadingAlerts,
    fetchStaffMembers,
    fetchItems,
    fetchDeliveries,
    fetchAlerts,
    createStaffMember,
    updateStaffMember,
    deleteStaffMember,
    createItem,
    updateItem,
    deleteItem,
    createDelivery,
    refreshAll,
  } = useDotation();

  const [activeTab, setActiveTab] = useState<DotationTab>("staff");

  const [staffFilters, setStaffFilters] = useState<DotationStaffFilters>({
    status: "",
    department: "",
    position: "",
  });
  const [itemFilters, setItemFilters] = useState<DotationItemFilters>({
    status: "",
    category: "",
  });
  const [deliveryFilters, setDeliveryFilters] = useState<DotationDeliveryFilters>({
    staff_document_number: "",
    item_code: "",
    alert_status: "",
    delivered_from: "",
    delivered_to: "",
    near_days: 30,
  });
  const [alertFilters, setAlertFilters] = useState<DotationAlertFilters>({
    staff_document_number: "",
    item_code: "",
    alert_status: "",
    near_days: 30,
    include_vigente: false,
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [editingStaffMember, setEditingStaffMember] = useState<DotationStaffMember | null>(null);
  const [editingItem, setEditingItem] = useState<DotationItem | null>(null);

  const summaryCards = useMemo(
    () => [
      { title: "Personal activo", value: staffMembers.length, icon: Users },
      { title: "Items en catálogo", value: items.length, icon: Package },
      { title: "Entregas registradas", value: deliveries.length, icon: ClipboardList },
      { title: "Alertas vigentes", value: alerts.length, icon: AlertTriangle },
    ],
    [alerts.length, deliveries.length, items.length, staffMembers.length]
  );

  const staffColumns = useMemo<Column<DotationStaffMember>[]>(
    () => [
      { key: "document_number", header: "Documento" },
      {
        key: "name",
        header: "Personal",
        sortValue: (item) => `${item.name} ${item.last_name}`,
        render: (_, item) => (
          <div>
            <p className="font-medium text-gray-900">{item.name} {item.last_name}</p>
            <p className="text-xs text-gray-500">{item.position || "Sin cargo"}</p>
          </div>
        ),
      },
      { key: "department", header: "Departamento" },
      {
        key: "status",
        header: "Estado",
        render: (value) => <Badge variant="outline" className={getStatusBadgeClass(String(value ?? "active"))}>{String(value ?? "active")}</Badge>,
      },
      {
        key: "hire_date",
        header: "Ingreso",
        render: (value) => formatDate(typeof value === "string" ? value : null),
        sortValue: (item) => item.hire_date ?? null,
      },
      { key: "actions", header: "Acciones", sortable: false },
    ],
    []
  );

  const itemColumns = useMemo<Column<DotationItem>[]>(
    () => [
      { key: "code", header: "Código" },
      {
        key: "name",
        header: "Item",
        render: (_, item) => (
          <div>
            <p className="font-medium text-gray-900">{item.name}</p>
            <p className="text-xs text-gray-500">{item.description || "Sin descripción"}</p>
          </div>
        ),
      },
      { key: "category", header: "Categoría" },
      {
        key: "renewal_months",
        header: "Renovación",
        render: (value) => `${String(value)} mes(es)`,
      },
      {
        key: "status",
        header: "Estado",
        render: (value) => <Badge variant="outline" className={getStatusBadgeClass(String(value ?? "active"))}>{String(value ?? "active")}</Badge>,
      },
      { key: "actions", header: "Acciones", sortable: false },
    ],
    []
  );

  const deliveryColumns = useMemo<Column<DotationDelivery>[]>(
    () => [
      {
        key: "staff_full_name",
        header: "Personal",
        render: (_, item) => (
          <div>
            <p className="font-medium text-gray-900">{item.staff_full_name}</p>
            <p className="text-xs text-gray-500">{item.staff_document_number}</p>
          </div>
        ),
      },
      {
        key: "item_name",
        header: "Item",
        render: (_, item) => (
          <div>
            <p className="font-medium text-gray-900">{item.item_name}</p>
            <p className="text-xs text-gray-500">{item.item_code} · {item.item_category}</p>
          </div>
        ),
      },
      { key: "quantity", header: "Cantidad" },
      {
        key: "delivered_at",
        header: "Entregado",
        render: (value) => formatDate(typeof value === "string" ? value : null),
        sortValue: (item) => item.delivered_at,
      },
      {
        key: "expires_at",
        header: "Vence",
        render: (value) => formatDate(typeof value === "string" ? value : null),
        sortValue: (item) => item.expires_at,
      },
      {
        key: "alert_status",
        header: "Alerta",
        render: (value) => <Badge variant="outline" className={getStatusBadgeClass(String(value))}>{String(value)}</Badge>,
      },
      {
        key: "days_to_expiry",
        header: "Días restantes",
        render: (value) => getDaysToExpiryLabel(Number(value ?? 0)),
        sortValue: (item) => item.days_to_expiry,
      },
    ],
    []
  );

  const alertColumns = useMemo<Column<DotationAlert>[]>(
    () => [
      {
        key: "staff_full_name",
        header: "Personal",
        render: (_, item) => (
          <div>
            <p className="font-medium text-gray-900">{item.staff_full_name}</p>
            <p className="text-xs text-gray-500">{item.staff_document_number}</p>
          </div>
        ),
      },
      {
        key: "item_name",
        header: "Item",
        render: (_, item) => (
          <div>
            <p className="font-medium text-gray-900">{item.item_name}</p>
            <p className="text-xs text-gray-500">{item.item_code} · {item.item_category}</p>
          </div>
        ),
      },
      {
        key: "expires_at",
        header: "Vence",
        render: (value) => formatDate(typeof value === "string" ? value : null),
        sortValue: (item) => item.expires_at,
      },
      {
        key: "alert_status",
        header: "Estado de alerta",
        render: (value) => <Badge variant="outline" className={getStatusBadgeClass(String(value))}>{String(value)}</Badge>,
      },
      {
        key: "days_to_expiry",
        header: "Días restantes",
        render: (value) => getDaysToExpiryLabel(Number(value ?? 0)),
        sortValue: (item) => item.days_to_expiry,
      },
      {
        key: "delivered_by",
        header: "Entregado por",
        render: (value) => String(value ?? "-") || "-",
      },
    ],
    []
  );

  const handleRefreshCurrentTab = async () => {
    setIsRefreshing(true);
    try {
      if (activeTab === "staff") {
        await fetchStaffMembers(staffFilters);
        return;
      }

      if (activeTab === "catalog") {
        await fetchItems(itemFilters);
        return;
      }

      if (activeTab === "deliveries") {
        await fetchDeliveries(deliveryFilters);
        return;
      }

      await fetchAlerts(alertFilters);
    } finally {
      setIsRefreshing(false);
    }
  };

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
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary-900">Dotación</h1>
          <p className="text-sm text-gray-500">
            Administra personal, catálogo, entregas y alertas de dotación usando el contrato actual del backend.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleRefreshCurrentTab} disabled={isRefreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Actualizar pestaña
          </Button>
          <Button onClick={handleRefreshAll} className="bg-primary hover:bg-primary-600" disabled={isRefreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Recargar todo
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <Card key={card.title} className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-gray-500">{card.title}</p>
                <p className="mt-1 text-2xl font-bold text-primary-900">{card.value}</p>
              </div>
              <div className="rounded-full bg-primary/10 p-3 text-primary">
                <card.icon className="h-5 w-5" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as DotationTab)} className="w-full">
        <TabsList className="grid w-full grid-cols-2 gap-2 md:grid-cols-4">
          <TabsTrigger value="staff">Personal</TabsTrigger>
          <TabsTrigger value="catalog">Catálogo</TabsTrigger>
          <TabsTrigger value="deliveries">Entregas</TabsTrigger>
          <TabsTrigger value="alerts">Alertas</TabsTrigger>
        </TabsList>

        <TabsContent value="staff" className="space-y-4">
          <Card className="space-y-4 p-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-primary-900">Filtros de personal</h3>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Input
                placeholder="Estado"
                value={staffFilters.status ?? ""}
                onChange={(event) => setStaffFilters((prev) => ({ ...prev, status: event.target.value }))}
              />
              <Input
                placeholder="Departamento"
                value={staffFilters.department ?? ""}
                onChange={(event) => setStaffFilters((prev) => ({ ...prev, department: event.target.value }))}
              />
              <Input
                placeholder="Cargo"
                value={staffFilters.position ?? ""}
                onChange={(event) => setStaffFilters((prev) => ({ ...prev, position: event.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={async () => {
                  const nextFilters = { status: "", department: "", position: "" };
                  setStaffFilters(nextFilters);
                  await fetchStaffMembers(nextFilters);
                }}
              >
                Limpiar
              </Button>
              <Button onClick={() => fetchStaffMembers(staffFilters)} className="bg-primary hover:bg-primary-600">
                Aplicar filtros
              </Button>
            </div>
          </Card>

          <DataTable
            data={staffMembers}
            columns={staffColumns}
            title="Personal de Dotación"
            addButtonText="Registrar personal"
            onAdd={() => {
              setEditingStaffMember(null);
              setIsStaffModalOpen(true);
            }}
            onEdit={(staffMember) => {
              setEditingStaffMember(staffMember);
              setIsStaffModalOpen(true);
            }}
            onDelete={deleteStaffMember}
            isLoading={isLoadingStaff}
            searchFields={["document_number", "name", "last_name", "department", "position", "status"]}
            searchPlaceholder="Buscar por documento, nombre, departamento o cargo..."
            defaultSort={{ key: "document_number", direction: "asc" }}
            initialPageSize={20}
          />
        </TabsContent>

        <TabsContent value="catalog" className="space-y-4">
          <Card className="space-y-4 p-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-primary-900">Filtros de catálogo</h3>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Input
                placeholder="Estado"
                value={itemFilters.status ?? ""}
                onChange={(event) => setItemFilters((prev) => ({ ...prev, status: event.target.value }))}
              />
              <Input
                placeholder="Categoría"
                value={itemFilters.category ?? ""}
                onChange={(event) => setItemFilters((prev) => ({ ...prev, category: event.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={async () => {
                  const nextFilters = { status: "", category: "" };
                  setItemFilters(nextFilters);
                  await fetchItems(nextFilters);
                }}
              >
                Limpiar
              </Button>
              <Button onClick={() => fetchItems(itemFilters)} className="bg-primary hover:bg-primary-600">
                Aplicar filtros
              </Button>
            </div>
          </Card>

          <DataTable
            data={items}
            columns={itemColumns}
            title="Catálogo de Dotación"
            addButtonText="Crear item"
            onAdd={() => {
              setEditingItem(null);
              setIsItemModalOpen(true);
            }}
            onEdit={(item) => {
              setEditingItem(item);
              setIsItemModalOpen(true);
            }}
            onDelete={deleteItem}
            isLoading={isLoadingItems}
            searchFields={["code", "name", "category", "status", "description"]}
            searchPlaceholder="Buscar por código, nombre, categoría o estado..."
            defaultSort={{ key: "name", direction: "asc" }}
            initialPageSize={20}
          />
        </TabsContent>

        <TabsContent value="deliveries" className="space-y-4">
          <Card className="space-y-4 p-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-primary-900">Filtros de entregas</h3>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Input
                placeholder="Documento del personal"
                value={deliveryFilters.staff_document_number ?? ""}
                onChange={(event) =>
                  setDeliveryFilters((prev) => ({ ...prev, staff_document_number: event.target.value }))
                }
              />
              <Input
                placeholder="Código del item"
                value={deliveryFilters.item_code ?? ""}
                onChange={(event) => setDeliveryFilters((prev) => ({ ...prev, item_code: event.target.value }))}
              />
              <Input
                placeholder="Estado de alerta"
                value={deliveryFilters.alert_status ?? ""}
                onChange={(event) => setDeliveryFilters((prev) => ({ ...prev, alert_status: event.target.value }))}
              />
              <div>
                <Label htmlFor="delivery-filter-from">Desde</Label>
                <Input
                  id="delivery-filter-from"
                  type="date"
                  value={deliveryFilters.delivered_from ?? ""}
                  onChange={(event) =>
                    setDeliveryFilters((prev) => ({ ...prev, delivered_from: event.target.value }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="delivery-filter-to">Hasta</Label>
                <Input
                  id="delivery-filter-to"
                  type="date"
                  value={deliveryFilters.delivered_to ?? ""}
                  onChange={(event) =>
                    setDeliveryFilters((prev) => ({ ...prev, delivered_to: event.target.value }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="delivery-filter-near">Días para alerta</Label>
                <Input
                  id="delivery-filter-near"
                  type="number"
                  min="0"
                  value={deliveryFilters.near_days ?? 30}
                  onChange={(event) =>
                    setDeliveryFilters((prev) => ({
                      ...prev,
                      near_days: Number(event.target.value) || 0,
                    }))
                  }
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={async () => {
                  const nextFilters = {
                    staff_document_number: "",
                    item_code: "",
                    alert_status: "",
                    delivered_from: "",
                    delivered_to: "",
                    near_days: 30,
                  };
                  setDeliveryFilters(nextFilters);
                  await fetchDeliveries(nextFilters);
                }}
              >
                Limpiar
              </Button>
              <Button onClick={() => fetchDeliveries(deliveryFilters)} className="bg-primary hover:bg-primary-600">
                Aplicar filtros
              </Button>
            </div>
          </Card>

          <DataTable
            data={deliveries}
            columns={deliveryColumns}
            title="Historial de Entregas"
            addButtonText="Registrar entrega"
            onAdd={() => setIsDeliveryModalOpen(true)}
            isLoading={isLoadingDeliveries}
            searchFields={[
              "staff_document_number",
              "staff_name",
              "staff_last_name",
              "staff_full_name",
              "item_code",
              "item_name",
              "item_category",
              "delivered_by",
              "alert_status",
            ]}
            searchPlaceholder="Buscar por personal, documento, item o estado..."
            defaultSort={{ key: "delivered_at", direction: "desc" }}
            initialPageSize={20}
          />
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card className="space-y-4 p-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-primary-900">Filtros de alertas</h3>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Input
                placeholder="Documento del personal"
                value={alertFilters.staff_document_number ?? ""}
                onChange={(event) =>
                  setAlertFilters((prev) => ({ ...prev, staff_document_number: event.target.value }))
                }
              />
              <Input
                placeholder="Código del item"
                value={alertFilters.item_code ?? ""}
                onChange={(event) => setAlertFilters((prev) => ({ ...prev, item_code: event.target.value }))}
              />
              <Input
                placeholder="Estado de alerta"
                value={alertFilters.alert_status ?? ""}
                onChange={(event) => setAlertFilters((prev) => ({ ...prev, alert_status: event.target.value }))}
              />
              <div>
                <Label htmlFor="alerts-filter-near">Días para alerta</Label>
                <Input
                  id="alerts-filter-near"
                  type="number"
                  min="0"
                  value={alertFilters.near_days ?? 30}
                  onChange={(event) =>
                    setAlertFilters((prev) => ({
                      ...prev,
                      near_days: Number(event.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div className="flex items-end pb-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="include-vigente"
                    checked={alertFilters.include_vigente === true}
                    onCheckedChange={(checked) =>
                      setAlertFilters((prev) => ({ ...prev, include_vigente: checked === true }))
                    }
                  />
                  <Label htmlFor="include-vigente">Incluir vigentes</Label>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={async () => {
                  const nextFilters = {
                    staff_document_number: "",
                    item_code: "",
                    alert_status: "",
                    near_days: 30,
                    include_vigente: false,
                  };
                  setAlertFilters(nextFilters);
                  await fetchAlerts(nextFilters);
                }}
              >
                Limpiar
              </Button>
              <Button onClick={() => fetchAlerts(alertFilters)} className="bg-primary hover:bg-primary-600">
                Aplicar filtros
              </Button>
            </div>
          </Card>

          <DataTable
            data={alerts}
            columns={alertColumns}
            title="Alertas de Dotación"
            hideAddButton
            isLoading={isLoadingAlerts}
            searchFields={[
              "staff_document_number",
              "staff_name",
              "staff_last_name",
              "staff_full_name",
              "item_code",
              "item_name",
              "item_category",
              "alert_status",
            ]}
            searchPlaceholder="Buscar por personal, documento, item o estado..."
            defaultSort={{ key: "days_to_expiry", direction: "asc" }}
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

      <FormModal
        isOpen={isDeliveryModalOpen}
        onClose={() => setIsDeliveryModalOpen(false)}
        title="Registrar Entrega de Dotación"
      >
        <DotationDeliveryForm
          staffMembers={staffMembers}
          items={items}
          onSubmit={handleDeliverySubmit}
          onCancel={() => setIsDeliveryModalOpen(false)}
        />
      </FormModal>
    </div>
  );
}