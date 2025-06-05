
import { useState } from "react";
import { DataTable } from "@/components/shared/DataTable";
import { FormModal } from "@/components/shared/FormModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SparePart } from "@/types";

const mockSpareParts: SparePart[] = [
  {
    id: "1",
    vehicle_id: "1",
    description: "Filtro de aceite marca Fram",
    quantity: 5,
    location: "Bodega A - Estante 3",
    created_at: "2024-01-15",
    updated_at: "2024-01-15"
  },
  {
    id: "2",
    vehicle_id: "2",
    description: "Pastillas de freno delanteras",
    quantity: 8,
    location: "Bodega B - Estante 1",
    created_at: "2024-01-10",
    updated_at: "2024-01-20"
  }
];

export default function SpareParts() {
  const [spareParts, setSpareParts] = useState<SparePart[]>(mockSpareParts);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSparePart, setEditingSparePart] = useState<SparePart | null>(null);
  const [formData, setFormData] = useState({
    vehicle_id: "",
    description: "",
    quantity: 0,
    location: ""
  });

  const columns = [
    { key: 'vehicle_id' as keyof SparePart, header: 'ID Vehículo' },
    { key: 'description' as keyof SparePart, header: 'Descripción' },
    { key: 'quantity' as keyof SparePart, header: 'Cantidad' },
    { key: 'location' as keyof SparePart, header: 'Ubicación' },
    { key: 'actions' as keyof SparePart, header: 'Acciones' }
  ];

  const handleAdd = () => {
    setEditingSparePart(null);
    setFormData({
      vehicle_id: "",
      description: "",
      quantity: 0,
      location: ""
    });
    setIsModalOpen(true);
  };

  const handleEdit = (sparePart: SparePart) => {
    setEditingSparePart(sparePart);
    setFormData({
      vehicle_id: sparePart.vehicle_id,
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
      />

      <FormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSparePart ? "Editar Repuesto" : "Agregar Repuesto"}
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
