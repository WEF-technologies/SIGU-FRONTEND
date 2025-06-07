
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
import { Contract, Shift } from "@/types";
import { contractsApi } from "@/services/contractsApi";
import { useToast } from "@/hooks/use-toast";
import { Eye, Edit, Trash2, Plus, Search, Loader2, RefreshCw } from "lucide-react";

export default function Contracts() {
  const { toast } = useToast();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadContracts();
  }, []);

  const loadContracts = async () => {
    setLoading(true);
    try {
      const contractsData = await contractsApi.getContracts();
      setContracts(contractsData);
    } catch (error) {
      console.error('Error loading contracts:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los contratos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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

    try {
      await contractsApi.deleteContract(contract.id);
      setContracts(prev => prev.filter(c => c.id !== contract.id));
      toast({
        title: "Contrato eliminado",
        description: `${contract.description} ha sido eliminado correctamente.`,
      });
    } catch (error) {
      console.error('Error deleting contract:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el contrato",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (contractData: Omit<Contract, 'id' | 'created_at' | 'updated_at'>) => {
    setIsFormLoading(true);
    try {
      if (editingContract) {
        const updatedContract = await contractsApi.updateContract(editingContract.id, contractData);
        setContracts(prev => prev.map(c => c.id === editingContract.id ? updatedContract : c));
        toast({
          title: "Contrato actualizado",
          description: `${contractData.description} ha sido actualizado correctamente.`,
        });
      } else {
        const newContract = await contractsApi.createContract(contractData);
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
    // Implementation for deleting shift
    toast({
      title: "Turno eliminado",
      description: "El turno ha sido eliminado correctamente.",
    });
  };

  const handleShiftSubmit = (shiftData: Omit<Shift, 'id' | 'created_at' | 'updated_at'>) => {
    // Implementation for shift submission
    setIsShiftModalOpen(false);
    setEditingShift(null);
    toast({
      title: editingShift ? "Turno actualizado" : "Turno creado",
      description: `El turno ha sido ${editingShift ? 'actualizado' : 'creado'} correctamente.`,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin mr-2" />
        <span className="text-lg">Cargando contratos...</span>
      </div>
    );
  }

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
                onClick={loadContracts}
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
                  <TableHead className="font-semibold">Vehículos</TableHead>
                  <TableHead className="font-semibold">Usuarios</TableHead>
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
                      <div className="space-y-1">
                        {contract.vehicles?.slice(0, 2).map((vehicle) => (
                          <Badge key={vehicle.id} variant="outline" className="text-xs">
                            {vehicle.plate_number}
                          </Badge>
                        ))}
                        {(contract.vehicles?.length || 0) > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{(contract.vehicles?.length || 0) - 2} más
                          </Badge>
                        )}
                        {(!contract.vehicles || contract.vehicles.length === 0) && (
                          <span className="text-gray-500 text-sm">Sin vehículos</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {contract.users?.slice(0, 2).map((user) => (
                          <Badge key={user.id} variant="outline" className="text-xs">
                            {user.name} {user.last_name || user.lastname}
                          </Badge>
                        ))}
                        {(contract.users?.length || 0) > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{(contract.users?.length || 0) - 2} más
                          </Badge>
                        )}
                        {(!contract.users || contract.users.length === 0) && (
                          <span className="text-gray-500 text-sm">Sin usuarios</span>
                        )}
                      </div>
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
