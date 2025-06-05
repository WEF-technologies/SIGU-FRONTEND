
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Shift } from "@/types";

interface ShiftFormProps {
  onSubmit: (shift: Omit<Shift, 'id' | 'created_at' | 'updated_at'>) => void;
  onCancel: () => void;
  editingShift?: Shift | null;
}

export function ShiftForm({ onSubmit, onCancel, editingShift }: ShiftFormProps) {
  const [formData, setFormData] = useState({
    description: editingShift?.description || ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      contract_id: "", // Se asignará desde el componente padre
      description: formData.description
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="description">Descripción del Turno</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({...formData, description: e.target.value})}
          placeholder="Ej: Turno mañana 6:00 AM - 2:00 PM"
          required
        />
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">
          {editingShift ? "Actualizar Turno" : "Crear Turno"}
        </Button>
      </div>
    </form>
  );
}
