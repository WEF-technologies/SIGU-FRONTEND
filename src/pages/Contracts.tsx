
import { useState } from "react";
import { DataTable } from "@/components/shared/DataTable";
import { FormModal } from "@/components/shared/FormModal";
import { ContractDetailsModal } from "@/components/contracts/ContractDetailsModal";
import { ShiftForm } from "@/components/contracts/ShiftForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Edit, Trash2, Plus } from "lucide-react";
import { Contract, Shift } from "@/types";

const mockContracts: Contract[] = [
  {
    id: "1",
    contract_code: "CONT-001",
    description: "Transporte escolar Colegio San José",
    start_date: "2024-01-15",
    end_date: "2024-12-15",
    location: "Bogotá, Colombia",
    status: "active",
    created_at: "2024-01-15",
    updated_at: "2024-01-15",
    vehicles: [
      { id: "1", brand: "Toyota", model: "Hiace", year: 2020, plate_number: "ABC-123", status: "active", created_at: "", updated_at: "" }
    ],
    routes: [
      { id: "1", contract_id: "1", description: "Ruta Norte", from_location: "Barrio Norte", to_location: "Colegio", status: "in_progress", created_at: "", updated_at: "" }
    ],
    shifts: [
      { id: "1", contract_id: "1", description: "Turno Mañana 6:00 AM - 12:00 PM", created_at: "", updated_at: "" }
    ]
  },
  {
    id: "2",
    contract_code: "CONT-002",
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
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [formData, setFormData] = useState({
    contract_code: "",
    description: "",
    start_date: "",
    end_date: "",
    location: "",
    status: "active" as 'active' | 'inactive' | 'completed'
  });

  const columns = [
    { key: 'contract_code' as keyof Contract, header: 'Código' },
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
      contract_code: "",
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
      contract_code: contract.contract_code || "",
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

  const handleViewDetails = (contract: Contract) => {
    setSelectedContract(contract);
    setIsDetailsModalOpen(true);
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
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setContracts([...contracts, newContract]);
    }
    
    setIsModalOpen(false);
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
      setContracts(contracts.map(c => 
        c.id === selectedContract.id 
          ? { 
              ...c, 
              shifts: c.shifts?.filter(s => s.id !== shift.id) || [],
              updated_at: new Date().toISOString() 
            }
          : c
      ));
      setSelectedContract({
        ...selectedContract,
        shifts: selectedContract.shifts?.filter(s => s.id !== shift.id) || []
      });
    }
  };

  const handleShiftSubmit = (shiftData: Omit<Shift, 'id' | 'created_at' | 'updated_at'>) => {
    if (selectedContract) {
      if (editingShift) {
        const updatedShift: Shift = {
          ...editingShift,
          ...shiftData,
          updated_at: new Date().toISOString()
        };

        setContracts(contracts.map(c => 
          c.id === selectedContract.id 
            ? { 
                ...c, 
                shifts: c.shifts?.map(s => s.id === editingShift.id ? updatedShift : s) || [],
                updated_at: new Date().toISOString() 
              }
            : c
        ));
      } else {
        const newShift: Shift = {
          id: Date.now().toString(),
          ...shiftData,
          contract_id: selectedContract.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        setContracts(contracts.map(c => 
          c.id === selectedContract.id 
            ? { 
                ...c, 
                shifts: [...(c.shifts || []), newShift],
                updated_at: new Date().toISOString() 
              }
            : c
        ));
      }
    }
    setIsShiftModalOpen(false);
  };

  return (
    <div>
      <DataTable
        data={contracts}
        columns={columns.map(col => ({
          ...col,
          render: col.key === 'actions' ? (value: any, item: Contract) => (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleViewDetails(item)}
                className="border-blue-200 text-blue-600 hover:bg-blue-50"
                title="Ver Detalles"
              >
                <Eye className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEdit(item)}
                className="border-primary-200 text-primary hover:bg-primary-50"
                title="Editar"
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAddShift(item)}
                className="border-green-200 text-green-600 hover:bg-green-50"
                title="Agregar Turno"
              >
                <Plus className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDelete(item)}
                className="border-red-200 text-red-600 hover:bg-red-50"
                title="Eliminar"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ) : col.render
        }))}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        title="Gestión de Contratos"
        addButtonText="Agregar Contrato"
        searchField="description"
        searchPlaceholder="Buscar por descripción..."
      />

      <FormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingContract ? "Editar Contrato" : "Agregar Contrato"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="contract_code">Código del Contrato</Label>
            <Input
              id="contract_code"
              value={formData.contract_code}
              onChange={(e) => setFormData({...formData, contract_code: e.target.value})}
              placeholder="Ej: CONT-001"
            />
          </div>

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
                onValueChange={(value: 'active' | 'inactive' | 'completed') => setFormData({...formData, status: value})}
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

      <ContractDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        contract={selectedContract}
        onEditShift={handleEditShift}
        onDeleteShift={handleDeleteShift}
        onAddShift={handleAddShift}
      />

      <FormModal
        isOpen={isShiftModalOpen}
        onClose={() => setIsShiftModalOpen(false)}
        title={editingShift ? "Editar Turno" : "Agregar Turno"}
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
