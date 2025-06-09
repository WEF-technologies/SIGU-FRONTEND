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
import { Eye, Edit, Trash2, History, Calendar, Gauge, Plus } from "lucide-react";

export default function Vehicles() {
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState<Vehicle[]>([
    {
      id: "1",
      brand: "Toyota",
      model: "Hiace",
      year: 2020,
      plate_number: "ABC-123",
      status: "available",
      current_kilometers: 52000,
      location: "Sede Principal",
      last_m3_date: "2024-01-15",
      last_m3_km: 45000,
      next_m3_km: 55000,
      created_at: "2024-01-01",
      updated_at: "2024-01-01",
    },
    {
      id: "2",
      brand: "Mercedes",
      model: "Sprinter",
      year: 2019,
      plate_number: "XYZ-789",
      status: "maintenance",
      current_maintenance_type: "M2",
      current_kilometers: 78000,
      location: "Sede Norte",
      last_m3_date: "2023-12-10",
      last_m3_km: 70000,
      next_m3_km: 80000,
      created_at: "2024-01-01",
      updated_at: "2024-01-01",
    },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [filters, setFilters] = useState<VehicleFilters>({
    plate: "",
    brandModel: "",
    status: "",
    yearFrom: "",
    yearTo: "",
    maintenancePending: false,
  });
  const [formData, setFormData] = useState({
    brand: "",
    model: "",
    year: new Date().getFullYear(),
    plate_number: "",
    status: "available" as Vehicle['status'],
    current_maintenance_type: undefined as Vehicle['current_maintenance_type'],
    current_kilometers: 0,
    location: "",
  });

  const filteredVehicles = useMemo(() => {
    return vehicles.filter(vehicle => {
      // Filtro por placa
      if (filters.plate && !vehicle.plate_number.toLowerCase().includes(filters.plate.toLowerCase())) {
        return false;
      }
      
      // Filtro por marca/modelo
      if (filters.brandModel) {
        const searchTerm = filters.brandModel.toLowerCase();
        const brandModel = `${vehicle.brand} ${vehicle.model}`.toLowerCase();
        if (!brandModel.includes(searchTerm)) {
          return false;
        }
      }
      
      // Filtro por estado
      if (filters.status && filters.status !== "all" && vehicle.status !== filters.status) {
        return false;
      }
      
      // Filtro por año
      if (filters.yearFrom && vehicle.year < parseInt(filters.yearFrom)) {
        return false;
      }
      if (filters.yearTo && vehicle.year > parseInt(filters.yearTo)) {
        return false;
      }
      
      // Filtro por mantenimiento pendiente
      if (filters.maintenancePending) {
        const needsMaintenance = vehicle.current_kilometers && vehicle.next_m3_km && 
          vehicle.current_kilometers >= vehicle.next_m3_km;
        if (!needsMaintenance) {
          return false;
        }
      }
      
      return true;
    });
  }, [vehicles, filters]);

  const getStatusBadge = (status: Vehicle['status']) => {
    const statusConfig = {
      available: { text: 'Operativa', className: 'bg-green-100 text-green-800' },
      maintenance: { text: 'En Mantenimiento', className: 'bg-yellow-100 text-yellow-800' },
      out_of_service: { text: 'Inactiva', className: 'bg-red-100 text-red-800' }
    };
    
    const config = statusConfig[status];
    return <Badge className={config.className}>{config.text}</Badge>;
  };

  const getMaintenanceInfo = (vehicle: Vehicle) => {
    if (!vehicle.last_m3_date) return "No registrado";
    return vehicle.last_m3_date;
  };

  const getNextMaintenanceInfo = (vehicle: Vehicle) => {
    if (!vehicle.current_kilometers || !vehicle.next_m3_km) return "No definido";
    const remaining = vehicle.next_m3_km - vehicle.current_kilometers;
    if (remaining <= 0) return <span className="text-red-600 font-medium">Vencido</span>;
    return `${remaining.toLocaleString()} km`;
  };

  const resetForm = () => {
    setFormData({
      brand: "",
      model: "",
      year: new Date().getFullYear(),
      plate_number: "",
      status: "available",
      current_maintenance_type: undefined,
      current_kilometers: 0,
      location: "",
    });
    setEditingVehicle(null);
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
      current_kilometers: vehicle.current_kilometers || 0,
      location: vehicle.location || "",
    });
    setEditingVehicle(vehicle);
    setIsModalOpen(true);
  };

  const handleViewDetails = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setIsDetailsModalOpen(true);
  };

  const handleDelete = (vehicle: Vehicle) => {
    setVehicles(prev => prev.filter(v => v.id !== vehicle.id));
    toast({
      title: "Vehículo eliminado",
      description: `${vehicle.plate_number} ha sido eliminado correctamente.`,
    });
  };

  const handleUpdateKilometers = (vehicleId: string, kilometers: number) => {
    setVehicles(prev => prev.map(v => 
      v.id === vehicleId 
        ? { ...v, current_kilometers: kilometers, updated_at: new Date().toISOString() }
        : v
    ));
    // Also update selectedVehicle if it's the same vehicle
    if (selectedVehicle && selectedVehicle.id === vehicleId) {
      setSelectedVehicle(prev => prev ? { ...prev, current_kilometers: kilometers } : null);
    }
    toast({
      title: "Kilometraje actualizado",
      description: `El kilometraje ha sido actualizado correctamente.`,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingVehicle) {
      setVehicles(prev => prev.map(v => 
        v.id === editingVehicle.id 
          ? { ...v, ...formData, updated_at: new Date().toISOString() }
          : v
      ));
      toast({
        title: "Vehículo actualizado",
        description: `${formData.plate_number} ha sido actualizado correctamente.`,
      });
    } else {
      const newVehicle: Vehicle = {
        id: Date.now().toString(),
        ...formData,
        current_maintenance_type: formData.status === 'maintenance' ? formData.current_maintenance_type : undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setVehicles(prev => [...prev, newVehicle]);
      toast({
        title: "Vehículo creado",
        description: `${formData.plate_number} ha sido creado correctamente.`,
      });
    }
    
    setIsModalOpen(false);
    resetForm();
  };

  const clearFilters = () => {
    setFilters({
      plate: "",
      brandModel: "",
      status: "",
      yearFrom: "",
      yearTo: "",
      maintenancePending: false,
    });
  };

  return (
    <div className="animate-fade-in space-y-4">
      {/* Filtros */}
      
      <VehicleFiltersComponent
        filters={filters}
        onFiltersChange={setFilters}
        onClearFilters={clearFilters}
      />

      <div className="bg-white rounded-lg border border-secondary-medium shadow-sm">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-2xl font-bold text-primary-900">Gestión de Vehículos</h2>
          <Button 
            onClick={handleAdd} 
            className="bg-primary hover:bg-primary-600 text-white font-medium px-4 py-2 rounded-lg shadow-sm"
          >
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
                  <td colSpan={8} className="text-center py-8 text-secondary-dark">
                    No hay vehículos disponibles
                  </td>
                </tr>
              ) : (
                filteredVehicles.map((vehicle) => (
                  <tr key={vehicle.id} className="border-b hover:bg-secondary-light transition-colors">
                    <td className="px-4 py-4">{vehicle.plate_number}</td>
                    <td className="px-4 py-4">{vehicle.brand}</td>
                    <td className="px-4 py-4">{vehicle.model}</td>
                    <td className="px-4 py-4">{vehicle.year}</td>
                    <td className="px-4 py-4">
                      {vehicle.status === 'available' && (
                        <Badge className="bg-green-100 text-green-800">Operativa</Badge>
                      )}
                      {vehicle.status === 'maintenance' && (
                        <Badge className="bg-yellow-100 text-yellow-800">En Mantenimiento</Badge>
                      )}
                      {vehicle.status === 'out_of_service' && (
                        <Badge className="bg-red-100 text-red-800">Inactiva</Badge>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {vehicle.last_m3_date || "No registrado"}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1">
                        <Gauge className="w-4 h-4 text-gray-400" />
                        {vehicle.current_kilometers && vehicle.next_m3_km ? (
                          vehicle.next_m3_km - vehicle.current_kilometers <= 0 ? (
                            <span className="text-red-600 font-medium">Vencido</span>
                          ) : (
                            `${(vehicle.next_m3_km - vehicle.current_kilometers).toLocaleString()} km`
                          )
                        ) : (
                          "No definido"
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(vehicle)}
                          className="border-blue-200 text-blue-600 hover:bg-blue-50"
                          title="Ver detalles"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(vehicle)}
                          className="border-primary-200 text-primary hover:bg-primary-50"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(vehicle)}
                          className="border-red-200 text-red-600 hover:bg-red-50"
                          title="Eliminar"
                        >
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

      {/* Modal de formulario */}
      <FormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingVehicle ? "Editar Vehículo" : "Registrar Nuevo Vehículo"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ... keep existing code (form fields) the same until maintenance type select ... */}
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="brand">Marca</Label>
              <Input
                id="brand"
                value={formData.brand}
                onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="model">Modelo</Label>
              <Input
                id="model"
                value={formData.model}
                onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="year">Año de Fabricación</Label>
              <Input
                id="year"
                type="number"
                value={formData.year}
                onChange={(e) => setFormData(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="plate_number">Número de Placa</Label>
              <Input
                id="plate_number"
                value={formData.plate_number}
                onChange={(e) => setFormData(prev => ({ ...prev, plate_number: e.target.value }))}
                placeholder="ABC-123"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="current_kilometers">Kilometraje Actual</Label>
              <Input
                id="current_kilometers"
                type="number"
                value={formData.current_kilometers}
                onChange={(e) => setFormData(prev => ({ ...prev, current_kilometers: parseInt(e.target.value) || 0 }))}
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="location">Ubicación/Sede</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Sede Principal"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="status">Estado Actual</Label>
            <Select
              value={formData.status}
              onValueChange={(value: Vehicle['status']) => 
                setFormData(prev => ({ ...prev, status: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="available">Disponible</SelectItem>
                <SelectItem value="maintenance">En mantenimiento</SelectItem>
                <SelectItem value="out_of_service">Fuera de servicio</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.status === 'maintenance' && (
            <div>
              <Label htmlFor="current_maintenance_type">Tipo de Mantenimiento Actual</Label>
              <Select
                value={formData.current_maintenance_type || ""}
                onValueChange={(value: Vehicle['current_maintenance_type']) => 
                  setFormData(prev => ({ ...prev, current_maintenance_type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M1">M1 - Mantenimiento Preventivo Básico</SelectItem>
                  <SelectItem value="M2">M2 - Mantenimiento Correctivo</SelectItem>
                  <SelectItem value="M3">M3 - Mantenimiento Mayor</SelectItem>
                  <SelectItem value="M4">M4 - Mantenimiento Especializado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary-600">
              {editingVehicle ? "Actualizar" : "Registrar"}
            </Button>
          </div>
        </form>
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
