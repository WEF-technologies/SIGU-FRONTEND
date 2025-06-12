
import { useState } from "react";
import { DataTable } from "@/components/shared/DataTable";
import { FormModal } from "@/components/shared/FormModal";
import { SparePartForm } from "@/components/spareparts/SparePartForm";
import { SparePartActions } from "@/components/spareparts/SparePartActions";
import { SparePartDetailsModal } from "@/components/spareparts/SparePartDetailsModal";
import { SparePart } from "@/types";
import { useToast } from "@/hooks/use-toast";

const mockVehicles = [
  { plate_number: "ABC-123", brand: "Toyota", model: "Hiace" },
  { plate_number: "XYZ-789", brand: "Mercedes", model: "Sprinter" },
  { plate_number: "DEF-456", brand: "Chevrolet", model: "NPR" },
  { plate_number: "GHI-321", brand: "Ford", model: "Transit" },
  { plate_number: "JKL-654", brand: "Iveco", model: "Daily" }
];

const mockSpareParts: SparePart[] = [
  {
    id: "1",
    code: "BRK-001",
    description: "Pastillas de freno delanteras marca Ferodo",
    quantity: 8,
    company_location: "Bodega A - Estante 3",
    store_location: "Repuestos García - Calle 26 #15-30",
    compatible_vehicles: ["ABC-123", "XYZ-789"],
    vehicle_plates: "ABC-123, XYZ-789",
    min_stock: 5,
    unit_price: 45000,
    created_at: "2024-01-15",
    updated_at: "2024-01-15"
  },
  {
    id: "2",
    code: "OIL-002",
    description: "Filtro de aceite marca Fram",
    quantity: 12,
    company_location: "Bodega B - Estante 1",
    store_location: "AutoPartes Central - Av. Caracas #45-12",
    compatible_vehicles: ["ABC-123", "DEF-456", "GHI-321"],
    vehicle_plates: "ABC-123, DEF-456, GHI-321",
    min_stock: 8,
    unit_price: 25000,
    created_at: "2024-01-10",
    updated_at: "2024-01-20"
  }
];

export default function SpareParts() {
  const { toast } = useToast();
  const [spareParts, setSpareParts] = useState<SparePart[]>(mockSpareParts);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [editingSparePart, setEditingSparePart] = useState<SparePart | null>(null);
  const [viewingSparePart, setViewingSparePart] = useState<SparePart | null>(null);

  const columns = [
    { key: 'code' as keyof SparePart, header: 'Código' },
    { key: 'description' as keyof SparePart, header: 'Descripción' },
    { key: 'quantity' as keyof SparePart, header: 'Cantidad' },
    { key: 'company_location' as keyof SparePart, header: 'Ubicación Empresa' },
    { 
      key: 'compatible_vehicles' as keyof SparePart, 
      header: 'Vehículos',
      render: (vehicles: string[]) => (
        <span className="text-sm text-gray-600">
          {vehicles && vehicles.length > 0 ? `${vehicles.length} vehículo(s)` : 'Ninguno'}
        </span>
      )
    },
    {
      key: 'unit_price' as keyof SparePart,
      header: 'Precio Unit.',
      render: (value: number) => (
        <span className="text-sm font-medium">
          {value ? `$${value.toLocaleString()}` : '-'}
        </span>
      )
    },
    {
      key: 'actions' as keyof SparePart,
      header: 'Acciones',
      render: (_: any, sparePart: SparePart) => (
        <SparePartActions
          sparePart={sparePart}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onViewDetails={handleViewDetails}
        />
      )
    }
  ];

  const handleAdd = () => {
    setEditingSparePart(null);
    setIsModalOpen(true);
  };

  const handleEdit = (sparePart: SparePart) => {
    setEditingSparePart(sparePart);
    setIsModalOpen(true);
  };

  const handleDelete = (sparePart: SparePart) => {
    setSpareParts(spareParts.filter(sp => sp.id !== sparePart.id));
    toast({
      title: "Repuesto eliminado",
      description: `${sparePart.code} - ${sparePart.description} ha sido eliminado correctamente.`,
    });
  };

  const handleViewDetails = (sparePart: SparePart) => {
    setViewingSparePart(sparePart);
    setIsDetailsModalOpen(true);
  };

  const handleSubmit = (formData: Omit<SparePart, 'id' | 'created_at' | 'updated_at'>) => {
    const vehiclePlates = formData.compatible_vehicles.join(", ");
    
    if (editingSparePart) {
      const updatedSparePart = {
        ...editingSparePart,
        ...formData,
        vehicle_plates: vehiclePlates,
        updated_at: new Date().toISOString()
      };
      setSpareParts(spareParts.map(sp => 
        sp.id === editingSparePart.id ? updatedSparePart : sp
      ));
      toast({
        title: "Repuesto actualizado",
        description: `${formData.code} - ${formData.description} ha sido actualizado correctamente.`,
      });
    } else {
      const newSparePart: SparePart = {
        id: Date.now().toString(),
        ...formData,
        vehicle_plates: vehiclePlates,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setSpareParts([...spareParts, newSparePart]);
      toast({
        title: "Repuesto creado",
        description: `${formData.code} - ${formData.description} ha sido creado correctamente.`,
      });
    }
    
    setIsModalOpen(false);
  };

  return (
    <div className="p-6">
      <DataTable
        data={spareParts}
        columns={columns}
        onAdd={handleAdd}
        title="Gestión de Repuestos"
        addButtonText="Agregar Repuesto"
        searchField="code"
        searchPlaceholder="Buscar por código..."
      />

      <FormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSparePart ? "Editar Repuesto" : "Agregar Repuesto"}
      >
        <SparePartForm
          sparePart={editingSparePart}
          vehicles={mockVehicles}
          onSubmit={handleSubmit}
          onCancel={() => setIsModalOpen(false)}
        />
      </FormModal>

      <SparePartDetailsModal
        sparePart={viewingSparePart}
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
      />
    </div>
  );
}
