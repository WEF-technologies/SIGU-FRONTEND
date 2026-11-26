
import { useState, useEffect, useMemo } from "react";
import { FormModal } from "@/components/shared/FormModal";
import { SparePartForm } from "@/components/spareparts/SparePartForm";
import { SparePartDetailsModal } from "@/components/spareparts/SparePartDetailsModal";
import {
  SparePartRequestForm,
  type SparePartRequestSubmission,
} from "@/components/spareparts/SparePartRequestForm";
import { SparePart, SparePartPayload, Vehicle } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useAuthenticatedFetch } from "@/hooks/useAuthenticatedFetch";
import { fetchAllPages } from "@/lib/apiClient";
import { useConfirm } from "@/hooks/useConfirm";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { RowActions } from "@/components/shared/RowActions";
import { SearchFilter } from "@/components/shared/SearchFilter";
import { TwoLineCell } from "@/components/shared/TwoLineCell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Plus, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { matchesSearch } from "@/lib/filtering";
import { localizeApiErrorPayload } from "@/lib/errorI18n";
import { isSparePartNotFoundError, SparePartsApiError, sparePartsApi } from "@/services/sparePartsApi";

const API_URL = import.meta.env.VITE_API_URL ?? "";

const parseBackendErrorMessage = async (response: Response, fallback: string) => {
  try {
    const body = await response.json();
    return localizeApiErrorPayload(body, fallback);
  } catch {
    return fallback;
  }
};

const getSparePartErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

const getFitmentSearchText = (part: SparePart) =>
  (part.fitments ?? [])
    .flatMap((fitment) => [
      fitment.brand,
      fitment.model,
      fitment.engine_type,
      fitment.engine_code,
      fitment.fuel_type,
      fitment.transmission_type,
      fitment.year_from != null ? String(fitment.year_from) : "",
      fitment.year_to != null ? String(fitment.year_to) : "",
    ])
    .filter((value): value is string => Boolean(value && value.trim()))
    .join(" ");

type StockTone = "out" | "low" | "ok";

const getStockTone = (part: SparePart): StockTone => {
  if (part.quantity <= 0) return "out";
  if (part.min_stock != null && part.quantity <= part.min_stock) return "low";
  return "ok";
};

/** Existencias: el numero manda; solo se marca lo agotado o bajo el minimo. */
function StockCell({ part }: { part: SparePart }) {
  const tone = getStockTone(part);
  return (
    <div className="whitespace-nowrap">
      <p className={cn("font-semibold tabular-nums", tone === "out" ? "text-gray-400" : "text-gray-900")}>
        {part.quantity} uds
      </p>
      {tone === "out" ? <p className="text-xs text-red-700">Agotado</p> : null}
      {tone === "low" ? <p className="text-xs text-amber-700">Stock bajo</p> : null}
    </div>
  );
}

/** Vehiculos compatibles en texto: placas separadas por coma, sin pastillas. */
function CompatibleVehiclesCell({ part }: { part: SparePart }) {
  const plates = part.compatible_vehicles ?? [];
  const fitmentCount = part.fitments?.length ?? 0;

  if (plates.length > 0) {
    const shown = plates.slice(0, 3).join(", ");
    return (
      <p className="text-sm text-gray-700">
        {shown}
        {plates.length > 3 ? <span className="text-gray-500"> y {plates.length - 3} más</span> : null}
      </p>
    );
  }
  if (fitmentCount > 0) {
    return (
      <p className="text-sm text-gray-500">
        Por ficha técnica ({fitmentCount} {fitmentCount === 1 ? "regla" : "reglas"})
      </p>
    );
  }
  return <p className="text-sm text-gray-400">Sin vehículos</p>;
}

