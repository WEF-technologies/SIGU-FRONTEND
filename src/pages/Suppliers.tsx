import { useCallback, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SupplierForm } from "@/components/suppliers/SupplierForm";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { FormModal } from "@/components/shared/FormModal";
import { SearchFilter } from "@/components/shared/SearchFilter";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useConfirm } from "@/hooks/useConfirm";
import { ALL_FILTER_VALUE, buildOptionsFromValues, matchesOption, matchesSearch, mergeKnownOptions } from "@/lib/filtering";
import { Supplier, SupplierPayload, SUPPLIER_CATEGORY_OPTIONS } from "@/types";
import { Edit, MessageCircle, Plus, Receipt, RefreshCw, Star, Trash2 } from "lucide-react";

const normalizeStatus = (value?: string | null) => (value ?? "").trim().toLowerCase();

const isInactiveStatus = (status?: string | null) => {
  const normalizedStatus = normalizeStatus(status);
  return normalizedStatus === "inactive" || normalizedStatus === "inactivo";
};

const categoryLabelMap = new Map<string, string>(
  SUPPLIER_CATEGORY_OPTIONS.map((option) => [option.value, option.label])
);

const formatCategoryLabel = (category: string) => categoryLabelMap.get(category) ?? category;

/**
 * Una sola vista en lugar de los filtros de estado y "Solo destacados" por
 * separado: son las preguntas que se hacen al abrir el listado.
 */
type SupplierView = "all" | "active" | "inactive" | "featured";

const VIEW_OPTIONS: { value: SupplierView; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Activos" },
  { value: "inactive", label: "Inactivos" },
  { value: "featured", label: "Destacados" },
];

const matchesView = (view: SupplierView, supplier: Supplier) => {
  switch (view) {
    case "active":
      return !isInactiveStatus(supplier.status);
    case "inactive":
      return isInactiveStatus(supplier.status);
    case "featured":
      return supplier.destacado;
    default:
      return true;
  }
};

const getSupplierSearchFields = (supplier: Supplier) => [
  supplier.name,
  supplier.location,
  supplier.address,
  supplier.contact_phone,
  supplier.email,
  supplier.description,
  supplier.notes,
  ...supplier.categories.map(formatCategoryLabel),
];

/** Los destacados primero (antes tenian un bloque propio arriba) y luego por nombre. */
const compareSuppliers = (a: Supplier, b: Supplier) =>
  Number(b.destacado) - Number(a.destacado) || a.name.localeCompare(b.name, "es", { sensitivity: "base" });

const toSupplierPayload = (supplier: Supplier, overrides: Partial<SupplierPayload> = {}): SupplierPayload => ({
  name: supplier.name,
  address: supplier.address,
  location: supplier.location,
  contact_phone: supplier.contact_phone,
  email: supplier.email ?? null,
  status: supplier.status,
  categories: supplier.categories,
  destacado: supplier.destacado,
  description: supplier.description ?? null,
  delivery_time_notes: supplier.delivery_time_notes ?? null,
  notes: supplier.notes ?? null,
  ...overrides,
});

const purchasesPath = (supplier: Supplier) => `/proveedores/${encodeURIComponent(supplier.id)}/compras`;

