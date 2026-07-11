import { useState, useEffect, useCallback, useMemo } from "react";
import { DataTable, Column } from "@/components/shared/DataTable";
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
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuthenticatedFetch } from "@/hooks/useAuthenticatedFetch";
import { localizeApiErrorPayload } from "@/lib/errorI18n";

const API_URL = import.meta.env.VITE_API_URL ?? "";
const REQUESTS_PAGE_SIZE = 500;
const MAX_REQUESTS_PAGES = 20;
const AUTO_REFRESH_MS = 45000;

type RequestStatus = "pending" | "approved" | "rejected";

interface SparePartRequestFormData {
  code: string;
  description: string;
  requestedBy: string;
  date: string;
  notes?: string;
}

interface SparePartRequest {
  id: string;
  spare_part_id: string;
  code: string;
  description: string;
  requested_by: string;
  date: string;
  notes?: string;
  status: RequestStatus;
  created_at: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isRequestStatus = (value: unknown): value is RequestStatus =>
  value === "pending" || value === "approved" || value === "rejected";

const extractItemsFromPayload = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) return payload;
  if (!isRecord(payload)) return [];

  const direct = [payload.items, payload.results, payload.requests, payload.data];
  for (const candidate of direct) {
    if (Array.isArray(candidate)) return candidate;
  }

  if (isRecord(payload.data)) {
    if (Array.isArray(payload.data.items)) return payload.data.items;
    if (Array.isArray(payload.data.results)) return payload.data.results;
    if (Array.isArray(payload.data.requests)) return payload.data.requests;
  }

  return [];
};

const extractTotalFromPayload = (payload: unknown): number | null => {
  if (!isRecord(payload)) return null;

  if (typeof payload.total === "number") return payload.total;
  if (typeof payload.count === "number") return payload.count;

  if (isRecord(payload.pagination)) {
    if (typeof payload.pagination.total === "number") return payload.pagination.total;
    if (typeof payload.pagination.count === "number") return payload.pagination.count;
  }

  if (isRecord(payload.meta)) {
    if (typeof payload.meta.total === "number") return payload.meta.total;
    if (typeof payload.meta.count === "number") return payload.meta.count;
  }

  return null;
};

const normalizeRequest = (payload: unknown): SparePartRequest | null => {
  if (!isRecord(payload)) return null;

  const id = payload.id ?? payload._id;
  if (typeof id !== "string" || !id.trim()) return null;

  const rawStatus = String(payload.status ?? "pending").toLowerCase();
  const status: RequestStatus = isRequestStatus(rawStatus) ? rawStatus : "pending";

  return {
    id,
    spare_part_id: typeof payload.spare_part_id === "string" ? payload.spare_part_id : "",
    code: typeof payload.code === "string" ? payload.code : "",
    description: typeof payload.description === "string" ? payload.description : "",
    requested_by: typeof payload.requested_by === "string" ? payload.requested_by : "",
    date: typeof payload.date === "string" ? payload.date : "",
    notes: typeof payload.notes === "string" ? payload.notes : undefined,
    status,
    created_at: typeof payload.created_at === "string" ? payload.created_at : "",
  };
};

const toLocalizedDate = (value?: string): string => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("es-ES");
};

const parseBackendErrorMessage = async (response: Response, fallback: string) => {
  try {
    const body = await response.json();
    return localizeApiErrorPayload(body, fallback);
  } catch {
    return fallback;
  }
};

const sortRequestsByCreatedAtDesc = (items: SparePartRequest[]) =>
  [...items].sort((a, b) => {
    const left = Date.parse(a.created_at || a.date || "");
    const right = Date.parse(b.created_at || b.date || "");
    return (Number.isNaN(right) ? 0 : right) - (Number.isNaN(left) ? 0 : left);
  });

interface FetchRequestsOptions {
  silent?: boolean;
  suppressErrorToast?: boolean;
}

