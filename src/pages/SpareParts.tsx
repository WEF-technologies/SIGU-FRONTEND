
import { useState } from "react";
import { DataTable } from "@/components/shared/DataTable";
import { FormModal } from "@/components/shared/FormModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SparePart } from "@/types";

const mockSpareParts: SparePart[] = [
  {
    id: "1",
    vehicle_id: "1",
    vehicle_plate: "ABC-123",
    description: "Filtro de aceite marca Fram",
    quantity: 5,
    location: "Bodega A - Estante 3",
    created_at: "2024-01-15",
    updated_at: "2024-01-15"
  },
  {
    id: "2",
    vehicle_id: "2", 
    vehicle_plate: "XYZ-789",
    description: "Pastillas de freno delanteras",
    quantity: 8,
    location: "Bodega B - Estante 1",
    created_at: "2024-01-10",
    updated_at: "2024-01-20"
  }
];

const mockVehicles = [
  { plate_number: "ABC-123", brand: "Toyota", model: "Hiace" },
  { plate_number: "XYZ-789", brand: "Mercedes", model: "Sprinter" },
  { plate_number: "DEF-456", brand: "Chevrolet", model: "NPR" }
];

export default function SpareParts() {
  const [spareParts, setSpareParts] = useState<SparePart[]>(mockSpareParts);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSparePart, setEditingSparePart] = useState<SparePart | null>(null);
  const [formData, setFormData] = useState({
    vehicle_plate: "",
    description: "",
    quantity: 0,
    location: ""
  });

  const columns = [
    { key: 'vehicle_plate' as keyof SparePart, header: 'Placa Vehículo' },
    { key: 'description' as keyof SparePart, header: 'Descripción' },
    { key: 'quantity' as keyof SparePart, header: 'Cantidad' },
    { key: 'location' as keyof SparePart, header: 'Ubicación' },
    { key: 'actions' as keyof SparePart, header: 'Acciones' }
  ];

  const handleAdd = () => {
    setEditingSparePart(null);
    setFormData({
      vehicle_plate: "",
      description: "",
      quantity: 0,
      location: ""
    });
    setIsModalOpen(true);
  };

  const handleEdit = (sparePart: SparePart) => {
    setEditingSparePart(sparePart);
    setFormData({
      vehicle_plate: sparePart.vehicle_plate || "",
      description: sparePart.description,
      quantity: sparePart.quantity,
      location: sparePart.location
    });
    setIsModalOpen(true);
  };

  const handleDelete = (sparePart: SparePart) => {
    setSpareParts(spareParts.filter(sp => sp.id !== sparePart.id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingSparePart) {
      setSpareParts(spareParts.map(sp => 
        sp.id === editingSparePart.id 
          ? { ...sp, ...formData, updated_at: new Date().toISOString() }
          : sp
      ));
    } else {
      const newSparePart: SparePart = {
        id: Date.now().toString(),
        vehicle_id: Date.now().toString(), // En producción se buscaría por placa
        ...formData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setSpareParts([...spareParts, newSparePart]);
    }
    
    setIsModalOpen(false);
  };

  return (
    <div>
      <DataTable
        data={spareParts}
        columns={columns}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        title="Gestión de Repuestos"
        addButtonText="Agregar Repuesto"
        searchField="description"
        searchPlaceholder="Buscar repuesto..."
      />

      <FormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSparePart ? "Editar Repuesto" : "Agregar Repuesto"}
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
            <Label htmlFor="description">Descripción del Repuesto</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Describa el repuesto (marca, modelo, especificaciones)"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quantity">Cantidad</Label>
              <Input
                id="quantity"
                type="number"
                min="0"
                value={formData.quantity}
                onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value) || 0})}
                placeholder="Cantidad disponible"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="location">Ubicación</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                placeholder="Bodega, estante, ubicación específica"
                required
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
              {editingSparePart ? "Actualizar Repuesto" : "Crear Repuesto"}
            </Button>
          </div>
        </form>
      </FormModal>
    </div>
  );
}
