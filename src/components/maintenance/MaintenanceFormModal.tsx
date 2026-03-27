
import { useState, useEffect } from "react";
import { FormModal } from "@/components/shared/FormModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Maintenance as MaintenanceType, Vehicle, SparePart } from "@/types";
import { maintenanceTypeConfig, MaintenanceTypeKey } from "@/constants/maintenanceTypes";
import { useAuthenticatedFetch } from "@/hooks/useAuthenticatedFetch";

const DESC_MAX = 255;

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
  const [vehicleOpen, setVehicleOpen] = useState(false);

  const emptyForm = () => ({
    plate_number: "",
    description: "",
    type: "m2+" as MaintenanceTypeKey,
    date: new Date().toISOString().split('T')[0],
    kilometers: 0,
    location: "",
    performed_by: "",
    spare_part_id: "none",
    spare_part_description: ""
  });

  const [formData, setFormData] = useState(emptyForm());

  // Repoblar el formulario cada vez que se abre el modal o cambia el registro editado
  useEffect(() => {
    if (!isOpen) return;
    if (editingMaintenance) {
      setFormData({
        plate_number: editingMaintenance.vehicle_plate || "",
        description: editingMaintenance.description || "",
        type: (editingMaintenance.type || "m2+") as MaintenanceTypeKey,
        date: editingMaintenance.date || new Date().toISOString().split('T')[0],
        kilometers: editingMaintenance.kilometers || 0,
        location: editingMaintenance.location || "",
        performed_by: editingMaintenance.performed_by || "",
        spare_part_id: editingMaintenance.spare_part_id || "none",
        spare_part_description: editingMaintenance.spare_part_description || ""
      });
    } else {
      setFormData(emptyForm());
    }
  }, [isOpen, editingMaintenance]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const fetchSpareParts = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || "https://sigu-back.vercel.app";
        const response = await authenticatedFetch(`${API_URL}/api/v1/spare_parts/`);
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
    setFormData(emptyForm());
    setVehicleOpen(false);
  };

  const descOver = formData.description.length > DESC_MAX;
  const spareDescOver = formData.spare_part_description.length > DESC_MAX;
  const canSubmit = !descOver && !spareDescOver;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.plate_number) return;
    if (!canSubmit) return;

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

  const selectedVehicle = vehicles.find(v => v.plate_number === formData.plate_number);

  return (
    <FormModal
      isOpen={isOpen}
      onClose={handleClose}
      title={editingMaintenance?.id ? "Editar Mantenimiento" : "Registrar Mantenimiento"}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* ── Vehículo (combobox con búsqueda) ── */}
        <div>
          <Label htmlFor="plate_number">Vehículo</Label>
          <Popover open={vehicleOpen} onOpenChange={setVehicleOpen}>
            <PopoverTrigger asChild>
              <Button
                id="plate_number"
                variant="outline"
                role="combobox"
                aria-expanded={vehicleOpen}
                className="w-full justify-between font-normal"
              >
                {selectedVehicle
                  ? `${selectedVehicle.plate_number} — ${selectedVehicle.brand} ${selectedVehicle.model}`
                  : "Seleccione un vehículo"}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" style={{ minWidth: "var(--radix-popover-trigger-width)" }}>
              <Command>
                <CommandInput placeholder="Buscar por placa, marca o modelo..." />
                <CommandList>
                  <CommandEmpty>No se encontró ningún vehículo.</CommandEmpty>
                  <CommandGroup>
                    {vehicles.map((vehicle) => (
                      <CommandItem
                        key={vehicle.id}
                        value={`${vehicle.plate_number} ${vehicle.brand} ${vehicle.model}`}
                        onSelect={() => {
                          setFormData({ ...formData, plate_number: vehicle.plate_number });
                          setVehicleOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            formData.plate_number === vehicle.plate_number ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <span className="font-medium">{vehicle.plate_number}</span>
                        <span className="ml-2 text-muted-foreground">{vehicle.brand} {vehicle.model}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <div>
          <Label htmlFor="type">Tipo de Mantenimiento</Label>
          <Select
            value={formData.type}
            onValueChange={(value: MaintenanceTypeKey) => setFormData({...formData, type: value})}
          >
            <SelectTrigger id="type">
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

        {/* ── Descripción con contador ── */}
        <div>
          <div className="flex justify-between items-baseline mb-1">
            <Label htmlFor="description">Descripción del Mantenimiento</Label>
            <span className={cn("text-xs", descOver ? "text-destructive font-medium" : "text-muted-foreground")}>
              {formData.description.length}/{DESC_MAX}
            </span>
          </div>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            placeholder="Describa detalladamente el mantenimiento realizado"
            required
            rows={3}
            className={cn(descOver && "border-destructive focus-visible:ring-destructive")}
          />
          {descOver && (
            <p className="text-xs text-destructive mt-1">
              La descripción supera los {DESC_MAX} caracteres permitidos ({formData.description.length - DESC_MAX} de exceso).
            </p>
          )}
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
            <SelectTrigger id="spare_part_id">
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

        {/* ── Descripción del repuesto con contador ── */}
        <div>
          <div className="flex justify-between items-baseline mb-1">
            <Label htmlFor="spare_part_description">Descripción del Repuesto</Label>
            {formData.spare_part_description.length > 0 && (
              <span className={cn("text-xs", spareDescOver ? "text-destructive font-medium" : "text-muted-foreground")}>
                {formData.spare_part_description.length}/{DESC_MAX}
              </span>
            )}
          </div>
          <Input
            id="spare_part_description"
            value={formData.spare_part_description}
            onChange={(e) => setFormData({...formData, spare_part_description: e.target.value})}
            placeholder="Descripción manual del repuesto utilizado"
            className={cn(spareDescOver && "border-destructive focus-visible:ring-destructive")}
          />
          {spareDescOver && (
            <p className="text-xs text-destructive mt-1">
              Supera los {DESC_MAX} caracteres ({formData.spare_part_description.length - DESC_MAX} de exceso).
            </p>
          )}
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
          <Button
            type="submit"
            className="bg-primary hover:bg-primary-600"
            disabled={!canSubmit}
          >
            {editingMaintenance?.id ? "Actualizar Mantenimiento" : "Registrar Mantenimiento"}
          </Button>
        </div>
      </form>
    </FormModal>
  );
}