export default function SparePartRequests() {
  const { toast } = useToast();
  const authenticatedFetch = useAuthenticatedFetch();

  const [requests, setRequests] = useState<SparePartRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | RequestStatus>("all");
  const [selectedRequest, setSelectedRequest] = useState<SparePartRequest | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isNewRequestModalOpen, setIsNewRequestModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingNewRequest, setIsSubmittingNewRequest] = useState(false);
  const [updatingRequestId, setUpdatingRequestId] = useState<string | null>(null);

  const fetchRequests = useCallback(async (options: FetchRequestsOptions = {}) => {
    const { silent = false, suppressErrorToast = silent } = options;

    if (!silent) {
      setIsLoading(true);
    }

    try {
      let offset = 0;
      const collected: SparePartRequest[] = [];

      for (let page = 0; page < MAX_REQUESTS_PAGES; page += 1) {
        const response = await authenticatedFetch(
          `${API_URL}/api/v1/spare_part_requests/?limit=${REQUESTS_PAGE_SIZE}&offset=${offset}`
        );

        if (!response.ok) {
          const message = await parseBackendErrorMessage(response, "No se pudieron cargar las solicitudes.");
          throw new Error(message);
        }

        const payload = await response.json();
        const rawItems = extractItemsFromPayload(payload);
        const normalizedItems = rawItems
          .map(normalizeRequest)
          .filter((item): item is SparePartRequest => item !== null);

        if (rawItems.length === 0) break;

        collected.push(...normalizedItems);

        if (Array.isArray(payload)) break;

        offset += rawItems.length;

        const total = extractTotalFromPayload(payload);
        if (total !== null && offset >= total) break;
        if (rawItems.length < REQUESTS_PAGE_SIZE) break;
      }

      const uniqueById = Array.from(
        new Map(collected.map((item) => [item.id, item])).values()
      );
      setRequests(sortRequestsByCreatedAtDesc(uniqueById));
    } catch (error) {
      if (!suppressErrorToast) {
        const message =
          error instanceof Error && error.message
            ? error.message
            : "No se pudieron cargar las solicitudes.";
        toast({
          title: "Error cargando solicitudes",
          description: message,
          variant: "destructive",
        });
      }

      if (!silent) {
        setRequests([]);
      }
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }, [authenticatedFetch, toast]);

  useEffect(() => {
    void fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;

      const hasPendingUiInteraction =
        isNewRequestModalOpen ||
        isDetailModalOpen ||
        isSubmittingNewRequest ||
        updatingRequestId !== null;

      if (hasPendingUiInteraction) return;

      void fetchRequests({ silent: true });
    }, AUTO_REFRESH_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [fetchRequests, isDetailModalOpen, isNewRequestModalOpen, isSubmittingNewRequest, updatingRequestId]);

  const handleViewDetails = (request: SparePartRequest) => {
    setSelectedRequest(request);
    setIsDetailModalOpen(true);
  };

  const handleStatusChange = async (
    request: SparePartRequest,
    newStatus: Extract<RequestStatus, "approved" | "rejected">
  ) => {
    setUpdatingRequestId(request.id);
    try {
      const response = await authenticatedFetch(
        `${API_URL}/api/v1/spare_part_requests/${encodeURIComponent(request.id)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (response.ok) {
        let updatedRequest: SparePartRequest | null = null;
        try {
          const payload = await response.clone().json();
          updatedRequest = normalizeRequest(payload);
        } catch {
          // El backend puede responder sin body.
        }

        setRequests((prev) =>
          prev.map((req) =>
            req.id === request.id
              ? {
                  ...req,
                  ...(updatedRequest ?? {}),
                  status: updatedRequest?.status ?? newStatus,
                }
              : req
          )
        );

        setSelectedRequest((prev) =>
          prev && prev.id === request.id
            ? {
                ...prev,
                ...(updatedRequest ?? {}),
                status: updatedRequest?.status ?? newStatus,
              }
            : prev
        );

        const statusText = newStatus === "approved" ? "aprobada" : "rechazada";
        toast({
          title: `Solicitud ${statusText}`,
          description: `La solicitud ${request.code} ha sido ${statusText} correctamente.`,
        });
        setIsDetailModalOpen(false);
      } else {
        const message = await parseBackendErrorMessage(
          response,
          "No se pudo actualizar el estado de la solicitud."
        );
        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "No se pudo conectar al servidor para actualizar la solicitud.",
        variant: "destructive",
      });
    } finally {
      setUpdatingRequestId(null);
    }
  };

  const handleNewRequest = async (requestData: SparePartRequestFormData) => {
    setIsSubmittingNewRequest(true);
    try {
      const payload = {
        code: requestData.code.trim().toUpperCase(),
        description: requestData.description.trim(),
        requested_by: requestData.requestedBy.trim(),
        date: requestData.date,
        ...(requestData.notes?.trim() ? { notes: requestData.notes.trim() } : {}),
      };

      const response = await authenticatedFetch(`${API_URL}/api/v1/spare_part_requests/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        let createdRequest: SparePartRequest | null = null;
        try {
          const payload = await response.clone().json();
          createdRequest = normalizeRequest(payload);
        } catch {
          // Si no hay body, refrescamos la lista abajo.
        }

        if (createdRequest) {
          setRequests((prev) => {
            const merged = [createdRequest, ...prev.filter((item) => item.id !== createdRequest!.id)];
            return sortRequestsByCreatedAtDesc(merged);
          });
        } else {
          await fetchRequests({ silent: true });
        }

        toast({
          title: "Solicitud enviada",
          description: `Solicitud ${payload.code} creada correctamente.`,
        });
        setIsNewRequestModalOpen(false);
      } else {
        const message = await parseBackendErrorMessage(
          response,
          "No se pudo crear la solicitud de repuesto."
        );
        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "No se pudo conectar al servidor para crear la solicitud.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingNewRequest(false);
    }
  };

  const pending = useMemo(
    () => requests.filter((request) => request.status === "pending").length,
    [requests]
  );
  const approved = useMemo(
    () => requests.filter((request) => request.status === "approved").length,
    [requests]
  );
  const rejected = useMemo(
    () => requests.filter((request) => request.status === "rejected").length,
    [requests]
  );

  const filteredRequests = useMemo(() => {
    if (statusFilter === "all") return requests;
    return requests.filter((request) => request.status === statusFilter);
  }, [requests, statusFilter]);

  const columns: Column<SparePartRequest>[] = [
    { key: "code", header: "Código" },
    { key: "description", header: "Descripción" },
    { key: "requested_by", header: "Solicitado por" },
    {
      key: "date",
      header: "Fecha",
      render: (value: string) => toLocalizedDate(value),
      sortValue: (request) => request.date || request.created_at,
    },
    {
      key: "status",
      header: "Estado",
      render: (status: string) => <StatusBadge status={status} />,
    },
    {
      key: "actions",
      header: "Acciones",
      sortable: false,
      render: (_, request) => (
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleViewDetails(request)}
            disabled={updatingRequestId === request.id}
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
                disabled={updatingRequestId === request.id}
                className="h-8 w-8 p-0 border-green-200 text-green-600 hover:bg-green-50"
                title="Aprobar"
              >
                {updatingRequestId === request.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange(request, "rejected")}
                disabled={updatingRequestId === request.id}
                className="h-8 w-8 p-0 border-red-200 text-red-600 hover:bg-red-50"
                title="Rechazar"
              >
                {updatingRequestId === request.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
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
          <p className="text-xs text-gray-500 mt-1">Actualizacion automatica cada 45 segundos.</p>
        </div>
        <Button
          onClick={() => setIsNewRequestModalOpen(true)}
          disabled={isSubmittingNewRequest}
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

      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={statusFilter === "all" ? "default" : "outline"}
          onClick={() => setStatusFilter("all")}
          className="h-8"
        >
          Todas ({requests.length})
        </Button>
        <Button
          size="sm"
          variant={statusFilter === "pending" ? "default" : "outline"}
          onClick={() => setStatusFilter("pending")}
          className="h-8"
        >
          Pendientes ({pending})
        </Button>
        <Button
          size="sm"
          variant={statusFilter === "approved" ? "default" : "outline"}
          onClick={() => setStatusFilter("approved")}
          className="h-8"
        >
          Aprobadas ({approved})
        </Button>
        <Button
          size="sm"
          variant={statusFilter === "rejected" ? "default" : "outline"}
          onClick={() => setStatusFilter("rejected")}
          className="h-8"
        >
          Rechazadas ({rejected})
        </Button>
      </div>

      {/* Tabla */}
      <DataTable
        data={filteredRequests}
        columns={columns}
        title=""
        searchFields={["code", "description", "requested_by", "notes", "status", "date"]}
        searchPlaceholder="Buscar por código, descripción, solicitante o estado..."
        defaultSort={{ key: "created_at", direction: "desc" }}
        initialPageSize={20}
        hideAddButton={true}
        isLoading={isLoading}
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
                  <p className="text-gray-600 mt-0.5">{toLocalizedDate(selectedRequest.date)}</p>
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
                    disabled={updatingRequestId === selectedRequest.id}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    {updatingRequestId === selectedRequest.id ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4 mr-2" />
                    )}
                    {updatingRequestId === selectedRequest.id ? "Procesando..." : "Aprobar"}
                  </Button>
                  <Button
                    onClick={() => handleStatusChange(selectedRequest, "rejected")}
                    disabled={updatingRequestId === selectedRequest.id}
                    variant="outline"
                    className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                  >
                    {updatingRequestId === selectedRequest.id ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <XCircle className="w-4 h-4 mr-2" />
                    )}
                    {updatingRequestId === selectedRequest.id ? "Procesando..." : "Rechazar"}
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
          isSubmitting={isSubmittingNewRequest}
        />
      </FormModal>
    </div>
  );
}
