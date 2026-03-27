
import { useState, useEffect, useMemo } from "react";
import { FormModal } from "@/components/shared/FormModal";
import { SparePartForm } from "@/components/spareparts/SparePartForm";
import { SparePartDetailsModal } from "@/components/spareparts/SparePartDetailsModal";
import { SparePartRequestForm } from "@/components/spareparts/SparePartRequestForm";
import { SparePart, Vehicle } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useAuthenticatedFetch } from "@/hooks/useAuthenticatedFetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus, ShoppingCart, Search, Package, Car, MapPin,
  Eye, Pencil, Trash2, AlertTriangle, Layers, ChevronDown, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API_URL = import.meta.env.VITE_API_URL || "https://sigu-back.vercel.app";

// ─── Tarjeta de repuesto en vista "Por Repuesto" ──────────────────────────────
function SparePartCard({
  part,
  vehicleMap,
  onView,
  onEdit,
  onDelete,
}: {
  part: SparePart;
  vehicleMap: Map<string, Vehicle>;
  onView: (p: SparePart) => void;
  onEdit: (p: SparePart) => void;
  onDelete: (p: SparePart) => void;
}) {
  const isLowStock = part.min_stock != null && part.quantity <= part.min_stock;
  const vehicles = (part.compatible_vehicles ?? [])
    .map(plate => vehicleMap.get(plate))
    .filter(Boolean) as Vehicle[];

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="text-xs font-mono text-primary font-semibold bg-primary/8 px-2 py-0.5 rounded">
            {part.code}
          </span>
          <p className="mt-1.5 font-semibold text-gray-800 text-sm leading-snug">{part.description}</p>
        </div>
        <div className="flex flex-col items-end shrink-0 gap-1">
          <span className={cn(
            "text-sm font-bold",
            part.quantity === 0 ? "text-gray-400" : isLowStock ? "text-amber-600" : "text-green-600"
          )}>
            {part.quantity} uds
          </span>
          {isLowStock && (
            <span className="flex items-center gap-0.5 text-xs text-amber-600">
              <AlertTriangle className="h-3 w-3" /> Stock bajo
            </span>
          )}
        </div>
      </div>

      {/* Metadata */}
      <div className="flex items-center gap-3 text-xs text-gray-500">
        {part.company_location && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" /> {part.company_location}
          </span>
        )}
        {part.unit_price ? (
          <span className="ml-auto font-semibold text-gray-700">${part.unit_price.toLocaleString()}</span>
        ) : (
          <span className="ml-auto text-gray-300">Sin precio</span>
        )}
      </div>

      {/* Vehículos */}
      {vehicles.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {vehicles.map(v => (
            <span
              key={v.plate_number}
              className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-md px-2 py-0.5"
            >
              <Car className="h-3 w-3 shrink-0" />
              <span className="font-medium">{v.plate_number}</span>
              <span className="text-blue-400">·</span>
              <span className="text-blue-500">{v.brand} {v.model}</span>
            </span>
          ))}
          {(part.compatible_vehicles ?? []).filter(p => !vehicleMap.has(p)).map(p => (
            <span key={p} className="text-xs bg-gray-50 text-gray-500 border border-gray-200 rounded-md px-2 py-0.5">{p}</span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-400 italic">Sin vehículos asignados</p>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-1 pt-1 border-t border-gray-100">
        <button onClick={() => onView(part)} className="p-1.5 rounded hover:bg-blue-50 text-blue-500" title="Ver detalles">
          <Eye className="h-4 w-4" />
        </button>
        <button onClick={() => onEdit(part)} className="p-1.5 rounded hover:bg-amber-50 text-amber-500" title="Editar">
          <Pencil className="h-4 w-4" />
        </button>
        <button onClick={() => onDelete(part)} className="p-1.5 rounded hover:bg-red-50 text-red-500" title="Eliminar">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Tarjeta de vehículo en vista "Por Vehículo" ─────────────────────────────
function VehiclePartsCard({
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
  const [open, setOpen] = useState(true);
  const lowStock = parts.filter(p => p.min_stock != null && p.quantity <= p.min_stock).length;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <button
        className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-3 min-w-0">
          {open ? <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" /> : <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />}
          <Car className="h-5 w-5 text-primary shrink-0" />
          <div className="min-w-0">
            <span className="font-bold text-gray-800">{vehicle.plate_number}</span>
            <span className="ml-2 text-sm text-gray-500">{vehicle.brand} {vehicle.model} · {vehicle.year}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {lowStock > 0 && (
            <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
              <AlertTriangle className="h-3 w-3" /> {lowStock} bajo stock
            </span>
          )}
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {parts.length} repuesto{parts.length !== 1 ? "s" : ""}
          </span>
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-100 divide-y divide-gray-50">
          {parts.map(part => {
            const isLowStock = part.min_stock != null && part.quantity <= part.min_stock;
            return (
              <div key={part.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 group">
                <Package className="h-4 w-4 text-gray-300 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-mono text-primary font-semibold shrink-0">{part.code}</span>
                    <span className="text-sm text-gray-700 truncate">{part.description}</span>
                  </div>
                  {part.company_location && (
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />{part.company_location}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={cn(
                    "text-sm font-semibold",
                    part.quantity === 0 ? "text-gray-400" : isLowStock ? "text-amber-600" : "text-green-600"
                  )}>
                    {part.quantity} uds
                  </span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onView(part)} className="p-1 rounded hover:bg-blue-50 text-blue-500">
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => onEdit(part)} className="p-1 rounded hover:bg-amber-50 text-amber-500">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function SpareParts() {
  const { toast } = useToast();
  const authenticatedFetch = useAuthenticatedFetch();
  const [spareParts, setSpareParts] = useState<SparePart[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [editingSparePart, setEditingSparePart] = useState<SparePart | null>(null);
  const [viewingSparePart, setViewingSparePart] = useState<SparePart | null>(null);
  const [view, setView] = useState<'parts' | 'vehicles'>('parts');
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [spRes, vRes] = await Promise.all([
          authenticatedFetch(`${API_URL}/api/v1/spare_parts/`),
          authenticatedFetch(`${API_URL}/api/v1/vehicles/`),
        ]);
        setSpareParts(spRes.ok ? await spRes.json() : []);
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
    const q = search.trim().toLowerCase();
    if (!q) return spareParts;
    return spareParts.filter(p =>
      p.code.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      (p.compatible_vehicles ?? []).some(plate => {
        const v = vehicleMap.get(plate);
        return plate.toLowerCase().includes(q) ||
          (v && `${v.brand} ${v.model}`.toLowerCase().includes(q));
      })
    );
  }, [spareParts, search, vehicleMap]);

  const vehicleGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    return vehicles
      .map(v => ({
        vehicle: v,
        parts: spareParts.filter(p => (p.compatible_vehicles ?? []).includes(v.plate_number)),
      }))
      .filter(g => {
        if (g.parts.length === 0) return false;
        if (!q) return true;
        return (
          g.vehicle.plate_number.toLowerCase().includes(q) ||
          `${g.vehicle.brand} ${g.vehicle.model}`.toLowerCase().includes(q) ||
          g.parts.some(p => p.code.toLowerCase().includes(q) || p.description.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => a.vehicle.plate_number.localeCompare(b.vehicle.plate_number));
  }, [vehicles, spareParts, search]);

  // ── CRUD handlers ──
  const handleAdd = () => { setEditingSparePart(null); setIsModalOpen(true); };
  const handleEdit = (sp: SparePart) => { setEditingSparePart(sp); setIsModalOpen(true); };
  const handleViewDetails = (sp: SparePart) => { setViewingSparePart(sp); setIsDetailsModalOpen(true); };

  const handleDelete = async (sp: SparePart) => {
    try {
      const res = await authenticatedFetch(`${API_URL}/api/v1/spare_parts/${sp.id}`, { method: "DELETE" });
      if (res.ok) {
        setSpareParts(prev => prev.filter(p => p.id !== sp.id));
        toast({ title: "Repuesto eliminado", description: `${sp.code} - ${sp.description} eliminado.` });
      }
    } catch {
      toast({ title: "Error", description: "Error al eliminar el repuesto.", variant: "destructive" });
    }
  };

  const handleSubmit = async (formData: Omit<SparePart, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      if (editingSparePart) {
        const res = await authenticatedFetch(`${API_URL}/api/v1/spare_parts/${editingSparePart.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (res.ok) {
          const updated = await res.json();
          setSpareParts(prev => prev.map(sp => sp.id === editingSparePart.id ? updated : sp));
          toast({ title: "Repuesto actualizado", description: `${formData.code} actualizado correctamente.` });
        }
      } else {
        const res = await authenticatedFetch(`${API_URL}/api/v1/spare_parts/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (res.ok) {
          const created = await res.json();
          setSpareParts(prev => [...prev, created]);
          toast({ title: "Repuesto creado", description: `${formData.code} creado correctamente.` });
        }
      }
    } catch {
      toast({ title: "Error", description: "Error al procesar la operación.", variant: "destructive" });
    }
    setIsModalOpen(false);
  };

  const handleSparePartRequest = async (requestData: {
    code: string; description: string; requestedBy: string; date: string; notes?: string;
  }) => {
    try {
      const res = await authenticatedFetch(`${API_URL}/api/v1/spare_part_requests/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: requestData.code,
          description: requestData.description,
          requested_by: requestData.requestedBy,
          date: requestData.date,
          notes: requestData.notes || null,
        }),
      });
      if (res.ok) {
        toast({ title: "Solicitud enviada", description: `Solicitud de ${requestData.code} enviada.` });
        setIsRequestModalOpen(false);
      } else {
        throw new Error();
      }
    } catch {
      toast({ title: "Error", description: "Error al enviar la solicitud.", variant: "destructive" });
    }
  };

  const lowStockCount = spareParts.filter(p => p.min_stock != null && p.quantity <= p.min_stock).length;

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary-900">Gestión de Repuestos</h1>
          <p className="text-gray-500 mt-0.5 text-sm">
            {spareParts.length} repuesto{spareParts.length !== 1 ? "s" : ""} registrados
            {lowStockCount > 0 && (
              <span className="ml-2 text-amber-600 font-medium">
                · {lowStockCount} con stock bajo
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsRequestModalOpen(true)} variant="outline"
            className="border-blue-200 text-blue-700 hover:bg-blue-50 gap-2">
            <ShoppingCart className="h-4 w-4" /> Solicitar
          </Button>
          <Button onClick={handleAdd} className="bg-primary hover:bg-primary/90 text-white gap-2">
            <Plus className="h-4 w-4" /> Agregar Repuesto
          </Button>
        </div>
      </div>

      {/* ── Controles: búsqueda + toggle de vista ── */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por código, descripción o vehículo..."
            className="pl-9"
          />
        </div>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden shrink-0">
          <button
            onClick={() => setView('parts')}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors",
              view === 'parts' ? "bg-primary text-white" : "bg-white text-gray-600 hover:bg-gray-50"
            )}
          >
            <Package className="h-4 w-4" /> Por Repuesto
          </button>
          <button
            onClick={() => setView('vehicles')}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors border-l border-gray-200",
              view === 'vehicles' ? "bg-primary text-white" : "bg-white text-gray-600 hover:bg-gray-50"
            )}
          >
            <Car className="h-4 w-4" /> Por Vehículo
          </button>
        </div>
      </div>

      {/* ── Vista por Repuesto ── */}
      {view === 'parts' && (
        <>
          {filteredParts.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Layers className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No se encontraron repuestos</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredParts.map(part => (
                <SparePartCard
                  key={part.id}
                  part={part}
                  vehicleMap={vehicleMap}
                  onView={handleViewDetails}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Vista por Vehículo ── */}
      {view === 'vehicles' && (
        <>
          {vehicleGroups.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Car className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Ningún vehículo tiene repuestos asignados</p>
            </div>
          ) : (
            <div className="space-y-3">
              {vehicleGroups.map(({ vehicle, parts }) => (
                <VehiclePartsCard
                  key={vehicle.id}
                  vehicle={vehicle}
                  parts={parts}
                  onView={handleViewDetails}
                  onEdit={handleEdit}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Modals ── */}
      <FormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}
        title={editingSparePart ? "Editar Repuesto" : "Agregar Repuesto"}>
        <SparePartForm
          sparePart={editingSparePart}
          vehicles={vehicles}
          onSubmit={handleSubmit}
          onCancel={() => setIsModalOpen(false)}
        />
      </FormModal>

      <FormModal isOpen={isRequestModalOpen} onClose={() => setIsRequestModalOpen(false)} title="Solicitar Repuesto">
        <SparePartRequestForm onSubmit={handleSparePartRequest} onCancel={() => setIsRequestModalOpen(false)} />
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
