
import { useState } from "react";
import { DataTable } from "@/components/shared/DataTable";
import { FormModal } from "@/components/shared/FormModal";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Vehicle } from "@/types";
import { useToast } from "@/hooks/use-toast";

export default function Vehicles() {
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState<Vehicle[]>([
    {
      id: "1",
      brand: "Toyota",
      model: "Hiace",
      year: 2020,
      plate_number: "ABC-123",
      status: "active",
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
      created_at: "2024-01-01",
      updated_at: "2024-01-01",
    },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [formData, setFormData] = useState({
    brand: "",
    model: "",
    year: new Date().getFullYear(),
    plate_number: "",
    status: "active" as Vehicle['status'],
  });

  const resetForm = () => {
    setFormData({
      brand: "",
      model: "",
      year: new Date().getFullYear(),
      plate_number: "",
      status: "active",
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
    });
    setEditingVehicle(vehicle);
    setIsModalOpen(true);
  };

  const handleDelete = (vehicle: Vehicle) => {
    setVehicles(prev => prev.filter(v => v.id !== vehicle.id));
    toast({
      title: "Vehículo eliminado",
      description: `${vehicle.plate_number} ha sido eliminado correctamente.`,
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

  const columns = [
    { key: 'plate_number' as keyof Vehicle, header: 'Placa' },
    { key: 'brand' as keyof Vehicle, header: 'Marca' },
    { key: 'model' as keyof Vehicle, header: 'Modelo' },
    { key: 'year' as keyof Vehicle, header: 'Año' },
    { 
      key: 'status' as keyof Vehicle, 
      header: 'Estado',
      render: (status: Vehicle['status']) => <StatusBadge status={status} />
    },
    { key: 'actions' as const, header: 'Acciones' },
  ];

  return (
    <div className="animate-fade-in">
      <DataTable
        data={vehicles}
        columns={columns}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        title="Gestión de Vehículos"
        addButtonText="Agregar Vehículo"
        searchField="plate_number"
        searchPlaceholder="Buscar por placa..."
      />

      <FormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingVehicle ? "Editar Vehículo" : "Agregar Vehículo"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
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
              <Label htmlFor="year">Año</Label>
              <Input
                id="year"
                type="number"
                value={formData.year}
                onChange={(e) => setFormData(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="plate_number">Placa</Label>
              <Input
                id="plate_number"
                value={formData.plate_number}
                onChange={(e) => setFormData(prev => ({ ...prev, plate_number: e.target.value }))}
                placeholder="ABC-123"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="status">Estado</Label>
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
                <SelectItem value="active">Activo</SelectItem>
                <SelectItem value="inactive">Inactivo</SelectItem>
                <SelectItem value="maintenance">Mantenimiento</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary-600">
              {editingVehicle ? "Actualizar" : "Crear"}
            </Button>
          </div>
        </form>
      </FormModal>
    </div>
  );
}
