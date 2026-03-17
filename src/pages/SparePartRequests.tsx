import { useState, useEffect } from "react";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { FormModal } from "@/components/shared/FormModal";
import { SparePartRequestForm } from "@/components/spareparts/SparePartRequestForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Eye,
  CheckCircle,
  XCircle,
  Plus,
  Clock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuthenticatedFetch } from "@/hooks/useAuthenticatedFetch";

const API_URL = import.meta.env.VITE_API_URL || "https://sigu-back.vercel.app";

interface SparePartRequest {
  id: string;
  spare_part_id: string;
  code: string;
  description: string;
  requested_by: string;
  date: string;
  notes?: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

export default function SparePartRequests() {
  const { toast } = useToast();
  const authenticatedFetch = useAuthenticatedFetch();
  const [requests, setRequests] = useState<SparePartRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<SparePartRequest | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isNewRequestModalOpen, setIsNewRequestModalOpen] = useState(false);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const response = await authenticatedFetch(`${API_URL}/api/v1/spare_part_requests/`);
        if (response.ok) {
          const data = await response.json();
          const raw = Array.isArray(data) ? data : [];
          // Normalizar _id → id y status a minúsculas por si el backend varía
          const normalized = raw.map((item: any) => ({
            ...item,
            id: item.id ?? item._id ?? "",
            status: (item.status ?? "pending").toLowerCase(),
          }));
          setRequests(normalized);
        } else {
          setRequests([]);
        }
      } catch (error) {
        console.error("Error fetching requests:", error);
        setRequests([]);
      }
    };

    fetchRequests();
  }, [authenticatedFetch]);

  const handleViewDetails = (request: SparePartRequest) => {
    setSelectedRequest(request);
    setIsDetailModalOpen(true);
  };

  const handleStatusChange = async (
    request: SparePartRequest,
    newStatus: "approved" | "rejected"
  ) => {
    try {
      const response = await authenticatedFetch(
        `${API_URL}/api/v1/spare_part_requests/${request.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (response.ok) {
        setRequests((prev) =>
          prev.map((req) =>
            req.id === request.id ? { ...req, status: newStatus } : req
          )
        );
        const statusText = newStatus === "approved" ? "aprobada" : "rechazada";
        toast({
          title: `Solicitud ${statusText}`,
          description: `La solicitud ${request.code} ha sido ${statusText} correctamente.`,
        });
        setIsDetailModalOpen(false);
      } else {
        toast({
          title: "Error",
          description: "Error al actualizar el estado de la solicitud.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al actualizar el estado de la solicitud.",
        variant: "destructive",
      });
    }
  };

  const handleNewRequest = async (requestData: {
    code: string;
    description: string;
    requestedBy: string;
    date: string;
    notes?: string;
  }) => {
    try {
      const response = await authenticatedFetch(`${API_URL}/api/v1/spare_part_requests/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: requestData.code,
          description: requestData.description,
          requested_by: requestData.requestedBy,
          date: requestData.date,
          notes: requestData.notes || null,
        }),
      });

      if (response.ok) {
        const newRequest = await response.json();
        setRequests((prev) => [newRequest, ...prev]);
        toast({
          title: "Solicitud enviada",
          description: `Solicitud ${requestData.code} creada correctamente.`,
        });
        setIsNewRequestModalOpen(false);
      } else {
        toast({
          title: "Error",
          description: "Error al crear la solicitud.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al crear la solicitud.",
        variant: "destructive",
      });
    }
  };

  const pending = requests.filter((r) => r.status === "pending").length;
  const approved = requests.filter((r) => r.status === "approved").length;
  const rejected = requests.filter((r) => r.status === "rejected").length;

  const columns = [
    { key: "code" as keyof SparePartRequest, header: "Código" },
    { key: "description" as keyof SparePartRequest, header: "Descripción" },
    { key: "requested_by" as keyof SparePartRequest, header: "Solicitado por" },
    { key: "date" as keyof SparePartRequest, header: "Fecha" },
    {
      key: "status" as keyof SparePartRequest,
      header: "Estado",
      render: (status: string) => <StatusBadge status={status} />,
    },
    {
      key: "actions" as keyof SparePartRequest,
      header: "Acciones",
      render: (_: any, request: SparePartRequest) => (
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleViewDetails(request)}
            className="h-8 w-8 p-0 border-blue-200 text-blue-600 hover:bg-blue-50"
            title="Ver detalles"
          >
            <Eye className="w-4 h-4" />
          </Button>

          {request.status === "pending" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange(request, "approved")}
                className="h-8 w-8 p-0 border-green-200 text-green-600 hover:bg-green-50"
                title="Aprobar"
              >
                <CheckCircle className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange(request, "rejected")}
                className="h-8 w-8 p-0 border-red-200 text-red-600 hover:bg-red-50"
                title="Rechazar"
              >
                <XCircle className="w-4 h-4" />
              </Button>
            </>
          )}

          {request.status === "approved" && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1">
              <CheckCircle className="w-3 h-3" />
              Aprobada
            </span>
          )}

          {request.status === "rejected" && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">
              <XCircle className="w-3 h-3" />
              Rechazada
            </span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary-900">Solicitudes de Repuestos</h1>
          <p className="text-gray-600 mt-1">Gestiona las solicitudes de repuestos del personal</p>
        </div>
        <Button
          onClick={() => setIsNewRequestModalOpen(true)}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-5 py-2.5 font-medium shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Nueva Solicitud
        </Button>
      </div>

      {/* Resumen de estado */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-full bg-yellow-100 p-2">
              <Clock className="w-5 h-5 text-yellow-700" />
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-800">{pending}</p>
              <p className="text-sm text-yellow-700 font-medium">Pendientes</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-full bg-green-100 p-2">
              <CheckCircle className="w-5 h-5 text-green-700" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-800">{approved}</p>
              <p className="text-sm text-green-700 font-medium">Aprobadas</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-full bg-red-100 p-2">
              <XCircle className="w-5 h-5 text-red-700" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-800">{rejected}</p>
              <p className="text-sm text-red-700 font-medium">Rechazadas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla */}
      <DataTable
        data={requests}
        columns={columns}
        title=""
        searchField="code"
        searchPlaceholder="Buscar por código..."
        hideAddButton={true}
      />

      {/* Modal detalle */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalles de la Solicitud</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-lg text-primary-900">{selectedRequest.code}</span>
                <StatusBadge status={selectedRequest.status} />
              </div>

              <div className="grid grid-cols-1 gap-3 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Descripción:</span>
                  <p className="text-gray-600 mt-0.5">{selectedRequest.description}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Solicitado por:</span>
                  <p className="text-gray-600 mt-0.5">{selectedRequest.requested_by}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Fecha:</span>
                  <p className="text-gray-600 mt-0.5">{selectedRequest.date}</p>
                </div>
                {selectedRequest.notes && (
                  <div>
                    <span className="font-medium text-gray-700">Notas:</span>
                    <p className="text-gray-600 bg-gray-50 p-3 rounded-lg mt-0.5">
                      {selectedRequest.notes}
                    </p>
                  </div>
                )}
              </div>

              {selectedRequest.status === "pending" && (
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    onClick={() => handleStatusChange(selectedRequest, "approved")}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Aprobar
                  </Button>
                  <Button
                    onClick={() => handleStatusChange(selectedRequest, "rejected")}
                    variant="outline"
                    className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Rechazar
                  </Button>
                </div>
              )}

              {selectedRequest.status === "approved" && (
                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
                    <CheckCircle className="w-5 h-5 shrink-0" />
                    <span className="font-medium">Esta solicitud fue aprobada.</span>
                  </div>
                </div>
              )}

              {selectedRequest.status === "rejected" && (
                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                    <XCircle className="w-5 h-5 shrink-0" />
                    <span className="font-medium">Esta solicitud fue rechazada.</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal nueva solicitud */}
      <FormModal
        isOpen={isNewRequestModalOpen}
        onClose={() => setIsNewRequestModalOpen(false)}
        title="Nueva Solicitud de Repuesto"
      >
        <SparePartRequestForm
          onSubmit={handleNewRequest}
          onCancel={() => setIsNewRequestModalOpen(false)}
        />
      </FormModal>
    </div>
  );
}
