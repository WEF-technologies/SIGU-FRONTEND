import { ReactNode, useMemo, useState } from "react";
import { FuelLogForm } from "@/components/fuel/FuelLogForm";
import { FuelReadingForm } from "@/components/fuel/FuelReadingForm";
import { FormModal } from "@/components/shared/FormModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  Car,
  Droplets,
  Fuel,
  Gauge,
  Plus,
  RefreshCw,
  Search,
  TrendingUp,
} from "lucide-react";
import { useFuel } from "@/hooks/useFuel";
import { FuelAnomalyFilters, FuelLog, FuelReading, FuelType } from "@/types";

type FuelLogRow = FuelLog & { vehicle_plate: string };
type FuelReadingRow = FuelReading & { vehicle_plate: string };

const FUEL_TYPE_OPTIONS: Array<{ value: FuelType; label: string }> = [
  { value: "gasoil", label: "Gasoil" },
  { value: "gasolina", label: "Gasolina" },
];

const getFuelTypeLabel = (fuelType: FuelType) =>
  fuelType === "gasoil" ? "Gasoil" : "Gasolina";

const formatDateTime = (isoDate: string) => {
  return new Date(isoDate).toLocaleString("es-VE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatShortDate = (isoDate: string) => {
  return new Date(isoDate).toLocaleDateString("es-VE", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
};

const NumberCell = ({ value, suffix = "" }: { value?: number | null; suffix?: string }) => {
  if (value === undefined || value === null) return <span className="text-gray-400">-</span>;
  return (
    <span>
      {value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
      {suffix}
    </span>
  );
};

const EmptyState = ({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) => {
  return (
    <Card className="p-8 text-center border-dashed">
      <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
        <Fuel className="w-6 h-6 text-gray-400" />
      </div>
      <p className="text-base font-semibold text-gray-700">{title}</p>
      <p className="text-sm text-gray-500 mt-1">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </Card>
  );
};

const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => {
  return (
    <Card className="p-4 border-red-200 bg-red-50">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-red-800">Ocurrio un error</p>
          <p className="text-sm text-red-700">{message}</p>
        </div>
        <Button variant="outline" className="border-red-300" onClick={onRetry}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Reintentar
        </Button>
      </div>
    </Card>
  );
};

const StatusCard = ({
  plate,
  source,
  asOf,
  fuelType,
  message,
  liters,
  totalCost,
  readingValue,
  readingUnit,
  odometerKm,
}: {
  plate: string;
  source: "fuel_log" | "fuel_reading";
  asOf: string;
  fuelType: FuelType;
  message: string;
  liters?: number;
  totalCost?: number;
  readingValue?: number;
  readingUnit?: "liters" | "percent";
  odometerKm?: number | null;
}) => {
  const sourceLabel = source === "fuel_log" ? "Carga registrada" : "Lectura manual";

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Car className="w-4 h-4 text-primary" />
          <span className="font-semibold text-primary-900">{plate}</span>
        </div>
        <Badge variant="outline" className="text-xs">
          {sourceLabel}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-gray-500">as_of</p>
          <p className="font-medium">{formatDateTime(asOf)}</p>
        </div>
        <div>
          <p className="text-gray-500">Combustible</p>
          <p className="font-medium">{getFuelTypeLabel(fuelType)}</p>
        </div>

        {source === "fuel_log" ? (
          <>
            <div>
              <p className="text-gray-500">Litros</p>
              <p className="font-medium">
                <NumberCell value={liters} suffix=" L" />
              </p>
            </div>
            <div>
              <p className="text-gray-500">Costo total</p>
              <p className="font-medium">
                <NumberCell value={totalCost} />
              </p>
            </div>
          </>
        ) : (
          <div>
            <p className="text-gray-500">Lectura observada</p>
            <p className="font-medium">
              {readingValue !== undefined && readingValue !== null
                ? `${readingValue.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}${readingUnit === "percent" ? "%" : " L"}`
                : "-"}
            </p>
          </div>
        )}

        <div>
          <p className="text-gray-500">Odometro</p>
          <p className="font-medium">
            <NumberCell value={odometerKm} suffix=" km" />
          </p>
        </div>
      </div>

      <p className="text-sm text-gray-600 bg-gray-50 border border-gray-100 rounded-md p-2">{message}</p>
    </Card>
  );
};

const LogsTable = ({ items }: { items: FuelLogRow[] }) => {
  return (
    <div className="overflow-x-auto rounded-lg border border-secondary-medium bg-white">
      <table className="w-full min-w-[920px]">
        <thead className="bg-secondary-light">
          <tr>
            <th className="text-left px-3 py-2 text-xs font-semibold">Fecha</th>
            <th className="text-left px-3 py-2 text-xs font-semibold">Unidad</th>
            <th className="text-left px-3 py-2 text-xs font-semibold">Combustible</th>
            <th className="text-left px-3 py-2 text-xs font-semibold">Litros</th>
            <th className="text-left px-3 py-2 text-xs font-semibold">Costo</th>
            <th className="text-left px-3 py-2 text-xs font-semibold">Odometro</th>
            <th className="text-left px-3 py-2 text-xs font-semibold">Estacion</th>
            <th className="text-left px-3 py-2 text-xs font-semibold">Notas</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-t hover:bg-secondary-light/60 transition-colors">
              <td className="px-3 py-2 text-sm">{formatDateTime(item.fueled_at)}</td>
              <td className="px-3 py-2 text-sm font-medium">{item.vehicle_plate}</td>
              <td className="px-3 py-2 text-sm">{getFuelTypeLabel(item.fuel_type)}</td>
              <td className="px-3 py-2 text-sm">
                <NumberCell value={item.liters} suffix=" L" />
              </td>
              <td className="px-3 py-2 text-sm">
                <NumberCell value={item.total_cost} />
              </td>
              <td className="px-3 py-2 text-sm">
                <NumberCell value={item.odometer_km} suffix=" km" />
              </td>
              <td className="px-3 py-2 text-sm">{item.station || "-"}</td>
              <td className="px-3 py-2 text-sm max-w-[280px] truncate" title={item.notes || undefined}>
                {item.notes || "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const ReadingsTable = ({ items }: { items: FuelReadingRow[] }) => {
  return (
    <div className="overflow-x-auto rounded-lg border border-secondary-medium bg-white">
      <table className="w-full min-w-[920px]">
        <thead className="bg-secondary-light">
          <tr>
            <th className="text-left px-3 py-2 text-xs font-semibold">Fecha</th>
            <th className="text-left px-3 py-2 text-xs font-semibold">Unidad</th>
            <th className="text-left px-3 py-2 text-xs font-semibold">Combustible</th>
            <th className="text-left px-3 py-2 text-xs font-semibold">Lectura</th>
            <th className="text-left px-3 py-2 text-xs font-semibold">Unidad</th>
            <th className="text-left px-3 py-2 text-xs font-semibold">Odometro</th>
            <th className="text-left px-3 py-2 text-xs font-semibold">Notas</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-t hover:bg-secondary-light/60 transition-colors">
              <td className="px-3 py-2 text-sm">{formatDateTime(item.observed_at)}</td>
              <td className="px-3 py-2 text-sm font-medium">{item.vehicle_plate}</td>
              <td className="px-3 py-2 text-sm">{getFuelTypeLabel(item.fuel_type)}</td>
              <td className="px-3 py-2 text-sm">
                <NumberCell value={item.reading_value} />
              </td>
              <td className="px-3 py-2 text-sm">{item.reading_unit === "percent" ? "%" : "L"}</td>
              <td className="px-3 py-2 text-sm">
                <NumberCell value={item.odometer_km} suffix=" km" />
              </td>
              <td className="px-3 py-2 text-sm max-w-[280px] truncate" title={item.notes || undefined}>
                {item.notes || "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default function FuelPage() {
  const {
    logs,
    readings,
    anomalies,
    vehicles,
    statusByVehicle,
    statusLoadingByVehicle,
    statusErrorByVehicle,
    isLoadingLogs,
    isLoadingReadings,
    isLoadingAnomalies,
    isLoadingVehicles,
    logsError,
    readingsError,
    anomaliesError,
    vehiclesError,
    createLog,
    createReading,
    fetchLogs,
    fetchReadings,
    fetchAnomalies,
    fetchVehicleStatus,
    clearVehicleStatus,
    refreshAll,
    defaultAnomalyFilters,
  } = useFuel();

  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isReadingModalOpen, setIsReadingModalOpen] = useState(false);

  const [historyFilters, setHistoryFilters] = useState<{
    vehicle_id?: string;
    fuel_type?: FuelType;
    date_from?: string;
    date_to?: string;
    query: string;
  }>({ query: "" });

  const [statusFilters, setStatusFilters] = useState<{ vehicle_id?: string; fuel_type?: FuelType }>({});

  const [anomalyFilters, setAnomalyFilters] = useState<FuelAnomalyFilters>(defaultAnomalyFilters);

  const vehicleMap = useMemo(() => {
    return new Map(vehicles.map((vehicle) => [vehicle.id, vehicle]));
  }, [vehicles]);

  const enrichedLogs = useMemo(() => {
    return logs.map((log) => ({
      ...log,
      vehicle_plate: vehicleMap.get(log.vehicle_id)?.plate_number || log.vehicle_id,
    }));
  }, [logs, vehicleMap]);

  const enrichedReadings = useMemo(() => {
    return readings.map((reading) => ({
      ...reading,
      vehicle_plate: vehicleMap.get(reading.vehicle_id)?.plate_number || reading.vehicle_id,
    }));
  }, [readings, vehicleMap]);

  const filteredLogs = useMemo(() => {
    const q = historyFilters.query.trim().toLowerCase();
    if (!q) return enrichedLogs;

    return enrichedLogs.filter((item) => {
      const plate = item.vehicle_plate?.toLowerCase() || "";
      const station = item.station?.toLowerCase() || "";
      const notes = item.notes?.toLowerCase() || "";
      return plate.includes(q) || station.includes(q) || notes.includes(q);
    });
  }, [enrichedLogs, historyFilters.query]);

  const filteredReadings = useMemo(() => {
    const q = historyFilters.query.trim().toLowerCase();
    if (!q) return enrichedReadings;

    return enrichedReadings.filter((item) => {
      const plate = item.vehicle_plate?.toLowerCase() || "";
      const notes = item.notes?.toLowerCase() || "";
      return plate.includes(q) || notes.includes(q);
    });
  }, [enrichedReadings, historyFilters.query]);

  const selectedStatusVehicle = statusFilters.vehicle_id || "";
  const selectedStatus = selectedStatusVehicle ? statusByVehicle[selectedStatusVehicle] : null;
  const selectedStatusError = selectedStatusVehicle ? statusErrorByVehicle[selectedStatusVehicle] : null;
  const selectedStatusLoading = selectedStatusVehicle
    ? statusLoadingByVehicle[selectedStatusVehicle] === true
    : false;

  const applyHistoryFilters = async () => {
    const filters = {
      vehicle_id: historyFilters.vehicle_id,
      fuel_type: historyFilters.fuel_type,
      date_from: historyFilters.date_from,
      date_to: historyFilters.date_to,
    };

    await Promise.all([fetchLogs(filters), fetchReadings(filters)]);
  };

  const clearHistoryFilters = async () => {
    setHistoryFilters({ query: "" });
    await Promise.all([fetchLogs({}), fetchReadings({})]);
  };

  const applyStatusFilter = async () => {
    if (!statusFilters.vehicle_id) return;
    await fetchVehicleStatus(statusFilters.vehicle_id, statusFilters.fuel_type);
  };

  const clearStatusFilter = () => {
    if (statusFilters.vehicle_id) {
      clearVehicleStatus(statusFilters.vehicle_id);
    }
    setStatusFilters({});
  };

  const applyAnomalyFilters = async () => {
    await fetchAnomalies(anomalyFilters);
  };

  const clearAnomalyFilters = async () => {
    setAnomalyFilters(defaultAnomalyFilters);
    await fetchAnomalies(defaultAnomalyFilters);
  };

  const statusSummary = useMemo(() => {
    const totalLogs = logs.length;
    const totalReadings = readings.length;
    const totalAnomalies = anomalies.length;
    const criticalAnomalies = anomalies.filter((item) => item.severity === "critical").length;

    return {
      totalLogs,
      totalReadings,
      totalAnomalies,
      criticalAnomalies,
    };
  }, [logs, readings, anomalies]);

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary-900">Modulo de Combustible</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Registros observados de cargas y lecturas, estado por unidad y anomalias de consumo.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={refreshAll}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualizar
          </Button>
          <Button onClick={() => setIsLogModalOpen(true)} className="bg-primary hover:bg-primary/90 text-white">
            <Plus className="w-4 h-4 mr-2" />
            Nueva carga
          </Button>
          <Button
            onClick={() => setIsReadingModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva lectura
          </Button>
        </div>
      </div>

      {vehiclesError ? <ErrorState message={vehiclesError} onRetry={refreshAll} /> : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Droplets className="w-4 h-4" /> Cargas registradas
          </div>
          <p className="text-2xl font-bold text-primary-900 mt-2">{statusSummary.totalLogs}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Gauge className="w-4 h-4" /> Lecturas manuales
          </div>
          <p className="text-2xl font-bold text-primary-900 mt-2">{statusSummary.totalReadings}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <TrendingUp className="w-4 h-4" /> Anomalias detectadas
          </div>
          <p className="text-2xl font-bold text-primary-900 mt-2">{statusSummary.totalAnomalies}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <AlertTriangle className="w-4 h-4" /> Criticas
          </div>
          <p className="text-2xl font-bold text-red-600 mt-2">{statusSummary.criticalAnomalies}</p>
        </Card>
      </div>

      <Tabs defaultValue="logs" className="space-y-4">
        <TabsList className="w-full lg:w-auto grid grid-cols-2 lg:grid-cols-4 h-auto">
          <TabsTrigger value="logs">Cargas</TabsTrigger>
          <TabsTrigger value="readings">Lecturas</TabsTrigger>
          <TabsTrigger value="status">Estado actual</TabsTrigger>
          <TabsTrigger value="anomalies">Anomalias</TabsTrigger>
        </TabsList>

        <Card className="p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
              <Label>Unidad</Label>
              <Select
                value={historyFilters.vehicle_id || "all"}
                onValueChange={(value) =>
                  setHistoryFilters((prev) => ({ ...prev, vehicle_id: value === "all" ? undefined : value }))
                }
                disabled={isLoadingVehicles}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {vehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.plate_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Combustible</Label>
              <Select
                value={historyFilters.fuel_type || "all"}
                onValueChange={(value) =>
                  setHistoryFilters((prev) => ({
                    ...prev,
                    fuel_type: value === "all" ? undefined : (value as FuelType),
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {FUEL_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Desde</Label>
              <Input
                type="date"
                value={historyFilters.date_from || ""}
                onChange={(event) =>
                  setHistoryFilters((prev) => ({
                    ...prev,
                    date_from: event.target.value || undefined,
                  }))
                }
              />
            </div>

            <div>
              <Label>Hasta</Label>
              <Input
                type="date"
                value={historyFilters.date_to || ""}
                onChange={(event) =>
                  setHistoryFilters((prev) => ({
                    ...prev,
                    date_to: event.target.value || undefined,
                  }))
                }
              />
            </div>

            <div>
              <Label>Busqueda local</Label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  className="pl-9"
                  placeholder="Placa, notas, estacion..."
                  value={historyFilters.query}
                  onChange={(event) =>
                    setHistoryFilters((prev) => ({
                      ...prev,
                      query: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={clearHistoryFilters}>
              Limpiar
            </Button>
            <Button onClick={applyHistoryFilters}>Aplicar filtros</Button>
          </div>
        </Card>

        <TabsContent value="logs" className="space-y-4">
          {logsError ? <ErrorState message={logsError} onRetry={applyHistoryFilters} /> : null}

          {isLoadingLogs ? (
            <Card className="p-4 space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </Card>
          ) : filteredLogs.length === 0 ? (
            <EmptyState
              title="Sin cargas registradas"
              description="No hay datos para los filtros seleccionados."
              action={
                <Button onClick={() => setIsLogModalOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Registrar primera carga
                </Button>
              }
            />
          ) : (
            <LogsTable items={filteredLogs} />
          )}
        </TabsContent>

        <TabsContent value="readings" className="space-y-4">
          {readingsError ? <ErrorState message={readingsError} onRetry={applyHistoryFilters} /> : null}

          {isLoadingReadings ? (
            <Card className="p-4 space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </Card>
          ) : filteredReadings.length === 0 ? (
            <EmptyState
              title="Sin lecturas registradas"
              description="No hay lecturas para los filtros seleccionados."
              action={
                <Button onClick={() => setIsReadingModalOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Registrar primera lectura
                </Button>
              }
            />
          ) : (
            <ReadingsTable items={filteredReadings} />
          )}
        </TabsContent>

        <TabsContent value="status" className="space-y-4">
          <Card className="p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label>Unidad</Label>
                <Select
                  value={statusFilters.vehicle_id || "all"}
                  onValueChange={(value) =>
                    setStatusFilters((prev) => ({ ...prev, vehicle_id: value === "all" ? undefined : value }))
                  }
                  disabled={isLoadingVehicles}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar unidad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Seleccionar...</SelectItem>
                    {vehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.plate_number} - {vehicle.brand} {vehicle.model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Tipo de combustible</Label>
                <Select
                  value={statusFilters.fuel_type || "all"}
                  onValueChange={(value) =>
                    setStatusFilters((prev) => ({
                      ...prev,
                      fuel_type: value === "all" ? undefined : (value as FuelType),
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {FUEL_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end gap-2">
                <Button onClick={applyStatusFilter} disabled={!statusFilters.vehicle_id || selectedStatusLoading}>
                  {selectedStatusLoading ? "Consultando..." : "Consultar"}
                </Button>
                <Button variant="outline" onClick={clearStatusFilter}>
                  Limpiar
                </Button>
              </div>
            </div>
          </Card>

          {!statusFilters.vehicle_id ? (
            <EmptyState
              title="Selecciona una unidad"
              description="Consulta el estado actual basado en la observacion mas reciente entre carga y lectura."
            />
          ) : selectedStatusLoading ? (
            <Card className="p-4 space-y-3">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-24 w-full" />
            </Card>
          ) : selectedStatusError ? (
            <ErrorState message={selectedStatusError} onRetry={applyStatusFilter} />
          ) : selectedStatus ? (
            <StatusCard
              plate={selectedStatus.vehicle_plate}
              source={selectedStatus.source}
              asOf={selectedStatus.as_of}
              fuelType={selectedStatus.fuel_type}
              message={selectedStatus.message}
              liters={selectedStatus.liters}
              totalCost={selectedStatus.total_cost}
              readingValue={selectedStatus.reading_value}
              readingUnit={selectedStatus.reading_unit}
              odometerKm={selectedStatus.odometer_km}
            />
          ) : (
            <EmptyState title="Sin informacion reciente" description="No se encontro estado para la seleccion actual." />
          )}
        </TabsContent>

        <TabsContent value="anomalies" className="space-y-4">
          <Card className="p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
              <div>
                <Label>Unidad</Label>
                <Select
                  value={anomalyFilters.vehicle_id || "all"}
                  onValueChange={(value) =>
                    setAnomalyFilters((prev) => ({
                      ...prev,
                      vehicle_id: value === "all" ? undefined : value,
                    }))
                  }
                  disabled={isLoadingVehicles}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {vehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.plate_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Combustible</Label>
                <Select
                  value={anomalyFilters.fuel_type || "all"}
                  onValueChange={(value) =>
                    setAnomalyFilters((prev) => ({
                      ...prev,
                      fuel_type: value === "all" ? undefined : (value as FuelType),
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {FUEL_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Lookback</Label>
                <Input
                  type="number"
                  min={1}
                  value={anomalyFilters.lookback ?? defaultAnomalyFilters.lookback}
                  onChange={(event) =>
                    setAnomalyFilters((prev) => ({
                      ...prev,
                      lookback: Number(event.target.value) || defaultAnomalyFilters.lookback,
                    }))
                  }
                />
              </div>

              <div>
                <Label>Historial minimo</Label>
                <Input
                  type="number"
                  min={1}
                  value={anomalyFilters.min_history ?? defaultAnomalyFilters.min_history}
                  onChange={(event) =>
                    setAnomalyFilters((prev) => ({
                      ...prev,
                      min_history: Number(event.target.value) || defaultAnomalyFilters.min_history,
                    }))
                  }
                />
              </div>

              <div>
                <Label>Umbral desviacion %</Label>
                <Input
                  type="number"
                  min={1}
                  value={anomalyFilters.threshold_percent ?? defaultAnomalyFilters.threshold_percent}
                  onChange={(event) =>
                    setAnomalyFilters((prev) => ({
                      ...prev,
                      threshold_percent:
                        Number(event.target.value) || defaultAnomalyFilters.threshold_percent,
                    }))
                  }
                />
              </div>

              <div>
                <Label>Distancia minima km</Label>
                <Input
                  type="number"
                  min={1}
                  value={anomalyFilters.min_distance_km ?? defaultAnomalyFilters.min_distance_km}
                  onChange={(event) =>
                    setAnomalyFilters((prev) => ({
                      ...prev,
                      min_distance_km:
                        Number(event.target.value) || defaultAnomalyFilters.min_distance_km,
                    }))
                  }
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={clearAnomalyFilters}>
                Limpiar
              </Button>
              <Button onClick={applyAnomalyFilters}>Aplicar filtros</Button>
            </div>
          </Card>

          {anomaliesError ? <ErrorState message={anomaliesError} onRetry={applyAnomalyFilters} /> : null}

          {isLoadingAnomalies ? (
            <Card className="p-4 space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </Card>
          ) : anomalies.length === 0 ? (
            <EmptyState
              title="Sin anomalias detectadas"
              description="No hay suficientes observaciones o no se supero el umbral para marcar desviaciones."
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-secondary-medium bg-white">
              <table className="w-full min-w-[960px]">
                <thead className="bg-secondary-light">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-semibold">Unidad</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold">Combustible</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold">as_of</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold">Observado L/100km</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold">Baseline L/100km</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold">Desviacion %</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold">Distancia</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold">Litros</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold">Severidad</th>
                  </tr>
                </thead>
                <tbody>
                  {anomalies.map((anomaly) => (
                    <tr key={`${anomaly.vehicle_id}-${anomaly.as_of}-${anomaly.fuel_type}`} className="border-t">
                      <td className="px-3 py-2 text-sm font-medium">{anomaly.vehicle_plate}</td>
                      <td className="px-3 py-2 text-sm">{getFuelTypeLabel(anomaly.fuel_type)}</td>
                      <td className="px-3 py-2 text-sm">{formatShortDate(anomaly.as_of)}</td>
                      <td className="px-3 py-2 text-sm">
                        {anomaly.observed_liters_per_100km.toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-3 py-2 text-sm">
                        {anomaly.baseline_liters_per_100km.toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-3 py-2 text-sm font-semibold">
                        {anomaly.deviation_percent.toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })}
                        %
                      </td>
                      <td className="px-3 py-2 text-sm">
                        {anomaly.distance_km.toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })} km
                      </td>
                      <td className="px-3 py-2 text-sm">
                        {anomaly.liters.toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })} L
                      </td>
                      <td className="px-3 py-2 text-sm">
                        <Badge
                          className={
                            anomaly.severity === "critical"
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700"
                          }
                        >
                          {anomaly.severity === "critical" ? "Critica" : "Advertencia"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <FormModal isOpen={isLogModalOpen} onClose={() => setIsLogModalOpen(false)} title="Registrar carga de combustible">
        <FuelLogForm
          vehicles={vehicles}
          onSubmit={async (payload) => {
            const ok = await createLog(payload);
            if (ok) {
              setIsLogModalOpen(false);
            }
            return ok;
          }}
          onCancel={() => setIsLogModalOpen(false)}
        />
      </FormModal>

      <FormModal
        isOpen={isReadingModalOpen}
        onClose={() => setIsReadingModalOpen(false)}
        title="Registrar lectura de combustible"
      >
        <FuelReadingForm
          vehicles={vehicles}
          onSubmit={async (payload) => {
            const ok = await createReading(payload);
            if (ok) {
              setIsReadingModalOpen(false);
            }
            return ok;
          }}
          onCancel={() => setIsReadingModalOpen(false)}
        />
      </FormModal>

      {isLoadingVehicles && vehicles.length === 0 ? (
        <Card className="p-4">
          <p className="text-sm text-gray-500">Cargando catalogo de unidades...</p>
        </Card>
      ) : null}
    </div>
  );
}
