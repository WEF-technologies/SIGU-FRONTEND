
import { useState } from "react";
import { FormModal } from "@/components/shared/FormModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Maintenance as MaintenanceType, Vehicle } from "@/types";
import { maintenanceTypeConfig, MaintenanceTypeKey } from "@/constants/maintenanceTypes";

interface MaintenanceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingMaintenance: MaintenanceType | null;
  vehicles: Vehicle[];
  onSubmit: (formData: any) => Promise<boolean>;
}

export function MaintenanceFormModal({ 
  isOpen, 
  onClose, 
  editingMaintenance, 
  vehicles, 
  onSubmit 
}: MaintenanceFormModalProps) {
  const [formData, setFormData] = useState({
    plate_number: editingMaintenance?.vehicle_plate || "",
    description: editingMaintenance?.description || "",
    type: (editingMaintenance?.type || "M1") as MaintenanceTypeKey,
    date: editingMaintenance?.date || new Date().toISOString().split('T')[0],
    kilometers: editingMaintenance?.kilometers || 0,
    next_maintenance_km: editingMaintenance?.next_maintenance_km || 0,
    location: editingMaintenance?.location || "",
    performed_by: editingMaintenance?.performed_by || ""
  });

  const resetForm = () => {
    setFormData({
      plate_number: "",
      description: "",
      type: "M1",
      date: new Date().toISOString().split('T')[0],
      kilometers: 0,
      next_maintenance_km: 0,
      location: "",
      performed_by: ""
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.plate_number) {
      return;
    }

    const success = await onSubmit(formData);
    if (success) {
      onClose();
      resetForm();
    }
  };

  const handleClose = () => {
    onClose();
    resetForm();
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={handleClose}
      title={editingMaintenance ? "Editar Mantenimiento" : "Registrar Mantenimiento"}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="plate_number">Vehículo</Label>
          <Select
            value={formData.plate_number}
            onValueChange={(value) => {
              console.log('Selected vehicle plate:', value);
              setFormData({...formData, plate_number: value});
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccione un vehículo" />
            </SelectTrigger>
            <SelectContent>
              {vehicles.map((vehicle) => (
                <SelectItem key={vehicle.id} value={vehicle.plate_number}>
                  {vehicle.plate_number} - {vehicle.brand} {vehicle.model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="type">Tipo de Mantenimiento</Label>
          <Select
            value={formData.type}
            onValueChange={(value: MaintenanceTypeKey) => setFormData({...formData, type: value})}
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="location">Lugar de Realización</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({...formData, location: e.target.value})}
              placeholder="Taller, concesionario, etc."
            />
          </div>

          <div>
            <Label htmlFor="performed_by">Realizado por</Label>
            <Input
              id="performed_by"
              value={formData.performed_by}
              onChange={(e) => setFormData({...formData, performed_by: e.target.value})}
              placeholder="Nombre del técnico o responsable"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
          >
            Cancelar
          </Button>
          <Button type="submit" className="bg-primary hover:bg-primary-600">
            {editingMaintenance ? "Actualizar Mantenimiento" : "Registrar Mantenimiento"}
          </Button>
        </div>
      </form>
    </FormModal>
  );
}
