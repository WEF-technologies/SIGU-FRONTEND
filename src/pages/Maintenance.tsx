
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
    description: "Revisión diaria - verificación de aceite y agua",
    type: "M1",
    date: "2024-01-15",
    kilometers: 15000,
    next_maintenance_km: 20000,
    created_at: "2024-01-15",
    updated_at: "2024-01-15"
  },
  {
    id: "2",
    vehicle_id: "2",
    description: "Cambio de aceite y filtros",
    type: "M3",
    date: "2024-01-10",
    kilometers: 25000,
    next_maintenance_km: 30000,
    created_at: "2024-01-10",
    updated_at: "2024-01-10"
  }
];

export default function Maintenance() {
  const [maintenances, setMaintenances] = useState<Maintenance[]>(mockMaintenances);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMaintenance, setEditingMaintenance] = useState<Maintenance | null>(null);
  const [formData, setFormData] = useState({
    vehicle_id: "",
    description: "",
    type: "M1" as MaintenanceType,
    date: "",
    kilometers: 0,
    next_maintenance_km: 0
  });

  const getMaintenanceTypeConfig = (type: MaintenanceType) => {
    switch (type) {
      case 'M1':
        return { text: 'M1 - Revisión Diaria', className: 'bg-blue-100 text-blue-800' };
      case 'M2':
        return { text: 'M2 - Engrase/Lavado', className: 'bg-yellow-100 text-yellow-800' };
      case 'M3':
        return { text: 'M3 - Servicio Completo', className: 'bg-green-100 text-green-800' };
    }
  };

  const columns = [
    { key: 'vehicle_id' as keyof Maintenance, header: 'ID Vehículo' },
    { 
      key: 'type' as keyof Maintenance, 
      header: 'Tipo',
      render: (value: MaintenanceType) => {
        const config = getMaintenanceTypeConfig(value);
        return <Badge className={config.className}>{config.text}</Badge>;
      }
    },
    { key: 'description' as keyof Maintenance, header: 'Descripción' },
    { 
      key: 'date' as keyof Maintenance, 
      header: 'Fecha',
      render: (value: any) => new Date(value).toLocaleDateString()
    },
    { key: 'kilometers' as keyof Maintenance, header: 'Kilómetros' },
    { key: 'next_maintenance_km' as keyof Maintenance, header: 'Próximo Mant. (km)' },
    { key: 'actions' as keyof Maintenance, header: 'Acciones' }
  ];

  const handleAdd = () => {
    setEditingMaintenance(null);
    setFormData({
      vehicle_id: "",
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
      vehicle_id: maintenance.vehicle_id,
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
        addButtonText="Agregar Mantenimiento"
      />

      <FormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingMaintenance ? "Editar Mantenimiento" : "Agregar Mantenimiento"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="vehicle_id">ID del Vehículo</Label>
            <Input
              id="vehicle_id"
              value={formData.vehicle_id}
              onChange={(e) => setFormData({...formData, vehicle_id: e.target.value})}
              placeholder="Ingrese el ID del vehículo"
              required
            />
          </div>

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
                <SelectItem value="M1">M1 - Revisión Diaria (aceite, agua, etc.)</SelectItem>
                <SelectItem value="M2">M2 - Engrase y Lavado</SelectItem>
                <SelectItem value="M3">M3 - Servicio Completo (cambio aceite, filtros)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="description">Descripción</Label>
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
                placeholder="Kilometraje actual"
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
              placeholder="Kilómetros para el próximo mantenimiento"
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
            <Button type="submit">
              {editingMaintenance ? "Actualizar Mantenimiento" : "Crear Mantenimiento"}
            </Button>
          </div>
        </form>
      </FormModal>
    </div>
  );
}
