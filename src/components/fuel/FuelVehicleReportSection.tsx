import { Dispatch, SetStateAction, useMemo, type ComponentType } from "react";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FuelConsumptionAnomaly,
  FuelReportBucket,
  FuelReportMovement,
  FuelType,
  FuelVehicleReport,
  Vehicle,
} from "@/types";
import {
  AlertTriangle,
  BarChart3,
  Calendar,
  Car,
  Download,
  Droplets,
  Fuel,
  Gauge,
  RefreshCw,
} from "lucide-react";
import { Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";

export interface FuelVehicleReportUiFilters {
  vehicle_id?: string;
  fuel_type?: FuelType;
  date_from?: string;
  date_to?: string;
  bucket: FuelReportBucket;
}

interface FuelVehicleReportSectionProps {
  vehicles: Vehicle[];
  vehicleMap: Map<string, Vehicle>;
  isLoadingVehicles: boolean;
  filters: FuelVehicleReportUiFilters;
  setFilters: Dispatch<SetStateAction<FuelVehicleReportUiFilters>>;
  report: FuelVehicleReport | null;
  isLoadingReport: boolean;
  isDownloadingReport: boolean;
  reportError: string | null;
  onApply: () => Promise<void> | void;
  onClear: () => void;
  onDownload: () => Promise<void> | void;
  getVehicleDisplayLabel: (vehicle?: Vehicle, fallbackPlateOrId?: string) => string;
}

const FUEL_TYPE_OPTIONS: Array<{ value: FuelType; label: string }> = [
  { value: "gasoil", label: "Gasoil" },
  { value: "gasolina", label: "Gasolina" },
];

const REPORT_BUCKET_OPTIONS: Array<{ value: FuelReportBucket; label: string }> = [
  { value: "day", label: "Diario" },
  { value: "week", label: "Semanal" },
  { value: "month", label: "Mensual" },
];

const chartConfig = {
  total_liters: {
    label: "Litros",
    color: "#0f766e",
  },
  average_consumption_l_per_100km: {
    label: "Consumo L/100km",
    color: "#b45309",
  },
} as const;

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleString("es-VE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatShortDate = (value?: string | null) => {
  if (!value) return "-";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString("es-VE", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
};

const formatPeriodLabel = (value: string, bucket: FuelReportBucket) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  if (bucket === "month") {
    return parsed.toLocaleDateString("es-VE", { month: "short", year: "2-digit" });
  }

  if (bucket === "week") {
    return parsed.toLocaleDateString("es-VE", { month: "short", day: "2-digit" });
  }

  return parsed.toLocaleDateString("es-VE", { month: "2-digit", day: "2-digit" });
};

const formatNumber = (value?: number | null, suffix = "", fallback = "s/d") => {
  if (value === undefined || value === null) return fallback;
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}${suffix}`;
};

const getFuelTypeLabel = (fuelType?: FuelType | null) => {
  if (!fuelType) return "Todos";
  return fuelType === "gasoil" ? "Gasoil" : "Gasolina";
};

const getMovementPrimaryText = (movement: FuelReportMovement) => {
  if (movement.event_type === "fuel_log") {
    return formatNumber(movement.liters, " L");
  }

  return movement.reading_value === undefined || movement.reading_value === null
    ? "-"
    : `${movement.reading_value.toLocaleString(undefined, { maximumFractionDigits: 2 })}${
        movement.reading_unit === "percent" ? "%" : " L"
      }`;
};

const getMovementSecondaryText = (movement: FuelReportMovement) => {
  if (movement.event_type === "fuel_log") {
    const cost = formatNumber(movement.total_cost, "", "s/d");
    const unitCost = formatNumber(movement.unit_cost, "", "s/d");
    const station = movement.station?.trim();
    return `${station ? `${station} · ` : ""}Costo ${cost} · Unit ${unitCost}`;
  }

  return movement.reading_unit === "percent" ? "Lectura porcentual" : "Lectura en litros";
};

const SectionEmpty = ({ title, description }: { title: string; description: string }) => (
  <div className="rounded-lg border border-dashed p-6 text-center bg-white">
    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
      <Fuel className="h-6 w-6 text-gray-400" />
    </div>
    <p className="text-sm font-semibold text-gray-800">{title}</p>
    <p className="mt-1 text-sm text-gray-500">{description}</p>
  </div>
);

const MetricCard = ({
  title,
  value,
  caption,
  icon: Icon,
}: {
  title: string;
  value: string;
  caption: string;
  icon: ComponentType<{ className?: string }>;
}) => (
  <Card className="p-4 border-primary/15 bg-white">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs uppercase tracking-wide text-gray-500">{title}</p>
        <p className="mt-2 text-xl font-semibold text-primary-900">{value}</p>
        <p className="mt-1 text-xs text-gray-500">{caption}</p>
      </div>
      <div className="rounded-full bg-primary/10 p-2 text-primary">
        <Icon className="h-4 w-4" />
      </div>
    </div>
  </Card>
);

const LatestStatusCard = ({
  report,
  unitLabel,
}: {
  report: FuelVehicleReport;
  unitLabel: string;
}) => {
  const status = report.latest_status;

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-primary-900">Ultima observacion</p>
          <p className="text-xs text-gray-500">{unitLabel}</p>
        </div>
        {status ? (
          <Badge variant="outline">{status.source === "fuel_log" ? "Carga registrada" : "Lectura manual"}</Badge>
        ) : null}
      </div>

      {!status ? (
        <SectionEmpty
          title="Sin observaciones en el rango"
          description="El backend no reporto una ultima observacion para los filtros aplicados."
        />
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="rounded-md border bg-gray-50 p-3">
              <p className="text-gray-500">Fecha</p>
              <p className="font-medium text-gray-900">{formatDateTime(status.as_of)}</p>
            </div>
            <div className="rounded-md border bg-gray-50 p-3">
              <p className="text-gray-500">Combustible</p>
              <p className="font-medium text-gray-900">{getFuelTypeLabel(status.fuel_type)}</p>
            </div>
            <div className="rounded-md border bg-gray-50 p-3">
              <p className="text-gray-500">
                {status.source === "fuel_log" ? "Litros cargados" : "Lectura observada"}
              </p>
              <p className="font-medium text-gray-900">
                {status.source === "fuel_log"
                  ? formatNumber(status.liters, " L", "-")
                  : status.reading_value === undefined || status.reading_value === null
                    ? "-"
                    : `${status.reading_value.toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}${status.reading_unit === "percent" ? "%" : " L"}`}
              </p>
            </div>
            <div className="rounded-md border bg-gray-50 p-3">
              <p className="text-gray-500">Odometro</p>
              <p className="font-medium text-gray-900">{formatNumber(status.odometer_km, " km", "-")}</p>
            </div>
          </div>

          <div className="rounded-md border bg-gray-50 p-3 text-sm text-gray-700">
            {status.message}
          </div>
        </div>
      )}
    </Card>
  );
};

export function FuelVehicleReportSection({
  vehicles,
  vehicleMap,
  isLoadingVehicles,
  filters,
  setFilters,
  report,
  isLoadingReport,
  isDownloadingReport,
  reportError,
  onApply,
  onClear,
  onDownload,
  getVehicleDisplayLabel,
}: FuelVehicleReportSectionProps) {
  const selectedVehicle = filters.vehicle_id ? vehicleMap.get(filters.vehicle_id) : undefined;
  const displayedVehicle = report ? vehicleMap.get(report.vehicle_id) : selectedVehicle;
  const displayedVehicleLabel = getVehicleDisplayLabel(
    displayedVehicle,
    report?.vehicle_plate || filters.vehicle_id
  );

  const timelineData = useMemo(
    () =>
      (report?.timeline ?? []).map((point) => ({
        ...point,
        label: formatPeriodLabel(point.period_start, point.bucket),
      })),
    [report]
  );

  const summaryFuelTypes = report?.summary.fuel_types ?? [];
  const reportAnomalies = report?.anomalies ?? [];
  const reportMovements = report?.movements ?? [];

  return (
    <div className="space-y-4">
      <Card className="p-4 border-primary/20 bg-gradient-to-r from-primary/5 via-white to-amber-50/40">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-primary-900">Reporte por unidad</p>
            <p className="text-xs text-gray-500 mt-1">
              El resumen, las anomalias y el consumo promedio se consumen directamente del backend, sin recalculo en cliente.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={onClear}>
              Limpiar
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void onDownload()}
              disabled={!filters.vehicle_id || isDownloadingReport}
            >
              <Download className="mr-2 h-4 w-4" />
              {isDownloadingReport ? "Descargando..." : "Descargar PDF"}
            </Button>
            <Button type="button" onClick={() => void onApply()} disabled={isLoadingReport}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {isLoadingReport ? "Consultando..." : "Consultar reporte"}
            </Button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
          <div>
            <Label>Unidad</Label>
            <Select
              value={filters.vehicle_id || "all"}
              onValueChange={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  vehicle_id: value === "all" ? undefined : value,
                }))
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
                    {getVehicleDisplayLabel(vehicle)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Combustible</Label>
            <Select
              value={filters.fuel_type || "all"}
              onValueChange={(value) =>
                setFilters((prev) => ({
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
            <Label>Agrupar por</Label>
            <Select
              value={filters.bucket}
              onValueChange={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  bucket: value as FuelReportBucket,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Periodo" />
              </SelectTrigger>
              <SelectContent>
                {REPORT_BUCKET_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Desde</Label>
            <div className="relative">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="date"
                className="pl-9"
                value={filters.date_from || ""}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    date_from: event.target.value || undefined,
                  }))
                }
              />
            </div>
          </div>

          <div>
            <Label>Hasta</Label>
            <div className="relative">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="date"
                className="pl-9"
                value={filters.date_to || ""}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    date_to: event.target.value || undefined,
                  }))
                }
              />
            </div>
          </div>
        </div>
      </Card>

      {!filters.vehicle_id ? (
        <SectionEmpty
          title="Selecciona una unidad"
          description="Consulta el reporte agregado por backend y descarga el PDF con los mismos filtros principales."
        />
      ) : isLoadingReport ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Card key={index} className="p-4 space-y-3">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-3 w-full" />
              </Card>
            ))}
          </div>
          <Card className="p-4 space-y-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-[280px] w-full" />
          </Card>
        </div>
      ) : reportError ? (
        <Card className="p-4 border-red-200 bg-red-50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-red-800">No se pudo generar el reporte</p>
              <p className="text-sm text-red-700">{reportError}</p>
            </div>
            <Button variant="outline" className="border-red-300" onClick={() => void onApply()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Reintentar
            </Button>
          </div>
        </Card>
      ) : !report ? (
        <SectionEmpty
          title="Listo para consultar"
          description="Aplica los filtros para ver el resumen, la ultima observacion, la linea de tiempo, las anomalias y el historial detallado."
        />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
            <MetricCard
              title="Cargas"
              value={formatNumber(report.summary.total_logs, "", "0")}
              caption="Registros de abastecimiento"
              icon={Droplets}
            />
            <MetricCard
              title="Lecturas"
              value={formatNumber(report.summary.total_readings, "", "0")}
              caption="Observaciones manuales"
              icon={Gauge}
            />
            <MetricCard
              title="Litros"
              value={formatNumber(report.summary.total_liters, " L", "0 L")}
              caption="Volumen total del rango"
              icon={Fuel}
            />
            <MetricCard
              title="Costo total"
              value={formatNumber(report.summary.total_cost, "", "0")}
              caption="Suma de cargas registradas"
              icon={BarChart3}
            />
            <MetricCard
              title="Distancia"
              value={formatNumber(report.summary.distance_km, " km")}
              caption="Recorrido inferido del rango"
              icon={Car}
            />
            <MetricCard
              title="Consumo promedio"
              value={formatNumber(report.summary.average_consumption_l_per_100km, " L/100km")}
              caption="Calculado por backend"
              icon={AlertTriangle}
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] gap-4">
            <LatestStatusCard report={report} unitLabel={displayedVehicleLabel} />

            <Card className="p-4 space-y-3">
              <div>
                <p className="text-sm font-semibold text-primary-900">Contexto del reporte</p>
                <p className="text-xs text-gray-500">Resumen del rango y filtros aplicados.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="rounded-md border bg-gray-50 p-3">
                  <p className="text-gray-500">Unidad</p>
                  <p className="font-medium text-gray-900">{displayedVehicleLabel}</p>
                </div>
                <div className="rounded-md border bg-gray-50 p-3">
                  <p className="text-gray-500">Combustible filtrado</p>
                  <p className="font-medium text-gray-900">{getFuelTypeLabel(report.fuel_type_filter)}</p>
                </div>
                <div className="rounded-md border bg-gray-50 p-3">
                  <p className="text-gray-500">Primer evento</p>
                  <p className="font-medium text-gray-900">{formatDateTime(report.summary.first_event_at)}</p>
                </div>
                <div className="rounded-md border bg-gray-50 p-3">
                  <p className="text-gray-500">Ultimo evento</p>
                  <p className="font-medium text-gray-900">{formatDateTime(report.summary.last_event_at)}</p>
                </div>
                <div className="rounded-md border bg-gray-50 p-3">
                  <p className="text-gray-500">Odometro inicial</p>
                  <p className="font-medium text-gray-900">{formatNumber(report.summary.odometer_start_km, " km", "-")}</p>
                </div>
                <div className="rounded-md border bg-gray-50 p-3">
                  <p className="text-gray-500">Odometro final</p>
                  <p className="font-medium text-gray-900">{formatNumber(report.summary.odometer_end_km, " km", "-")}</p>
                </div>
              </div>

              <div className="rounded-md border bg-gray-50 p-3 text-sm">
                <p className="text-gray-500 mb-2">Tipos observados</p>
                <div className="flex flex-wrap gap-2">
                  {summaryFuelTypes.length > 0 ? (
                    summaryFuelTypes.map((fuelType) => (
                      <Badge key={fuelType} variant="outline">
                        {getFuelTypeLabel(fuelType)}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-gray-500">Sin detalle</span>
                  )}
                </div>
              </div>
            </Card>
          </div>

          <Card className="p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-primary-900">Linea de tiempo</p>
                <p className="text-xs text-gray-500">
                  Agrupada por {REPORT_BUCKET_OPTIONS.find((option) => option.value === report.bucket)?.label.toLowerCase() || report.bucket}.
                </p>
              </div>
              <Badge variant="outline">{timelineData.length} periodos</Badge>
            </div>

            {timelineData.length === 0 ? (
              <SectionEmpty
                title="Sin puntos en la linea de tiempo"
                description="El backend no devolvio periodos agregados para el rango solicitado."
              />
            ) : (
              <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
                <ComposedChart data={timelineData}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} />
                  <YAxis yAxisId="liters" tickLine={false} axisLine={false} width={72} />
                  <YAxis yAxisId="consumption" orientation="right" tickLine={false} axisLine={false} width={88} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar
                    yAxisId="liters"
                    dataKey="total_liters"
                    fill="var(--color-total_liters)"
                    radius={[4, 4, 0, 0]}
                  />
                  <Line
                    yAxisId="consumption"
                    type="monotone"
                    dataKey="average_consumption_l_per_100km"
                    stroke="var(--color-average_consumption_l_per_100km)"
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                </ComposedChart>
              </ChartContainer>
            )}
          </Card>

          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-primary-900">Anomalias destacadas</p>
                <p className="text-xs text-gray-500">Priorizadas por backend para la unidad seleccionada.</p>
              </div>
              <Badge variant="outline">{reportAnomalies.length}</Badge>
            </div>

            {reportAnomalies.length === 0 ? (
              <SectionEmpty
                title="Sin anomalias en el rango"
                description="No hay desviaciones destacadas para los filtros actuales."
              />
            ) : (
              <div className="overflow-x-auto rounded-lg border border-secondary-medium bg-white">
                <table className="w-full min-w-[860px]">
                  <thead className="bg-secondary-light">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs font-semibold">Fecha</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold">Combustible</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold">Observado L/100km</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold">Base L/100km</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold">Desviacion</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold">Distancia</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold">Litros</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold">Severidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportAnomalies.map((anomaly: FuelConsumptionAnomaly) => (
                      <tr key={`${anomaly.vehicle_id}-${anomaly.as_of}-${anomaly.fuel_type}`} className="border-t">
                        <td className="px-3 py-2 text-sm">{formatShortDate(anomaly.as_of)}</td>
                        <td className="px-3 py-2 text-sm">{getFuelTypeLabel(anomaly.fuel_type)}</td>
                        <td className="px-3 py-2 text-sm">{formatNumber(anomaly.observed_liters_per_100km)}</td>
                        <td className="px-3 py-2 text-sm">{formatNumber(anomaly.baseline_liters_per_100km)}</td>
                        <td className="px-3 py-2 text-sm font-semibold">{formatNumber(anomaly.deviation_percent, "%")}</td>
                        <td className="px-3 py-2 text-sm">{formatNumber(anomaly.distance_km, " km")}</td>
                        <td className="px-3 py-2 text-sm">{formatNumber(anomaly.liters, " L")}</td>
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
          </Card>

          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-primary-900">Movimientos detallados</p>
                <p className="text-xs text-gray-500">Incluye cargas y lecturas devueltas por el backend para el rango actual.</p>
              </div>
              <Badge variant="outline">{reportMovements.length}</Badge>
            </div>

            {reportMovements.length === 0 ? (
              <SectionEmpty
                title="Sin movimientos en el rango"
                description="No se registraron cargas ni lecturas para la unidad en el filtro actual."
              />
            ) : (
              <div className="overflow-x-auto rounded-lg border border-secondary-medium bg-white">
                <table className="w-full min-w-[980px]">
                  <thead className="bg-secondary-light">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs font-semibold">Fecha</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold">Evento</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold">Combustible</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold">Detalle</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold">Resumen</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold">Odometro</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold">Notas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportMovements.map((movement) => (
                      <tr key={`${movement.event_type}-${movement.record_id}`} className="border-t align-top">
                        <td className="px-3 py-2 text-sm whitespace-nowrap">{formatDateTime(movement.occurred_at)}</td>
                        <td className="px-3 py-2 text-sm">
                          <Badge variant="outline">
                            {movement.event_type === "fuel_log" ? "Carga" : "Lectura"}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-sm">{getFuelTypeLabel(movement.fuel_type)}</td>
                        <td className="px-3 py-2 text-sm font-medium">{getMovementPrimaryText(movement)}</td>
                        <td className="px-3 py-2 text-sm text-gray-600">{getMovementSecondaryText(movement)}</td>
                        <td className="px-3 py-2 text-sm">{formatNumber(movement.odometer_km, " km", "-")}</td>
                        <td className="px-3 py-2 text-sm max-w-[320px] whitespace-normal break-words text-gray-600">
                          {movement.notes?.trim() || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}