import { ReactNode, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Contract, Shift, Route } from "@/types";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useToast } from "@/hooks/use-toast";
import { Edit, Trash2, Plus, Download, FileText, Loader2 } from "lucide-react";

interface ContractDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: Contract | null;
  onEditShift: (shift: Shift) => void;
  onDeleteShift: (shift: Shift) => void;
  onAddShift: (contract: Contract) => void;
}

// Datos mock para rutas y turnos
const mockRoutes: Route[] = [
  {
    id: '1',
    contract_id: '1',
    description: 'Ruta Centro - Norte',
    from_location: 'Centro de la Ciudad',
    to_location: 'Zona Norte',
    status: 'in_progress',
    created_at: '2024-01-01',
    updated_at: '2024-01-01'
  },
  {
    id: '2',
    contract_id: '1',
    description: 'Ruta Norte - Terminal',
    from_location: 'Zona Norte',
    to_location: 'Terminal de Buses',
    status: 'pending',
    created_at: '2024-01-01',
    updated_at: '2024-01-01'
  }
];

const mockShifts: Shift[] = [
  {
    id: '1',
    contract_id: '1',
    description: 'Turno Matutino 06:00 - 14:00',
    created_at: '2024-01-01',
    updated_at: '2024-01-01'
  },
  {
    id: '2',
    contract_id: '1',
    description: 'Turno Vespertino 14:00 - 22:00',
    created_at: '2024-01-01',
    updated_at: '2024-01-01'
  },
  {
    id: '3',
    contract_id: '1',
    description: 'Turno Nocturno 22:00 - 06:00',
    created_at: '2024-01-01',
    updated_at: '2024-01-01'
  }
];

export function ContractDetailsModal({ 
  isOpen, 
  onClose, 
  contract, 
  onEditShift, 
  onDeleteShift, 
  onAddShift 
}: ContractDetailsModalProps) {
  const { toast } = useToast();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloadingDoc, setDownloadingDoc] = useState(false);

  useEffect(() => {
    if (contract && isOpen) {
      loadContractDetails();
    }
  }, [contract, isOpen]);

  const loadContractDetails = async () => {
    if (!contract) return;
    
    setLoading(true);
    
    // Simular delay de carga
    await new Promise(resolve => setTimeout(resolve, 500));
    
    try {
      const contractRoutes = mockRoutes.filter(route => route.contract_id === contract.id);
      const contractShifts = mockShifts.filter(shift => shift.contract_id === contract.id);
      
      setRoutes(contractRoutes);
      setShifts(contractShifts);
    } catch (error) {
      console.error('Error loading contract details:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar todos los detalles del contrato",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadDocument = async () => {
    if (!contract) return;

    setDownloadingDoc(true);
    
    // Simular descarga
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    try {
      toast({
        title: "Descarga simulada",
        description: "En un entorno real se descargaría el documento del contrato",
      });
    } catch (error) {
      console.error('Error downloading document:', error);
      toast({
        title: "Error",
        description: "No se pudo descargar el documento",
        variant: "destructive",
      });
    } finally {
      setDownloadingDoc(false);
    }
  };

  if (!contract) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-primary-900">
            Detalles del Contrato
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Información General</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <span className="font-medium text-gray-700">Código:</span>
                  <p className="text-gray-900">{contract.contract_code || 'No asignado'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Descripción:</span>
                  <p className="text-gray-900">{contract.description}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Ubicación:</span>
                  <p className="text-gray-900">{contract.location}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Estado:</span>
                  <StatusBadge status={contract.status} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="font-medium text-gray-700">Fecha Inicio:</span>
                    <p className="text-gray-900">{new Date(contract.start_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Fecha Fin:</span>
                    <p className="text-gray-900">{new Date(contract.end_date).toLocaleDateString()}</p>
                  </div>
                </div>
                {contract.document_url && (
                  <div>
                    <span className="font-medium text-gray-700">Documento:</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadDocument}
                      disabled={downloadingDoc}
                      className="ml-2"
                    >
                      {downloadingDoc ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-1" />
                      ) : (
                        <Download className="w-4 h-4 mr-1" />
                      )}
                      {downloadingDoc ? 'Descargando...' : 'Descargar'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Vehículos Asignados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {contract.vehicles && contract.vehicles.length > 0 ? (
                    contract.vehicles.map((vehicle) => (
                      <Badge key={vehicle.id} variant="outline" className="mr-2 mb-2 p-2">
                        <div className="flex flex-col">
                          <span className="font-medium">{vehicle.plate_number}</span>
                          <span className="text-xs text-gray-500">{vehicle.brand} {vehicle.model}</span>
                        </div>
                      </Badge>
                    ))
                  ) : (
                    <p className="text-gray-500">No hay vehículos asignados</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Choferes Asignados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {contract.drivers && contract.drivers.length > 0 ? (
                    contract.drivers.map((driver) => (
                      <Badge key={driver.id} variant="outline" className="mr-2 mb-2 p-2">
                        <div className="flex flex-col">
                          <span className="font-medium">{driver.name} {driver.last_name}</span>
                          <span className="text-xs text-gray-500">{driver.document_number}</span>
                        </div>
                      </Badge>
                    ))
                  ) : (
                    <p className="text-gray-500">No hay choferes asignados</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Rutas del Contrato</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin mr-2" />
                    <span>Cargando rutas...</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {routes.length > 0 ? (
                      routes.map((route) => (
                        <div key={route.id} className="border rounded-lg p-3">
                          <h4 className="font-medium text-gray-900">{route.description}</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {route.from_location} → {route.to_location}
                          </p>
                          <div className="mt-2">
                            <StatusBadge status={route.status} />
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500">No hay rutas asignadas</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Turnos del Contrato</CardTitle>
                  <Button
                    size="sm"
                    onClick={() => onAddShift(contract)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Agregar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin mr-2" />
                    <span>Cargando turnos...</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {shifts.length > 0 ? (
                      shifts.map((shift) => (
                        <div key={shift.id} className="border rounded-lg p-3 flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900">{shift.description}</h4>
                            <p className="text-xs text-gray-500 mt-1">
                              Creado: {new Date(shift.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onEditShift(shift)}
                              className="border-blue-200 text-blue-600 hover:bg-blue-50"
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onDeleteShift(shift)}
                              className="border-red-200 text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500">No hay turnos asignados</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
