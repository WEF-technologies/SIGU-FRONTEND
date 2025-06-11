
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { SparePart } from "@/types";

interface Vehicle {
  plate_number: string;
  brand: string;
  model: string;
}

interface SparePartFormProps {
  sparePart?: SparePart | null;
  vehicles: Vehicle[];
  onSubmit: (formData: Omit<SparePart, 'id' | 'created_at' | 'updated_at'>) => void;
  onCancel: () => void;
}

export function SparePartForm({ sparePart, vehicles, onSubmit, onCancel }: SparePartFormProps) {
  const [formData, setFormData] = useState({
    code: "",
    description: "",
    quantity: 0,
    company_location: "",
    store_location: "",
    compatible_vehicles: [] as string[],
    min_stock: 0,
    unit_price: 0
  });

  useEffect(() => {
    if (sparePart) {
      setFormData({
        code: sparePart.code || "",
        description: sparePart.description,
        quantity: sparePart.quantity,
        company_location: sparePart.company_location,
        store_location: sparePart.store_location,
        compatible_vehicles: sparePart.compatible_vehicles || [],
        min_stock: sparePart.min_stock || 0,
        unit_price: sparePart.unit_price || 0
      });
    }
  }, [sparePart]);

  const handleVehicleChange = (plateNumber: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        compatible_vehicles: [...prev.compatible_vehicles, plateNumber]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        compatible_vehicles: prev.compatible_vehicles.filter(p => p !== plateNumber)
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="code">Código del Repuesto</Label>
          <Input
            id="code"
            value={formData.code}
            onChange={(e) => setFormData({...formData, code: e.target.value})}
            placeholder="Ej: BRK-001"
            required
          />
        </div>

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
          <Label htmlFor="company_location">Ubicación en la Empresa</Label>
          <Input
            id="company_location"
            value={formData.company_location}
            onChange={(e) => setFormData({...formData, company_location: e.target.value})}
            placeholder="Ej: Bodega A - Estante 3"
            required
          />
        </div>

        <div>
          <Label htmlFor="store_location">Tienda de Compra</Label>
          <Input
            id="store_location"
            value={formData.store_location}
            onChange={(e) => setFormData({...formData, store_location: e.target.value})}
            placeholder="Ej: Repuestos García - Calle 26 #15-30"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="min_stock">Stock Mínimo</Label>
          <Input
            id="min_stock"
            type="number"
            min="0"
            value={formData.min_stock}
            onChange={(e) => setFormData({...formData, min_stock: parseInt(e.target.value) || 0})}
            placeholder="Cantidad mínima"
          />
        </div>

        <div>
          <Label htmlFor="unit_price">Precio Unitario</Label>
          <Input
            id="unit_price"
            type="number"
            min="0"
            step="0.01"
            value={formData.unit_price}
            onChange={(e) => setFormData({...formData, unit_price: parseFloat(e.target.value) || 0})}
            placeholder="Precio por unidad"
          />
        </div>
      </div>

      <div>
        <Label>Vehículos Compatibles</Label>
        <div className="grid grid-cols-2 gap-2 mt-2 max-h-40 overflow-y-auto border rounded-md p-2">
          {vehicles.map((vehicle) => (
            <div key={vehicle.plate_number} className="flex items-center space-x-2">
              <Checkbox
                id={vehicle.plate_number}
                checked={formData.compatible_vehicles.includes(vehicle.plate_number)}
                onCheckedChange={(checked) => handleVehicleChange(vehicle.plate_number, !!checked)}
              />
              <Label htmlFor={vehicle.plate_number} className="text-sm">
                {vehicle.plate_number} - {vehicle.brand} {vehicle.model}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
        >
          Cancelar
        </Button>
        <Button type="submit">
          {sparePart ? "Actualizar Repuesto" : "Crear Repuesto"}
        </Button>
      </div>
    </form>
  );
}
