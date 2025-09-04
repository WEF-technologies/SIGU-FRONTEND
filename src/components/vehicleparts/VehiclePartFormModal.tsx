import { FormModal } from "@/components/shared/FormModal";
import { VehiclePartForm } from "./VehiclePartForm";
import { VehiclePart, Vehicle } from "@/types";

interface VehiclePartFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingPart?: VehiclePart | null;
  vehicles: Vehicle[];
  onSubmit: (data: any) => Promise<void>;
}

export function VehiclePartFormModal({
  isOpen,
  onClose,
  editingPart,
  vehicles,
  onSubmit
}: VehiclePartFormModalProps) {
  const handleSubmit = async (data: any) => {
    await onSubmit(data);
    onClose();
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title={editingPart ? "Editar Parte de Vehículo" : "Agregar Parte de Vehículo"}
    >
      <VehiclePartForm
        editingPart={editingPart}
        vehicles={vehicles}
        onSubmit={handleSubmit}
        onCancel={onClose}
      />
    </FormModal>
  );
}