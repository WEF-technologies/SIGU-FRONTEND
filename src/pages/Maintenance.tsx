import { useState, useMemo } from "react";
import { Maintenance as MaintenanceType, Vehicle } from "@/types";
import { MaintenanceFormModal } from "@/components/maintenance/MaintenanceFormModal";
import { MaintenanceDetailsModal } from "@/components/maintenance/MaintenanceDetailsModal";
import { MaintenanceAlerts } from "@/components/maintenance/MaintenanceAlerts";
import { useMaintenance } from "@/hooks/useMaintenance";
import { maintenanceTypeConfig } from "@/constants/maintenanceTypes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Car, Search, Plus, ChevronDown, ChevronRight,
  Edit, Trash2, Eye, MapPin, User, Wrench,
  Calendar, Gauge, Package, AlertTriangle, CheckCircle,
} from "lucide-react";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es-VE", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function M3StatusPill({ vehicle }: { vehicle?: Vehicle }) {
  if (!vehicle) return null;
  const effectiveKm = Math.max(
    vehicle.current_kilometers || (vehicle as any).kilometers || 0,
    vehicle.last_m3_kilometers || 0
  );
  const nextM3Km = vehicle.next_m3_kilometers;
  if (!effectiveKm || !nextM3Km) return null;
  const remaining = nextM3Km - effectiveKm;
  if (remaining <= 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-100 border border-red-200 px-2 py-0.5 rounded-full">
        <AlertTriangle className="w-3 h-3" />
        M3 Vencido
      </span>
    );
  }
  if (remaining <= 1050) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full">
        <AlertTriangle className="w-3 h-3" />
        M3 en {remaining.toLocaleString()} km
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 border border-green-200 px-2 py-0.5 rounded-full">
      <CheckCircle className="w-3 h-3" />
      M3 en {remaining.toLocaleString()} km
    </span>
  );
}

// ─── Tarjeta de un registro de mantenimiento ────────────────────────────────

interface MaintenanceRowProps {
  m: MaintenanceType;
  isLast: boolean;
  onEdit: (m: MaintenanceType) => void;
  onDelete: (m: MaintenanceType) => void;
  onView: (m: MaintenanceType) => void;
}

