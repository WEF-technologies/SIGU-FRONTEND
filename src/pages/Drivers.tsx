
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { FormModal } from "@/components/shared/FormModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { DriverForm } from "@/components/drivers/DriverForm";
import { DriverActions } from "@/components/drivers/DriverActions";
import { DriverAlerts } from "@/components/drivers/DriverAlerts";
import {
  formatAlertDate,
  getDriverAlertStatusColor,
  getDriverAlertStatusText,
  hasActiveAlert,
} from "@/components/drivers/driverAlertStatus";
import { Driver, Contract, DriverAlert } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useAuthenticatedFetch } from "@/hooks/useAuthenticatedFetch";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

const API_URL = import.meta.env.VITE_API_URL ?? "";

/** Grupo del acordeón para choferes sin contrato asignado (o con contrato inexistente). */
const NO_CONTRACT_KEY = "__sin_contrato__";

const sortDrivers = (ds: Driver[]) => {
  return ds.slice().sort((a, b) => {
    const aContract = a.contract?.description || "";
    const bContract = b.contract?.description || "";
    if (aContract.localeCompare(bContract) !== 0) return aContract.localeCompare(bContract);
    const aLast = a.last_name || a.name || "";
    const bLast = b.last_name || b.name || "";
    if (aLast.localeCompare(bLast) !== 0) return aLast.localeCompare(bLast);
    return (a.name || "").localeCompare(b.name || "");
  });
};

