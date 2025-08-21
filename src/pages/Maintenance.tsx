
import { useState } from "react";
import { DataTable } from "@/components/shared/DataTable";
import { Maintenance as MaintenanceType } from "@/types";
import { MaintenanceDetailsModal } from "@/components/maintenance/MaintenanceDetailsModal";
import { MaintenanceFormModal } from "@/components/maintenance/MaintenanceFormModal";
import { MaintenanceAlerts } from "@/components/maintenance/MaintenanceAlerts";
import { getMaintenanceTableColumns } from "@/components/maintenance/MaintenanceTableColumns";
import { useMaintenance } from "@/hooks/useMaintenance";

export default function Maintenance() {
  const { 
    maintenance, 
    vehicles, 
    alerts,
    createMaintenance, 
    updateMaintenance, 
    deleteMaintenance 
  } = useMaintenance();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [editingMaintenance, setEditingMaintenance] = useState<MaintenanceType | null>(null);
  const [selectedMaintenance, setSelectedMaintenance] = useState<MaintenanceType | null>(null);

  const handleAdd = () => {
    setEditingMaintenance(null);
    setIsModalOpen(true);
  };

  const handleEdit = (maintenance: MaintenanceType) => {
    setEditingMaintenance(maintenance);
    setIsModalOpen(true);
  };

  const handleViewDetails = (maintenance: MaintenanceType) => {
    setSelectedMaintenance(maintenance);
    setIsDetailsModalOpen(true);
  };

  const handleDelete = async (maintenance: MaintenanceType) => {
    await deleteMaintenance(maintenance);
  };

  const handleSubmit = async (formData: any) => {
    if (editingMaintenance) {
      return await updateMaintenance(editingMaintenance.id, formData);
    } else {
      return await createMaintenance(formData);
    }
  };

  const columns = getMaintenanceTableColumns({
    onViewDetails: handleViewDetails,
    onEdit: handleEdit,
    onDelete: handleDelete
  });

  return (
    <div className="animate-fade-in space-y-6">
      <MaintenanceAlerts alerts={alerts} />
      
      <DataTable
        data={maintenance}
        columns={columns}
        onAdd={handleAdd}
        title="Gestión de Mantenimientos"
        addButtonText="Registrar Mantenimiento"
        searchField="vehicle_plate"
        searchPlaceholder="Buscar por placa del vehículo..."
      />

      <MaintenanceFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingMaintenance={editingMaintenance}
        vehicles={vehicles}
        onSubmit={handleSubmit}
      />

      <MaintenanceDetailsModal
        maintenance={selectedMaintenance}
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
      />
    </div>
  );
}