// ─── Vista "Por vehículo": un bloque por unidad con sus repuestos ──────────────
function VehiclePartsGroup({
  vehicle,
  parts,
  onView,
  onEdit,
}: {
  vehicle: Vehicle;
  parts: SparePart[];
  onView: (p: SparePart) => void;
  onEdit: (p: SparePart) => void;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-secondary-medium bg-white" aria-label={vehicle.plate_number}>
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-secondary-medium bg-secondary-light px-4 py-3">
        <p className="font-semibold text-primary-900">
          {vehicle.plate_number}
          <span className="ml-2 text-sm font-normal text-gray-500">
            {vehicle.brand} {vehicle.model} {vehicle.year}
          </span>
        </p>
        <p className="text-sm text-gray-500">
          {parts.length} {parts.length === 1 ? "repuesto" : "repuestos"}
        </p>
      </header>
      <ul className="divide-y divide-secondary-medium">
        {parts.map((part) => (
          <li key={part.id} className="flex items-center gap-4 px-4 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-gray-900">{part.description}</p>
              <p className="text-xs text-gray-500">
                {part.code}
                {part.company_location ? `, ${part.company_location}` : ""}
              </p>
            </div>
            <StockCell part={part} />
            {/* Siempre visibles: en pantallas tactiles no existe "pasar el puntero". */}
            <RowActions label={part.description} onView={() => onView(part)} onEdit={() => onEdit(part)} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function EmptyMessage({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-dashed border-secondary-medium bg-white px-6 py-12 text-center">
      <p className="font-medium text-primary-900">{title}</p>
      <p className="mt-1 text-sm text-secondary-dark">{description}</p>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function SpareParts() {
  const { toast } = useToast();
  const authenticatedFetch = useAuthenticatedFetch();
  const confirm = useConfirm();
  const [spareParts, setSpareParts] = useState<SparePart[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [editingSparePart, setEditingSparePart] = useState<SparePart | null>(null);
  const [viewingSparePart, setViewingSparePart] = useState<SparePart | null>(null);
  const [view, setView] = useState<'parts' | 'vehicles'>('parts');
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sparePartsData, vRes] = await Promise.all([
          sparePartsApi.listAll(authenticatedFetch),
          fetchAllPages(authenticatedFetch, `${API_URL}/api/v1/vehicles/`),
        ]);
        setSpareParts(sparePartsData);
        setVehicles(vRes.ok ? await vRes.json() : []);
      } catch {
        setSpareParts([]);
        setVehicles([]);
      }
    };
    fetchData();
  }, [authenticatedFetch]);

  // ── Derivados ──
  const vehicleMap = useMemo(
    () => new Map(vehicles.map(v => [v.plate_number, v])),
    [vehicles]
  );

  const filteredParts = useMemo(() => {
    if (!search.trim()) return spareParts;
    return spareParts.filter(p =>
      matchesSearch(search, [
        p.code,
        p.description,
        getFitmentSearchText(p),
        ...(p.compatible_vehicles ?? []).flatMap(plate => {
          const v = vehicleMap.get(plate);
          return [plate, v?.brand, v?.model];
        }),
      ])
    );
  }, [spareParts, search, vehicleMap]);

  const vehicleGroups = useMemo(() => {
    const hasSearch = Boolean(search.trim());
    return vehicles
      .map(v => ({
        vehicle: v,
        parts: spareParts.filter(p => (p.compatible_vehicles ?? []).includes(v.plate_number)),
      }))
      .filter(g => {
        if (g.parts.length === 0) return false;
        if (!hasSearch) return true;
        return matchesSearch(search, [
          g.vehicle.plate_number,
          g.vehicle.brand,
          g.vehicle.model,
          ...g.parts.flatMap(p => [p.code, p.description]),
        ]);
      })
      .sort((a, b) => a.vehicle.plate_number.localeCompare(b.vehicle.plate_number));
  }, [vehicles, spareParts, search]);

  // ── CRUD handlers ──
  const handleAdd = () => { setEditingSparePart(null); setIsModalOpen(true); };
  const handleEdit = (sp: SparePart) => { setEditingSparePart(sp); setIsModalOpen(true); };
  const handleViewDetails = (sp: SparePart) => { setViewingSparePart(sp); setIsDetailsModalOpen(true); };

  const handleDelete = async (sp: SparePart) => {
    // Un repuesto en uso ya se puede borrar: el historial se conserva.
    if (!(await confirm({
      title: "Eliminar repuesto",
      description:
        `Se eliminará ${sp.code} - ${sp.description} del inventario. ` +
        "Los mantenimientos y solicitudes que lo usaban conservan su descripción y su código. " +
        "Esta acción no se puede deshacer.",
    }))) return;
    try {
      await sparePartsApi.remove(authenticatedFetch, sp.id);
      setSpareParts(prev => prev.filter(p => p.id !== sp.id));
      toast({
        title: "Repuesto eliminado",
        description: `${sp.code} - ${sp.description} eliminado. El historial que lo usaba conserva su descripción y su código.`,
      });
    } catch (error) {
      if (error instanceof SparePartsApiError && error.status === 404) {
        // Otro usuario ya lo había eliminado: el resultado es el mismo.
        setSpareParts(prev => prev.filter(p => p.id !== sp.id));
        toast({ title: "Repuesto eliminado", description: `${sp.code} ya no existía en el inventario.` });
        return;
      }
      toast({
        title: "Error",
        description: getSparePartErrorMessage(error, "Error al eliminar el repuesto."),
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (formData: SparePartPayload) => {
    try {
      if (editingSparePart) {
        const updated = await sparePartsApi.update(authenticatedFetch, editingSparePart.id, formData);
        setSpareParts(prev => prev.map(sp => sp.id === editingSparePart.id ? updated : sp));
        toast({ title: "Repuesto actualizado", description: `${formData.code} actualizado correctamente.` });
      } else {
        const created = await sparePartsApi.create(authenticatedFetch, formData);
        setSpareParts(prev => [...prev, created]);
        toast({ title: "Repuesto creado", description: `${formData.code} creado correctamente.` });
      }
      setIsModalOpen(false);
    } catch (error) {
      if (editingSparePart && isSparePartNotFoundError(error)) {
        // Lo eliminaron mientras se editaba: no queda nada que guardar.
        setSpareParts(prev => prev.filter(sp => sp.id !== editingSparePart.id));
        setIsModalOpen(false);
        toast({
          title: "Repuesto no encontrado",
          description: getSparePartErrorMessage(error, "El repuesto ya no existe."),
          variant: "destructive",
        });
        return;
      }
      // El resto (fitment vacío, años invertidos, placa nueva inexistente: 404 al
      // editar y 400 al crear) es un error de validación: se muestra el detalle.
      const isValidationError =
        error instanceof SparePartsApiError && [400, 404, 422].includes(error.status);
      toast({
        title: isValidationError ? "Datos del repuesto no válidos" : "Error",
        description: getSparePartErrorMessage(error, "Error al procesar la operación."),
        variant: "destructive"
      });
    }
  };

  const handleSparePartRequest = async (requestData: SparePartRequestSubmission) => {
    setIsSubmittingRequest(true);
    try {
      const normalizedCode = requestData.code?.trim();
      const res = await authenticatedFetch(`${API_URL}/api/v1/spare_part_requests/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: requestData.description.trim(),
          requested_by: requestData.requestedBy.trim(),
          date: requestData.date,
          item_type: requestData.itemType.trim() || "spare_part",
          target_area: requestData.targetArea.trim() || "general",
          ...(normalizedCode ? { code: normalizedCode.toUpperCase() } : {}),
          ...(requestData.notes?.trim() ? { notes: requestData.notes.trim() } : {}),
          ...(requestData.targetReference?.trim()
            ? { target_reference: requestData.targetReference.trim() }
            : {}),
        }),
      });
      if (res.ok) {
        toast({
          title: "Solicitud enviada",
          description: `Solicitud de ${normalizedCode?.toUpperCase() ?? requestData.description.trim()} enviada.`,
        });
        setIsRequestModalOpen(false);
      } else {
        const message = await parseBackendErrorMessage(
          res,
          "No se pudo enviar la solicitud."
        );
        toast({ title: "Error", description: message, variant: "destructive" });
      }
    } catch {
      toast({
        title: "Error",
        description: "No se pudo conectar al servidor para enviar la solicitud.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const lowStockCount = spareParts.filter(p => getStockTone(p) !== "ok").length;

  const columns: Column<SparePart>[] = [
    {
      key: "description",
      header: "Repuesto",
      render: (_, part) => <TwoLineCell primary={part.description} secondary={part.code} />,
    },
    {
      key: "company_location",
      header: "Ubicación",
      render: (_, part) => <span className="text-sm text-gray-700">{part.company_location || "-"}</span>,
    },
    {
      key: "compatible_vehicles",
      header: "Vehículos",
      sortable: false,
      render: (_, part) => <CompatibleVehiclesCell part={part} />,
    },
    {
      key: "quantity",
      header: "Existencias",
      sortValue: (part) => part.quantity,
      render: (_, part) => <StockCell part={part} />,
    },
    {
      key: "unit_price",
      header: "Precio",
      sortValue: (part) => part.unit_price ?? null,
      render: (_, part) =>
        part.unit_price != null ? (
          <span className="whitespace-nowrap text-sm tabular-nums text-gray-900">${part.unit_price.toLocaleString("es-VE")}</span>
        ) : (
          <span className="text-sm text-gray-400">Sin precio</span>
        ),
    },
    {
      key: "actions",
      header: "",
      sortable: false,
      render: (_, part) => (
        <RowActions
          label={part.description}
          onView={() => handleViewDetails(part)}
          onEdit={() => handleEdit(part)}
          onDelete={() => void handleDelete(part)}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Repuestos"
        description={`${spareParts.length} ${spareParts.length === 1 ? "repuesto" : "repuestos"}${
          lowStockCount > 0
            ? `, ${lowStockCount} ${lowStockCount === 1 ? "agotado" : "agotados"} o con stock bajo`
            : ""
        }`}
        actions={
          <>
            <Button
              onClick={() => setIsRequestModalOpen(true)}
              variant="outline"
              className="border-primary-200 text-primary hover:bg-primary-50"
            >
              <ShoppingCart className="h-4 w-4" />
              Solicitar
            </Button>
            <Button onClick={handleAdd} className="bg-primary text-white hover:bg-primary-600">
              <Plus className="h-4 w-4" />
              Agregar repuesto
            </Button>
          </>
        }
      />

      <section className="space-y-3" aria-label="Repuestos">
        {/* Vista y busqueda en una sola linea, igual que en los demas modulos. */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <ToggleGroup
            type="single"
            value={view}
            onValueChange={(next) => next && setView(next as "parts" | "vehicles")}
            aria-label="Agrupar"
            className="w-fit justify-start rounded-lg border border-secondary-medium bg-white p-1"
          >
            {[
              { value: "parts", label: "Por repuesto" },
              { value: "vehicles", label: "Por vehículo" },
            ].map((option) => (
              <ToggleGroupItem
                key={option.value}
                value={option.value}
                className="h-8 whitespace-nowrap px-3 text-gray-600 hover:bg-primary-50 hover:text-primary data-[state=on]:bg-primary data-[state=on]:text-white"
              >
                {option.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <div>
            <Label htmlFor="spare-part-search" className="sr-only">
              Buscar repuestos
            </Label>
            <SearchFilter
              id="spare-part-search"
              className="w-full sm:w-72"
              placeholder="Código, descripción o placa"
              value={search}
              onChange={setSearch}
            />
          </div>
        </div>

        {view === "parts" ? (
          filteredParts.length === 0 ? (
            <EmptyMessage
              title={search.trim() ? "Ningún repuesto coincide con la búsqueda" : "Aún no hay repuestos"}
              description={search.trim() ? "Prueba con otro código, descripción o placa." : "Agrega el primero para empezar el inventario."}
            />
          ) : (
            <DataTable
              data={filteredParts}
              columns={columns}
              defaultSort={{ key: "description", direction: "asc" }}
              initialPageSize={20}
              hideAddButton
              mobileTitle={(part) => <TwoLineCell primary={part.description} secondary={part.code} />}
            />
          )
        ) : vehicleGroups.length === 0 ? (
          <EmptyMessage
            title={search.trim() ? "Ningún vehículo coincide con la búsqueda" : "Ningún vehículo tiene repuestos asignados"}
            description="Asigna vehículos compatibles al editar cada repuesto."
          />
        ) : (
          <div className="space-y-3">
            {vehicleGroups.map(({ vehicle, parts }) => (
              <VehiclePartsGroup
                key={vehicle.id}
                vehicle={vehicle}
                parts={parts}
                onView={handleViewDetails}
                onEdit={handleEdit}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Modals ── */}
      <FormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}
        title={editingSparePart ? "Editar repuesto" : "Agregar repuesto"}>
        <SparePartForm
          sparePart={editingSparePart}
          vehicles={vehicles}
          onSubmit={handleSubmit}
          onCancel={() => setIsModalOpen(false)}
        />
      </FormModal>

      <FormModal isOpen={isRequestModalOpen} onClose={() => setIsRequestModalOpen(false)} title="Solicitar repuesto">
        <SparePartRequestForm
          onSubmit={handleSparePartRequest}
          onCancel={() => setIsRequestModalOpen(false)}
          isSubmitting={isSubmittingRequest}
        />
      </FormModal>

      <SparePartDetailsModal
        sparePart={viewingSparePart}
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        vehicles={vehicles}
      />
    </div>
  );
}
