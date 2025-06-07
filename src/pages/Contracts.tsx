import { useState, useEffect } from "react";
import { FormModal } from "@/components/shared/FormModal";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ContractDetailsModal } from "@/components/contracts/ContractDetailsModal";
import { ContractForm } from "@/components/contracts/ContractForm";
import { ShiftForm } from "@/components/contracts/ShiftForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Contract, Shift, Vehicle, User } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Eye, Edit, Trash2, Plus, Search, Loader2, RefreshCw, Download } from "lucide-react";

// Datos de ejemplo
const mockVehicles: Vehicle[] = [
  {
    id: '1',
    brand: 'Toyota',
    model: 'Corolla',
    year: 2020,
    plate_number: 'ABC-123',
    status: 'available',
    created_at: '2024-01-01',
    updated_at: '2024-01-01'
  },
  {
    id: '2',
    brand: 'Honda',
    model: 'Civic',
    year: 2021,
    plate_number: 'DEF-456',
    status: 'available',
    created_at: '2024-01-01',
    updated_at: '2024-01-01'
  },
  {
    id: '3',
    brand: 'Ford',
    model: 'Focus',
    year: 2019,
    plate_number: 'GHI-789',
    status: 'maintenance',
    created_at: '2024-01-01',
    updated_at: '2024-01-01'
  }
];

const mockUsers: User[] = [
  {
    id: '1',
    document_type: 'CC',
    name: 'Juan',
    last_name: 'Pérez',
    status: 'active',
    telephone: '123456789',
    document_number: '12345678',
    created_at: '2024-01-01',
    updated_at: '2024-01-01'
  },
  {
    id: '2',
    document_type: 'CC',
    name: 'María',
    last_name: 'García',
    status: 'active',
    telephone: '987654321',
    document_number: '87654321',
    created_at: '2024-01-01',
    updated_at: '2024-01-01'
  },
  {
    id: '3',
    document_type: 'CC',
    name: 'Carlos',
    last_name: 'López',
    status: 'inactive',
    telephone: '555666777',
    document_number: '11223344',
    created_at: '2024-01-01',
    updated_at: '2024-01-01'
  }
];

const mockContracts: Contract[] = [
  {
    id: '1',
    description: 'Contrato de Transporte Urbano - Zona Norte',
    start_date: '2024-01-01',
    end_date: '2024-12-31',
    location: 'Zona Norte de la Ciudad',
    status: 'active',
    contract_code: 'CNT-2024-001',
    vehicles: [mockVehicles[0], mockVehicles[1]],
    users: [mockUsers[0], mockUsers[1]],
    document_url: 'https://example.com/contract1.pdf',
    created_at: '2024-01-01',
    updated_at: '2024-01-01'
  },
  {
    id: '2',
    description: 'Contrato de Servicios Especiales',
    start_date: '2024-03-01',
    end_date: '2024-09-30',
    location: 'Centro Empresarial',
    status: 'inactive',
    contract_code: 'CNT-2024-002',
    vehicles: [mockVehicles[2]],
    users: [mockUsers[2]],
    created_at: '2024-01-01',
    updated_at: '2024-01-01'
  },
  {
    id: '3',
    description: 'Contrato Temporal de Emergencia',
    start_date: '2024-02-15',
    end_date: '2024-03-15',
    location: 'Zona Sur',
    status: 'terminated',
    contract_code: 'CNT-2024-003',
    vehicles: [],
    users: [],
    created_at: '2024-01-01',
    updated_at: '2024-01-01'
  }
];

