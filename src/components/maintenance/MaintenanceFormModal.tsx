
import { useState, useEffect } from "react";
import { FormModal } from "@/components/shared/FormModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Maintenance as MaintenanceType, Vehicle, SparePart } from "@/types";
import { maintenanceTypeConfig, MaintenanceTypeKey } from "@/constants/maintenanceTypes";
import { useAuthenticatedFetch } from "@/hooks/useAuthenticatedFetch";

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
  const authenticatedFetch = useAuthenticatedFetch();
  const [spareParts, setSpareParts] = useState<SparePart[]>([]);
  const [formData, setFormData] = useState({
    plate_number: editingMaintenance?.vehicle_plate || "",
    description: editingMaintenance?.description || "",
    type: (editingMaintenance?.type || "m2+") as MaintenanceTypeKey,
    date: editingMaintenance?.date || new Date().toISOString().split('T')[0],
    kilometers: editingMaintenance?.kilometers || 0,
    location: editingMaintenance?.location || "",
    performed_by: editingMaintenance?.performed_by || "",
    spare_part_id: editingMaintenance?.spare_part_id || "none",
    spare_part_description: editingMaintenance?.spare_part_description || ""
  });

  useEffect(() => {
    const fetchSpareParts = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || "https://sigu-back-e39xv5vbt-enmanuelalxs-projects.vercel.app";
        const response = await authenticatedFetch(`${API_URL}/api/v1/spare-parts/`);
        if (response.ok) {
          const data = await response.json();
          setSpareParts(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error('Error fetching spare parts:', error);
        setSpareParts([]);
      }
    };

    if (isOpen) {
      fetchSpareParts();
    }
  }, [isOpen, authenticatedFetch]);

  const resetForm = () => {
    setFormData({
      plate_number: "",
      description: "",
      type: "m2+",
      date: new Date().toISOString().split('T')[0],
      kilometers: 0,
      location: "",
      performed_by: "",
      spare_part_id: "none",
      spare_part_description: ""
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.plate_number) {
      return;
    }

    const submitData = {
      ...formData,
      spare_part_id: formData.spare_part_id === "none" ? null : formData.spare_part_id
    };
    
    const success = await onSubmit(submitData);
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
          <Label htmlFor="spare_part_id">Repuesto Utilizado (Opcional)</Label>
          <Select
            value={formData.spare_part_id}
            onValueChange={(value) => {
              const selectedPart = value === "none" ? null : spareParts.find(p => p.id === value);
              setFormData({
                ...formData, 
                spare_part_id: value,
                spare_part_description: selectedPart ? selectedPart.description : ""
              });
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccione un repuesto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin repuesto</SelectItem>
              {spareParts.map((part) => (
                <SelectItem key={part.id} value={part.id}>
                  {part.code} - {part.description}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="spare_part_description">Descripción del Repuesto</Label>
          <Input
            id="spare_part_description"
            value={formData.spare_part_description}
            onChange={(e) => setFormData({...formData, spare_part_description: e.target.value})}
            placeholder="Descripción manual del repuesto utilizado"
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
