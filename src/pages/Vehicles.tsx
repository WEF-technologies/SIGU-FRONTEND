
import { useState, useMemo } from "react";
import { DataTable } from "@/components/shared/DataTable";
import { FormModal } from "@/components/shared/FormModal";
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
import { maintenanceTypeConfig } from "@/constants/maintenanceTypes";
import { Eye, Edit, Trash2, Calendar, Gauge, Plus, Wrench, Info } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "https://sigu-back.vercel.app";

type ModalStep = "vehicle" | "baseline";

const EMPTY_FORM = {
  brand: "",
  model: "",
  year: new Date().getFullYear(),
  plate_number: "",
  status: "available" as Vehicle["status"],
  current_maintenance_type: undefined as Vehicle["current_maintenance_type"],
  current_kilometers: 0,
  location: "",
};

/** KM del último mantenimiento por tipo, vacío = nunca realizado */
type BaselineData = Record<string, string>; // type -> km string

const today = new Date().toISOString().split("T")[0];

export default function Vehicles() {
  const { toast } = useToast();
  const authenticatedFetch = useAuthenticatedFetch();
  const { vehicles, refreshVehicles, updateVehicleInState, createBaselineMaintenances } = useMaintenance();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<ModalStep>("vehicle");
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [newVehiclePlate, setNewVehiclePlate] = useState("");
  const [baselineData, setBaselineData] = useState<BaselineData>({});
  const [isSavingBaseline, setIsSavingBaseline] = useState(false);

  const [filters, setFilters] = useState<VehicleFilters>({
    plate: "",
    brandModel: "",
    status: "",
    yearFrom: "",
    yearTo: "",
    maintenancePending: false,
  });
  const [formData, setFormData] = useState({ ...EMPTY_FORM });

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((vehicle) => {
      if (filters.plate && !vehicle.plate_number.toLowerCase().includes(filters.plate.toLowerCase())) return false;
      if (filters.brandModel) {
        const searchTerm = filters.brandModel.toLowerCase();
        if (!`${vehicle.brand} ${vehicle.model}`.toLowerCase().includes(searchTerm)) return false;
      }
      if (filters.status && filters.status !== "all" && vehicle.status !== filters.status) return false;
      if (filters.yearFrom && vehicle.year < parseInt(filters.yearFrom)) return false;
      if (filters.yearTo && vehicle.year > parseInt(filters.yearTo)) return false;
      if (filters.maintenancePending) {
        const currentKm = vehicle.current_kilometers || vehicle.kilometers || 0;
        const nextM3Km = vehicle.next_m3_kilometers;
        if (!(currentKm && nextM3Km && currentKm >= nextM3Km)) return false;
      }
      return true;
    });
  }, [vehicles, filters]);

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
      current_maintenance_type: vehicle.current_maintenance_type,
      current_kilometers: vehicle.current_kilometers || vehicle.kilometers || 0,
      location: vehicle.location || "",
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
    try {
      const response = await authenticatedFetch(`${API_URL}/api/v1/vehicles/${vehicle.plate_number}`, {
        method: "DELETE",
      });
      if (response.ok) {
        toast({ title: "Vehículo eliminado", description: `${vehicle.plate_number} ha sido eliminado.` });
        await refreshVehicles();
      }
    } catch (error) {
      console.error("Error deleting vehicle:", error);
    }
  };

  const handleUpdateKilometers = async (plateNumber: string, kilometers: number) => {
    try {
      const response = await authenticatedFetch(`${API_URL}/api/v1/vehicles/${plateNumber}/kilometers`, {
        method: "PUT",
        body: JSON.stringify({ kilometers }),
      });
      if (response.ok) {
        toast({ title: "Kilometraje actualizado" });
        await refreshVehicles();
      } else {
        toast({ title: "Error al actualizar el kilometraje.", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error updating kilometers:", error);
    }
  };

  /** Paso 1: guarda el vehículo. Si es nuevo, avanza al paso 2 de baseline. */
  const handleSubmitVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingVehicle) {
        const response = await authenticatedFetch(`${API_URL}/api/v1/vehicles/${editingVehicle.plate_number}`, {
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

  const clearFilters = () => {
    setFilters({ plate: "", brandModel: "", status: "", yearFrom: "", yearTo: "", maintenancePending: false });
  };

  const modalTitle =
    modalStep === "baseline"
      ? "Configurar Baseline de Mantenimiento"
      : editingVehicle
      ? "Editar Vehículo"
      : "Registrar Nuevo Vehículo";

  return (
    <div className="animate-fade-in space-y-4">
      <VehicleFiltersComponent filters={filters} onFiltersChange={setFilters} onClearFilters={clearFilters} />

      <div className="bg-white rounded-lg border border-secondary-medium shadow-sm">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-2xl font-bold text-primary-900">Gestión de Vehículos</h2>
          <Button onClick={handleAdd} className="bg-primary hover:bg-primary-600 text-white font-medium px-4 py-2 rounded-lg shadow-sm">
            <Plus className="w-4 h-4 mr-2" />
            Registrar Nuevo Vehículo
          </Button>
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
                  <td colSpan={8} className="text-center py-8 text-secondary-dark">No hay vehículos disponibles</td>
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
                          const currentKm = vehicle.current_kilometers || vehicle.kilometers || 0;
                          const nextM3Km = vehicle.next_m3_kilometers;
                          if (currentKm && nextM3Km) {
                            const remaining = nextM3Km - currentKm;
                            return remaining <= 0 ? (
                              <span className="text-red-600 font-semibold">Vencido</span>
                            ) : (
                              `${remaining.toLocaleString()} km`
                            );
                          }
                          return "No definido";
                        })()}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex gap-1">
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
                <Label htmlFor="location">Ubicación/Sede</Label>
                <Select value={formData.location} onValueChange={(v) => setFormData((p) => ({ ...p, location: v }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar ubicación" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Puerto Ordaz">Puerto Ordaz</SelectItem>
                    <SelectItem value="Barcelona">Barcelona</SelectItem>
                    <SelectItem value="Ciudad Piar">Ciudad Piar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="status">Estado Actual</Label>
              <Select value={formData.status} onValueChange={(v: Vehicle["status"]) => setFormData((p) => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Disponible</SelectItem>
                  <SelectItem value="maintenance">En mantenimiento</SelectItem>
                  <SelectItem value="out_of_service">Fuera de servicio</SelectItem>
                  <SelectItem value="Puerto Ordaz">Puerto Ordaz</SelectItem>
                  <SelectItem value="Barcelona">Barcelona</SelectItem>
                  <SelectItem value="Ciudad Piar">Ciudad Piar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.status === "maintenance" && (
              <div>
                <Label htmlFor="current_maintenance_type">Tipo de Mantenimiento Actual</Label>
                <Select value={formData.current_maintenance_type || ""} onValueChange={(v: Vehicle["current_maintenance_type"]) => setFormData((p) => ({ ...p, current_maintenance_type: v }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar tipo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M1">M1 - Mantenimiento Preventivo Básico</SelectItem>
                    <SelectItem value="M2">M2 - Mantenimiento Correctivo</SelectItem>
                    <SelectItem value="M3">M3 - Mantenimiento Mayor</SelectItem>
                    <SelectItem value="M4">M4 - Mantenimiento Especializado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

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
