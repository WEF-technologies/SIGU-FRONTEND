import { useState, useEffect } from "react";
import { FormModal } from "@/components/shared/FormModal";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ContractDetailsModal } from "@/components/contracts/ContractDetailsModal";
import { ContractForm } from "@/components/contracts/ContractForm";
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
import { Contract, ContractPayload } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useAuthenticatedFetch } from "@/hooks/useAuthenticatedFetch";
import { fetchAllPages } from "@/lib/apiClient";
import { matchesSearch } from "@/lib/filtering";
import { localizeApiErrorPayload } from "@/lib/errorI18n";
import { isSessionExpiredError } from "@/lib/apiClient";
import { CONTRACT_STATUS_OPTIONS } from "@/types";
import { Eye, Plus, Search, Loader2, RefreshCw } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL ?? "";

export default function Contracts() {
  const { toast } = useToast();
  const authenticatedFetch = useAuthenticatedFetch();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchContracts = async () => {
    setLoading(true);
    try {
      const response = await fetchAllPages(authenticatedFetch, `${API_URL}/api/v1/contracts/`);
      if (response.ok) {
        const data = await response.json();
        setContracts(Array.isArray(data) ? data : []);
      } else {
        console.error('Error fetching contracts:', response.status);
        setContracts([]);
      }
    } catch (error) {
      console.error('Error fetching contracts:', error);
      setContracts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const contractsResponse = await fetchAllPages(authenticatedFetch, `${API_URL}/api/v1/contracts/`);
        
        if (contractsResponse.ok) {
          const contractsData = await contractsResponse.json();
          setContracts(Array.isArray(contractsData) ? contractsData : []);
        } else {
          setContracts([]);
        }
      } catch (error) {
        console.error('Error fetching contracts:', error);
        setContracts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredContracts = contracts.filter(contract =>
    matchesSearch(searchTerm, [
      contract.description,
      contract.location,
      contract.status,
      CONTRACT_STATUS_OPTIONS.find((option) => option.value === contract.status)?.label,
      contract.contract_number,
      contract.client,
    ])
  );

  const handleAdd = () => {
    setIsModalOpen(true);
  };

  const handleViewDetails = (contract: Contract) => {
    setSelectedContract(contract);
    setIsDetailsModalOpen(true);
  };


  /** Devuelve true si se creó; si falla, el modal queda abierto con lo escrito. */
  const handleSubmit = async (contractData: ContractPayload): Promise<boolean> => {
    setIsFormLoading(true);
    try {
      const response = await authenticatedFetch(`${API_URL}/api/v1/contracts/`, {
        method: "POST",
        body: JSON.stringify(contractData),
      });
      if (!response.ok) {
        let payload: unknown = null;
        try {
          payload = await response.json();
        } catch {
          payload = null;
        }
        toast({
          title: response.status === 409 ? "Contrato duplicado" : "No se pudo crear el contrato",
          description: localizeApiErrorPayload(payload, `No se pudo crear el contrato (${response.status}).`),
          variant: "destructive",
        });
        return false;
      }

      const newContract = await response.json();
      setContracts(prev => [...prev, newContract]);
      toast({
        title: "Contrato creado",
        description: `${contractData.description} ha sido creado correctamente.`,
      });
      setIsModalOpen(false);
      return true;
    } catch (error) {
      if (!isSessionExpiredError(error)) {
        toast({
          title: "Error",
          description: "No se pudo conectar con el servidor para crear el contrato.",
          variant: "destructive",
        });
      }
      return false;
    } finally {
      setIsFormLoading(false);
    }
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
                onClick={fetchContracts}
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
                  <TableHead className="font-semibold">Descripción</TableHead>
                  <TableHead className="font-semibold">Fechas</TableHead>
                  <TableHead className="font-semibold">Ubicación</TableHead>
                  <TableHead className="font-semibold">Estado</TableHead>
                  <TableHead className="font-semibold text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <div className="flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin mr-2" />
                        Cargando contratos...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredContracts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      No se encontraron contratos que coincidan con tu búsqueda.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredContracts.map((contract) => (
                    <TableRow key={contract.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium">{contract.description}</TableCell>
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
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <FormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Crear Nuevo Contrato"
      >
        <ContractForm
          onSubmit={handleSubmit}
          onCancel={() => setIsModalOpen(false)}
          isLoading={isFormLoading}
        />
      </FormModal>

      <ContractDetailsModal
        contract={selectedContract}
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
      />
    </div>
  );
}
