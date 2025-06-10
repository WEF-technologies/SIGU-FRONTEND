
import { useState } from "react";
import { DataTable } from "@/components/shared/DataTable";
import { FormModal } from "@/components/shared/FormModal";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Driver, Contract } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Upload } from "lucide-react";

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
  const [formData, setFormData] = useState({
    name: "",
    last_name: "",
    document_number: "",
    license_type: "",
    telephone: "",
    blood_type: "",
    address: "",
    contract_id: "",
    status: "active" as 'active' | 'inactive',
    document_url: ""
  });

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
    { key: 'actions' as keyof Driver, header: 'Acciones' }
  ];

  const handleAdd = () => {
    setEditingDriver(null);
    setFormData({
      name: "",
      last_name: "",
      document_number: "",
      license_type: "",
      telephone: "",
      blood_type: "",
      address: "",
      contract_id: "",
      status: "active",
      document_url: ""
    });
    setIsModalOpen(true);
  };

  const handleEdit = (driver: Driver) => {
    setEditingDriver(driver);
    setFormData({
      name: driver.name,
      last_name: driver.last_name,
      document_number: driver.document_number,
      license_type: driver.license_type,
      telephone: driver.telephone,
      blood_type: driver.blood_type || "",
      address: driver.address || "",
      contract_id: driver.contract_id || "",
      status: driver.status,
      document_url: driver.document_url || ""
    });
    setIsModalOpen(true);
  };

  const handleDelete = (driver: Driver) => {
    setDrivers(drivers.filter(d => d.id !== driver.id));
    toast({
      title: "Chofer eliminado",
      description: `${driver.name} ${driver.last_name} ha sido eliminado correctamente.`,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const selectedContract = mockContracts.find(c => c.id === formData.contract_id);
    
    if (editingDriver) {
      const updatedDriver = {
        ...editingDriver,
        ...formData,
        contract: selectedContract,
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
        contract: selectedContract,
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Simular subida de archivo
      const fileUrl = URL.createObjectURL(file);
      setFormData({...formData, document_url: fileUrl});
      toast({
        title: "Documento cargado",
        description: `${file.name} ha sido cargado correctamente.`,
      });
    }
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
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Ingrese el nombre"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="last_name">Apellido</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                placeholder="Ingrese el apellido"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="document_number">Número de Cédula</Label>
              <Input
                id="document_number"
                value={formData.document_number}
                onChange={(e) => setFormData({...formData, document_number: e.target.value})}
                placeholder="Ingrese el número de cédula"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="blood_type">Tipo de Sangre</Label>
              <Select
                value={formData.blood_type}
                onValueChange={(value) => setFormData({...formData, blood_type: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A+">A+</SelectItem>
                  <SelectItem value="A-">A-</SelectItem>
                  <SelectItem value="B+">B+</SelectItem>
                  <SelectItem value="B-">B-</SelectItem>
                  <SelectItem value="AB+">AB+</SelectItem>
                  <SelectItem value="AB-">AB-</SelectItem>
                  <SelectItem value="O+">O+</SelectItem>
                  <SelectItem value="O-">O-</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="license_type">Tipo de Licencia</Label>
              <Select
                value={formData.license_type}
                onValueChange={(value) => setFormData({...formData, license_type: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A1">A1 - Motocicletas</SelectItem>
                  <SelectItem value="A2">A2 - Motocicletas</SelectItem>
                  <SelectItem value="B1">B1 - Automóviles</SelectItem>
                  <SelectItem value="B2">B2 - Camionetas</SelectItem>
                  <SelectItem value="C1">C1 - Camiones</SelectItem>
                  <SelectItem value="C2">C2 - Buses</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="telephone">Teléfono</Label>
              <Input
                id="telephone"
                value={formData.telephone}
                onChange={(e) => setFormData({...formData, telephone: e.target.value})}
                placeholder="Ingrese el teléfono"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="address">Dirección</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
              placeholder="Ingrese la dirección completa"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contract_id">Contrato</Label>
              <Select
                value={formData.contract_id}
                onValueChange={(value) => setFormData({...formData, contract_id: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar contrato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin asignar</SelectItem>
                  {mockContracts.map((contract) => (
                    <SelectItem key={contract.id} value={contract.id}>
                      {contract.contract_code} - {contract.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="status">Estado</Label>
              <Select
                value={formData.status}
                onValueChange={(value: 'active' | 'inactive') => setFormData({...formData, status: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="inactive">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="document">Documento</Label>
            <div className="flex items-center gap-2">
              <Input
                id="document"
                type="file"
                onChange={handleFileUpload}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                className="flex-1"
              />
              <Button type="button" variant="outline" size="sm">
                <Upload className="w-4 h-4" />
              </Button>
            </div>
            {formData.document_url && (
              <p className="text-sm text-green-600 mt-1">Documento cargado correctamente</p>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit">
              {editingDriver ? "Actualizar Chofer" : "Crear Chofer"}
            </Button>
          </div>
        </form>
      </FormModal>
    </div>
  );
}
