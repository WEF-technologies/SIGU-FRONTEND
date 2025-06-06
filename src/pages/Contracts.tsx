import { useState, useMemo } from "react";
import { DataTable } from "@/components/shared/DataTable";
import { FormModal } from "@/components/shared/FormModal";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ContractDetailsModal } from "@/components/contracts/ContractDetailsModal";
import { ShiftForm } from "@/components/contracts/ShiftForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Contract, Shift } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Eye, Edit, Trash2 } from "lucide-react";

export default function Contracts() {
  const { toast } = useToast();
  const [contracts, setContracts] = useState<Contract[]>([
    {
      id: "1",
      description: "Contrato de Transporte Sede Norte",
      start_date: "2024-01-01",
      end_date: "2024-12-31",
      location: "Sede Norte",
      status: "active",
      contract_code: "CNT-2024-001",
      created_at: "2024-01-01",
      updated_at: "2024-01-01",
    },
    {
      id: "2", 
      description: "Contrato de Transporte Sede Sur",
      start_date: "2024-02-01",
      end_date: "2024-11-30",
      location: "Sede Sur",
      status: "active",
      contract_code: "CNT-2024-002",
      created_at: "2024-02-01",
      updated_at: "2024-02-01",
    },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    description: "",
    start_date: "",
    end_date: "",
    location: "",
    status: "active" as Contract['status'],
    contract_code: "",
  });

  const filteredContracts = useMemo(() => {
    return contracts.filter(contract =>
      contract.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.contract_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.location.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [contracts, searchTerm]);

  const resetForm = () => {
    setFormData({
      description: "",
      start_date: "",
      end_date: "",
      location: "",
      status: "active",
      contract_code: "",
    });
    setEditingContract(null);
  };

  const handleAdd = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleEdit = (contract: Contract) => {
    setFormData({
      description: contract.description,
      start_date: contract.start_date,
      end_date: contract.end_date,
      location: contract.location,
      status: contract.status,
      contract_code: contract.contract_code || "",
    });
    setEditingContract(contract);
    setIsModalOpen(true);
  };

  const handleViewDetails = (contract: Contract) => {
    setSelectedContract(contract);
    setIsDetailsModalOpen(true);
  };

  const handleDelete = (contract: Contract) => {
    setContracts(prev => prev.filter(c => c.id !== contract.id));
    toast({
      title: "Contrato eliminado",
      description: `${contract.description} ha sido eliminado correctamente.`,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingContract) {
      setContracts(prev => prev.map(c => 
        c.id === editingContract.id 
          ? { ...c, ...formData, updated_at: new Date().toISOString() }
          : c
      ));
      toast({
        title: "Contrato actualizado",
        description: `${formData.description} ha sido actualizado correctamente.`,
      });
    } else {
      const newContract: Contract = {
        id: Date.now().toString(),
        ...formData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setContracts(prev => [...prev, newContract]);
      toast({
        title: "Contrato creado",
        description: `${formData.description} ha sido creado correctamente.`,
      });
    }
    
    setIsModalOpen(false);
    resetForm();
  };

  const handleAddShift = (contract: Contract) => {
    setSelectedContract(contract);
    setEditingShift(null);
    setIsShiftModalOpen(true);
  };

  const handleEditShift = (shift: Shift) => {
    setEditingShift(shift);
    setIsShiftModalOpen(true);
  };

  const handleDeleteShift = (shift: Shift) => {
    if (selectedContract) {
      const updatedContract = {
        ...selectedContract,
        shifts: selectedContract.shifts?.filter(s => s.id !== shift.id) || []
      };
      setSelectedContract(updatedContract);
      setContracts(prev => prev.map(c => c.id === selectedContract.id ? updatedContract : c));
      
      toast({
        title: "Turno eliminado",
        description: "El turno ha sido eliminado correctamente.",
      });
    }
  };

  const handleShiftSubmit = (shiftData: Omit<Shift, 'id' | 'created_at' | 'updated_at'>) => {
    if (!selectedContract) return;

    if (editingShift) {
      const updatedShift = {
        ...editingShift,
        ...shiftData,
        updated_at: new Date().toISOString()
      };
      
      const updatedContract = {
        ...selectedContract,
        shifts: selectedContract.shifts?.map(s => s.id === editingShift.id ? updatedShift : s) || []
      };
      
      setSelectedContract(updatedContract);
      setContracts(prev => prev.map(c => c.id === selectedContract.id ? updatedContract : c));
      
      toast({
        title: "Turno actualizado",
        description: "El turno ha sido actualizado correctamente.",
      });
    } else {
      const newShift: Shift = {
        id: Date.now().toString(),
        ...shiftData,
        contract_id: selectedContract.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const updatedContract = {
        ...selectedContract,
        shifts: [...(selectedContract.shifts || []), newShift]
      };
      
      setSelectedContract(updatedContract);
      setContracts(prev => prev.map(c => c.id === selectedContract.id ? updatedContract : c));
      
      toast({
        title: "Turno creado",
        description: "El turno ha sido creado correctamente.",
      });
    }
    
    setIsShiftModalOpen(false);
    setEditingShift(null);
  };

  const columns = [
    { key: 'contract_code' as keyof Contract, header: 'Código' },
    { key: 'description' as keyof Contract, header: 'Descripción' },
    { key: 'start_date' as keyof Contract, header: 'Fecha Inicio' },
    { key: 'end_date' as keyof Contract, header: 'Fecha Fin' },
    { key: 'location' as keyof Contract, header: 'Ubicación' },
    { 
      key: 'status' as keyof Contract, 
      header: 'Estado',
      render: (status: Contract['status']) => <StatusBadge status={status} />
    },
    { 
      key: 'actions' as const, 
      header: 'Acciones',
      render: (value: any, contract: Contract) => (
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleViewDetails(contract)}
            className="border-blue-200 text-blue-600 hover:bg-blue-50"
            title="Ver detalles"
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleEdit(contract)}
            className="border-primary-200 text-primary hover:bg-primary-50"
            title="Editar"
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDelete(contract)}
            className="border-red-200 text-red-600 hover:bg-red-50"
            title="Eliminar"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )
    },
  ];

  return (
    <div className="animate-fade-in space-y-4">
      <DataTable
        data={filteredContracts}
        columns={columns}
        onAdd={handleAdd}
        title="Gestión de Contratos"
        addButtonText="Crear Nuevo Contrato"
        searchField="description"
        searchPlaceholder="Buscar contratos..."
      />

      <FormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingContract ? "Editar Contrato" : "Crear Nuevo Contrato"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="contract_code">Código del Contrato</Label>
            <Input
              id="contract_code"
              value={formData.contract_code}
              onChange={(e) => setFormData(prev => ({ ...prev, contract_code: e.target.value }))}
              placeholder="CNT-2024-001"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Descripción</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
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
                onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="end_date">Fecha de Fin</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="location">Ubicación</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              required
            />
          </div>

          <div>
            <Label htmlFor="status">Estado</Label>
            <Select
              value={formData.status}
              onValueChange={(value: Contract['status']) => 
                setFormData(prev => ({ ...prev, status: value }))
              }
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

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary-600">
              {editingContract ? "Actualizar" : "Crear"}
            </Button>
          </div>
        </form>
      </FormModal>

      <ContractDetailsModal
        contract={selectedContract}
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        onEditShift={handleEditShift}
        onDeleteShift={handleDeleteShift}
        onAddShift={handleAddShift}
      />

      <FormModal
        isOpen={isShiftModalOpen}
        onClose={() => setIsShiftModalOpen(false)}
        title={editingShift ? "Editar Turno" : "Crear Nuevo Turno"}
      >
        <ShiftForm
          onSubmit={handleShiftSubmit}
          onCancel={() => setIsShiftModalOpen(false)}
          editingShift={editingShift}
        />
      </FormModal>
    </div>
  );
}
