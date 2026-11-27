
import { useEffect, useMemo, useState } from "react";
import {
  MaintenanceFormData,
  SparePart,
  Vehicle,
  VehicleSpecification,
  VehicleSpecificationPayload,
} from "@/types";
import { formatKilometers, formatKmNumber } from "@/lib/kilometers";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, Check, Download, Edit, Gauge, Loader2, Plus, Save, Wrench, X } from "lucide-react";
import { MaintenanceFormModal } from "@/components/maintenance/MaintenanceFormModal";
import { useMaintenance } from "@/hooks/useMaintenance";
import { maintenanceTypeConfig } from "@/constants/maintenanceTypes";
import { getVehicleStatusAppearance } from "@/constants/vehicleLocations";
import { VehicleStatusBadge } from "@/components/vehicles/VehicleStatusBadge";
import { formatDateOnly } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { useAuthenticatedFetch } from "@/hooks/useAuthenticatedFetch";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { maintenancesApi, ApiRequestError } from "@/services/maintenancesApi";
import { sparePartsApi } from "@/services/sparePartsApi";
import { vehiclesApi } from "@/services/vehiclesApi";
import { isSessionExpiredError, SESSION_EXPIRED_MESSAGE } from "@/lib/apiClient";

const normalizeIdValue = (value: unknown) => {
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

const normalizePlateValue = (value: unknown) => {
  if (typeof value !== "string") return "";
  return value.trim().toUpperCase();
};

const createEmptyVehicleSpecificationForm = (): VehicleSpecificationPayload => ({
  engine_type: "",
  engine_code: "",
  fuel_type: "",
  transmission_type: "",
  drive_type: "",
  serial: "",
  chassis_number: "",
  notes: "",
});

const mapVehicleSpecificationToForm = (
  specification: VehicleSpecification | null
): VehicleSpecificationPayload => ({
  engine_type: specification?.engine_type ?? "",
  engine_code: specification?.engine_code ?? "",
  fuel_type: specification?.fuel_type ?? "",
  transmission_type: specification?.transmission_type ?? "",
  drive_type: specification?.drive_type ?? "",
  serial: specification?.serial ?? "",
  chassis_number: specification?.chassis_number ?? "",
  notes: specification?.notes ?? "",
});

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

interface VehicleDetailsModalProps {
  vehicle: Vehicle | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateKilometers: (vehicleId: string, kilometers: number) => void;
}

export function VehicleDetailsModal({ vehicle, isOpen, onClose, onUpdateKilometers }: VehicleDetailsModalProps) {
  const [editingKm, setEditingKm] = useState(false);
  const [kmValue, setKmValue] = useState("");
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [isDownloadingReport, setIsDownloadingReport] = useState(false);
  const [isLoadingSpecification, setIsLoadingSpecification] = useState(false);
  const [isSavingSpecification, setIsSavingSpecification] = useState(false);
  const [vehicleSpecification, setVehicleSpecification] = useState<VehicleSpecificationPayload>(
    createEmptyVehicleSpecificationForm()
  );
  const [spareParts, setSpareParts] = useState<SparePart[]>([]);
  const { maintenance, vehicles, createMaintenance } = useMaintenance();
  const authenticatedFetch = useAuthenticatedFetch();
  const { toast } = useToast();

  // Filtrar mantenimientos para este vehículo específico
  const vehicleMaintenances = useMemo(
    () =>
      maintenance
        .filter((m) => {
          if (!vehicle) return false;

          const byPlate = normalizePlateValue(m.vehicle_plate) === normalizePlateValue(vehicle.plate_number);
          const byId =
            normalizeIdValue(vehicle.id).length > 0 &&
            normalizeIdValue(m.vehicle_id) === normalizeIdValue(vehicle.id);
          return byPlate || byId;
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [maintenance, vehicle]
  );

  const fetchVehicleSpareParts = async (plateNumber: string) => {
    const parts = await sparePartsApi.listByVehicle(authenticatedFetch, plateNumber);
    setSpareParts(parts);
  };

  useEffect(() => {
    if (!vehicle || !isOpen) return;

    const currentKm = vehicle.current_kilometers || vehicle.kilometers || 0;
    setKmValue(currentKm.toString());

    let isActive = true;

    const loadVehicleContext = async () => {
      setIsLoadingSpecification(true);

      const [specificationResult, sparePartsResult] = await Promise.allSettled([
        vehiclesApi.getSpecification(authenticatedFetch, vehicle.plate_number),
        sparePartsApi.listByVehicle(authenticatedFetch, vehicle.plate_number),
      ]);

      if (!isActive) return;

      if (specificationResult.status === "fulfilled") {
        setVehicleSpecification(mapVehicleSpecificationToForm(specificationResult.value));
      } else {
        console.error("Error fetching vehicle specification:", specificationResult.reason);
        setVehicleSpecification(createEmptyVehicleSpecificationForm());
        const message = getErrorMessage(
          specificationResult.reason,
          "No se pudo cargar la ficha técnica del vehículo."
        );
        if (message !== SESSION_EXPIRED_MESSAGE) {
          toast({
            title: "Error al cargar ficha técnica",
            description: message,
            variant: "destructive",
          });
        }
      }

      if (sparePartsResult.status === "fulfilled") {
        setSpareParts(sparePartsResult.value);
      } else {
        console.error("Error fetching vehicle spare parts:", sparePartsResult.reason);
        setSpareParts([]);
        const message = getErrorMessage(
          sparePartsResult.reason,
          "No se pudieron cargar los repuestos compatibles del vehículo."
        );
        if (message !== SESSION_EXPIRED_MESSAGE) {
          toast({
            title: "Error al cargar repuestos",
            description: message,
            variant: "destructive",
          });
        }
      }

      setIsLoadingSpecification(false);
    };

    void loadVehicleContext();

    return () => {
      isActive = false;
    };
  }, [authenticatedFetch, isOpen, toast, vehicle]);

  if (!vehicle) return null;

  /**
   * Km efectivo: usa el mayor entre el km almacenado del vehículo y el km
   * del último M3 registrado. Evita mostrar "Faltan" inflado cuando el campo
   * current_kilometers del vehículo está desactualizado respecto al historial.
   */
  const effectiveCurrentKm = Math.max(
    vehicle.current_kilometers || vehicle.kilometers || 0,
    vehicle.last_m3_kilometers || 0
  );

  const calculateM3Progress = () => {
    const nextM3Km = vehicle.next_m3_kilometers;
    if (!effectiveCurrentKm || !nextM3Km) return 0;
    const M3_INTERVAL = 5000;
    const lastM3Km = nextM3Km - M3_INTERVAL;
    const kmSinceLastM3 = effectiveCurrentKm - lastM3Km;
    return Math.min(Math.max((kmSinceLastM3 / M3_INTERVAL) * 100, 0), 100);
  };

  const getM3Status = () => {
    const nextM3Km = vehicle.next_m3_kilometers;
    if (!effectiveCurrentKm || !nextM3Km) {
      return { text: 'N/A', isOverdue: false };
    }
    const remaining = nextM3Km - effectiveCurrentKm;
    if (remaining <= 0) {
      return { text: 'Vencido', isOverdue: true };
    }
    return { text: `${formatKmNumber(remaining)} km`, isOverdue: false };
  };

  const m3Status = getM3Status();
  const m3Remaining =
    effectiveCurrentKm && vehicle.next_m3_kilometers ? vehicle.next_m3_kilometers - effectiveCurrentKm : null;
  /** Verde con margen, ámbar en los últimos 1.000 km, rojo si ya venció. */
  const m3Tone =
    m3Remaining === null
      ? { bar: "bg-secondary-dark", text: "text-primary-900" }
      : m3Remaining <= 0
        ? { bar: "bg-red-600", text: "text-red-700" }
        : m3Remaining <= 1000
          ? { bar: "bg-amber-500", text: "text-amber-800" }
          : { bar: "bg-primary-500", text: "text-primary-900" };
  const m3Progress = calculateM3Progress();
  const statusAppearance = getVehicleStatusAppearance(vehicle.status);
  const lastMaintenance = vehicleMaintenances[0];
  const currentKm = vehicle.current_kilometers || vehicle.kilometers || 0;
  // El backend deja ambos campos en null cuando a la unidad no le queda ningún M3.
  const hasM3 = vehicle.next_m3_kilometers != null || Boolean(vehicle.last_m3_date);

  const handleSaveKilometers = () => {
    const km = Number(kmValue);
    if (kmValue.trim() !== "" && Number.isFinite(km) && km > 0) {
      onUpdateKilometers(vehicle.plate_number, km);
      setEditingKm(false);
    }
  };

  const handleMaintenanceSubmit = async (formData: MaintenanceFormData) => {
    const result = await createMaintenance(formData);
    if (result.ok) {
      setShowMaintenanceForm(false);
    }
    return result;
  };

  const handleSpecificationFieldChange = (
    field: keyof VehicleSpecificationPayload,
    value: string
  ) => {
    setVehicleSpecification((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveSpecification = async () => {
    if (!vehicle?.plate_number) return;

    try {
      setIsSavingSpecification(true);
      const updatedSpecification = await vehiclesApi.upsertSpecification(
        authenticatedFetch,
        vehicle.plate_number,
        vehicleSpecification
      );

      setVehicleSpecification(mapVehicleSpecificationToForm(updatedSpecification));
      await fetchVehicleSpareParts(vehicle.plate_number);

      toast({
        title: "Ficha técnica actualizada",
        description: `Se actualizó la ficha técnica de ${vehicle.plate_number}.`,
      });
    } catch (error) {
      console.error("Error saving vehicle specification:", error);
      toast({
        title: "Error al guardar ficha técnica",
        description: getErrorMessage(error, "No se pudo guardar la ficha técnica del vehículo."),
        variant: "destructive",
      });
    } finally {
      setIsSavingSpecification(false);
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(objectUrl);
  };

  const getDownloadErrorMessage = (error: unknown): string => {
    if (error instanceof ApiRequestError) {
      if (error.status === 401) {
        return "Tu sesión venció o no es válida. Inicia sesión nuevamente para descargar el historial.";
      }
      if (error.status === 403) {
        return "No tienes permisos para descargar el historial de este vehículo.";
      }
      if (error.status === 404) {
        return "No se encontró historial de mantenimiento para esta placa.";
      }
      return error.message || "No se pudo descargar el historial PDF.";
    }

    if (isSessionExpiredError(error)) {
      return "Tu sesión expiró. Inicia sesión nuevamente para continuar.";
    }

    return "No se pudo descargar el historial PDF. Intenta nuevamente.";
  };

  const handleDownloadMaintenanceReport = async () => {
    if (!vehicle?.plate_number) return;

    try {
      setIsDownloadingReport(true);
      const { blob, filename } = await maintenancesApi.downloadVehicleReport(vehicle.plate_number);
      downloadBlob(blob, filename);
      toast({
        title: "Descarga completada",
        description: `Se descargó el historial PDF de ${vehicle.plate_number}.`,
      });
    } catch (error) {
      console.error("Error downloading vehicle report:", error);
      toast({
        title: "Error al descargar historial",
        description: getDownloadErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setIsDownloadingReport(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] grid-cols-[minmax(0,1fr)] overflow-y-auto overflow-x-hidden gap-0 p-0">
          {/* Cabecera: placa, unidad y sede, con el color de la sede */}
          <DialogHeader className={cn("relative space-y-0 border-b px-5 pb-5 pt-6 text-left sm:px-6", statusAppearance.tintClassName)}>
            <span aria-hidden="true" className={cn("absolute inset-x-0 top-0 h-1.5", statusAppearance.accentClassName)} />
            <div className="flex flex-col gap-4 pr-8 sm:flex-row sm:items-center">
              <div className="inline-flex w-fit flex-col items-center rounded-md border-2 border-primary-900 bg-white px-4 pb-1.5 pt-1 shadow-sm">
                <span className="text-[10px] font-semibold tracking-[0.2em] text-secondary-dark">Venezuela</span>
                <DialogTitle className="text-2xl font-extrabold leading-none tracking-[0.12em] text-primary-900 tabular-nums">
                  {vehicle.plate_number}
                </DialogTitle>
              </div>
              <div className="min-w-0 space-y-2">
                <DialogDescription className="text-lg font-semibold leading-tight text-primary-900">
                  {vehicle.brand} {vehicle.model} <span className="font-normal text-secondary-dark">{vehicle.year}</span>
                </DialogDescription>
                <div className="flex flex-wrap items-center gap-2">
                  <VehicleStatusBadge status={vehicle.status} size="md" />
                  {statusAppearance.kind === "sede" && (
                    <span className="text-sm text-secondary-dark">Unidad operativa en esta sede</span>
                  )}
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="min-w-0 space-y-6 px-5 py-5 sm:px-6">
            {/* Datos clave */}
            <dl className="grid grid-cols-1 divide-y rounded-lg border sm:grid-cols-2 sm:divide-x sm:divide-y-0">
              <div className="p-4">
                <dt className="flex items-center gap-1.5 text-sm text-secondary-dark">
                  <Gauge className="h-4 w-4" aria-hidden="true" />
                  Kilometraje actual
                </dt>
                <dd className="mt-1">
                  {editingKm ? (
                    <form
                      className="flex items-center gap-1.5"
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSaveKilometers();
                      }}
                    >
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        value={kmValue}
                        onChange={(e) => setKmValue(e.target.value)}
                        placeholder={currentKm.toString()}
                        aria-label="Nuevo kilometraje"
                        className="h-9 w-32"
                        autoFocus
                      />
                      <Button type="submit" size="icon" className="h-9 w-9 shrink-0" aria-label="Guardar kilometraje">
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-9 w-9 shrink-0"
                        onClick={() => setEditingKm(false)}
                        aria-label="Cancelar"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </form>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold tabular-nums text-primary-900">{formatKilometers(currentKm)}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-secondary-dark hover:text-primary-900"
                        onClick={() => setEditingKm(true)}
                        aria-label="Editar kilometraje"
                        title="Editar kilometraje"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </dd>
              </div>
              <div className="p-4">
                <dt className="flex items-center gap-1.5 text-sm text-secondary-dark">
                  <Calendar className="h-4 w-4" aria-hidden="true" />
                  Último mantenimiento
                </dt>
                <dd className="mt-1">
                  {lastMaintenance ? (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="text-2xl font-bold tabular-nums text-primary-900">
                        {formatDateOnly(lastMaintenance.date)}
                      </span>
                      <Badge
                        variant="outline"
                        className={maintenanceTypeConfig[lastMaintenance.type]?.color}
                      >
                        {lastMaintenance.type.toUpperCase()}
                      </Badge>
                      <span className="text-sm tabular-nums text-secondary-dark">
                        a los {formatKilometers(lastMaintenance.kilometers)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-base font-medium text-secondary-dark">Sin mantenimientos registrados</span>
                  )}
                </dd>
              </div>
            </dl>

            {/* Próximo M3 */}
            <section aria-labelledby="vehicle-m3-heading" className="rounded-lg border p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 id="vehicle-m3-heading" className="flex items-center gap-2 font-semibold text-primary-900">
                  <Wrench className="h-4 w-4" aria-hidden="true" />
                  Próximo mantenimiento M3
                </h3>
                {hasM3 && (
                  <p className={cn("text-sm font-semibold", m3Tone.text)}>
                    {m3Status.isOverdue ? "Vencido" : `Faltan ${m3Status.text}`}
                  </p>
                )}
              </div>
              {hasM3 ? (
                <div className="mt-3 space-y-2">
                  <div
                    role="progressbar"
                    aria-label="Recorrido desde el último M3"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(m3Progress)}
                    className="h-3 w-full overflow-hidden rounded-full bg-secondary-light ring-1 ring-inset ring-secondary-medium"
                  >
                    <div className={cn("h-full rounded-full transition-all", m3Tone.bar)} style={{ width: `${m3Progress}%` }} />
                  </div>
                  <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm text-secondary-dark">
                    <span>
                      Último M3: {vehicle.last_m3_date ? formatDateOnly(vehicle.last_m3_date) : "sin fecha"}
                    </span>
                    <span>
                      Toca a los <strong className="font-semibold text-primary-900">{formatKilometers(vehicle.next_m3_kilometers, "N/A")}</strong>
                    </span>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-sm text-secondary-dark">
                  Sin M3 registrado. El próximo se calcula al registrar un mantenimiento M3.
                </p>
              )}
            </section>

            {/* Tabs para historial, ficha técnica y repuestos */}
            <Tabs defaultValue="maintenance" className="w-full">
              <TabsList className="grid h-auto w-full grid-cols-3">
                <TabsTrigger value="maintenance" className="whitespace-normal py-2">
                  Mantenimientos <span className="ml-1 tabular-nums text-secondary-dark">{vehicleMaintenances.length}</span>
                </TabsTrigger>
                <TabsTrigger value="specs" className="whitespace-normal py-2">Ficha técnica</TabsTrigger>
                <TabsTrigger value="parts" className="whitespace-normal py-2">
                  Repuestos <span className="ml-1 tabular-nums text-secondary-dark">{spareParts.length}</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="maintenance" className="space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="font-semibold text-primary-900">Historial de mantenimientos</h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleDownloadMaintenanceReport}
                      disabled={isDownloadingReport}
                    >
                      {isDownloadingReport ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4 mr-2" />
                      )}
                      {isDownloadingReport ? "Descargando..." : "Descargar historial PDF"}
                    </Button>
                    <Button 
                      size="sm" 
                      className="bg-primary"
                      onClick={() => setShowMaintenanceForm(true)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Registrar Mantenimiento
                    </Button>
                  </div>
                </div>

                <Card className="overflow-hidden">
                  <Table>
                    <TableHeader className="bg-secondary-light">
                      <TableRow>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Kilometraje</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead>Ubicación</TableHead>
                        <TableHead>Realizado por</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vehicleMaintenances.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                            No hay mantenimientos registrados para este vehículo
                          </TableCell>
                        </TableRow>
                      ) : (
                        vehicleMaintenances.map((maintenanceItem) => (
                          <TableRow key={maintenanceItem.id}>
                            <TableCell>
                              <Badge
                                className={maintenanceTypeConfig[maintenanceItem.type]?.color}
                                variant="outline"
                              >
                                {maintenanceItem.type.toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell className="whitespace-nowrap tabular-nums">{formatDateOnly(maintenanceItem.date)}</TableCell>
                            <TableCell className="whitespace-nowrap tabular-nums">{formatKilometers(maintenanceItem.kilometers)}</TableCell>
                            <TableCell>{maintenanceItem.description}</TableCell>
                            <TableCell>{maintenanceItem.location || <span className="text-secondary-dark">No especificada</span>}</TableCell>
                            <TableCell>{maintenanceItem.performed_by || <span className="text-secondary-dark">No especificado</span>}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </Card>
              </TabsContent>

              <TabsContent value="specs" className="space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-semibold text-primary-900">Ficha técnica del vehículo</h3>
                    <p className="text-sm text-gray-500">
                      Estos datos permiten que el backend determine repuestos compatibles por especificación técnica.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleSaveSpecification}
                    disabled={isLoadingSpecification || isSavingSpecification}
                  >
                    {isSavingSpecification ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    {isSavingSpecification ? "Guardando..." : "Guardar ficha técnica"}
                  </Button>
                </div>

                <Card className="p-4">
                  {isLoadingSpecification ? (
                    <div className="flex min-h-[220px] items-center justify-center text-sm text-gray-500">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Cargando ficha técnica...
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <Label htmlFor="engine_type">Tipo de Motor</Label>
                          <Input
                            id="engine_type"
                            value={vehicleSpecification.engine_type ?? ""}
                            onChange={(e) => handleSpecificationFieldChange("engine_type", e.target.value)}
                            placeholder="Ej. 2.8 Diesel"
                          />
                        </div>
                        <div>
                          <Label htmlFor="engine_code">Código de Motor</Label>
                          <Input
                            id="engine_code"
                            value={vehicleSpecification.engine_code ?? ""}
                            onChange={(e) => handleSpecificationFieldChange("engine_code", e.target.value)}
                            placeholder="Ej. 1GD-FTV"
                          />
                        </div>
                        <div>
                          <Label htmlFor="fuel_type">Tipo de Combustible</Label>
                          <Input
                            id="fuel_type"
                            value={vehicleSpecification.fuel_type ?? ""}
                            onChange={(e) => handleSpecificationFieldChange("fuel_type", e.target.value)}
                            placeholder="Ej. gasoil"
                          />
                        </div>
                        <div>
                          <Label htmlFor="transmission_type">Tipo de Transmisión</Label>
                          <Input
                            id="transmission_type"
                            value={vehicleSpecification.transmission_type ?? ""}
                            onChange={(e) => handleSpecificationFieldChange("transmission_type", e.target.value)}
                            placeholder="Ej. manual"
                          />
                        </div>
                        <div>
                          <Label htmlFor="drive_type">Tipo de Tracción</Label>
                          <Input
                            id="drive_type"
                            value={vehicleSpecification.drive_type ?? ""}
                            onChange={(e) => handleSpecificationFieldChange("drive_type", e.target.value)}
                            placeholder="Ej. 4x4"
                          />
                        </div>
                        <div>
                          <Label htmlFor="serial">SERIAL</Label>
                          <Input
                            id="serial"
                            value={vehicleSpecification.serial ?? ""}
                            onChange={(e) => handleSpecificationFieldChange("serial", e.target.value)}
                            placeholder="Serial del vehículo"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label htmlFor="chassis_number">Número de Chasis</Label>
                          <Input
                            id="chassis_number"
                            value={vehicleSpecification.chassis_number ?? ""}
                            onChange={(e) => handleSpecificationFieldChange("chassis_number", e.target.value)}
                            placeholder="Número de chasis"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="vehicle_spec_notes">Notas</Label>
                        <Textarea
                          id="vehicle_spec_notes"
                          value={vehicleSpecification.notes ?? ""}
                          onChange={(e) => handleSpecificationFieldChange("notes", e.target.value)}
                          placeholder="Detalles adicionales relevantes para repuestos o mantenimiento"
                        />
                      </div>
                    </div>
                  )}
                </Card>
              </TabsContent>

              <TabsContent value="parts" className="space-y-4">
                <div className="space-y-1">
                  <h3 className="font-semibold text-primary-900">Repuestos compatibles</h3>
                  <p className="text-sm text-gray-500">
                    Lista calculada por placa y ficha técnica registrada para este vehículo.
                  </p>
                </div>
                <Card className="overflow-hidden">
                  <Table>
                    <TableHeader className="bg-secondary-light">
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead>Cantidad</TableHead>
                        <TableHead>Ubicación Empresa</TableHead>
                        <TableHead>Compatibilidad</TableHead>
                        <TableHead>Precio Unitario</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {spareParts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                            No hay repuestos compatibles con este vehículo
                          </TableCell>
                        </TableRow>
                      ) : (
                        spareParts.map((part) => (
                          <TableRow key={part.id}>
                            <TableCell className="whitespace-nowrap font-medium">{part.code}</TableCell>
                            <TableCell>{part.description}</TableCell>
                            <TableCell>{part.quantity}</TableCell>
                            <TableCell>{part.company_location || "—"}</TableCell>
                            <TableCell>
                              {(part.fitments?.length ?? 0) > 0
                                ? `${part.fitments?.length} regla${part.fitments?.length !== 1 ? "s" : ""}`
                                : (part.compatible_vehicles?.length ?? 0) > 0
                                  ? "Por placa"
                                  : "General"}
                            </TableCell>
                            <TableCell>
                              {part.unit_price != null ? `$${part.unit_price.toLocaleString()}` : 'N/A'}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      <MaintenanceFormModal
        isOpen={showMaintenanceForm}
        onClose={() => setShowMaintenanceForm(false)}
        editingMaintenance={null}
        vehicles={vehicles}
        onSubmit={handleMaintenanceSubmit}
      />
    </>
  );
}
