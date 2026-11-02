
import { useState, useEffect, useCallback } from "react";
import { FormModal } from "@/components/shared/FormModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { AlertTriangle, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { toDateOnlyLocalValue } from "@/lib/dates";
import { formatKmNumber } from "@/lib/kilometers";
import {
  Maintenance as MaintenanceType,
  MaintenanceFormData,
  MaintenanceMutationResult,
  SparePart,
  Vehicle,
} from "@/types";
import { maintenanceTypeConfig, MaintenanceTypeKey } from "@/constants/maintenanceTypes";
import { useAuthenticatedFetch } from "@/hooks/useAuthenticatedFetch";
import { useToast } from "@/hooks/use-toast";
import { sparePartsApi } from "@/services/sparePartsApi";

const DESC_MAX = 255;
const NO_SPARE_PART = "none";

interface MaintenanceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Un objeto sin `id` es un alta con la placa ya elegida. */
  editingMaintenance: MaintenanceType | null;
  vehicles: Vehicle[];
  onSubmit: (formData: MaintenanceFormData) => Promise<MaintenanceMutationResult>;
}

interface MaintenanceFormState {
  plate_number: string;
  description: string;
  /** Normalmente una clave de maintenanceTypeConfig; un tipo legado se conserva tal cual. */
  type: string;
  date: string;
  /** Texto del input: vacío = usar el km actual de la unidad. Admite decimales. */
  kilometers: string;
  location: string;
  performed_by: string;
  /** UUID del repuesto o NO_SPARE_PART. */
  spare_part_id: string;
  spare_part_description: string;
}

const toKilometersInput = (value: number | null | undefined) =>
  typeof value === "number" && Number.isFinite(value) ? String(value) : "";

const parseKilometersInput = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : NaN;
};

