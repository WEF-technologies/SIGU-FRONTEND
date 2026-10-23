
import { useState, useMemo } from "react";
import { DataTable } from "@/components/shared/DataTable";
import { FormModal } from "@/components/shared/FormModal";
import { PageDataLoader } from "@/components/shared/PageDataLoader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { VehicleFiltersComponent, VehicleFilters } from "@/components/vehicles/VehicleFilters";
import { VehicleDetailsModal } from "@/components/vehicles/VehicleDetailsModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Vehicle } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useAuthenticatedFetch } from "@/hooks/useAuthenticatedFetch";
import { useMaintenance } from "@/hooks/useMaintenance";
import { useConfirm } from "@/hooks/useConfirm";
import { maintenanceTypeConfig } from "@/constants/maintenanceTypes";
import { VEHICLE_FORM_STATUS_OPTIONS, VEHICLE_STATUS_OPTIONS } from "@/constants/filterOptions";
import {
  buildOptionsFromValues,
  getOptionLabel,
  matchesOption,
  matchesSearch,
  mergeKnownOptions,
} from "@/lib/filtering";
import { Eye, Edit, Trash2, Calendar, Gauge, Plus, Wrench, Info, Download, Loader2 } from "lucide-react";
import { ApiRequestError, maintenancesApi } from "@/services/maintenancesApi";
import { localizeApiErrorPayload } from "@/lib/errorI18n";

const API_URL = import.meta.env.VITE_API_URL ?? "";

const parseBackendErrorMessage = async (response: Response, fallback: string) => {
  try {
    const body = await response.json();
    return localizeApiErrorPayload(body, fallback);
  } catch {
    return fallback;
  }
};

type ModalStep = "vehicle" | "baseline";

const EMPTY_FORM = {
  brand: "",
  model: "",
  year: new Date().getFullYear(),
  plate_number: "",
  status: "available" as Vehicle["status"],
  current_kilometers: 0,
};

/** KM del último mantenimiento por tipo, vacío = nunca realizado */
type BaselineData = Record<string, string>; // type -> km string

const today = new Date().toISOString().split("T")[0];

const EMPTY_VEHICLE_FILTERS: VehicleFilters = {
  query: "",
  status: "",
  brand: "",
  yearFrom: "",
  yearTo: "",
  maintenanceOverdue: false,
};

type VehicleSort = "maintenance_due" | "plate_asc" | "plate_desc" | "year_desc" | "status";

const SORT_OPTIONS: Array<{ value: VehicleSort; label: string }> = [
  { value: "maintenance_due", label: "Próximo mantenimiento" },
  { value: "plate_asc", label: "Placa A-Z" },
  { value: "plate_desc", label: "Placa Z-A" },
  { value: "year_desc", label: "Año más reciente" },
  { value: "status", label: "Estado operativo" },
];

/** Un estado con nombre de sede (p. ej. "Barcelona") cuenta como operativa, igual que en el dashboard. */
const getStatusOrder = (status: string) => {
  if (status === "maintenance") return 1;
  if (status === "out_of_service") return 2;
  return 0;
};

/**
 * Km que faltan para el próximo M3, usando el mayor km conocido (evita "Faltan"
 * inflado cuando current_km está desactualizado respecto al último mantenimiento).
 */
const getRemainingKm = (vehicle: Vehicle) => {
  const effectiveKm = Math.max(
    vehicle.current_kilometers || vehicle.kilometers || 0,
    vehicle.last_m3_kilometers || 0
  );
  const nextM3Km = vehicle.next_m3_kilometers;
  if (!effectiveKm || !nextM3Km) return null;
  return nextM3Km - effectiveKm;
};

