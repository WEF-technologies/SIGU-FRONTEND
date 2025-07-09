
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SparePart, Vehicle } from "@/types";
import { VehicleSelector } from "./VehicleSelector";

interface SparePartFormProps {
  sparePart?: SparePart | null;
  vehicles: Vehicle[];
  onSubmit: (sparePart: Omit<SparePart, 'id' | 'created_at' | 'updated_at'>) => void;
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
    unit_price: 0,
  });

  useEffect(() => {
    if (sparePart) {
      setFormData({
        code: sparePart.code,
        description: sparePart.description,
        quantity: sparePart.quantity,
        company_location: sparePart.company_location || "",
        store_location: sparePart.store_location || "",
        compatible_vehicles: sparePart.compatible_vehicles || [],
        unit_price: sparePart.unit_price || 0,
      });
    }
  }, [sparePart]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="code">Código</Label>
          <Input
            id="code"
            value={formData.code}
            onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="quantity">Cantidad</Label>
          <Input
            id="quantity"
            type="number"
            value={formData.quantity}
            onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="description">Descripción</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="company_location">Ubicación en Empresa</Label>
          <Input
            id="company_location"
            value={formData.company_location}
            onChange={(e) => setFormData(prev => ({ ...prev, company_location: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="unit_price">Precio Unitario</Label>
          <Input
            id="unit_price"
            type="number"
            step="0.01"
            value={formData.unit_price}
            onChange={(e) => setFormData(prev => ({ ...prev, unit_price: parseFloat(e.target.value) || 0 }))}
          />
        </div>
      </div>

      <div>
        <Label>Vehículos Compatibles</Label>
        <VehicleSelector
          vehicles={vehicles}
          selectedVehicles={formData.compatible_vehicles}
          onSelectionChange={(selected) => setFormData(prev => ({ ...prev, compatible_vehicles: selected }))}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" className="bg-primary hover:bg-primary-600">
          {sparePart ? "Actualizar" : "Crear"}
        </Button>
      </div>
    </form>
  );
}
