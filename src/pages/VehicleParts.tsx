import { useState } from "react";
import { DataTable } from "@/components/shared/DataTable";
import { VehiclePart } from "@/types";
import { VehiclePartDetailsModal } from "@/components/vehicleparts/VehiclePartDetailsModal";
import { VehiclePartFormModal } from "@/components/vehicleparts/VehiclePartFormModal";
import { VehiclePartAlerts } from "@/components/vehicleparts/VehiclePartAlerts";
import { getVehiclePartTableColumns } from "@/components/vehicleparts/VehiclePartTableColumns";
import { useVehicleParts } from "@/hooks/useVehicleParts";

export default function VehicleParts() {
  const { 
    parts, 
    vehicles, 
    alerts,
    createPart, 
    updatePart, 
    deletePart 
  } = useVehicleParts();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<VehiclePart | null>(null);
  const [selectedPart, setSelectedPart] = useState<VehiclePart | null>(null);

  const handleAdd = () => {
    setEditingPart(null);
    setIsModalOpen(true);
  };

  const handleEdit = (part: VehiclePart) => {
    setEditingPart(part);
    setIsModalOpen(true);
  };

  const handleViewDetails = (part: VehiclePart) => {
    setSelectedPart(part);
    setIsDetailsModalOpen(true);
  };

  const handleDelete = async (part: VehiclePart) => {
    await deletePart(part);
  };

  const handleSubmit = async (formData: any) => {
    if (editingPart) {
      return await updatePart(editingPart.id, formData);
    } else {
      return await createPart(formData);
    }
  };

  const columns = getVehiclePartTableColumns({
    onViewDetails: handleViewDetails,
    onEdit: handleEdit,
    onDelete: handleDelete
  });

  return (
    <div className="animate-fade-in space-y-6">
      <VehiclePartAlerts alerts={alerts} />
      
      <DataTable
        data={parts}
        columns={columns}
        onAdd={handleAdd}
        title="Gestión de Partes de Vehículos"
        addButtonText="Agregar Parte"
        searchField="vehicle_plate"
        searchPlaceholder="Buscar por placa del vehículo..."
      />

      <VehiclePartFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingPart={editingPart}
        vehicles={vehicles}
        onSubmit={handleSubmit}
      />

      <VehiclePartDetailsModal
        part={selectedPart}
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
      />
    </div>
  );
}