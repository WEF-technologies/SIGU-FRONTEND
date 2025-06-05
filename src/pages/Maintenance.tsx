import { useState } from "react";
import { DataTable } from "@/components/shared/DataTable";
import { FormModal } from "@/components/shared/FormModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Maintenance as MaintenanceType } from "@/types";

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
  }
];

const mockVehicles = [
  { plate_number: "ABC-123", brand: "Toyota", model: "Hiace" },
  { plate_number: "XYZ-789", brand: "Mercedes", model: "Sprinter" },
  { plate_number: "DEF-456", brand: "Chevrolet", model: "NPR" }
];

export default function Maintenance() {
  const [maintenance, setMaintenance] = useState<MaintenanceType[]>(mockMaintenance);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMaintenance, setEditingMaintenance] = useState<MaintenanceType | null>(null);
  const [formData, setFormData] = useState({
    vehicle_plate: "",
    description: "",
    type: "M1" as 'M1' | 'M2' | 'M3',
    date: "",
    kilometers: 0,
    next_maintenance_km: 0
  });

  const columns = [
    { key: 'vehicle_plate' as keyof MaintenanceType, header: 'Placa Vehículo' },
    { key: 'description' as keyof MaintenanceType, header: 'Descripción' },
    { key: 'type' as keyof MaintenanceType, header: 'Tipo' },
    { 
      key: 'date' as keyof MaintenanceType, 
      header: 'Fecha',
      render: (value: any) => new Date(value).toLocaleDateString()
    },
    { key: 'kilometers' as keyof MaintenanceType, header: 'Kilómetros' },
    { key: 'next_maintenance_km' as keyof MaintenanceType, header: 'Próximo Mant. (km)' },
    { key: 'actions' as keyof MaintenanceType, header: 'Acciones' }
  ];

  const handleAdd = () => {
    setEditingMaintenance(null);
    setFormData({
      vehicle_plate: "",
      description: "",
      type: "M1",
      date: "",
      kilometers: 0,
      next_maintenance_km: 0
    });
    setIsModalOpen(true);
  };

  const handleEdit = (maintenance: MaintenanceType) => {
    setEditingMaintenance(maintenance);
    setFormData({
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
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingMaintenance) {
      setMaintenance(prev => prev.map(m => 
        m.id === editingMaintenance.id 
          ? { ...m, ...formData, updated_at: new Date().toISOString() }
          : m
      ));
    } else {
      const newMaintenance: MaintenanceType = {
        id: Date.now().toString(),
        vehicle_id: Date.now().toString(),
        ...formData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setMaintenance(prev => [...prev, newMaintenance]);
    }
    
    setIsModalOpen(false);
  };

  return (
    <div>
      <DataTable
        data={maintenance}
        columns={columns}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        title="Gestión de Mantenimiento"
        addButtonText="Agregar Mantenimiento"
        searchField="description"
        searchPlaceholder="Buscar mantenimiento..."
      />

      <FormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingMaintenance ? "Editar Mantenimiento" : "Agregar Mantenimiento"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="vehicle_plate">Placa del Vehículo</Label>
            <Select
              value={formData.vehicle_plate}
              onValueChange={(value) => setFormData({...formData, vehicle_plate: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccione un vehículo" />
              </SelectTrigger>
              <SelectContent>
                {mockVehicles.map((vehicle) => (
                  <SelectItem key={vehicle.plate_number} value={vehicle.plate_number}>
                    {vehicle.plate_number} - {vehicle.brand} {vehicle.model}
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
              placeholder="Describa el mantenimiento realizado"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="type">Tipo de Mantenimiento</Label>
              <Select
                value={formData.type}
                onValueChange={(value: 'M1' | 'M2' | 'M3') => setFormData({...formData, type: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M1">M1 - Preventivo</SelectItem>
                  <SelectItem value="M2">M2 - Correctivo</SelectItem>
                  <SelectItem value="M3">M3 - Predictivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="date">Fecha</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit">
              {editingMaintenance ? "Actualizar Mantenimiento" : "Crear Mantenimiento"}
            </Button>
          </div>
        </form>
      </FormModal>
    </div>
  );
}
