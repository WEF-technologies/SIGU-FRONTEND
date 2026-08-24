import { useMemo, useState } from "react";
import { SupplierForm } from "@/components/suppliers/SupplierForm";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { FormModal } from "@/components/shared/FormModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSuppliers } from "@/hooks/useSuppliers";
import { Supplier, SupplierFilters, SupplierPayload, SUPPLIER_CATEGORY_OPTIONS } from "@/types";
import {
  Building2,
  Edit,
  MapPin,
  MessageCircle,
  RefreshCw,
  Star,
  Tags,
  Trash2,
} from "lucide-react";

const normalizeStatus = (value?: string | null) => (value ?? "").trim().toLowerCase();

const getStatusBadgeClass = (status?: string | null) => {
  const normalizedStatus = normalizeStatus(status);

  if (normalizedStatus.includes("inactive") || normalizedStatus.includes("inactivo")) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (normalizedStatus.includes("pending") || normalizedStatus.includes("pendiente")) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (normalizedStatus.includes("active") || normalizedStatus.includes("activo")) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
};

const categoryLabelMap = new Map<string, string>(
  SUPPLIER_CATEGORY_OPTIONS.map((option) => [option.value, option.label])
);

const formatCategoryLabel = (category: string) => categoryLabelMap.get(category) ?? category;

const formatContactLine = (supplier: Supplier) => {
  const contactParts = [supplier.contact_phone, supplier.email].filter(
    (value): value is string => typeof value === "string" && value.trim().length > 0
  );

  return contactParts.length > 0 ? contactParts.join(" · ") : "Sin contacto registrado";
};

const formatAddressLine = (supplier: Supplier) => {
  const parts = [supplier.address, supplier.location].filter(
    (value): value is string => typeof value === "string" && value.trim().length > 0
  );

  return parts.length > 0 ? parts.join(" · ") : "Sin direccion registrada";
};

