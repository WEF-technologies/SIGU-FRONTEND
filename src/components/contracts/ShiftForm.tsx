
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
    description: editingShift?.description || "",
    start_time: editingShift?.start_time || "",
    end_time: editingShift?.end_time || ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      contract_id: "", // Se asignará desde el componente padre
      description: formData.description,
      start_time: formData.start_time,
      end_time: formData.end_time
    });
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="description">Descripción del Turno</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleInputChange("description", e.target.value)}
          placeholder="Ej: Turno Matutino"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="start_time">Hora de Inicio</Label>
          <Input
            id="start_time"
            type="time"
            value={formData.start_time}
            onChange={(e) => handleInputChange("start_time", e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="end_time">Hora de Fin</Label>
          <Input
            id="end_time"
            type="time"
            value={formData.end_time}
            onChange={(e) => handleInputChange("end_time", e.target.value)}
            required
          />
        </div>
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
