
import { useEffect, useMemo, useState } from "react";
import { SparePart, Vehicle, VehicleSpecification, VehicleSpecificationPayload } from "@/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Edit, Gauge, Loader2, MapPin, Save, Wrench } from "lucide-react";
import { MaintenanceFormModal } from "@/components/maintenance/MaintenanceFormModal";
import { useMaintenance } from "@/hooks/useMaintenance";
import { maintenanceTypeConfig } from "@/constants/maintenanceTypes";
import { useAuthenticatedFetch } from "@/hooks/useAuthenticatedFetch";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { maintenancesApi, ApiRequestError } from "@/services/maintenancesApi";
import { sparePartsApi } from "@/services/sparePartsApi";
import { vehiclesApi } from "@/services/vehiclesApi";

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
  vin: "",
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
  vin: specification?.vin ?? "",
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
        if (message !== "Sesión expirada") {
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
        if (message !== "Sesión expirada") {
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

  const getStatusBadge = (status: Vehicle['status']) => {
    const statusConfig = {
      available: { text: 'Operativa', className: 'bg-green-100 text-green-800' },
      maintenance: { text: 'En Mantenimiento', className: 'bg-yellow-100 text-yellow-800' },
      out_of_service: { text: 'Inactiva', className: 'bg-red-100 text-red-800' }
    };
    
    const config = statusConfig[status] || { text: status, className: 'bg-blue-100 text-blue-800' };
    return <Badge className={config.className}>{config.text}</Badge>;
  };

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
    return { text: `${remaining.toLocaleString()} km`, isOverdue: false };
  };

  const m3Status = getM3Status();

  const handleSaveKilometers = () => {
    const km = parseInt(kmValue);
    if (!isNaN(km) && km > 0) {
      onUpdateKilometers(vehicle.plate_number, km);
      setEditingKm(false);
    }
  };

  const handleMaintenanceSubmit = async (formData: any) => {
    const success = await createMaintenance(formData);
    if (success) {
      setShowMaintenanceForm(false);
    }
    return success;
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

    if (error instanceof Error && error.message === "Sesión expirada") {
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>Detalles del Vehículo - {vehicle.plate_number}</span>
              {getStatusBadge(vehicle.status)}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Información básica */}
            <Card className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-sm text-gray-600">Marca</Label>
                  <p className="font-medium">{vehicle.brand}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Modelo</Label>
                  <p className="font-medium">{vehicle.model}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Año</Label>
                  <p className="font-medium">{vehicle.year}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Placa</Label>
                  <p className="font-medium">{vehicle.plate_number}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600 flex items-center gap-1">
                    <Gauge className="w-4 h-4" />
                    Kilometraje Actual
                  </Label>
                  {editingKm ? (
                    <div className="flex gap-2 mt-1">
                      <Input
                        type="number"
                        value={kmValue}
                        onChange={(e) => setKmValue(e.target.value)}
                        placeholder={(vehicle.current_kilometers || vehicle.kilometers || 0).toString()}
                        className="w-24"
                      />
                      <Button size="sm" onClick={handleSaveKilometers}>
                        Guardar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingKm(false)}>
                        Cancelar
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{(vehicle.current_kilometers || vehicle.kilometers || 0).toLocaleString()} km</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingKm(true)}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-sm text-gray-600 flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    Status
                  </Label>
                  <p className="font-medium">{vehicle.location || vehicle.status}</p>
                </div>
              </div>
            </Card>

            {/* Progreso M3 */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <Label className="font-medium flex items-center gap-2">
                  <Wrench className="w-4 h-4" />
                  Próximo Mantenimiento M3
                </Label>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Último M3: {vehicle.last_m3_date ? new Date(vehicle.last_m3_date).toLocaleDateString() : 'No registrado'}</span>
                  <span className={m3Status.isOverdue ? 'text-red-600 font-medium' : ''}>
                    Faltan: {m3Status.text}
                  </span>
                </div>
                <Progress value={calculateM3Progress()} className="h-2" />
                <div className="text-xs text-gray-500">
                  Próximo M3 en: {vehicle.next_m3_kilometers?.toLocaleString() || 'N/A'} km
                </div>
              </div>
            </Card>

            {/* Tabs para historial, ficha técnica y repuestos */}
            <Tabs defaultValue="maintenance" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="maintenance">Historial de Mantenimientos</TabsTrigger>
                <TabsTrigger value="specs">Ficha Técnica</TabsTrigger>
                <TabsTrigger value="parts">Repuestos</TabsTrigger>
              </TabsList>

              <TabsContent value="maintenance" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">Historial de Mantenimientos ({vehicleMaintenances.length})</h3>
                  <div className="flex items-center gap-2">
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

                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Kilometraje</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead>Status</TableHead>
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
                                {maintenanceItem.type}
                              </Badge>
                            </TableCell>
                            <TableCell>{new Date(maintenanceItem.date).toLocaleDateString()}</TableCell>
                            <TableCell>{maintenanceItem.kilometers?.toLocaleString()} km</TableCell>
                            <TableCell>{maintenanceItem.description}</TableCell>
                            <TableCell>{maintenanceItem.location || 'No especificada'}</TableCell>
                            <TableCell>{maintenanceItem.performed_by || 'No especificado'}</TableCell>
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
                    <h3 className="font-medium">Ficha Técnica del Vehículo</h3>
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
                          <Label htmlFor="vin">VIN</Label>
                          <Input
                            id="vin"
                            value={vehicleSpecification.vin ?? ""}
                            onChange={(e) => handleSpecificationFieldChange("vin", e.target.value)}
                            placeholder="Número VIN"
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
                  <h3 className="font-medium">Repuestos Compatibles ({spareParts.length})</h3>
                  <p className="text-sm text-gray-500">
                    Lista calculada por placa y ficha técnica registrada para este vehículo.
                  </p>
                </div>
                <Card>
                  <Table>
                    <TableHeader>
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
                            <TableCell>{part.code}</TableCell>
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
