import { useState, useEffect } from "react";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuthenticatedFetch } from "@/hooks/useAuthenticatedFetch";

const API_URL = import.meta.env.VITE_API_URL || "https://sigu-back-e39xv5vbt-enmanuelalxs-projects.vercel.app";

interface SparePartRequest {
  id: string;
  spare_part_id: string;
  code: string;
  description: string;
  requested_by: string;
  date: string;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export default function SparePartRequests() {
  const { toast } = useToast();
  const authenticatedFetch = useAuthenticatedFetch();
  const [requests, setRequests] = useState<SparePartRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<SparePartRequest | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        console.log('Fetching spare part requests...');
        const response = await authenticatedFetch(`${API_URL}/api/v1/spare_part_requests/`);
        console.log('Requests response status:', response.status);
        if (response.ok) {
          const data = await response.json();
          console.log('Requests data received:', data);
          setRequests(Array.isArray(data) ? data : []);
        } else {
          console.error('Error fetching requests:', response.status);
          setRequests([]);
        }
      } catch (error) {
        console.error('Error fetching requests:', error);
        setRequests([]);
      }
    };

    fetchRequests();
  }, [authenticatedFetch]);

  const handleViewDetails = (request: SparePartRequest) => {
    setSelectedRequest(request);
    setIsDetailModalOpen(true);
  };

  const handleStatusChange = async (request: SparePartRequest, newStatus: 'approved' | 'rejected') => {
    try {
      const response = await authenticatedFetch(`${API_URL}/api/v1/spare_part_requests/${request.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (response.ok) {
        const updated = await response.json();
        setRequests(requests.map(req => req.id === request.id ? { ...req, status: newStatus } : req));
        const statusText = newStatus === 'approved' ? 'aprobada' : 'rechazada'; 
        toast({
          title: `Solicitud ${statusText}`,
          description: `La solicitud ${request.code} ha sido ${statusText} correctamente.`,
        });
        setIsDetailModalOpen(false);
      } else {
        console.error('Error updating request status:', response.status);
        toast({
          title: "Error",
          description: "Error al actualizar el estado de la solicitud.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error updating request status:', error);
      toast({
        title: "Error",
        description: "Error al actualizar el estado de la solicitud.",
        variant: "destructive"
      });
    }
  };

  const columns = [
    { key: 'code' as keyof SparePartRequest, header: 'Código' },
    { key: 'description' as keyof SparePartRequest, header: 'Descripción' },
    { key: 'requested_by' as keyof SparePartRequest, header: 'Solicitado por' },
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
                  <p className="text-gray-600">{selectedRequest.requested_by}</p>
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