export default function Drivers() {
  const { toast } = useToast();
  const authenticatedFetch = useAuthenticatedFetch();
  const [searchParams] = useSearchParams();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [alerts, setAlerts] = useState<DriverAlert[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [createPrefill, setCreatePrefill] = useState<Partial<Driver> | null>(null);
  const [openGroup, setOpenGroup] = useState<string>("");
  const [highlightedDriver, setHighlightedDriver] = useState<string | null>(null);
  const handledDriverParam = useRef<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const contractsResponse = await authenticatedFetch(`${API_URL}/api/v1/contracts/`);
        let contractsData: Contract[] = [];
        if (contractsResponse.ok) {
          const payload = await contractsResponse.json();
          contractsData = Array.isArray(payload) ? payload : [];
        }
        setContracts(contractsData);

        const driversResponse = await authenticatedFetch(`${API_URL}/api/v1/drivers/`);
        if (driversResponse.ok) {
          const driversData = await driversResponse.json();

          // Asociar cada chofer con su contrato
          const driversWithContracts = (Array.isArray(driversData) ? driversData : []).map((driver: Driver) => {
            if (driver.contract_id) {
              const contract = contractsData.find((c: Contract) => c.id === driver.contract_id);
              return { ...driver, contract };
            }
            return driver;
          });

          setDrivers(sortDrivers(driversWithContracts));
        } else {
          setDrivers([]);
        }

        const alertsResponse = await authenticatedFetch(`${API_URL}/api/v1/drivers/alerts`);
        if (alertsResponse.ok) {
          const alertsData = await alertsResponse.json();
          setAlerts(Array.isArray(alertsData) ? alertsData : []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setDrivers([]);
        setContracts([]);
        setAlerts([]);
      }
    };

    fetchData();
  }, [authenticatedFetch]);

  const contractIds = useMemo(() => new Set(contracts.map((c) => c.id)), [contracts]);

  /** Alertas activas (no-ok) indexadas por cédula. */
  const alertsByDocument = useMemo(() => {
    const map = new Map<string, DriverAlert>();
    for (const alert of alerts) {
      if (hasActiveAlert(alert)) map.set(alert.document_number, alert);
    }
    return map;
  }, [alerts]);

  /** Choferes sin contrato o cuyo contract_id no existe en la lista de contratos. */
  const unassignedDrivers = useMemo(
    () => drivers.filter((d) => !d.contract_id || !contractIds.has(d.contract_id)),
    [drivers, contractIds]
  );

  const getGroupForDriver = useCallback(
    (driver: Driver) =>
      driver.contract_id && contractIds.has(driver.contract_id) ? driver.contract_id : NO_CONTRACT_KEY,
    [contractIds]
  );

  /** Expande el grupo del chofer, lo resalta y hace scroll hasta su fila. */
  const focusDriver = useCallback(
    (documentNumber: string) => {
      const driver = drivers.find((d) => d.document_number === documentNumber);
      if (!driver) {
        toast({
          title: "Chofer no encontrado",
          description: "El chofer de la alerta ya no está registrado en el sistema.",
          variant: "destructive",
        });
        return;
      }
      setOpenGroup(getGroupForDriver(driver));
      setHighlightedDriver(documentNumber);
      // Esperar a que el acordeón termine de expandirse antes del scroll
      setTimeout(() => {
        document
          .getElementById(`driver-${documentNumber}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 250);
    },
    [drivers, getGroupForDriver, toast]
  );

  // Deep-link desde el dashboard: /choferes?driver=<cédula>
  useEffect(() => {
    const target = searchParams.get("driver");
    if (!target || drivers.length === 0) return;
    if (handledDriverParam.current === target) return;
    handledDriverParam.current = target;
    focusDriver(target);
  }, [searchParams, drivers, focusDriver]);

  const openAddForContract = (contractId: string) => {
    setEditingDriver(null);
    setCreatePrefill({ contract_id: contractId });
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingDriver(null);
    setCreatePrefill(null);
    setIsModalOpen(true);
  };

  const handleEdit = (driver: Driver) => {
    setEditingDriver(driver);
    setIsModalOpen(true);
  };

  const handleDelete = async (driver: Driver) => {
    try {
      const response = await authenticatedFetch(
        `${API_URL}/api/v1/drivers/${encodeURIComponent(driver.document_number)}`,
        {
          method: "DELETE",
        }
      );
      if (response.ok) {
        setDrivers((prev) => prev.filter(d => d.document_number !== driver.document_number));
        toast({
          title: "Chofer eliminado",
          description: `${driver.name} ${driver.last_name} ha sido eliminado correctamente.`,
        });
      }
    } catch (error) {
      console.error('Error deleting driver:', error);
      toast({
        title: "Error",
        description: "Error al eliminar el chofer.",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (formData: Omit<Driver, 'id' | 'created_at' | 'updated_at'>) => {
    const payload = {
      name: formData.name,
      last_name: formData.last_name,
      document_number: formData.document_number,
      telephone: formData.telephone,
      address: formData.address,
      contract_id: formData.contract_id,
      status: formData.status,
      license_expiry_date: formData.license_expiry_date || null,
      defensive_driving_expiry_date: formData.defensive_driving_expiry_date || null
    };

    try {
      if (editingDriver) {
        const response = await authenticatedFetch(
          `${API_URL}/api/v1/drivers/${encodeURIComponent(editingDriver.document_number)}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );
        if (response.ok) {
          const updatedDriver = await response.json();
          const contract = contracts.find(c => c.id === updatedDriver.contract_id);
          const driverWithContract = { ...updatedDriver, contract };
          setDrivers((prev) =>
            sortDrivers(prev.map(d => d.document_number === editingDriver.document_number ? driverWithContract : d))
          );
          toast({
            title: "Chofer actualizado",
            description: `${formData.name} ${formData.last_name} ha sido actualizado correctamente.`,
          });
        }
      } else {
        const response = await authenticatedFetch(`${API_URL}/api/v1/drivers/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (response.ok) {
          const newDriver = await response.json();
          const contract = contracts.find(c => c.id === newDriver.contract_id);
          const driverWithContract = { ...newDriver, contract };
          setDrivers((prev) => sortDrivers([...prev, driverWithContract]));
          toast({
            title: "Chofer creado",
            description: `${formData.name} ${formData.last_name} ha sido creado correctamente.`,
          });
        }
      }
    } catch (error) {
      console.error('Error with driver operation:', error);
      toast({
        title: "Error",
        description: "Error al procesar la operación.",
        variant: "destructive"
      });
    }
    setIsModalOpen(false);
  };

  const renderDriverRow = (driver: Driver) => {
    const driverAlert = alertsByDocument.get(driver.document_number);
    const isHighlighted = highlightedDriver === driver.document_number;
    const licenseDate = driverAlert ? formatAlertDate(driverAlert.license_expiry_date) : null;
    const defensiveDate = driverAlert ? formatAlertDate(driverAlert.defensive_driving_expiry_date) : null;

    return (
      <div
        key={driver.document_number}
        id={`driver-${driver.document_number}`}
        className={`flex items-center justify-between p-3 border rounded transition-colors ${
          isHighlighted
            ? "border-red-400 ring-2 ring-red-300 bg-red-50"
            : driverAlert
            ? "border-yellow-300 bg-yellow-50/50"
            : ""
        }`}
      >
        <div>
          <div className="font-medium flex items-center gap-2">
            {driver.name} {driver.last_name}
            {driverAlert && <AlertTriangle className="h-4 w-4 text-red-600" />}
          </div>
          <div className="text-sm text-gray-600">Cédula: {driver.document_number} • {driver.telephone}</div>
          <div className="text-sm text-gray-500">{driver.address}</div>
          {driverAlert && (
            <div className="mt-2 flex flex-wrap gap-2">
              {driverAlert.status_license !== "ok" && (
                <Badge variant="outline" className={getDriverAlertStatusColor(driverAlert.status_license)}>
                  Licencia: {getDriverAlertStatusText(driverAlert.status_license)}
                  {licenseDate ? ` (${licenseDate})` : ""}
                </Badge>
              )}
              {driverAlert.status_defensive !== "ok" && (
                <Badge variant="outline" className={getDriverAlertStatusColor(driverAlert.status_defensive)}>
                  Manejo Defensivo: {getDriverAlertStatusText(driverAlert.status_defensive)}
                  {defensiveDate ? ` (${defensiveDate})` : ""}
                </Badge>
              )}
            </div>
          )}
        </div>
        <div>
          <DriverActions driver={driver} onEdit={handleEdit} onDelete={handleDelete} />
        </div>
      </div>
    );
  };

  const renderGroupAlertBadge = (groupDrivers: Driver[]) => {
    const groupAlerts = groupDrivers
      .map((d) => alertsByDocument.get(d.document_number))
      .filter((a): a is DriverAlert => Boolean(a));
    if (groupAlerts.length === 0) return null;

    const hasDue = groupAlerts.some(
      (a) => a.status_license === "due" || a.status_defensive === "due"
    );
    return (
      <Badge
        className={`flex items-center gap-1 ${
          hasDue
            ? "bg-red-100 text-red-700 border border-red-200"
            : "bg-yellow-100 text-yellow-800 border border-yellow-200"
        }`}
      >
        <AlertTriangle className="h-3 w-3" />
        {groupAlerts.length} alerta{groupAlerts.length !== 1 ? "s" : ""}
      </Badge>
    );
  };

  return (
    <div>
      <DriverAlerts alerts={alerts} onSelectDriver={focusDriver} />
      <div className="space-y-4">
        <Accordion
          type="single"
          collapsible
          value={openGroup}
          onValueChange={(value) => {
            setOpenGroup(value);
            if (!value) setHighlightedDriver(null);
          }}
        >
          {contracts.map((c) => {
            const cid = c.id;
            const driversForContract = drivers.filter(d => d.contract_id === cid);
            return (
              <AccordionItem key={c.id} value={c.id}>
                <AccordionTrigger>
                  <div className="flex items-center justify-between w-full">
                    <div className="font-medium">{c.description}</div>
                    <div className="flex items-center gap-3">
                      {renderGroupAlertBadge(driversForContract)}
                      <div className="text-sm text-gray-500">{driversForContract.length} chofer(es)</div>
                      <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); openAddForContract(cid); }}>
                        Agregar
                      </Button>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2">
                    {driversForContract.length === 0 && <p className="text-sm text-gray-600">No hay choferes.</p>}
                    {driversForContract.map(renderDriverRow)}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
          {unassignedDrivers.length > 0 && (
            <AccordionItem value={NO_CONTRACT_KEY}>
              <AccordionTrigger>
                <div className="flex items-center justify-between w-full">
                  <div className="font-medium text-gray-700">Sin contrato asignado</div>
                  <div className="flex items-center gap-3">
                    {renderGroupAlertBadge(unassignedDrivers)}
                    <div className="text-sm text-gray-500">{unassignedDrivers.length} chofer(es)</div>
                    <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleAdd(); }}>
                      Agregar
                    </Button>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  {unassignedDrivers.map(renderDriverRow)}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
      </div>

      <FormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingDriver ? "Editar Chofer" : "Agregar Chofer"}
      >
        <DriverForm
          driver={editingDriver ?? createPrefill ?? undefined}
          contracts={contracts}
          onSubmit={(data) => {
            // clear prefill after submit
            setCreatePrefill(null);
            handleSubmit(data);
          }}
          onCancel={() => { setIsModalOpen(false); setCreatePrefill(null); }}
        />
      </FormModal>
    </div>
  );
}