export default function Vehicles() {
  const { toast } = useToast();
  const authenticatedFetch = useAuthenticatedFetch();
  const confirm = useConfirm();
  const {
    vehicles,
    isLoadingData,
    refreshVehicles,
    updateVehicleInState,
    removeVehicleFromState,
    createBaselineMaintenances,
  } = useMaintenance();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<ModalStep>("vehicle");
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [newVehiclePlate, setNewVehiclePlate] = useState("");
  const [baselineData, setBaselineData] = useState<BaselineData>({});
  const [isSavingBaseline, setIsSavingBaseline] = useState(false);
  const [downloadingPlate, setDownloadingPlate] = useState<string | null>(null);

  const [filters, setFilters] = useState<VehicleFilters>(EMPTY_VEHICLE_FILTERS);
  const [sortBy, setSortBy] = useState<VehicleSort>("maintenance_due");
  const [formData, setFormData] = useState({ ...EMPTY_FORM });

  // Mismas opciones de estado que el formulario, más cualquier otro valor que ya exista en los datos.
  const filterOptions = useMemo(
    () => ({
      status: mergeKnownOptions(VEHICLE_FORM_STATUS_OPTIONS, vehicles.map((vehicle) => vehicle.status)),
      brand: buildOptionsFromValues(vehicles.map((vehicle) => vehicle.brand)),
    }),
    [vehicles]
  );

  const filteredVehicles = useMemo(() => {
    const yearFrom = parseInt(filters.yearFrom, 10);
    const yearTo = parseInt(filters.yearTo, 10);

    const base = vehicles.filter((vehicle) => {
      const matchesQuery = matchesSearch(filters.query, [
        vehicle.plate_number,
        vehicle.brand,
        vehicle.model,
        vehicle.year,
        vehicle.status,
        getOptionLabel(VEHICLE_STATUS_OPTIONS, vehicle.status),
      ]);
      if (!matchesQuery) return false;
      if (!matchesOption(filters.status, vehicle.status)) return false;
      if (!matchesOption(filters.brand, vehicle.brand)) return false;
      if (!Number.isNaN(yearFrom) && vehicle.year < yearFrom) return false;
      if (!Number.isNaN(yearTo) && vehicle.year > yearTo) return false;
      if (filters.maintenanceOverdue) {
        const remaining = getRemainingKm(vehicle);
        if (remaining === null || remaining > 0) return false;
      }
      return true;
    });

    return [...base].sort((a, b) => {
      if (sortBy === "plate_asc") {
        return a.plate_number.localeCompare(b.plate_number, "es", { sensitivity: "base" });
      }

      if (sortBy === "plate_desc") {
        return b.plate_number.localeCompare(a.plate_number, "es", { sensitivity: "base" });
      }

      if (sortBy === "year_desc") {
        const byYear = b.year - a.year;
        if (byYear !== 0) return byYear;
        return a.plate_number.localeCompare(b.plate_number, "es", { sensitivity: "base" });
      }

      if (sortBy === "status") {
        const byStatus = getStatusOrder(a.status) - getStatusOrder(b.status);
        if (byStatus !== 0) return byStatus;
        return a.plate_number.localeCompare(b.plate_number, "es", { sensitivity: "base" });
      }

      const aRemaining = getRemainingKm(a);
      const bRemaining = getRemainingKm(b);

      if (aRemaining === null && bRemaining === null) {
        return a.plate_number.localeCompare(b.plate_number, "es", { sensitivity: "base" });
      }
      if (aRemaining === null) return 1;
      if (bRemaining === null) return -1;

      const byRemaining = aRemaining - bRemaining;
      if (byRemaining !== 0) return byRemaining;

      return a.plate_number.localeCompare(b.plate_number, "es", { sensitivity: "base" });
    });
  }, [vehicles, filters, sortBy]);

  const getStatusDisplay = (status: string) => {
    if (status === "available") return <Badge className="bg-green-100 text-green-800">Operativa</Badge>;
    if (status === "maintenance") return <Badge className="bg-yellow-100 text-yellow-800">En Mantenimiento</Badge>;
    if (status === "out_of_service") return <Badge className="bg-red-100 text-red-800">Inactiva</Badge>;
    return <Badge className="bg-blue-100 text-blue-800">{status}</Badge>;
  };

  const resetForm = () => {
    setFormData({ ...EMPTY_FORM });
    setEditingVehicle(null);
    setModalStep("vehicle");
    setNewVehiclePlate("");
    setBaselineData({});
  };

  const handleAdd = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleEdit = (vehicle: Vehicle) => {
    setFormData({
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      plate_number: vehicle.plate_number,
      status: vehicle.status,
      current_kilometers: vehicle.current_kilometers || vehicle.kilometers || 0,
    });
    setEditingVehicle(vehicle);
    setModalStep("vehicle");
    setIsModalOpen(true);
  };

  const handleViewDetails = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setIsDetailsModalOpen(true);
  };

  const handleDelete = async (vehicle: Vehicle) => {
    if (!(await confirm({
      title: "Eliminar vehículo",
      description: `Se eliminará el vehículo ${vehicle.plate_number}. Esta acción no se puede deshacer.`,
    }))) return;
    try {
      const response = await authenticatedFetch(`${API_URL}/api/v1/vehicles/${encodeURIComponent(vehicle.plate_number)}`, {
        method: "DELETE",
      });
      if (response.ok) {
        // Eliminar del estado local directamente — sin refetch completo
        removeVehicleFromState(vehicle.plate_number);
        toast({ title: "Vehículo eliminado", description: `${vehicle.plate_number} ha sido eliminado.` });
      } else {
        const message = await parseBackendErrorMessage(
          response,
          response.status === 409
            ? "No se pudo eliminar el vehículo porque aún tiene referencias activas."
            : "No se pudo eliminar el vehículo."
        );

        toast({
          title: response.status === 409 ? "Vehículo con dependencias" : "Error al eliminar vehículo",
          description: message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting vehicle:", error);
      toast({
        title: "Error de conexión",
        description: "No se pudo conectar al servidor para eliminar el vehículo.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateKilometers = async (plateNumber: string, kilometers: number) => {
    try {
      const response = await authenticatedFetch(`${API_URL}/api/v1/vehicles/${encodeURIComponent(plateNumber)}/kilometers`, {
        method: "PUT",
        body: JSON.stringify({ kilometers }),
      });
      if (response.ok) {
        toast({ title: "Kilometraje actualizado" });
        await refreshVehicles();
      } else {
        const message = await parseBackendErrorMessage(
          response,
          "No se pudo actualizar el kilometraje del vehículo."
        );
        toast({
          title: response.status === 400 || response.status === 422 ? "Validación de kilometraje" : "Error al actualizar kilometraje",
          description: message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error updating kilometers:", error);
      toast({
        title: "Error de conexión",
        description: "No se pudo conectar al servidor para actualizar el kilometraje.",
        variant: "destructive",
      });
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(objectUrl);
  };

  const getDownloadErrorMessage = (error: unknown): string => {
    if (error instanceof ApiRequestError) {
      if (error.status === 401) return "Tu sesión venció o no es válida. Inicia sesión nuevamente.";
      if (error.status === 403) return "No tienes permisos para descargar este historial.";
      if (error.status === 404) return "No se encontró historial de mantenimiento para este vehículo.";
      return error.message || "No se pudo descargar el historial PDF.";
    }
    if (error instanceof Error && error.message === "Sesión expirada") {
      return "Tu sesión expiró. Inicia sesión nuevamente para continuar.";
    }
    return "Ocurrió un error al descargar el historial PDF.";
  };

  const handleDownloadVehicleReport = async (vehicle: Vehicle) => {
    try {
      setDownloadingPlate(vehicle.plate_number);
      const { blob, filename } = await maintenancesApi.downloadVehicleReport(vehicle.plate_number);
      downloadBlob(blob, filename);
      toast({
        title: "Descarga completada",
        description: `Se descargó el historial PDF de ${vehicle.plate_number}.`,
      });
    } catch (error) {
      console.error("Error downloading vehicle report:", error);
      toast({
        title: "Error al descargar historial",
        description: getDownloadErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setDownloadingPlate(null);
    }
  };

  /** Paso 1: guarda el vehículo. Si es nuevo, avanza al paso 2 de baseline. */
  const handleSubmitVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingVehicle) {
        const response = await authenticatedFetch(`${API_URL}/api/v1/vehicles/${encodeURIComponent(editingVehicle.plate_number)}`, {
          method: "PUT",
          body: JSON.stringify({ ...formData, kilometers: formData.current_kilometers }),
        });
        if (response.ok) {
          const vehicle = await response.json();
          toast({ title: "Vehículo actualizado", description: `${vehicle.plate_number} actualizado.` });
          setIsModalOpen(false);
          resetForm();
          updateVehicleInState(vehicle);
        }
      } else {
        const response = await authenticatedFetch(`${API_URL}/api/v1/vehicles/`, {
          method: "POST",
          body: JSON.stringify({ ...formData, kilometers: formData.current_kilometers }),
        });
        if (response.ok) {
          const vehicle = await response.json();
          updateVehicleInState(vehicle);
          toast({ title: "Vehículo registrado", description: `${vehicle.plate_number} creado. Ahora configura el baseline de mantenimiento.` });
          // Avanzar al paso 2 solo si el vehículo tiene KM > 0
          if (formData.current_kilometers > 0) {
            setNewVehiclePlate(vehicle.plate_number);
            setModalStep("baseline");
          } else {
            setIsModalOpen(false);
            resetForm();
          }
        }
      }
    } catch (error) {
      console.error("Error with vehicle operation:", error);
    }
  };

  /** Paso 2: guarda el baseline de mantenimiento. */
  const handleSubmitBaseline = async () => {
    const entries = Object.entries(baselineData).filter(([, km]) => km.trim() !== "" && !isNaN(Number(km)));
    if (entries.length === 0) {
      // El usuario omitió el paso
      setIsModalOpen(false);
      resetForm();
      return;
    }
    setIsSavingBaseline(true);
    const baselines = entries.map(([type, km]) => ({
      plate_number: newVehiclePlate,
      type,
      kilometers: Number(km),
      date: today,
    }));
    await createBaselineMaintenances(baselines);
    setIsSavingBaseline(false);
    setIsModalOpen(false);
    resetForm();
  };

  const modalTitle =
    modalStep === "baseline"
      ? "Configurar Baseline de Mantenimiento"
      : editingVehicle
      ? "Editar Vehículo"
      : "Registrar Nuevo Vehículo";

  const showPageLoader = isLoadingData && vehicles.length === 0;

  if (showPageLoader) {
    return (
      <div className="animate-fade-in space-y-4">
        <PageDataLoader
          title="Cargando vehículos y mantenimiento..."
          description="Estamos sincronizando unidades, kilometrajes y próximo M3."
          icon={<Wrench className="w-7 h-7 animate-bounce" />}
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-4">
      <VehicleFiltersComponent
        filters={filters}
        onFiltersChange={setFilters}
        onClearFilters={() => setFilters(EMPTY_VEHICLE_FILTERS)}
        statusOptions={filterOptions.status}
        brandOptions={filterOptions.brand}
      />

      <div className="bg-white rounded-lg border border-secondary-medium shadow-sm">
        <div className="flex flex-col gap-3 p-4 border-b lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-primary-900">Gestión de Vehículos</h2>
            <p className="text-sm text-secondary-dark">
              {filteredVehicles.length === vehicles.length
                ? `${vehicles.length} vehículo${vehicles.length !== 1 ? "s" : ""}`
                : `${filteredVehicles.length} de ${vehicles.length} vehículos`}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as VehicleSort)}>
              <SelectTrigger className="sm:w-72" aria-label="Ordenar por">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    Ordenar: {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleAdd} className="bg-primary hover:bg-primary-600 text-white font-medium px-4 py-2 rounded-lg shadow-sm">
              <Plus className="w-4 h-4 mr-2" />
              Registrar Nuevo Vehículo
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary-light">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-primary-900">Placa</th>
                <th className="px-4 py-3 text-left font-semibold text-primary-900">Marca</th>
                <th className="px-4 py-3 text-left font-semibold text-primary-900">Modelo</th>
                <th className="px-4 py-3 text-left font-semibold text-primary-900">Año</th>
                <th className="px-4 py-3 text-left font-semibold text-primary-900">Estado</th>
                <th className="px-4 py-3 text-left font-semibold text-primary-900">Último M3</th>
                <th className="px-4 py-3 text-left font-semibold text-primary-900">Próximo Mantenimiento</th>
                <th className="px-4 py-3 text-left font-semibold text-primary-900">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredVehicles.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-secondary-dark">
                    {vehicles.length === 0 ? "No hay vehículos registrados" : "Ningún vehículo coincide con los filtros"}
                  </td>
                </tr>
              ) : (
                filteredVehicles.map((vehicle) => (
                  <tr key={vehicle.id} className="border-b hover:bg-secondary-light transition-colors">
                    <td className="px-4 py-4 font-medium">{vehicle.plate_number}</td>
                    <td className="px-4 py-4">{vehicle.brand}</td>
                    <td className="px-4 py-4">{vehicle.model}</td>
                    <td className="px-4 py-4">{vehicle.year}</td>
                    <td className="px-4 py-4">{getStatusDisplay(vehicle.status)}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {vehicle.last_m3_date || "No registrado"}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1">
                        <Gauge className="w-4 h-4 text-gray-400" />
                        {(() => {
                          const remaining = getRemainingKm(vehicle);
                          if (remaining === null) return "No definido";
                          return remaining <= 0 ? (
                            <span className="text-red-600 font-semibold">Vencido</span>
                          ) : (
                            `${remaining.toLocaleString()} km`
                          );
                        })()}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadVehicleReport(vehicle)}
                          className="border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                          title="Descargar historial PDF"
                          disabled={downloadingPlate === vehicle.plate_number}
                        >
                          {downloadingPlate === vehicle.plate_number ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleViewDetails(vehicle)} className="border-blue-200 text-blue-600 hover:bg-blue-50" title="Ver detalles">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleEdit(vehicle)} className="border-primary-200 text-primary hover:bg-primary-50" title="Editar">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDelete(vehicle)} className="border-red-200 text-red-600 hover:bg-red-50" title="Eliminar">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── MODAL ────────────────────────────────────────────────── */}
      <FormModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); resetForm(); }} title={modalTitle}>

        {/* PASO 1 — Datos del vehículo */}
        {modalStep === "vehicle" && (
          <form onSubmit={handleSubmitVehicle} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="brand">Marca</Label>
                <Input id="brand" value={formData.brand} onChange={(e) => setFormData((p) => ({ ...p, brand: e.target.value }))} required />
              </div>
              <div>
                <Label htmlFor="model">Modelo</Label>
                <Input id="model" value={formData.model} onChange={(e) => setFormData((p) => ({ ...p, model: e.target.value }))} required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="year">Año de Fabricación</Label>
                <Input id="year" type="number" value={formData.year} onChange={(e) => setFormData((p) => ({ ...p, year: parseInt(e.target.value) }))} required />
              </div>
              <div>
                <Label htmlFor="plate_number">Número de Placa</Label>
                <Input id="plate_number" value={formData.plate_number} onChange={(e) => setFormData((p) => ({ ...p, plate_number: e.target.value }))} placeholder="ABC-123" required disabled={!!editingVehicle} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="current_kilometers">Kilometraje Actual</Label>
                <Input id="current_kilometers" type="number" value={formData.current_kilometers} onChange={(e) => setFormData((p) => ({ ...p, current_kilometers: parseInt(e.target.value) || 0 }))} placeholder="0" />
              </div>
              <div>
                <Label htmlFor="status">Estado / Sede</Label>
                <Select value={formData.status} onValueChange={(v: Vehicle["status"]) => setFormData((p) => ({ ...p, status: v }))}>
                  <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VEHICLE_FORM_STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Info hint al agregar con KM > 0 */}
            {!editingVehicle && formData.current_kilometers > 0 && (
              <div className="flex items-start gap-2 p-3 rounded-md bg-blue-50 border border-blue-200 text-blue-800 text-sm">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <p>
                  Este vehículo tiene <strong>{formData.current_kilometers.toLocaleString()} km</strong>. En el siguiente paso podrás indicar cuándo se realizó cada mantenimiento para evitar alertas falsas.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => { setIsModalOpen(false); resetForm(); }}>Cancelar</Button>
              <Button type="submit" className="bg-primary hover:bg-primary-600">
                {editingVehicle ? "Actualizar" : "Registrar y Continuar"}
              </Button>
            </div>
          </form>
        )}

        {/* PASO 2 — Baseline de mantenimiento */}
        {modalStep === "baseline" && (
          <div className="space-y-5">
            <div className="flex items-start gap-2 p-3 rounded-md bg-amber-50 border border-amber-300 text-amber-900 text-sm">
              <Wrench className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Configura el historial de mantenimiento</p>
                <p>Indica el último KM en que se realizó cada tipo de mantenimiento en <strong>{newVehiclePlate}</strong>. Deja vacío los que nunca se han realizado. Esto evita alertas falsas al ingresar la unidad.</p>
              </div>
            </div>

            <div className="space-y-3">
              {Object.entries(maintenanceTypeConfig).map(([type, config]) => (
                <div key={type} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <Label className="text-sm font-semibold">{config.label}</Label>
                    <p className="text-xs text-gray-500 truncate">{config.description}</p>
                  </div>
                  <div className="w-36 shrink-0">
                    <Input
                      type="number"
                      placeholder="KM (vacío = nunca)"
                      value={baselineData[type] ?? ""}
                      onChange={(e) =>
                        setBaselineData((prev) => ({ ...prev, [type]: e.target.value }))
                      }
                      min={0}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => { setIsModalOpen(false); resetForm(); }}
                disabled={isSavingBaseline}
              >
                Omitir
              </Button>
              <Button
                type="button"
                className="bg-primary hover:bg-primary-600"
                onClick={handleSubmitBaseline}
                disabled={isSavingBaseline}
              >
                {isSavingBaseline ? "Guardando..." : "Guardar Baseline"}
              </Button>
            </div>
          </div>
        )}
      </FormModal>

      {/* Modal de detalles */}
      <VehicleDetailsModal
        vehicle={selectedVehicle}
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        onUpdateKilometers={handleUpdateKilometers}
      />
    </div>
  );
}