export default function Suppliers() {
  const { suppliers, isLoadingSuppliers, fetchSuppliers, createSupplier, updateSupplier, deleteSupplier } =
    useSuppliers();
  const confirm = useConfirm();
  const navigate = useNavigate();

  const [view, setView] = useState<SupplierView>("all");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const categoryOptions = useMemo(
    () =>
      mergeKnownOptions(
        SUPPLIER_CATEGORY_OPTIONS,
        suppliers.flatMap((supplier) => supplier.categories),
        formatCategoryLabel
      ),
    [suppliers]
  );
  const locationOptions = useMemo(
    () => buildOptionsFromValues(suppliers.map((supplier) => supplier.location)),
    [suppliers]
  );

  const visibleSuppliers = useMemo(
    () =>
      suppliers
        .filter(
          (supplier) =>
            matchesView(view, supplier) &&
            matchesOption(location, supplier.location) &&
            (!category || supplier.categories.some((value) => matchesOption(category, value))) &&
            matchesSearch(searchTerm, getSupplierSearchFields(supplier))
        )
        .sort(compareSuppliers),
    [category, location, searchTerm, suppliers, view]
  );

  const featuredCount = useMemo(() => suppliers.filter((supplier) => supplier.destacado).length, [suppliers]);
  const hasFilters = view !== "all" || Boolean(category || location || searchTerm.trim());

  const clearFilters = () => {
    setView("all");
    setCategory("");
    setLocation("");
    setSearchTerm("");
  };

  const openCreate = () => {
    setEditingSupplier(null);
    setIsModalOpen(true);
  };

  /**
   * El backend no deja eliminar un proveedor con compras (409) para no perder
   * el historial, y sugiere desactivarlo. Se ofrece eso mismo en un paso.
   */
  const handleSupplierWithPurchases = useCallback(
    async (supplier: Supplier) => {
      if (isInactiveStatus(supplier.status)) {
        const viewHistory = await confirm({
          title: "No se puede eliminar el proveedor",
          description: `${supplier.name} tiene compras registradas y ya está inactivo. Su historial de compras se conserva.`,
          confirmLabel: "Ver historial de compras",
          confirmVariant: "default",
        });
        if (viewHistory) navigate(purchasesPath(supplier));
        return;
      }

      const deactivate = await confirm({
        title: "No se puede eliminar el proveedor",
        description: `${supplier.name} tiene compras registradas y su historial debe conservarse. ¿Quieres marcarlo como inactivo? Así no se le podrán registrar compras nuevas.`,
        confirmLabel: "Marcar como inactivo",
        confirmVariant: "default",
      });
      if (!deactivate) return;

      await updateSupplier(supplier.id, toSupplierPayload(supplier, { status: "inactive" }));
    },
    [confirm, navigate, updateSupplier]
  );

  const columns = useMemo<Column<Supplier>[]>(
    () => [
      {
        key: "name",
        header: "Proveedor",
        // En movil el nombre ya es el titulo de la tarjeta.
        hideOnMobile: true,
        sortValue: (supplier) => supplier.name,
        render: (_, supplier) => <SupplierNameCell supplier={supplier} />,
      },
      {
        key: "location",
        header: "Ubicación",
        render: (_, supplier) => (
          <div className="min-w-0">
            <p className="text-sm text-gray-900">{supplier.location || "-"}</p>
            {supplier.address ? <p className="text-xs text-gray-500">{supplier.address}</p> : null}
          </div>
        ),
      },
      {
        key: "contact_phone",
        header: "Contacto",
        sortable: false,
        render: (_, supplier) => <ContactCell supplier={supplier} />,
      },
      {
        key: "status",
        header: "Estado",
        sortValue: (supplier) => (isInactiveStatus(supplier.status) ? 1 : 0),
        render: (_, supplier) => {
          const inactive = isInactiveStatus(supplier.status);
          return (
            <span className="inline-flex items-center gap-2 whitespace-nowrap text-sm text-gray-700">
              <span
                aria-hidden="true"
                className={`h-2 w-2 rounded-full ${inactive ? "bg-gray-400" : "bg-emerald-500"}`}
              />
              {inactive ? "Inactivo" : "Activo"}
            </span>
          );
        },
      },
      {
        key: "actions",
        header: "",
        sortable: false,
        render: (_, supplier) => (
          <div className="flex flex-nowrap items-center justify-end gap-1">
            <Button asChild variant="ghost" size="sm" className="text-primary hover:bg-primary-50 hover:text-primary">
              <Link to={purchasesPath(supplier)} aria-label={`Ver el historial de compras de ${supplier.name}`}>
                <Receipt className="h-4 w-4" />
                Compras
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-500 hover:bg-primary-50 hover:text-primary"
              onClick={() => {
                setEditingSupplier(supplier);
                setIsModalOpen(true);
              }}
              aria-label={`Editar ${supplier.name}`}
              title="Editar"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-500 hover:bg-red-50 hover:text-red-600"
              onClick={async () => {
                if (
                  !(await confirm({
                    title: "Eliminar proveedor",
                    description: `Se eliminará el proveedor ${supplier.name}. Esta acción no se puede deshacer.`,
                  }))
                )
                  return;
                const result = await deleteSupplier(supplier);
                if (result === "has-purchases") await handleSupplierWithPurchases(supplier);
              }}
              aria-label={`Eliminar ${supplier.name}`}
              title="Eliminar"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [confirm, deleteSupplier, handleSupplierWithPurchases]
  );

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSupplier(null);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchSuppliers({});
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSubmitSupplier = async (payload: SupplierPayload) => {
    const ok = editingSupplier ? await updateSupplier(editingSupplier.id, payload) : await createSupplier(payload);

    if (ok) {
      closeModal();
    }

    return ok;
  };

  const countLabel = isLoadingSuppliers
    ? "Cargando..."
    : `${suppliers.length} ${suppliers.length === 1 ? "proveedor" : "proveedores"}${
        featuredCount > 0 ? `, ${featuredCount} ${featuredCount === 1 ? "destacado" : "destacados"}` : ""
      }`;

  return (
    <div className="space-y-6 p-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-primary-900">Proveedores</h1>
          <p className="text-sm text-secondary-dark">{countLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="border-primary-200 text-primary hover:bg-primary-50"
            aria-label="Actualizar"
            title="Actualizar"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
          <Button onClick={openCreate} className="bg-primary text-white hover:bg-primary-600">
            <Plus className="h-4 w-4" />
            Agregar proveedor
          </Button>
        </div>
      </header>

      <section className="space-y-3" aria-label="Listado de proveedores">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <Label htmlFor="supplier-view" className="sr-only">
              Mostrar
            </Label>
            {/* En movil los cuatro botones no caben bien: se usa un desplegable. */}
            <select
              id="supplier-view"
              value={view}
              onChange={(event) => setView(event.target.value as SupplierView)}
              className="h-10 w-full rounded-md border border-input bg-white px-3 text-base sm:hidden"
            >
              {VIEW_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ToggleGroup
              type="single"
              value={view}
              // Radix devuelve "" al volver a pulsar la opcion activa: se mantiene la actual.
              onValueChange={(next) => next && setView(next as SupplierView)}
              aria-label="Mostrar"
              className="hidden w-fit justify-start rounded-lg border border-secondary-medium bg-white p-1 sm:flex"
            >
              {VIEW_OPTIONS.map((option) => (
                <ToggleGroupItem
                  key={option.value}
                  value={option.value}
                  className="h-8 shrink-0 whitespace-nowrap px-3 text-gray-600 hover:bg-primary-50 hover:text-primary data-[state=on]:bg-primary data-[state=on]:text-white"
                >
                  {option.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <CompactSelect
              id="supplier-category"
              label="Categoría"
              allLabel="Todas las categorías"
              value={category}
              onChange={setCategory}
              options={categoryOptions}
            />
            {/* Con una sola ubicacion el filtro no aporta nada. */}
            {locationOptions.length > 1 ? (
              <CompactSelect
                id="supplier-location"
                label="Ubicación"
                allLabel="Todas las ubicaciones"
                value={location}
                onChange={setLocation}
                options={locationOptions}
              />
            ) : null}
            <Label htmlFor="supplier-search" className="sr-only">
              Buscar proveedores
            </Label>
            <SearchFilter
              id="supplier-search"
              className="w-full sm:w-64"
              placeholder="Buscar proveedor"
              value={searchTerm}
              onChange={setSearchTerm}
            />
            {hasFilters ? (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="shrink-0 self-start text-gray-600 sm:self-auto">
                Limpiar
              </Button>
            ) : null}
          </div>
        </div>

        {!isLoadingSuppliers && visibleSuppliers.length === 0 ? (
          <div className="rounded-lg border border-dashed border-secondary-medium bg-white px-6 py-12 text-center">
            {hasFilters ? (
              <>
                <p className="font-medium text-primary-900">Ningún proveedor coincide con los filtros</p>
                <p className="mt-1 text-sm text-secondary-dark">Prueba con otra categoría u otra búsqueda.</p>
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="mt-4 border-primary-200 text-primary hover:bg-primary-50"
                >
                  Limpiar filtros
                </Button>
              </>
            ) : (
              <>
                <p className="font-medium text-primary-900">Aún no hay proveedores</p>
                <p className="mt-1 text-sm text-secondary-dark">
                  Agrega el primero para registrar sus datos de contacto y sus compras.
                </p>
              </>
            )}
          </div>
        ) : (
          <DataTable
            data={visibleSuppliers}
            columns={columns}
            isLoading={isLoadingSuppliers}
            initialPageSize={20}
            hideAddButton
            mobileTitle={(supplier) => <SupplierNameCell supplier={supplier} />}
          />
        )}
      </section>

      <FormModal isOpen={isModalOpen} onClose={closeModal} title={editingSupplier ? "Editar proveedor" : "Nuevo proveedor"}>
        <SupplierForm editingSupplier={editingSupplier} onSubmit={handleSubmitSupplier} onCancel={closeModal} />
      </FormModal>
    </div>
  );
}

/** Nombre con su marca de destacado y, debajo, las categorias en texto: sin pastillas. */
function SupplierNameCell({ supplier }: { supplier: Supplier }) {
  const categories = supplier.categories.map(formatCategoryLabel).join(", ");

  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1.5 font-medium text-gray-900">
        {supplier.name}
        {supplier.destacado ? (
          <Star className="h-4 w-4 shrink-0 fill-amber-400 text-amber-400" aria-label="Destacado" role="img" />
        ) : null}
      </p>
      <p className="text-xs text-gray-500">{categories || "Sin categorías"}</p>
    </div>
  );
}

/** El telefono abre el chat de WhatsApp: reemplaza al boton "Chatear" de cada fila. */
function ContactCell({ supplier }: { supplier: Supplier }) {
  const phone = supplier.contact_phone?.trim();

  return (
    <div className="min-w-0">
      {phone && supplier.chat_url ? (
        <a
          href={supplier.chat_url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded text-sm text-gray-900 hover:text-emerald-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          title="Abrir chat de WhatsApp"
        >
          <MessageCircle className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
          {phone}
          <span className="sr-only">(abrir chat de WhatsApp)</span>
        </a>
      ) : (
        <p className="text-sm text-gray-900">{phone || "-"}</p>
      )}
      {supplier.email ? <p className="text-xs text-gray-500">{supplier.email}</p> : null}
    </div>
  );
}

interface CompactSelectProps {
  id: string;
  label: string;
  allLabel: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly { value: string; label: string }[];
}

/** Desplegable de filtro sin rotulo visible: la opcion "Todas..." ya dice que filtra. */
function CompactSelect({ id, label, allLabel, value, onChange, options }: CompactSelectProps) {
  return (
    <div>
      <Label htmlFor={id} className="sr-only">
        {label}
      </Label>
      <Select
        value={value || ALL_FILTER_VALUE}
        onValueChange={(next) => onChange(next === ALL_FILTER_VALUE ? "" : next)}
      >
        <SelectTrigger id={id} className="w-full bg-white sm:w-52">
          <SelectValue placeholder={allLabel} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_FILTER_VALUE}>{allLabel}</SelectItem>
          {options
            .filter((option) => option.value && option.value !== ALL_FILTER_VALUE)
            .map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    </div>
  );
}
