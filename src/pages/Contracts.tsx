
import { useState } from "react";
import { DataTable } from "@/components/shared/DataTable";
import { FormModal } from "@/components/shared/FormModal";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Contract } from "@/types";

const mockContracts: Contract[] = [
  {
    id: "1",
    description: "Transporte escolar Colegio San José",
    start_date: "2024-01-15",
    end_date: "2024-12-15",
    location: "Bogotá, Colombia",
    status: "active",
    created_at: "2024-01-15",
    updated_at: "2024-01-15"
  },
  {
    id: "2",
    description: "Servicio de transporte empresarial",
    start_date: "2024-02-01",
    end_date: "2024-07-31",
    location: "Medellín, Colombia",
    status: "completed",
    created_at: "2024-02-01",
    updated_at: "2024-07-31"
  }
];

export default function Contracts() {
  const [contracts, setContracts] = useState<Contract[]>(mockContracts);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [formData, setFormData] = useState({
    description: "",
    start_date: "",
    end_date: "",
    location: "",
    status: "active"
  });

  const columns = [
    { key: 'description' as keyof Contract, header: 'Descripción' },
    { 
      key: 'start_date' as keyof Contract, 
      header: 'Fecha Inicio',
      render: (value: any) => new Date(value).toLocaleDateString()
    },
    { 
      key: 'end_date' as keyof Contract, 
      header: 'Fecha Fin',
      render: (value: any) => new Date(value).toLocaleDateString()
    },
    { key: 'location' as keyof Contract, header: 'Ubicación' },
    {
      key: 'status' as keyof Contract,
      header: 'Estado',
      render: (value: any) => <StatusBadge status={value} />
    },
    { key: 'actions' as keyof Contract, header: 'Acciones' }
  ];

  const handleAdd = () => {
    setEditingContract(null);
    setFormData({
      description: "",
      start_date: "",
      end_date: "",
      location: "",
      status: "active"
    });
    setIsModalOpen(true);
  };

  const handleEdit = (contract: Contract) => {
    setEditingContract(contract);
    setFormData({
      description: contract.description,
      start_date: contract.start_date,
      end_date: contract.end_date,
      location: contract.location,
      status: contract.status
    });
    setIsModalOpen(true);
  };

  const handleDelete = (contract: Contract) => {
    setContracts(contracts.filter(c => c.id !== contract.id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingContract) {
      setContracts(contracts.map(c => 
        c.id === editingContract.id 
          ? { ...c, ...formData, updated_at: new Date().toISOString() }
          : c
      ));
    } else {
      const newContract: Contract = {
        id: Date.now().toString(),
        ...formData,
        status: formData.status as 'active' | 'inactive' | 'completed',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setContracts([...contracts, newContract]);
    }
    
    setIsModalOpen(false);
  };

  return (
    <div>
      <DataTable
        data={contracts}
        columns={columns}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        title="Gestión de Contratos"
        addButtonText="Agregar Contrato"
      />

      <FormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingContract ? "Editar Contrato" : "Agregar Contrato"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Describa el contrato"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start_date">Fecha de Inicio</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="end_date">Fecha de Fin</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="location">Ubicación</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                placeholder="Ingrese la ubicación"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="status">Estado</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({...formData, status: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="inactive">Inactivo</SelectItem>
                  <SelectItem value="completed">Completado</SelectItem>
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
              {editingContract ? "Actualizar Contrato" : "Crear Contrato"}
            </Button>
          </div>
        </form>
      </FormModal>
    </div>
  );
}