export default function Contracts() {
  const { toast } = useToast();
  const [contracts, setContracts] = useState<Contract[]>(mockContracts);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredContracts = contracts.filter(contract =>
    contract.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contract.contract_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contract.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdd = () => {
    setEditingContract(null);
    setIsModalOpen(true);
  };

  const handleEdit = (contract: Contract) => {
    setEditingContract(contract);
    setIsModalOpen(true);
  };

  const handleViewDetails = (contract: Contract) => {
    setSelectedContract(contract);
    setIsDetailsModalOpen(true);
  };

  const handleDelete = async (contract: Contract) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar el contrato "${contract.description}"?`)) {
      return;
    }

    setContracts(prev => prev.filter(c => c.id !== contract.id));
    toast({
      title: "Contrato eliminado",
      description: `${contract.description} ha sido eliminado correctamente.`,
    });
  };

  const handleSubmit = async (contractData: Omit<Contract, 'id' | 'created_at' | 'updated_at'>) => {
    setIsFormLoading(true);
    
    // Simular delay de API
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    try {
      if (editingContract) {
        const updatedContract = {
          ...editingContract,
          ...contractData,
          updated_at: new Date().toISOString()
        };
        setContracts(prev => prev.map(c => c.id === editingContract.id ? updatedContract : c));
        toast({
          title: "Contrato actualizado",
          description: `${contractData.description} ha sido actualizado correctamente.`,
        });
      } else {
        const newContract: Contract = {
          ...contractData,
          id: Date.now().toString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        setContracts(prev => [...prev, newContract]);
        toast({
          title: "Contrato creado",
          description: `${contractData.description} ha sido creado correctamente.`,
        });
      }
      
      setIsModalOpen(false);
      setEditingContract(null);
    } catch (error) {
      console.error('Error saving contract:', error);
      toast({
        title: "Error",
        description: `No se pudo ${editingContract ? 'actualizar' : 'crear'} el contrato`,
        variant: "destructive",
      });
    } finally {
      setIsFormLoading(false);
    }
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
    toast({
      title: "Turno eliminado",
      description: "El turno ha sido eliminado correctamente.",
    });
  };

  const handleShiftSubmit = (shiftData: Omit<Shift, 'id' | 'created_at' | 'updated_at'>) => {
    setIsShiftModalOpen(false);
    setEditingShift(null);
    toast({
      title: editingShift ? "Turno actualizado" : "Turno creado",
      description: `El turno ha sido ${editingShift ? 'actualizado' : 'creado'} correctamente.`,
    });
  };

  const handleDownloadDocument = async (contract: Contract) => {
    if (!contract.document_url) {
      toast({
        title: "Sin documento",
        description: "Este contrato no tiene un documento asociado.",
        variant: "destructive",
      });
      return;
    }

    // Simular descarga
    toast({
      title: "Descargando documento",
      description: `Descargando documento del contrato ${contract.contract_code || contract.description}`,
    });
  };

  return (
    <div className="animate-fade-in space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold text-primary-900">
              Gestión de Contratos
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setContracts(mockContracts)}
                className="border-gray-300"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Actualizar
              </Button>
              <Button onClick={handleAdd} className="bg-primary hover:bg-primary-600">
                <Plus className="w-4 h-4 mr-1" />
                Crear Nuevo Contrato
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar contratos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Badge variant="outline" className="text-sm">
              {filteredContracts.length} contrato{filteredContracts.length !== 1 ? 's' : ''} encontrado{filteredContracts.length !== 1 ? 's' : ''}
            </Badge>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold">Código</TableHead>
                  <TableHead className="font-semibold">Descripción</TableHead>
                  <TableHead className="font-semibold">Fechas</TableHead>
                  <TableHead className="font-semibold">Ubicación</TableHead>
                  <TableHead className="font-semibold">Estado</TableHead>
                  <TableHead className="font-semibold text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContracts.map((contract) => (
                  <TableRow key={contract.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">
                      {contract.contract_code || 'Sin código'}
                    </TableCell>
                    <TableCell>{contract.description}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>Inicio: {new Date(contract.start_date).toLocaleDateString()}</div>
                        <div>Fin: {new Date(contract.end_date).toLocaleDateString()}</div>
                      </div>
                    </TableCell>
                    <TableCell>{contract.location}</TableCell>
                    <TableCell>
                      <StatusBadge status={contract.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center gap-1">
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
                        {contract.document_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadDocument(contract)}
                            className="border-green-200 text-green-600 hover:bg-green-50"
                            title="Descargar documento"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        )}
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredContracts.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                No se encontraron contratos que coincidan con tu búsqueda.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <FormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingContract ? "Editar Contrato" : "Crear Nuevo Contrato"}
      >
        <ContractForm
          contract={editingContract}
          onSubmit={handleSubmit}
          onCancel={() => setIsModalOpen(false)}
          isLoading={isFormLoading}
          availableVehicles={mockVehicles}
          availableUsers={mockUsers}
        />
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