export default function Suppliers() {
  const {
    suppliers,
    isLoadingSuppliers,
    fetchSuppliers,
    createSupplier,
    updateSupplier,
    deleteSupplier,
  } = useSuppliers();

  const [filters, setFilters] = useState<SupplierFilters>({
    search: "",
    status: "",
    location: "",
    category: "",
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const featuredSuppliers = useMemo(
    () => suppliers.filter((supplier) => supplier.destacado),
    [suppliers]
  );

  const summaryCards = useMemo(() => {
    const uniqueLocations = new Set(
      suppliers
        .map((supplier) => supplier.location?.trim())
        .filter((value): value is string => Boolean(value))
    );

    const uniqueCategories = new Set(
      suppliers.flatMap((supplier) => supplier.categories.map((category) => category.trim()).filter(Boolean))
    );

    return [
      { title: "Total de proveedores", value: suppliers.length, icon: Building2 },
      { title: "Destacados", value: featuredSuppliers.length, icon: Star },
      { title: "Ubicaciones", value: uniqueLocations.size, icon: MapPin },
      { title: "Categorias", value: uniqueCategories.size, icon: Tags },
    ];
  }, [featuredSuppliers.length, suppliers]);

  const columns = useMemo<Column<Supplier>[]>(
    () => [
      {
        key: "name",
        header: "Proveedor",
        render: (_, supplier) => (
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium text-gray-900">{supplier.name}</p>
              {supplier.destacado ? (
                <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                  <Star className="mr-1 h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  Destacado
                </Badge>
              ) : null}
            </div>
            <p className="text-xs text-gray-500">{formatContactLine(supplier)}</p>
            <p className="text-xs text-gray-500">{formatAddressLine(supplier)}</p>
          </div>
        ),
      },
      {
        key: "categories",
        header: "Categorias",
        sortable: false,
        render: (value) => {
          const categories = Array.isArray(value) ? value : [];

          if (categories.length === 0) {
            return <span className="text-sm text-gray-500">Sin categorias</span>;
          }

          return (
            <div className="flex flex-wrap gap-1.5">
              {categories.slice(0, 3).map((category) => (
                <Badge key={category} variant="outline" className="border-primary-200 text-primary-800">
                  {formatCategoryLabel(String(category))}
                </Badge>
              ))}
              {categories.length > 3 && (
                <Badge variant="outline" className="border-slate-200 text-slate-600">
                  +{categories.length - 3}
                </Badge>
              )}
            </div>
          );
        },
      },
      {
        key: "location",
        header: "Ubicacion",
        render: (_, supplier) => (
          <div>
            <p className="text-sm text-gray-900">{supplier.location || "-"}</p>
            <p className="text-xs text-gray-500">{supplier.address || "Sin direccion"}</p>
          </div>
        ),
      },
      {
        key: "status",
        header: "Estado",
        render: (value) => (
          <Badge variant="outline" className={getStatusBadgeClass(String(value ?? "active"))}>
            {String(value ?? "active")}
          </Badge>
        ),
      },
      {
        key: "destacado",
        header: "Prioridad",
        render: (value) => {
          const highlighted = Boolean(value);
          return highlighted ? (
            <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
              Destacado
            </Badge>
          ) : (
            <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">
              Normal
            </Badge>
          );
        },
      },
      {
        key: "actions",
        header: "Acciones",
        sortable: false,
        render: (_, supplier) => (
          <div className="flex flex-wrap gap-2">
            {supplier.chat_url ? (
              <Button asChild variant="outline" size="sm" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                <a href={supplier.chat_url} target="_blank" rel="noreferrer">
                  <MessageCircle className="w-4 h-4" />
                  Chatear
                </a>
              </Button>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              className="border-primary-200 text-primary hover:bg-primary-50"
              onClick={() => {
                setEditingSupplier(supplier);
                setIsModalOpen(true);
              }}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-red-200 text-red-600 hover:bg-red-50"
              onClick={async () => {
                if (!confirm(`¿Eliminar el proveedor ${supplier.name}?`)) return;
                await deleteSupplier(supplier);
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ),
      },
    ],
    [deleteSupplier]
  );

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSupplier(null);
  };

  const handleApplyFilters = async () => {
    setIsRefreshing(true);
    try {
      await fetchSuppliers(filters);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleQuickFeaturedFilter = async (destacado?: boolean) => {
    const nextFilters: SupplierFilters = {
      ...filters,
      destacado,
    };

    setFilters(nextFilters);
    setIsRefreshing(true);
    try {
      await fetchSuppliers(nextFilters);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleClearFilters = async () => {
    const nextFilters: SupplierFilters = {
      search: "",
      status: "",
      location: "",
      category: "",
      destacado: undefined,
    };

    setFilters(nextFilters);
    setIsRefreshing(true);
    try {
      await fetchSuppliers(nextFilters);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSubmitSupplier = async (payload: SupplierPayload) => {
    const ok = editingSupplier
      ? await updateSupplier(editingSupplier.id, payload)
      : await createSupplier(payload);

    if (ok) {
      closeModal();
    }

    return ok;
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary-900">Proveedores</h1>
        </div>
        <Button
          variant="outline"
          onClick={handleApplyFilters}
          disabled={isRefreshing}
          className="border-primary-200 text-primary hover:bg-primary-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <Card key={card.title}>
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <p className="text-sm text-secondary-dark">{card.title}</p>
                <p className="mt-2 text-3xl font-bold text-primary-900">{card.value}</p>
              </div>
              <div className="rounded-full bg-primary-50 p-3 text-primary">
                <card.icon className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {featuredSuppliers.length > 0 ? (
        <Card>
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-xl text-primary-900">Proveedores priorizados</CardTitle>
              <p className="text-sm text-secondary-dark">Accesos rápidos a los proveedores marcados como destacados.</p>
            </div>
            <Badge variant="outline" className="w-fit border-amber-200 bg-amber-50 text-amber-700">
              {featuredSuppliers.length} destacados
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {featuredSuppliers.map((supplier) => (
                <div key={supplier.id} className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-primary-900">{supplier.name}</p>
                      <p className="mt-1 text-sm text-secondary-dark">{formatContactLine(supplier)}</p>
                      <p className="mt-1 text-sm text-secondary-dark">{formatAddressLine(supplier)}</p>
                    </div>
                    <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {supplier.categories.length > 0 ? (
                      supplier.categories.map((category) => (
                        <Badge key={`${supplier.id}-${category}`} variant="outline" className="border-primary-200 text-primary-800">
                          {formatCategoryLabel(category)}
                        </Badge>
                      ))
                    ) : (
                      <Badge variant="outline" className="border-slate-200 text-slate-600">
                        Sin categorias
                      </Badge>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{supplier.location || "Sin ubicacion"}</p>
                      <p className="mt-1 text-xs text-gray-500">{supplier.description || "Sin descripcion"}</p>
                      <Badge variant="outline" className={`mt-2 ${getStatusBadgeClass(supplier.status)}`}>
                        {supplier.status}
                      </Badge>
                    </div>
                    {supplier.chat_url ? (
                      <Button asChild className="bg-primary hover:bg-primary-600 text-white">
                        <a href={supplier.chat_url} target="_blank" rel="noreferrer">
                          <MessageCircle className="h-4 w-4" />
                          Chatear
                        </a>
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-xl text-primary-900">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
            <span className="text-sm font-medium text-amber-900">Vista rápida:</span>
            <Button
              type="button"
              variant={filters.destacado === undefined ? "default" : "outline"}
              className={filters.destacado === undefined ? "bg-primary hover:bg-primary-600 text-white" : "border-amber-300 bg-white text-amber-900 hover:bg-amber-100"}
              onClick={() => void handleQuickFeaturedFilter(undefined)}
              disabled={isRefreshing}
            >
              Todos
            </Button>
            <Button
              type="button"
              variant={filters.destacado === true ? "default" : "outline"}
              className={filters.destacado === true ? "bg-amber-500 hover:bg-amber-600 text-white" : "border-amber-300 bg-white text-amber-900 hover:bg-amber-100"}
              onClick={() => void handleQuickFeaturedFilter(true)}
              disabled={isRefreshing}
            >
              <Star className="h-4 w-4" />
              Solo destacados
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <Label htmlFor="supplier-search">Busqueda</Label>
              <Input
                id="supplier-search"
                value={filters.search ?? ""}
                onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
                placeholder="Nombre, direccion o telefono"
              />
            </div>
            <div>
              <Label htmlFor="supplier-category-filter">Categoria</Label>
              <select
                id="supplier-category-filter"
                value={filters.category ?? ""}
                onChange={(event) => setFilters((prev) => ({ ...prev, category: event.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Todas</option>
                {SUPPLIER_CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="supplier-location-filter">Ubicacion</Label>
              <Input
                id="supplier-location-filter"
                value={filters.location ?? ""}
                onChange={(event) => setFilters((prev) => ({ ...prev, location: event.target.value }))}
                placeholder="Ciudad o sede"
              />
            </div>
            <div>
              <Label htmlFor="supplier-status-filter">Estado</Label>
              <Input
                id="supplier-status-filter"
                value={filters.status ?? ""}
                onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
                placeholder="active"
              />
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={handleClearFilters}>
              Limpiar
            </Button>
            <Button onClick={handleApplyFilters} className="bg-primary hover:bg-primary-600 text-white" disabled={isRefreshing}>
              Aplicar filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      <DataTable
        title="Listado general"
        data={suppliers}
        columns={columns}
        onAdd={() => {
          setEditingSupplier(null);
          setIsModalOpen(true);
        }}
        addButtonText="Agregar proveedor"
        isLoading={isLoadingSuppliers}
        defaultSort={{ key: "name", direction: "asc" }}
        initialPageSize={20}
        hideAddButton={false}
      />

      <FormModal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingSupplier ? "Editar proveedor" : "Nuevo proveedor"}
      >
        <SupplierForm
          editingSupplier={editingSupplier}
          onSubmit={handleSubmitSupplier}
          onCancel={closeModal}
        />
      </FormModal>
    </div>
  );
}