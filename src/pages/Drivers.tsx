
import { useState } from "react";
import { DataTable } from "@/components/shared/DataTable";
import { FormModal } from "@/components/shared/FormModal";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Driver } from "@/types";

const mockDrivers: Driver[] = [
  {
    id: "1",
    name: "Carlos Alberto",
    last_name: "Mendoza Silva",
    document_number: "12345678",
    license_type: "B1",
    telephone: "3001234567",
    status: "active",
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
    created_at: "2024-01-10",
    updated_at: "2024-01-20"
  }
];

export default function Drivers() {
  const [drivers, setDrivers] = useState<Driver[]>(mockDrivers);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    last_name: "",
    document_number: "",
    license_type: "",
    telephone: "",
    status: "active" as 'active' | 'inactive'
  });

  const columns = [
    { key: 'name' as keyof Driver, header: 'Nombre' },
    { key: 'last_name' as keyof Driver, header: 'Apellido' },
    { key: 'document_number' as keyof Driver, header: 'Núm. Cédula' },
    { key: 'license_type' as keyof Driver, header: 'Tipo Licencia' },
    { key: 'telephone' as keyof Driver, header: 'Teléfono' },
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
      status: "active" as 'active' | 'inactive'
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
      status: driver.status
    });
    setIsModalOpen(true);
  };

  const handleDelete = (driver: Driver) => {
    setDrivers(drivers.filter(d => d.id !== driver.id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingDriver) {
      setDrivers(drivers.map(d => 
        d.id === editingDriver.id 
          ? { ...d, ...formData, updated_at: new Date().toISOString() }
          : d
      ));
    } else {
      const newDriver: Driver = {
        id: Date.now().toString(),
        ...formData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setDrivers([...drivers, newDriver]);
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
        searchField="name"
        searchPlaceholder="Buscar por nombre..."
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
          </div>

          <div className="grid grid-cols-2 gap-4">
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