export function MaintenanceFormModal({
  isOpen,
  onClose,
  editingMaintenance,
  vehicles,
  onSubmit
}: MaintenanceFormModalProps) {
  const authenticatedFetch = useAuthenticatedFetch();
  const { toast } = useToast();
  const [spareParts, setSpareParts] = useState<SparePart[]>([]);
  const [vehicleOpen, setVehicleOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sparePartRemoved, setSparePartRemoved] = useState(false);

  const isEditing = Boolean(editingMaintenance?.id);

  const emptyForm = (): MaintenanceFormState => ({
    plate_number: "",
    description: "",
    type: "m2+",
    date: toDateOnlyLocalValue(),
    kilometers: "",
    location: "",
    performed_by: "",
    spare_part_id: NO_SPARE_PART,
    spare_part_description: ""
  });

  const [formData, setFormData] = useState<MaintenanceFormState>(emptyForm());

  // Repoblar el formulario cada vez que se abre el modal o cambia el registro editado
  useEffect(() => {
    if (!isOpen) return;
    setSparePartRemoved(false);
    if (editingMaintenance) {
      setFormData({
        plate_number: editingMaintenance.vehicle_plate || "",
        description: editingMaintenance.description || "",
        // "M3" y "m3" son el mismo tipo; el resto se conserva para no cambiarlo al guardar.
        type: (editingMaintenance.type || "m2+").toLowerCase(),
        date: editingMaintenance.date || toDateOnlyLocalValue(),
        kilometers: toKilometersInput(editingMaintenance.kilometers),
        location: editingMaintenance.location || "",
        performed_by: editingMaintenance.performed_by || "",
        spare_part_id: editingMaintenance.spare_part_id || NO_SPARE_PART,
        spare_part_description: editingMaintenance.spare_part_description || ""
      });
    } else {
      setFormData(emptyForm());
    }
  }, [isOpen, editingMaintenance]);

  const loadSpareParts = useCallback(async () => {
    try {
      setSpareParts(await sparePartsApi.listAll(authenticatedFetch));
    } catch (error) {
      console.error('Error fetching spare parts:', error);
      setSpareParts([]);
    }
  }, [authenticatedFetch]);

  useEffect(() => {
    if (isOpen) {
      void loadSpareParts();
    }
  }, [isOpen, loadSpareParts]);

  const resetForm = () => {
    setFormData(emptyForm());
    setVehicleOpen(false);
    setSparePartRemoved(false);
  };

  const descOver = formData.description.length > DESC_MAX;
  const spareDescOver = formData.spare_part_description.length > DESC_MAX;
  const descriptionEmpty = formData.description.trim().length === 0;
  const canSubmit = !descOver && !spareDescOver && !descriptionEmpty;

  const selectedVehicle = vehicles.find(v => v.plate_number === formData.plate_number);
  const referenceKilometers = selectedVehicle
    ? Math.max(
        selectedVehicle.current_kilometers || selectedVehicle.kilometers || 0,
        selectedVehicle.last_m3_kilometers || 0
      )
    : 0;

  const originalKilometers = isEditing ? editingMaintenance?.kilometers ?? null : null;
  const originalKilometersInput = toKilometersInput(originalKilometers);
  const kilometersChanged = isEditing && formData.kilometers.trim() !== originalKilometersInput;
  const vehicleChanged =
    isEditing && formData.plate_number !== (editingMaintenance?.vehicle_plate || "");
  const parsedKilometers = parseKilometersInput(formData.kilometers);
  const kilometersInvalid =
    parsedKilometers !== null && (Number.isNaN(parsedKilometers) || parsedKilometers < 0);

  // Solo al registrar: al editar, el backend valida el km únicamente si cambió el
  // km o la unidad, y contra el mayor km registrado. Un mantenimiento antiguo
  // (p. ej. 1000 km con otro de 3000 km) se puede corregir sin tocar su km.
  const kilometersTooLow =
    !isEditing &&
    parsedKilometers !== null &&
    !Number.isNaN(parsedKilometers) &&
    parsedKilometers > 0 &&
    referenceKilometers > 0 &&
    parsedKilometers < referenceKilometers;

  /**
   * Al editar, el km original se reenvía tal cual si no cambió. Mandarlo en
   * null haría que el backend use el km actual de la unidad: activaría la
   * validación y sobrescribiría el km del mantenimiento.
   */
  const resolveKilometersToSend = (): number | null => {
    if (isEditing && !kilometersChanged) return originalKilometers;
    return parsedKilometers;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.plate_number) return;
    if (!canSubmit || kilometersInvalid || isSubmitting) return;
    if (kilometersTooLow) {
      toast({
        title: "Validación de kilometraje",
        description: `El kilometraje (${formatKmNumber(parsedKilometers ?? 0)} km) no puede ser menor al actual de la unidad (${formatKmNumber(referenceKilometers)} km).`,
        variant: "destructive",
      });
      return;
    }

    const submitData: MaintenanceFormData = {
      ...formData,
      kilometers: resolveKilometersToSend(),
      spare_part_id: formData.spare_part_id === NO_SPARE_PART ? null : formData.spare_part_id,
    };

    setIsSubmitting(true);
    let result: MaintenanceMutationResult;
    try {
      result = await onSubmit(submitData);
    } finally {
      setIsSubmitting(false);
    }

    if (result.ok || result.reason === "not_found") {
      // Si el mantenimiento ya no existe, no hay nada más que editar aquí.
      onClose();
      resetForm();
      return;
    }

    if (result.reason === "spare_part_missing") {
      // Lo eliminaron mientras se llenaba el formulario: se recarga la lista y se
      // conserva la descripción para poder guardarla como texto libre.
      setSparePartRemoved(true);
      setFormData((prev) => ({ ...prev, spare_part_id: NO_SPARE_PART }));
      await loadSpareParts();
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
      title={isEditing ? "Editar Mantenimiento" : "Registrar Mantenimiento"}
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
            onValueChange={(value: MaintenanceTypeKey) => setFormData((prev) => ({ ...prev, type: value }))}
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
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
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
          {descriptionEmpty && formData.description.length > 0 && (
            <p className="text-xs text-destructive mt-1">
              La descripción no puede quedar solo con espacios.
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
              onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
              required
            />
          </div>

          <div>
            <Label htmlFor="kilometers">Kilómetros Actuales</Label>
            <Input
              id="kilometers"
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              value={formData.kilometers}
              onChange={(e) => setFormData((prev) => ({ ...prev, kilometers: e.target.value }))}
              placeholder={isEditing ? "Sin kilometraje registrado" : "Vacío = km actual de la unidad"}
            />
            {referenceKilometers > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                Kilometraje registrado de la unidad: {formatKmNumber(referenceKilometers)} km.
              </p>
            )}
            {kilometersInvalid && (
              <p className="mt-1 text-xs text-destructive">
                Ingresa un kilometraje válido, mayor o igual a 0.
              </p>
            )}
            {kilometersTooLow && (
              <p className="mt-1 text-xs text-destructive">
                El valor ingresado debe ser mayor o igual a {formatKmNumber(referenceKilometers)} km.
              </p>
            )}
            {isEditing && (kilometersChanged || vehicleChanged) && (
              <p className="mt-1 text-xs text-muted-foreground">
                Al cambiar el kilometraje o la unidad, el sistema verifica que no sea menor al
                mayor kilometraje ya registrado para la unidad.
              </p>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="spare_part_id">Repuesto Utilizado (Opcional)</Label>
          <Select
            value={formData.spare_part_id}
            onValueChange={(value) => {
              const selectedPart = value === NO_SPARE_PART ? null : spareParts.find(p => p.id === value);
              setSparePartRemoved(false);
              setFormData((prev) => ({
                ...prev,
                spare_part_id: value,
                spare_part_description: selectedPart ? selectedPart.description : ""
              }));
            }}
          >
            <SelectTrigger id="spare_part_id">
              <SelectValue placeholder="Seleccione un repuesto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_SPARE_PART}>Sin repuesto</SelectItem>
              {spareParts.map((part) => (
                <SelectItem key={part.id} value={part.id}>
                  {part.code} - {part.description}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {sparePartRemoved && (
            <p className="mt-1 flex items-start gap-1.5 text-xs text-amber-700">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              El repuesto elegido se eliminó del inventario. La lista ya está actualizada: elige
              otro o guarda solo la descripción.
            </p>
          )}
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
            onChange={(e) => setFormData((prev) => ({ ...prev, spare_part_description: e.target.value }))}
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
              onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
              placeholder="Taller, concesionario, etc."
            />
          </div>

          <div>
            <Label htmlFor="performed_by">Realizado por</Label>
            <Input
              id="performed_by"
              value={formData.performed_by}
              onChange={(e) => setFormData((prev) => ({ ...prev, performed_by: e.target.value }))}
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
            disabled={!canSubmit || kilometersTooLow || kilometersInvalid || isSubmitting}
          >
            {isEditing ? "Actualizar Mantenimiento" : "Registrar Mantenimiento"}
          </Button>
        </div>
      </form>
    </FormModal>
  );
}
