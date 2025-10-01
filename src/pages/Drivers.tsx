
import { useState, useEffect } from "react";
import { DataTable } from "@/components/shared/DataTable";
import { FormModal } from "@/components/shared/FormModal";
import { DriverForm } from "@/components/drivers/DriverForm";
import { DriverActions } from "@/components/drivers/DriverActions";
import { DriverAlerts } from "@/components/drivers/DriverAlerts";
import { Driver, Contract, DriverAlert } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useAuthenticatedFetch } from "@/hooks/useAuthenticatedFetch";

const API_URL = import.meta.env.VITE_API_URL || "https://sigu-back-e39xv5vbt-enmanuelalxs-projects.vercel.app";

export default function Drivers() {
  const { toast } = useToast();
  const authenticatedFetch = useAuthenticatedFetch();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [alerts, setAlerts] = useState<DriverAlert[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch contracts first
        console.log('Fetching contracts...');
        const contractsResponse = await authenticatedFetch(`${API_URL}/api/v1/contracts/`);
        console.log('Contracts response status:', contractsResponse.status);
        let contractsData = [];
        if (contractsResponse.ok) {
          contractsData = await contractsResponse.json();
          console.log('Contracts data received:', contractsData);
          setContracts(Array.isArray(contractsData) ? contractsData : []);
        } else {
          console.log('No contracts found or endpoint not available');
          setContracts([]);
        }

        // Fetch drivers
        console.log('Fetching drivers...');
        const driversResponse = await authenticatedFetch(`${API_URL}/api/v1/drivers/`);
        console.log('Drivers response status:', driversResponse.status);
        if (driversResponse.ok) {
          const driversData = await driversResponse.json();
          console.log('Drivers data received:', driversData);
          
          // Map contract data to drivers
          const driversWithContracts = driversData.map((driver: Driver) => {
            if (driver.contract_id) {
              const contract = contractsData.find((c: Contract) => c.id === driver.contract_id);
              return { ...driver, contract };
            }
            return driver;
          });
          
          setDrivers(Array.isArray(driversWithContracts) ? driversWithContracts : []);
        } else {
          console.log('No drivers found or endpoint not available');
          setDrivers([]);
        }

        // Fetch driver alerts
        console.log('Fetching driver alerts...');
        const alertsResponse = await authenticatedFetch(`${API_URL}/api/v1/drivers/alerts`);
        if (alertsResponse.ok) {
          const alertsData = await alertsResponse.json();
          console.log('Driver alerts received:', alertsData);
          setAlerts(Array.isArray(alertsData) ? alertsData : []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setDrivers([]);
        setContracts([]);
        setAlerts([]);
      }
    };

    fetchData();
  }, [authenticatedFetch]);

  const columns = [
    { key: 'name' as keyof Driver, header: 'Nombre' },
    { key: 'last_name' as keyof Driver, header: 'Apellido' },
    { key: 'document_number' as keyof Driver, header: 'Núm. Cédula' },
    { key: 'telephone' as keyof Driver, header: 'Teléfono' },
    { key: 'address' as keyof Driver, header: 'Dirección' },
    {
      key: 'contract' as keyof Driver,
      header: 'Contrato',
      render: (value: Contract) => value?.description || 'Sin asignar'
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
    try {
      const response = await authenticatedFetch(`${API_URL}/api/v1/drivers/${driver.document_number}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setDrivers(drivers.filter(d => d.document_number !== driver.document_number));
        toast({
          title: "Chofer eliminado",
          description: `${driver.name} ${driver.last_name} ha sido eliminado correctamente.`,
        });
      }
    } catch (error) {
      console.error('Error deleting driver:', error);
      toast({
        title: "Error",
        description: "Error al eliminar el chofer.",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (formData: Omit<Driver, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      if (editingDriver) {
        const response = await authenticatedFetch(`${API_URL}/api/v1/drivers/${editingDriver.document_number}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name,
            last_name: formData.last_name,
            document_number: formData.document_number,
            telephone: formData.telephone,
            address: formData.address,
            contract_id: formData.contract_id,
            status: formData.status,
            license_expiry_date: formData.license_expiry_date || null,
            defensive_driving_expiry_date: formData.defensive_driving_expiry_date || null
          }),
        });
        if (response.ok) {
          const updatedDriver = await response.json();
          // Add contract info to updated driver
          const contract = contracts.find(c => c.id === updatedDriver.contract_id);
          const driverWithContract = { ...updatedDriver, contract };
          
          setDrivers(drivers.map(d => 
            d.document_number === editingDriver.document_number ? driverWithContract : d
          ));
          toast({
            title: "Chofer actualizado",
            description: `${formData.name} ${formData.last_name} ha sido actualizado correctamente.`,
          });
        }
      } else {
        const response = await authenticatedFetch(`${API_URL}/api/v1/drivers/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name,
            last_name: formData.last_name,
            document_number: formData.document_number,
            telephone: formData.telephone,
            address: formData.address,
            contract_id: formData.contract_id,
            status: formData.status,
            license_expiry_date: formData.license_expiry_date || null,
            defensive_driving_expiry_date: formData.defensive_driving_expiry_date || null
          }),
        });
        if (response.ok) {
          const newDriver = await response.json();
          // Add contract info to new driver
          const contract = contracts.find(c => c.id === newDriver.contract_id);
          const driverWithContract = { ...newDriver, contract };
          
          setDrivers([...drivers, driverWithContract]);
          toast({
            title: "Chofer creado",
            description: `${formData.name} ${formData.last_name} ha sido creado correctamente.`,
          });
        }
      }
    } catch (error) {
      console.error('Error with driver operation:', error);
      toast({
        title: "Error",
        description: "Error al procesar la operación.",
        variant: "destructive"
      });
    }
    setIsModalOpen(false);
  };

  return (
    <div>
      <DriverAlerts alerts={alerts} />
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