function MaintenanceRow({ m, isLast, onEdit, onDelete, onView }: MaintenanceRowProps) {
  const typeConfig = maintenanceTypeConfig[m.type as keyof typeof maintenanceTypeConfig];
  const typeColor = typeConfig?.color ?? "text-gray-500 border-gray-400";
  const typeLabel = typeConfig?.label?.split("(")[0]?.trim() ?? m.type?.toUpperCase() ?? "—";
  return (
    <div className={`flex gap-4 ${!isLast ? "pb-4 border-b border-gray-100" : ""}`}>
      {/* Timeline indicator */}
      <div className="flex flex-col items-center shrink-0 pt-1">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 text-xs font-bold ${typeColor.replace("text-", "border-").split(" ")[0]} bg-white`}>
          <span className={typeColor.split(" ")[0]}>{m.type?.toUpperCase() ?? "?"}</span>
        </div>
        {!isLast && <div className="w-0.5 flex-1 bg-gray-200 mt-1" />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-1">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={`text-xs font-semibold ${typeColor}`}>
              {typeLabel}
            </Badge>
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> {formatDate(m.date)}
            </span>
            {m.kilometers != null && (
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Gauge className="w-3 h-3" /> {m.kilometers.toLocaleString()} km
              </span>
            )}
          </div>
          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <Button
              size="sm" variant="ghost"
              className="h-7 w-7 p-0 text-gray-400 hover:text-blue-600"
              onClick={() => onView(m)} title="Ver detalles"
            >
              <Eye className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="sm" variant="ghost"
              className="h-7 w-7 p-0 text-gray-400 hover:text-primary"
              onClick={() => onEdit(m)} title="Editar"
            >
              <Edit className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="sm" variant="ghost"
              className="h-7 w-7 p-0 text-gray-400 hover:text-red-600"
              onClick={() => onDelete(m)} title="Eliminar"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Description */}
        {m.description && (
          <p className="text-sm text-gray-700 mt-1.5 leading-relaxed">{m.description}</p>
        )}

        {/* Metadata chips */}
        <div className="flex flex-wrap gap-2 mt-2">
          {m.location && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              <MapPin className="w-3 h-3" /> {m.location}
            </span>
          )}
          {m.performed_by && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              <User className="w-3 h-3" /> {m.performed_by}
            </span>
          )}
          {m.spare_part_description && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
              <Package className="w-3 h-3" /> {m.spare_part_description}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Tarjeta de un vehículo con su historial ────────────────────────────────

interface VehicleCardProps {
  plate: string;
  vehicle?: Vehicle;
  maintenances: MaintenanceType[];
  defaultOpen: boolean;
  onAdd: (plate: string) => void;
  onEdit: (m: MaintenanceType) => void;
  onDelete: (m: MaintenanceType) => void;
  onView: (m: MaintenanceType) => void;
}

function VehicleCard({
  plate, vehicle, maintenances, defaultOpen,
  onAdd, onEdit, onDelete, onView,
}: VehicleCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  const latest = maintenances[0];
  const currentKm = Math.max(
    vehicle?.current_kilometers || (vehicle as any)?.kilometers || 0,
    vehicle?.last_m3_kilometers || 0
  );

  return (
    <Card className="overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      {/* ── Vehicle header ──────────────────────────────────────────── */}
      <button
        className="w-full flex items-center justify-between gap-3 px-4 py-3.5 bg-white hover:bg-gray-50 transition-colors text-left"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Car className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-base text-primary-900">{plate}</span>
              {vehicle && (
                <span className="text-sm text-gray-500">
                  {vehicle.brand} {vehicle.model} · {vehicle.year}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <M3StatusPill vehicle={vehicle} />
              {currentKm > 0 && (
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Gauge className="w-3 h-3" /> {currentKm.toLocaleString()} km
                </span>
              )}
              {latest && (
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Último: {formatDate(latest.date)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full hidden sm:inline">
            {maintenances.length} registro{maintenances.length !== 1 ? "s" : ""}
          </span>
          {open ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      {/* ── Maintenance timeline ──────────────────────────────────────── */}
      {open && (
        <div className="border-t border-gray-100">
          {/* Add button row */}
          <div className="flex justify-end px-4 pt-3 pb-1">
            <Button
              size="sm"
              className="bg-primary hover:bg-primary/90 text-white text-xs h-7 px-3 gap-1.5"
              onClick={(e) => { e.stopPropagation(); onAdd(plate); }}
            >
              <Plus className="w-3.5 h-3.5" />
              Registrar mantenimiento
            </Button>
          </div>

          {maintenances.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              <Wrench className="w-8 h-8 mx-auto mb-2 opacity-30" />
              Sin registros de mantenimiento
            </div>
          ) : (
            <div className="px-4 pb-4 pt-2 space-y-0">
              {maintenances.map((m, i) => (
                <MaintenanceRow
                  key={m.id}
                  m={m}
                  isLast={i === maintenances.length - 1}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onView={onView}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ─── Página principal ────────────────────────────────────────────────────────

export default function Maintenance() {
  const {
    maintenance, vehicles, alerts,
    createMaintenance, updateMaintenance, deleteMaintenance, dismissAlert,
  } = useMaintenance();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [editingMaintenance, setEditingMaintenance] = useState<MaintenanceType | null>(null);
  const [selectedMaintenance, setSelectedMaintenance] = useState<MaintenanceType | null>(null);
  const [searchPlate, setSearchPlate] = useState("");
  // Pre-fill plate when adding from within a vehicle card
  const [prefilledPlate, setPrefilledPlate] = useState<string>("");

  // ── Group maintenances by vehicle plate, sorted newest first ──────────────
  const grouped = useMemo(() => {
    const map = new Map<string, MaintenanceType[]>();
    for (const m of maintenance) {
      const plate = m.vehicle_plate ?? "Sin placa";
      const list = map.get(plate) ?? [];
      list.push(m);
      map.set(plate, list);
    }
    // Sort records within each group newest → oldest
    for (const [, list] of map) {
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    // Sort groups: most recent maintenance first, then alphabetically
    return Array.from(map.entries()).sort(([, a], [, b]) => {
      const dateA = new Date(a[0]?.date ?? 0).getTime();
      const dateB = new Date(b[0]?.date ?? 0).getTime();
      return dateB - dateA;
    });
  }, [maintenance]);

  // ── Filter by search ──────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!searchPlate.trim()) return grouped;
    const term = searchPlate.trim().toLowerCase();
    return grouped.filter(([plate]) => plate.toLowerCase().includes(term));
  }, [grouped, searchPlate]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleAdd = () => {
    setEditingMaintenance(null);
    setPrefilledPlate("");
    setIsModalOpen(true);
  };

  const handleAddForVehicle = (plate: string) => {
    setEditingMaintenance(null);
    setPrefilledPlate(plate);
    setIsModalOpen(true);
  };

  const handleEdit = (m: MaintenanceType) => {
    setEditingMaintenance(m);
    setPrefilledPlate("");
    setIsModalOpen(true);
  };

  const handleView = (m: MaintenanceType) => {
    setSelectedMaintenance(m);
    setIsDetailsModalOpen(true);
  };

  const handleDelete = async (m: MaintenanceType) => {
    await deleteMaintenance(m);
  };

  const handleSubmit = async (formData: any) => {
    if (editingMaintenance) {
      return await updateMaintenance(editingMaintenance.id, formData);
    }
    return await createMaintenance(formData);
  };

  // Build a synthetic editing object with prefilled plate for new registrations
  const modalEditing = editingMaintenance
    ? editingMaintenance
    : prefilledPlate
    ? ({ vehicle_plate: prefilledPlate } as unknown as MaintenanceType)
    : null;

  return (
    <div className="animate-fade-in space-y-4">
      {/* ── Alerts ───────────────────────────────────────────────────── */}
      <MaintenanceAlerts alerts={alerts} onDismiss={dismissAlert} />

      {/* ── Header bar ───────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-primary-900">Gestión de Mantenimientos</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {grouped.length} vehículo{grouped.length !== 1 ? "s" : ""} ·{" "}
            {maintenance.length} registro{maintenance.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <Input
              placeholder="Buscar por placa..."
              value={searchPlate}
              onChange={(e) => setSearchPlate(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Button onClick={handleAdd} className="bg-primary hover:bg-primary/90 text-white h-9 px-4 shrink-0">
            <Plus className="w-4 h-4 mr-1.5" />
            Registrar
          </Button>
        </div>
      </div>

      {/* ── Vehicle cards ──────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <Card className="py-16 text-center text-gray-400 border-dashed">
          <Wrench className="w-12 h-12 mx-auto mb-3 opacity-25" />
          <p className="font-medium">
            {searchPlate ? `No se encontraron registros para "${searchPlate}"` : "No hay mantenimientos registrados"}
          </p>
          {!searchPlate && (
            <Button onClick={handleAdd} variant="outline" className="mt-4 text-primary border-primary hover:bg-primary/5">
              <Plus className="w-4 h-4 mr-1.5" />
              Registrar primer mantenimiento
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(([plate, records]) => (
            <VehicleCard
              key={plate}
              plate={plate}
              vehicle={vehicles.find((v) => v.plate_number === plate)}
              maintenances={records}
              defaultOpen={filtered.length === 1 || !!searchPlate}
              onAdd={handleAddForVehicle}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onView={handleView}
            />
          ))}
        </div>
      )}

      {/* ── Modals ───────────────────────────────────────────────────── */}
      <MaintenanceFormModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setPrefilledPlate(""); }}
        editingMaintenance={modalEditing}
        vehicles={vehicles}
        onSubmit={handleSubmit}
      />

      <MaintenanceDetailsModal
        maintenance={selectedMaintenance}
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
      />
    </div>
  );
}
