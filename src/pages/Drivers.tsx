
import { useState } from "react";
import { DataTable } from "@/components/shared/DataTable";
import { FormModal } from "@/components/shared/FormModal";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DriverForm } from "@/components/drivers/DriverForm";
import { DriverActions } from "@/components/drivers/DriverActions";
import { Driver, Contract } from "@/types";
import { useToast } from "@/hooks/use-toast";

// Mock contracts data
const mockContracts: Contract[] = [
  {
    id: "1",
    description: "Contrato de Transporte Urbano - Zona Norte",
    start_date: "2024-01-01",
    end_date: "2024-12-31",
    location: "Zona Norte",
    status: "active",
    contract_code: "CNT-2024-001",
    vehicles: [],
    users: [],
    created_at: "2024-01-01",
    updated_at: "2024-01-01"
  },
  {
    id: "2",
    description: "Contrato de Servicios Especiales",
    start_date: "2024-03-01",
    end_date: "2024-09-30",
    location: "Centro Empresarial",
    status: "active",
    contract_code: "CNT-2024-002",
    vehicles: [],
    users: [],
    created_at: "2024-01-01",
    updated_at: "2024-01-01"
  }
];

const mockDrivers: Driver[] = [
  {
    id: "1",
    name: "Carlos Alberto",
    last_name: "Mendoza Silva",
    document_number: "12345678",
    license_type: "B1",
    telephone: "3001234567",
    status: "active",
    blood_type: "O+",
    address: "Calle 123 #45-67, Bogotá",
    contract_id: "1",
    contract: mockContracts[0],
    created_at: "2024-01-15",
    updated_at: "2024-01-15"
  },
  {
    id: "2",
    name: "Ana María",
    last_name: "Rodríguez Castro",
    document_number: "87654321",
    license_type: "B2",
    telephone: "3109876543",
    status: "inactive",
    blood_type: "A-",
    address: "Carrera 45 #23-89, Medellín",
    contract_id: "2",
    contract: mockContracts[1],
    created_at: "2024-01-10",
    updated_at: "2024-01-20"
  }
];

export default function Drivers() {
  const { toast } = useToast();
  const [drivers, setDrivers] = useState<Driver[]>(mockDrivers);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);

  const columns = [
    { key: 'name' as keyof Driver, header: 'Nombre' },
    { key: 'last_name' as keyof Driver, header: 'Apellido' },
    { key: 'document_number' as keyof Driver, header: 'Núm. Cédula' },
    { key: 'license_type' as keyof Driver, header: 'Tipo Licencia' },
    { key: 'telephone' as keyof Driver, header: 'Teléfono' },
    { key: 'blood_type' as keyof Driver, header: 'Tipo Sangre' },
    {
      key: 'contract' as keyof Driver,
      header: 'Contrato',
      render: (value: Contract) => value?.contract_code || 'Sin asignar'
    },
    {
      key: 'status' as keyof Driver,
      header: 'Estado',
      render: (value: any) => <StatusBadge status={value} />
    },
    {
      key: 'actions' as keyof Driver,
      header: 'Acciones',
      render: (_: any, driver: Driver) => (
        <DriverActions
          driver={driver}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )
    }
  ];

  const handleAdd = () => {
    setEditingDriver(null);
    setIsModalOpen(true);
  };

  const handleEdit = (driver: Driver) => {
    setEditingDriver(driver);
    setIsModalOpen(true);
  };

  const handleDelete = (driver: Driver) => {
    setDrivers(drivers.filter(d => d.id !== driver.id));
    toast({
      title: "Chofer eliminado",
      description: `${driver.name} ${driver.last_name} ha sido eliminado correctamente.`,
    });
  };

  const handleSubmit = (formData: Omit<Driver, 'id' | 'created_at' | 'updated_at'>) => {
    if (editingDriver) {
      const updatedDriver = {
        ...editingDriver,
        ...formData,
        updated_at: new Date().toISOString()
      };
      setDrivers(drivers.map(d => 
        d.id === editingDriver.id ? updatedDriver : d
      ));
      toast({
        title: "Chofer actualizado",
        description: `${formData.name} ${formData.last_name} ha sido actualizado correctamente.`,
      });
    } else {
      const newDriver: Driver = {
        id: Date.now().toString(),
        ...formData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setDrivers([...drivers, newDriver]);
      toast({
        title: "Chofer creado",
        description: `${formData.name} ${formData.last_name} ha sido creado correctamente.`,
      });
    }
    
    setIsModalOpen(false);
  };

  return (
    <div>
      <DataTable
        data={drivers}
        columns={columns}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        title="Gestión de Choferes"
        addButtonText="Agregar Chofer"
        searchField="document_number"
        searchPlaceholder="Buscar por cédula..."
      />

      <FormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingDriver ? "Editar Chofer" : "Agregar Chofer"}
      >
        <DriverForm
          driver={editingDriver}
          contracts={mockContracts}
          onSubmit={handleSubmit}
          onCancel={() => setIsModalOpen(false)}
        />
      </FormModal>
    </div>
  );
}
