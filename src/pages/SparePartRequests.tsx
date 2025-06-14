
import { useState } from "react";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SparePartRequest {
  id: string;
  code: string;
  description: string;
  requestedBy: string;
  date: string;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

const mockRequests: SparePartRequest[] = [
  {
    id: "1",
    code: "BRK-001",
    description: "Pastillas de freno delanteras",
    requestedBy: "Juan Pérez",
    date: "2024-01-20",
    notes: "Urgente - Vehículo ABC-123 requiere cambio inmediato",
    status: "pending",
    createdAt: "2024-01-20T10:30:00Z"
  },
  {
    id: "2",
    code: "OIL-003",
    description: "Filtro de aceite marca premium",
    requestedBy: "María González",
    date: "2024-01-18",
    status: "approved",
    createdAt: "2024-01-18T14:15:00Z"
  },
  {
    id: "3",
    code: "TIR-005",
    description: "Llanta 215/75R16 para vehículo de carga",
    requestedBy: "Carlos López",
    date: "2024-01-15",
    notes: "Solicitud para reposición por desgaste normal",
    status: "rejected",
    createdAt: "2024-01-15T09:45:00Z"
  }
];

export default function SparePartRequests() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<SparePartRequest[]>(mockRequests);
  const [selectedRequest, setSelectedRequest] = useState<SparePartRequest | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const handleViewDetails = (request: SparePartRequest) => {
    setSelectedRequest(request);
    setIsDetailModalOpen(true);
  };

  const handleStatusChange = (request: SparePartRequest, newStatus: 'approved' | 'rejected') => {
    setRequests(requests.map(req => 
      req.id === request.id ? { ...req, status: newStatus } : req
    ));
    
    const statusText = newStatus === 'approved' ? 'aprobada' : 'rechazada';
    toast({
      title: `Solicitud ${statusText}`,
      description: `La solicitud ${request.code} ha sido ${statusText} correctamente.`,
    });
  };

  const columns = [
    { key: 'code' as keyof SparePartRequest, header: 'Código' },
    { key: 'description' as keyof SparePartRequest, header: 'Descripción' },
    { key: 'requestedBy' as keyof SparePartRequest, header: 'Solicitado por' },
    { key: 'date' as keyof SparePartRequest, header: 'Fecha' },
    {
      key: 'status' as keyof SparePartRequest,
      header: 'Estado',
      render: (status: string) => (
        <StatusBadge status={status} />
      )
    },
    {
      key: 'actions' as keyof SparePartRequest,
      header: 'Acciones',
      render: (_: any, request: SparePartRequest) => (
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleViewDetails(request)}
            className="h-8 w-8 p-0 border-blue-200 text-blue-600 hover:bg-blue-50"
          >
            <Eye className="w-4 h-4" />
          </Button>
          {request.status === 'pending' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange(request, 'approved')}
                className="h-8 w-8 p-0 border-green-200 text-green-600 hover:bg-green-50"
              >
                <CheckCircle className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange(request, 'rejected')}
                className="h-8 w-8 p-0 border-red-200 text-red-600 hover:bg-red-50"
              >
                <XCircle className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary-900">Solicitudes de Repuestos</h1>
          <p className="text-gray-600 mt-1">Gestiona las solicitudes de repuestos del personal</p>
        </div>
      </div>

      <DataTable
        data={requests}
        columns={columns}
        title=""
        searchField="code"
        searchPlaceholder="Buscar por código..."
        hideAddButton={true}
      />

      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalles de la Solicitud</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  {selectedRequest.code}
                  <StatusBadge status={selectedRequest.status} />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-700">Descripción:</h4>
                  <p className="text-gray-600">{selectedRequest.description}</p>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-700">Solicitado por:</h4>
                  <p className="text-gray-600">{selectedRequest.requestedBy}</p>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-700">Fecha de solicitud:</h4>
                  <p className="text-gray-600">{selectedRequest.date}</p>
                </div>
                
                {selectedRequest.notes && (
                  <div>
                    <h4 className="font-medium text-gray-700">Notas adicionales:</h4>
                    <p className="text-gray-600 bg-gray-50 p-3 rounded-lg">{selectedRequest.notes}</p>
                  </div>
                )}
                
                {selectedRequest.status === 'pending' && (
                  <div className="flex gap-3 pt-4 border-t">
                    <Button 
                      onClick={() => handleStatusChange(selectedRequest, 'approved')}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Aprobar
                    </Button>
                    <Button 
                      onClick={() => handleStatusChange(selectedRequest, 'rejected')}
                      variant="outline"
                      className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Rechazar
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
