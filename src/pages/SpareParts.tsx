import { useState, useEffect } from "react";
import { DataTable } from "@/components/shared/DataTable";
import { FormModal } from "@/components/shared/FormModal";
import { SparePartForm } from "@/components/spareparts/SparePartForm";
import { SparePartActions } from "@/components/spareparts/SparePartActions";
import { SparePartDetailsModal } from "@/components/spareparts/SparePartDetailsModal";
import { SparePartRequestForm } from "@/components/spareparts/SparePartRequestForm";
import { SparePart, Vehicle } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Plus, ShoppingCart } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function SpareParts() {
  const { toast } = useToast();
  const [spareParts, setSpareParts] = useState<SparePart[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [editingSparePart, setEditingSparePart] = useState<SparePart | null>(null);
  const [viewingSparePart, setViewingSparePart] = useState<SparePart | null>(null);

  // Cargar repuestos y vehículos desde el backend
  useEffect(() => {
    fetch(`${API_URL}/api/v1/spare_parts/`)
      .then(res => res.ok ? res.json() : [])
      .then(data => setSpareParts(Array.isArray(data) ? data : []));
    fetch(`${API_URL}/api/v1/vehicles/`)
      .then(res => res.ok ? res.json() : [])
      .then(data => setVehicles(Array.isArray(data) ? data : []));
  }, []);

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
    fetch(`${API_URL}/api/v1/spare_parts/${sparePart.id}`, {
      method: "DELETE",
    }).then(() => {
      setSpareParts(spareParts.filter(sp => sp.id !== sparePart.id));
      toast({
        title: "Repuesto eliminado",
        description: `${sparePart.code} - ${sparePart.description} ha sido eliminado correctamente.`,
      });
    });
  };

  const handleViewDetails = (sparePart: SparePart) => {
    setViewingSparePart(sparePart);
    setIsDetailsModalOpen(true);
  };

  const handleSubmit = (formData: Omit<SparePart, 'id' | 'created_at' | 'updated_at'>) => {
    if (editingSparePart) {
      // PUT
      fetch(`${API_URL}/api/v1/spare_parts/${editingSparePart.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
        .then(res => res.json())
        .then(updatedSparePart => {
          setSpareParts(spareParts.map(sp => 
            sp.id === editingSparePart.id ? updatedSparePart : sp
          ));
          toast({
            title: "Repuesto actualizado",
            description: `${formData.code} - ${formData.description} ha sido actualizado correctamente.`,
          });
        });
    } else {
      // POST
      fetch(`${API_URL}/api/v1/spare_parts/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
        .then(res => res.json())
        .then(newSparePart => {
          setSpareParts([...spareParts, newSparePart]);
          toast({
            title: "Repuesto creado",
            description: `${formData.code} - ${formData.description} ha sido creado correctamente.`,
          });
        });
    }
    setIsModalOpen(false);
  };

  // Solicitud de repuesto (nuevo endpoint)
  const handleSparePartRequest = (requestData: {
    code: string;
    description: string;
    requestedBy: string;
    date: string;
    notes?: string;
  }) => {
    // Map requestedBy (camelCase) to requested_by (snake_case) for the API
    const apiRequestData = {
      ...requestData,
      requested_by: requestData.requestedBy,
    };
    delete (apiRequestData as any).requestedBy;

    fetch(`${API_URL}/api/v1/spare_part_requests/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(apiRequestData),
    })
      .then(res => res.ok)
      .then(() => {
        toast({
          title: "Solicitud enviada",
          description: `Solicitud de ${requestData.code} - ${requestData.description} enviada correctamente.`,
        });
        setIsRequestModalOpen(false);
      });
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
          vehicles={vehicles}
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