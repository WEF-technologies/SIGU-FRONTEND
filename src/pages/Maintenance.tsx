import { useState, useEffect } from "react";
import { DataTable } from "@/components/shared/DataTable";
import { FormModal } from "@/components/shared/FormModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Maintenance as MaintenanceType, Vehicle } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { MaintenanceDetailsModal } from "@/components/maintenance/MaintenanceDetailsModal";
import { Eye, Edit, Trash2 } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const maintenanceTypeConfig = {
  M1: { label: "M1 - Preventivo Básico", color: "bg-blue-100 text-blue-800", priority: "low" },
  M2: { label: "M2 - Correctivo", color: "bg-yellow-100 text-yellow-800", priority: "medium" },
  M3: { label: "M3 - Mayor (Crítico)", color: "bg-red-100 text-red-800", priority: "high" },
  M4: { label: "M4 - Especializado", color: "bg-purple-100 text-purple-800", priority: "medium" }
};

export default function Maintenance() {
  const { toast } = useToast();
  const [maintenance, setMaintenance] = useState<MaintenanceType[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [editingMaintenance, setEditingMaintenance] = useState<MaintenanceType | null>(null);
  const [selectedMaintenance, setSelectedMaintenance] = useState<MaintenanceType | null>(null);
  const [formData, setFormData] = useState({
    vehicle_id: "",
    vehicle_plate: "",
    description: "",
    type: "M1" as 'M1' | 'M2' | 'M3' | 'M4',
    date: "",
    kilometers: 0,
    next_maintenance_km: 0,
    location: "",
    performed_by: ""
  });

  // Cargar mantenimientos y vehículos desde el backend
  useEffect(() => {
    fetch(`${API_URL}/api/v1/maintenance/`)
      .then(res => res.ok ? res.json() : [])
      .then(data => setMaintenance(Array.isArray(data) ? data : []));
    fetch(`${API_URL}/api/v1/vehicles/`)
      .then(res => res.ok ? res.json() : [])
      .then(data => setVehicles(Array.isArray(data) ? data : []));
  }, []);

  const columns = [
    { key: 'vehicle_plate' as keyof MaintenanceType, header: 'Placa Vehículo' },
    { 
      key: 'type' as keyof MaintenanceType, 
      header: 'Tipo',
      render: (value: MaintenanceType['type']) => {
        const config = maintenanceTypeConfig[value];
        return <Badge className={config.color}>{value}</Badge>;
      }
    },
    { key: 'description' as keyof MaintenanceType, header: 'Descripción' },
    { 
      key: 'date' as keyof MaintenanceType, 
      header: 'Fecha',
      render: (value: any) => new Date(value).toLocaleDateString()
    },
    { 
      key: 'kilometers' as keyof MaintenanceType, 
      header: 'Kilómetros',
      render: (value: any) => value ? value.toLocaleString() + ' km' : 'N/A'
    },
    { 
      key: 'next_maintenance_km' as keyof MaintenanceType, 
      header: 'Próximo Mant. (km)',
      render: (value: any) => value ? value.toLocaleString() + ' km' : 'N/A'
    },
    { 
      key: 'actions' as keyof MaintenanceType, 
      header: 'Acciones',
      render: (value: any, row: MaintenanceType) => (
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleViewDetails(row)}
            className="h-8 w-8 p-0"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleEdit(row)}
            className="h-8 w-8 p-0"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleDelete(row)}
            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];

  const resetForm = () => {
    setFormData({
      vehicle_id: "",
      vehicle_plate: "",
      description: "",
      type: "M1",
      date: "",
      kilometers: 0,
      next_maintenance_km: 0,
      location: "",
      performed_by: ""
    });
    setEditingMaintenance(null);
  };

  const handleAdd = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleEdit = (maintenance: MaintenanceType) => {
    setEditingMaintenance(maintenance);
    setFormData({
      vehicle_id: maintenance.vehicle_id,
      vehicle_plate: maintenance.vehicle_plate || "",
      description: maintenance.description,
      type: maintenance.type,
      date: maintenance.date,
      kilometers: maintenance.kilometers || 0,
      next_maintenance_km: maintenance.next_maintenance_km || 0,
      location: maintenance.location || "",
      performed_by: maintenance.performed_by || ""
    });
    setIsModalOpen(true);
  };

  const handleViewDetails = (maintenance: MaintenanceType) => {
    setSelectedMaintenance(maintenance);
    setIsDetailsModalOpen(true);
  };

  const handleDelete = (maintenance: MaintenanceType) => {
    fetch(`${API_URL}/api/v1/maintenance/${maintenance.id}`, {
      method: "DELETE",
    }).then(() => {
      setMaintenance(prev => prev.filter(m => m.id !== maintenance.id));
      toast({
        title: "Mantenimiento eliminado",
        description: "El registro de mantenimiento ha sido eliminado correctamente.",
      });
    });
  };

  const handleVehicleSelect = (vehicleId: string) => {
    const selectedVehicle = vehicles.find(v => v.id === vehicleId);
    if (selectedVehicle) {
      setFormData(prev => ({
        ...prev,
        vehicle_id: vehicleId,
        vehicle_plate: selectedVehicle.plate_number
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.vehicle_id) {
      toast({
        title: "Error",
        description: "Debe seleccionar un vehículo.",
        variant: "destructive"
      });
      return;
    }

    if (editingMaintenance) {
      // PUT
      fetch(`${API_URL}/api/v1/maintenance/${editingMaintenance.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
        .then(res => res.json())
        .then(updated => {
          setMaintenance(prev => prev.map(m => m.id === editingMaintenance.id ? updated : m));
          toast({
            title: "Mantenimiento actualizado",
            description: `El mantenimiento ${formData.type} ha sido actualizado correctamente.`,
          });
        });
    } else {
      // POST
      fetch(`${API_URL}/api/v1/maintenance/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
        .then(res => res.json())
        .then(newMaintenance => {
          setMaintenance(prev => [...prev, newMaintenance]);
          toast({
            title: "Mantenimiento registrado",
            description: `El mantenimiento ${formData.type} ha sido registrado correctamente.`,
          });
        });
    }

    setIsModalOpen(false);
    resetForm();
  };

  return (
    <div className="animate-fade-in">
      <DataTable
        data={maintenance}
        columns={columns}
        onAdd={handleAdd}
        title="Gestión de Mantenimientos"
        addButtonText="Registrar Mantenimiento"
        searchField="vehicle_plate"
        searchPlaceholder="Buscar por placa del vehículo..."
      />

      <FormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingMaintenance ? "Editar Mantenimiento" : "Registrar Mantenimiento"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="vehicle">Vehículo</Label>
            <Select
              value={formData.vehicle_id}
              onValueChange={handleVehicleSelect}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccione un vehículo" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map((vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.plate_number} - {vehicle.brand} {vehicle.model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="type">Tipo de Mantenimiento</Label>
            <Select
              value={formData.type}
              onValueChange={(value: 'M1' | 'M2' | 'M3' | 'M4') => setFormData({...formData, type: value})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(maintenanceTypeConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <Badge className={config.color} variant="outline">{key}</Badge>
                      <span>{config.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="description">Descripción del Mantenimiento</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Describa detalladamente el mantenimiento realizado"
              required
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date">Fecha de Mantenimiento</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="kilometers">Kilómetros Actuales</Label>
              <Input
                id="kilometers"
                type="number"
                min="0"
                value={formData.kilometers}
                onChange={(e) => setFormData({...formData, kilometers: parseInt(e.target.value) || 0})}
                placeholder="Kilómetros del vehículo"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="next_maintenance_km">Próximo Mantenimiento (km)</Label>
            <Input
              id="next_maintenance_km"
              type="number"
              min="0"
              value={formData.next_maintenance_km}
              onChange={(e) => setFormData({...formData, next_maintenance_km: parseInt(e.target.value) || 0})}
              placeholder="Kilómetros para próximo mantenimiento"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="location">Lugar de Realización</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                placeholder="Taller, concesionario, etc."
              />
            </div>

            <div>
              <Label htmlFor="performed_by">Realizado por</Label>
              <Input
                id="performed_by"
                value={formData.performed_by}
                onChange={(e) => setFormData({...formData, performed_by: e.target.value})}
                placeholder="Nombre del técnico o responsable"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary-600">
              {editingMaintenance ? "Actualizar Mantenimiento" : "Registrar Mantenimiento"}
            </Button>
          </div>
        </form>
      </FormModal>

      <MaintenanceDetailsModal
        maintenance={selectedMaintenance}
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
      />
    </div>
  );
}