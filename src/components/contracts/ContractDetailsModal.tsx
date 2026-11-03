import { ReactNode, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Contract, Route, Driver } from "@/types";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useToast } from "@/hooks/use-toast";
import { useAuthenticatedFetch } from "@/hooks/useAuthenticatedFetch";
import { fetchAllPages, isSessionExpiredError } from "@/lib/apiClient";
import { Loader2, Users } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL ?? "";

interface ContractDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: Contract | null;
}

/** Los decimales del backend llegan como texto ("1500.00"). */
const toNumber = (value: number | string | null | undefined) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatAmount = (contract: Contract) => {
  const amount = toNumber(contract.contract_amount);
  if (amount === null) return null;
  const formatted = amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return contract.currency ? `${contract.currency} ${formatted}` : formatted;
};

const formatPct = (value: number | string | undefined) => {
  const parsed = toNumber(value);
  return parsed === null ? null : `${parsed.toLocaleString(undefined, { maximumFractionDigits: 2 })} %`;
};

function DetailItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <span className="font-medium text-gray-700">{label}:</span>
      <p className="text-gray-900">{value ?? <span className="text-gray-400">No registrado</span>}</p>
    </div>
  );
}

export function ContractDetailsModal({ isOpen, onClose, contract }: ContractDetailsModalProps) {
  const { toast } = useToast();
  const authenticatedFetch = useAuthenticatedFetch();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!contract || !isOpen) return;

    let isActive = true;

    const loadContractDetails = async () => {
      setLoading(true);

      try {
        const [routesResponse, driversResponse] = await Promise.all([
          // El backend filtra las rutas por la descripción del contrato.
          fetchAllPages(
            authenticatedFetch,
            `${API_URL}/api/v1/routes/?contract_description=${encodeURIComponent(contract.description)}`
          ),
          fetchAllPages(authenticatedFetch, `${API_URL}/api/v1/drivers/`),
        ]);
        if (!isActive) return;

        const contractRoutes = routesResponse.ok ? await routesResponse.json() : [];
        setRoutes(Array.isArray(contractRoutes) ? contractRoutes : []);

        const allDrivers = driversResponse.ok ? await driversResponse.json() : [];
        setDrivers(
          Array.isArray(allDrivers)
            ? allDrivers.filter((driver: Driver) => driver.contract_id === contract.id)
            : []
        );
      } catch (error) {
        if (!isActive) return;
        console.error('Error loading contract details:', error);
        setRoutes([]);
        setDrivers([]);
        if (!isSessionExpiredError(error)) {
          toast({
            title: "Error",
            description: "No se pudieron cargar todos los detalles del contrato",
            variant: "destructive",
          });
        }
      } finally {
        if (isActive) setLoading(false);
      }
    };

    void loadContractDetails();

    return () => {
      isActive = false;
    };
  }, [authenticatedFetch, contract, isOpen, toast]);

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
                <DetailItem label="Descripción" value={contract.description} />
                <DetailItem label="Ubicación" value={contract.location} />
                <div>
                  <span className="font-medium text-gray-700">Estado:</span>
                  <StatusBadge status={contract.status} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <DetailItem label="Fecha Inicio" value={new Date(contract.start_date).toLocaleDateString()} />
                  <DetailItem label="Fecha Fin" value={new Date(contract.end_date).toLocaleDateString()} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Datos del Contrato</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <DetailItem label="Número de contrato" value={contract.contract_number} />
                <DetailItem label="Orden SAP" value={contract.sap_order_number} />
                <DetailItem label="Cliente" value={contract.client} />
                <DetailItem label="Gerencia usuaria" value={contract.user_management} />
                <DetailItem label="Administrador" value={contract.administrator_name} />
                <DetailItem label="Monto" value={formatAmount(contract)} />
                <DetailItem
                  label="Frecuencia de valuación"
                  value={contract.valuation_frequency_days != null ? `${contract.valuation_frequency_days} días` : null}
                />
                <DetailItem
                  label="Anticipación para aprobar"
                  value={contract.approval_lead_days != null ? `${contract.approval_lead_days} días` : null}
                />
                <DetailItem label="Umbral de advertencia" value={formatPct(contract.warning_pct)} />
                <DetailItem label="Umbral crítico" value={formatPct(contract.critical_pct)} />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Choferes Asignados
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin mr-2" />
                    <span>Cargando choferes...</span>
                  </div>
                ) : drivers.length > 0 ? (
                  <div className="space-y-2">
                    {drivers.map((driver) => (
                      <div key={driver.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div>
                          <div className="font-medium">{driver.name} {driver.last_name}</div>
                          <div className="text-sm text-muted-foreground">
                            Cédula: {driver.document_number} | Tel: {driver.telephone}
                          </div>
                        </div>
                        <StatusBadge status={driver.status} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No hay choferes asignados a este contrato</p>
                )}
              </CardContent>
            </Card>

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
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500">No hay rutas asignadas</p>
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
