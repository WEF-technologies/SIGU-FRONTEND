import { useState, useEffect } from "react";
import { Eye, Download } from "lucide-react";
import { DataTable } from "@/components/shared/DataTable";
import { FormModal } from "@/components/shared/FormModal";
import { DriverForm } from "@/components/drivers/DriverForm";
import { DriverActions } from "@/components/drivers/DriverActions";
import { Driver, Contract } from "@/types";
import { useToast } from "@/hooks/use-toast";

export default function Drivers() {
  const { toast } = useToast();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("http://localhost:8000/api/v1/drivers/").then(res => res.ok ? res.json() : []),
      fetch("http://localhost:8000/api/v1/contracts/").then(res => res.ok ? res.json() : []),
    ]).then(([driversData, contractsData]) => {
      setDrivers(Array.isArray(driversData) ? driversData : []);
      setContracts(Array.isArray(contractsData) ? contractsData : []);
    });
  }, []);

  const columns = [
    { key: 'name' as keyof Driver, header: 'Nombre' },
    { key: 'last_name' as keyof Driver, header: 'Apellido' },
    { key: 'document_number' as keyof Driver, header: 'Núm. Cédula' },
    { key: 'telephone' as keyof Driver, header: 'Teléfono' },
    { key: 'address' as keyof Driver, header: 'Dirección' },
    {
      key: 'contract' as keyof Driver,
      header: 'Contrato',
      render: (value: Contract) => value?.contract_code || 'Sin asignar'
    },
    {
      key: 'actions' as keyof Driver,
      header: 'Acciones',
      render: (_: any, driver: Driver) => (
        <div className="flex gap-1">
          <DriverActions
            driver={driver}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>
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

  const handleDelete = async (driver: Driver) => {
    // Eliminar chofer en backend
    await fetch(`http://localhost:8000/api/v1/drivers/${driver.id}`, {
      method: "DELETE",
    });
    setDrivers(drivers.filter(d => d.id !== driver.id));
    toast({
      title: "Chofer eliminado",
      description: `${driver.name} ${driver.last_name} ha sido eliminado correctamente.`,
    });
  };

  const handleSubmit = async (formData: Omit<Driver, 'id' | 'created_at' | 'updated_at'>) => {
    if (editingDriver) {
      // Actualizar chofer en backend
      const res = await fetch(`http://localhost:8000/api/v1/drivers/${editingDriver.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const updatedDriver = await res.json();
      setDrivers(drivers.map(d => 
        d.id === editingDriver.id ? updatedDriver : d
      ));
      toast({
        title: "Chofer actualizado",
        description: `${formData.name} ${formData.last_name} ha sido actualizado correctamente.`,
      });
    } else {
      // Crear chofer en backend
      const res = await fetch("http://localhost:8000/api/v1/drivers/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const newDriver = await res.json();
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
          contracts={contracts}
          onSubmit={handleSubmit}
          onCancel={() => setIsModalOpen(false)}
        />
      </FormModal>
    </div>
  );
}