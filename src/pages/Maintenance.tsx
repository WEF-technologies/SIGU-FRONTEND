
import { useState } from "react";
import { DataTable } from "@/components/shared/DataTable";
import { FormModal } from "@/components/shared/FormModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Maintenance as MaintenanceType } from "@/types";
import { useToast } from "@/hooks/use-toast";

const mockMaintenance: MaintenanceType[] = [
  {
    id: "1",
    vehicle_id: "1",
    vehicle_plate: "ABC-123",
    description: "Cambio de aceite y filtros",
    type: "M1",
    date: "2024-01-15",
    kilometers: 50000,
    next_maintenance_km: 55000,
    created_at: "2024-01-15",
    updated_at: "2024-01-15"
  },
  {
    id: "2",
    vehicle_id: "2",
    vehicle_plate: "XYZ-789",
    description: "Revisión de frenos y suspensión",
    type: "M2",
    date: "2024-01-10",
    kilometers: 75000,
    next_maintenance_km: 85000,
    created_at: "2024-01-10",
    updated_at: "2024-01-20"
  },
  {
    id: "3",
    vehicle_id: "1",
    vehicle_plate: "ABC-123",
    description: "Mantenimiento mayor completo - revisión integral",
    type: "M3",
    date: "2024-02-01",
    kilometers: 52000,
    next_maintenance_km: 62000,
    created_at: "2024-02-01",
    updated_at: "2024-02-01"
  }
];

const mockVehicles = [
  { id: "1", plate_number: "ABC-123", brand: "Toyota", model: "Hiace" },
  { id: "2", plate_number: "XYZ-789", brand: "Mercedes", model: "Sprinter" },
  { id: "3", plate_number: "DEF-456", brand: "Chevrolet", model: "NPR" }
];

const maintenanceTypeConfig = {
  M1: { label: "M1 - Preventivo Básico", color: "bg-blue-100 text-blue-800", priority: "low" },
  M2: { label: "M2 - Correctivo", color: "bg-yellow-100 text-yellow-800", priority: "medium" },
  M3: { label: "M3 - Mayor (Crítico)", color: "bg-red-100 text-red-800", priority: "high" },
  M4: { label: "M4 - Especializado", color: "bg-purple-100 text-purple-800", priority: "medium" }
};

export default function Maintenance() {
  const { toast } = useToast();
  const [maintenance, setMaintenance] = useState<MaintenanceType[]>(mockMaintenance);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMaintenance, setEditingMaintenance] = useState<MaintenanceType | null>(null);
  const [formData, setFormData] = useState({
    vehicle_id: "",
    vehicle_plate: "",
    description: "",
    type: "M1" as 'M1' | 'M2' | 'M3' | 'M4',
    date: "",
    kilometers: 0,
    next_maintenance_km: 0
  });

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
    { key: 'actions' as keyof MaintenanceType, header: 'Acciones' }
  ];

  const resetForm = () => {
    setFormData({
      vehicle_id: "",
      vehicle_plate: "",
      description: "",
      type: "M1",
      date: "",
      kilometers: 0,
      next_maintenance_km: 0
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
      next_maintenance_km: maintenance.next_maintenance_km || 0
    });
    setIsModalOpen(true);
  };

  const handleDelete = (maintenance: MaintenanceType) => {
    setMaintenance(prev => prev.filter(m => m.id !== maintenance.id));
    toast({
      title: "Mantenimiento eliminado",
      description: "El registro de mantenimiento ha sido eliminado correctamente.",
    });
  };

  const handleVehicleSelect = (vehicleId: string) => {
    const selectedVehicle = mockVehicles.find(v => v.id === vehicleId);
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
      setMaintenance(prev => prev.map(m => 
        m.id === editingMaintenance.id 
          ? { ...m, ...formData, updated_at: new Date().toISOString() }
          : m
      ));
      toast({
        title: "Mantenimiento actualizado",
        description: `El mantenimiento ${formData.type} ha sido actualizado correctamente.`,
      });
    } else {
      const newMaintenance: MaintenanceType = {
        id: Date.now().toString(),
        ...formData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setMaintenance(prev => [...prev, newMaintenance]);
      toast({
        title: "Mantenimiento registrado",
        description: `El mantenimiento ${formData.type} ha sido registrado correctamente.`,
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
        onEdit={handleEdit}
        onDelete={handleDelete}
        title="Gestión de Mantenimientos"
        addButtonText="Registrar Mantenimiento"
        searchField="description"
        searchPlaceholder="Buscar por descripción..."
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
                {mockVehicles.map((vehicle) => (
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
    </div>
  );
}
