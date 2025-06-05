
import { useState } from "react";
import { DataTable } from "@/components/shared/DataTable";
import { FormModal } from "@/components/shared/FormModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Maintenance, MaintenanceType } from "@/types";

const mockMaintenances: Maintenance[] = [
  {
    id: "1",
    vehicle_id: "1",
    vehicle_plate: "ABC-123",
    description: "Cambio de aceite y filtros",
    type: "M3",
    date: "2024-01-15",
    kilometers: 15000,
    next_maintenance_km: 20000,
    created_at: "2024-01-15",
    updated_at: "2024-01-15"
  },
  {
    id: "2",
    vehicle_id: "2",
    vehicle_plate: "XYZ-789",
    description: "Revisión diaria - nivel de aceite",
    type: "M1",
    date: "2024-01-20",
    kilometers: 8500,
    created_at: "2024-01-20",
    updated_at: "2024-01-20"
  }
];

const mockVehicles = [
  { plate_number: "ABC-123", brand: "Toyota", model: "Hiace" },
  { plate_number: "XYZ-789", brand: "Mercedes", model: "Sprinter" },
  { plate_number: "DEF-456", brand: "Chevrolet", model: "NPR" }
];

export default function Maintenance() {
  const [maintenances, setMaintenances] = useState<Maintenance[]>(mockMaintenances);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMaintenance, setEditingMaintenance] = useState<Maintenance | null>(null);
  const [formData, setFormData] = useState({
    vehicle_plate: "",
    description: "",
    type: "M1" as MaintenanceType,
    date: "",
    kilometers: 0,
    next_maintenance_km: 0
  });

  const getMaintenanceTypeBadge = (type: MaintenanceType) => {
    const typeConfig = {
      M1: { label: "M1 - Revisión Diaria", color: "bg-green-100 text-green-800" },
      M2: { label: "M2 - Engrase/Lavado", color: "bg-yellow-100 text-yellow-800" },
      M3: { label: "M3 - Servicio Mayor", color: "bg-red-100 text-red-800" }
    };
    
    const config = typeConfig[type];
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const columns = [
    { key: 'vehicle_plate' as keyof Maintenance, header: 'Placa Vehículo' },
    { key: 'description' as keyof Maintenance, header: 'Descripción' },
    { 
      key: 'type' as keyof Maintenance, 
      header: 'Tipo',
      render: (value: MaintenanceType) => getMaintenanceTypeBadge(value)
    },
    { 
      key: 'date' as keyof Maintenance, 
      header: 'Fecha',
      render: (value: any) => new Date(value).toLocaleDateString()
    },
    { key: 'kilometers' as keyof Maintenance, header: 'Kilometraje' },
    { 
      key: 'next_maintenance_km' as keyof Maintenance, 
      header: 'Próximo Mant. (km)',
      render: (value: any) => value || 'N/A'
    },
    { key: 'actions' as keyof Maintenance, header: 'Acciones' }
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

  const handleEdit = (maintenance: Maintenance) => {
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

  const handleDelete = (maintenance: Maintenance) => {
    setMaintenances(maintenances.filter(m => m.id !== maintenance.id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingMaintenance) {
      setMaintenances(maintenances.map(m => 
        m.id === editingMaintenance.id 
          ? { ...m, ...formData, updated_at: new Date().toISOString() }
          : m
      ));
    } else {
      const newMaintenance: Maintenance = {
        id: Date.now().toString(),
        vehicle_id: Date.now().toString(), // En producción se buscaría por placa
        ...formData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setMaintenances([...maintenances, newMaintenance]);
    }
    
    setIsModalOpen(false);
  };

  return (
    <div>
      <DataTable
        data={maintenances}
        columns={columns}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        title="Gestión de Mantenimiento"
        addButtonText="Registrar Mantenimiento"
        searchField="vehicle_plate"
        searchPlaceholder="Buscar por placa..."
      />

      <FormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingMaintenance ? "Editar Mantenimiento" : "Registrar Mantenimiento"}
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
                onValueChange={(value: MaintenanceType) => setFormData({...formData, type: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M1">M1 - Revisión Diaria</SelectItem>
                  <SelectItem value="M2">M2 - Engrase/Lavado</SelectItem>
                  <SelectItem value="M3">M3 - Servicio Mayor</SelectItem>
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
              <Label htmlFor="kilometers">Kilometraje Actual</Label>
              <Input
                id="kilometers"
                type="number"
                min="0"
                value={formData.kilometers}
                onChange={(e) => setFormData({...formData, kilometers: parseInt(e.target.value) || 0})}
                placeholder="Kilometraje al momento del mantenimiento"
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
                placeholder="Kilometraje para próximo mantenimiento"
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
              {editingMaintenance ? "Actualizar Mantenimiento" : "Registrar Mantenimiento"}
            </Button>
          </div>
        </form>
      </FormModal>
    </div>
  );
}
