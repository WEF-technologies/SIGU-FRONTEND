import { useState } from "react";
import { DataTable } from "@/components/shared/DataTable";
import { FormModal } from "@/components/shared/FormModal";
import { SparePartForm } from "@/components/spareparts/SparePartForm";
import { SparePartActions } from "@/components/spareparts/SparePartActions";
import { SparePartDetailsModal } from "@/components/spareparts/SparePartDetailsModal";
import { SparePartRequestForm } from "@/components/spareparts/SparePartRequestForm";
import { SparePart } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Plus, ShoppingCart } from "lucide-react";

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
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
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

  const handleRequestSparePart = () => {
    setIsRequestModalOpen(true);
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

  const handleSparePartRequest = (requestData: {
    code: string;
    description: string;
    requestedBy: string;
    date: string;
    notes?: string;
  }) => {
    toast({
      title: "Solicitud enviada",
      description: `Solicitud de ${requestData.code} - ${requestData.description} enviada correctamente.`,
    });
    setIsRequestModalOpen(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary-900">Gestión de Repuestos</h1>
          <p className="text-gray-600 mt-1">Administra el inventario de repuestos y solicitudes</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Button 
            onClick={handleRequestSparePart} 
            variant="outline" 
            className="flex items-center justify-center gap-2 bg-white hover:bg-gray-50 border-blue-200 text-blue-700 hover:text-blue-800 px-6 py-2.5 font-medium"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Solicitar Repuesto</span>
          </Button>
          <Button 
            onClick={handleAdd} 
            className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-2.5 font-medium shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar Repuesto</span>
          </Button>
        </div>
      </div>

      <DataTable
        data={spareParts}
        columns={columns}
        onAdd={handleAdd}
        title=""
        addButtonText=""
        searchField="code"
        searchPlaceholder="Buscar por código..."
        hideAddButton={true}
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

      <FormModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        title="Solicitar Repuesto"
      >
        <SparePartRequestForm
          onSubmit={handleSparePartRequest}
          onCancel={() => setIsRequestModalOpen(false)}
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
