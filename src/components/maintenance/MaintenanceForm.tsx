
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MaintenanceType } from "@/types";
import { useToast } from "@/hooks/use-toast";

interface MaintenanceFormProps {
  vehicleId: string;
  vehiclePlate: string;
  onMaintenanceAdded: (maintenance: any) => void;
  onCancel: () => void;
}

const maintenanceTypeConfig = {
  M1: { label: "M1 - Preventivo Básico", color: "bg-blue-100 text-blue-800" },
  M2: { label: "M2 - Correctivo", color: "bg-yellow-100 text-yellow-800" },
  M3: { label: "M3 - Mayor (Crítico)", color: "bg-red-100 text-red-800" },
  M4: { label: "M4 - Especializado", color: "bg-purple-100 text-purple-800" }
};

export function MaintenanceForm({ vehicleId, vehiclePlate, onMaintenanceAdded, onCancel }: MaintenanceFormProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    type: "M1" as MaintenanceType,
    description: "",
    date: new Date().toISOString().split('T')[0],
    kilometers: 0,
    next_maintenance_km: 0
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newMaintenance = {
      id: Date.now().toString(),
      vehicle_id: vehicleId,
      vehicle_plate: vehiclePlate,
      ...formData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    onMaintenanceAdded(newMaintenance);
    
    toast({
      title: "Mantenimiento registrado",
      description: `El mantenimiento ${formData.type} ha sido registrado correctamente.`,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label className="text-sm text-gray-600">Vehículo</Label>
        <p className="font-medium">{vehiclePlate}</p>
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
            {Object.entries(maintenanceTypeConfig).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                <div className="flex items-center gap-2">
                  <Badge className={config.color} variant="outline">{key}</Badge>
                  <span>{config.label}</span>
                </div>
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
          placeholder="Describa detalladamente el mantenimiento realizado"
          required
          rows={3}
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
            placeholder="Kilómetros del vehículo"
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
          placeholder="Kilómetros para próximo mantenimiento"
        />
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
        >
          Cancelar
        </Button>
        <Button type="submit" className="bg-primary hover:bg-primary-600">
          Registrar Mantenimiento
        </Button>
      </div>
    </form>
  );
}
