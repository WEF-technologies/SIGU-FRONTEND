import { ReactNode, memo, useDeferredValue, useEffect, useMemo, useState } from "react";
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
  BarChart3,
  Car,
  Droplets,
  Fuel,
  Gauge,
  List,
  Plus,
  RefreshCw,
  Search,
  TrendingUp,
} from "lucide-react";
import { useFuel } from "@/hooks/useFuel";
import { FuelAnomalyFilters, FuelLog, FuelReading, FuelType, Vehicle } from "@/types";

type FuelLogRow = FuelLog & {
  vehicle_plate: string;
  vehicle_label: string;
  vehicle_search_text: string;
};

type FuelReadingRow = FuelReading & {
  vehicle_plate: string;
  vehicle_label: string;
  vehicle_search_text: string;
};

type ReadingSortMode = "plate_asc" | "latest_desc" | "level_desc";
type ReadingsViewMode = "grouped" | "table";

interface FuelReadingsGroup {
  vehicleId: string;
  vehicleLabel: string;
  vehiclePlate: string;
  readings: FuelReadingRow[];
  latest: FuelReadingRow;
  latestTimestamp: number;
  latestNormalized: number | null;
  maxLitersReference: number;
  primaryUnit: "percent" | "liters";
  trendValues: number[];
}

const FUEL_TYPE_OPTIONS: Array<{ value: FuelType; label: string }> = [
  { value: "gasoil", label: "Gasoil" },
  { value: "gasolina", label: "Gasolina" },
];

const getFuelTypeLabel = (fuelType: FuelType) =>
  fuelType === "gasoil" ? "Gasoil" : "Gasolina";

const getVehicleDisplayLabel = (vehicle?: Vehicle, fallbackPlateOrId?: string) => {
  if (!vehicle) return fallbackPlateOrId || "Unidad no identificada";

  const descriptor = [vehicle.brand, vehicle.model, vehicle.year ? String(vehicle.year) : ""]
    .filter(Boolean)
    .join(" ")
    .trim();

  if (descriptor && vehicle.plate_number) {
    return `${descriptor} (${vehicle.plate_number})`;
  }

  return descriptor || vehicle.plate_number || fallbackPlateOrId || "Unidad no identificada";
};

const getVehicleSearchText = (vehicle?: Vehicle, fallbackPlateOrId?: string) => {
  if (!vehicle) return fallbackPlateOrId || "";

  return [
    vehicle.plate_number,
    vehicle.brand,
    vehicle.model,
    vehicle.year ? String(vehicle.year) : "",
    vehicle.location || "",
    vehicle.status,
  ]
    .filter(Boolean)
    .join(" ");
};

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

const clamp = (value: number, min: number, max: number) => {
  return Math.min(max, Math.max(min, value));
};

const formatReadingValue = (item: FuelReadingRow) => {
  const suffix = item.reading_unit === "percent" ? "%" : " L";
  return `${item.reading_value.toLocaleString(undefined, { maximumFractionDigits: 2 })}${suffix}`;
};

const getReadingNormalized = (item: FuelReadingRow, maxLitersReference: number): number | null => {
  if (item.reading_unit === "percent") {
    return clamp(item.reading_value, 0, 100) / 100;
  }

  if (maxLitersReference <= 0) return null;
  return clamp(item.reading_value / maxLitersReference, 0, 1);
};

const NumberCell = memo(({ value, suffix = "" }: { value?: number | null; suffix?: string }) => {
  if (value === undefined || value === null) return <span className="text-gray-400">-</span>;
  return (
    <span>
      {value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
      {suffix}
    </span>
  );
});

const EmptyState = memo(({
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
});

const ErrorState = memo(({ message, onRetry }: { message: string; onRetry: () => void }) => {
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
});

const InitialDataLoader = memo(() => {
  const dots = ["0ms", "120ms", "240ms"];

  return (
    <Card className="p-6 border-primary/20 bg-gradient-to-r from-primary/5 via-white to-emerald-50/60">
      <div className="flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <div className="h-14 w-14 rounded-full border-4 border-primary/25 animate-pulse" />
          <Droplets className="w-7 h-7 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-bounce" />
        </div>

        <div className="text-center">
          <p className="text-sm font-semibold text-primary-900">Cargando datos de combustible...</p>
          <p className="text-xs text-gray-500">Estamos obteniendo unidades, cargas y lecturas.</p>
        </div>

        <div className="flex items-center gap-1">
          {dots.map((delay) => (
            <span
              key={delay}
              className="h-2 w-2 rounded-full bg-primary animate-bounce"
              style={{ animationDelay: delay }}
            />
          ))}
        </div>

        <div className="w-full max-w-3xl space-y-2 pt-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      </div>
    </Card>
  );
});

const StatusCard = memo(({
  unitLabel,
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
  unitLabel: string;
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
          <span className="font-semibold text-primary-900">{unitLabel}</span>
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
});

const LogsTable = memo(({ items }: { items: FuelLogRow[] }) => {
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
              <td className="px-3 py-2 text-sm font-medium" title={item.vehicle_label}>{item.vehicle_label}</td>
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
});

const ReadingsTable = memo(({ items }: { items: FuelReadingRow[] }) => {
  return (
    <div className="overflow-x-auto rounded-lg border border-secondary-medium bg-white">
      <table className="w-full min-w-[920px]">
        <thead className="bg-secondary-light">
          <tr>
            <th className="text-left px-3 py-2 text-xs font-semibold">Fecha</th>
            <th className="text-left px-3 py-2 text-xs font-semibold">Unidad</th>
            <th className="text-left px-3 py-2 text-xs font-semibold">Combustible</th>
            <th className="text-left px-3 py-2 text-xs font-semibold">Lectura</th>
            <th className="text-left px-3 py-2 text-xs font-semibold">Medida</th>
            <th className="text-left px-3 py-2 text-xs font-semibold">Odometro</th>
            <th className="text-left px-3 py-2 text-xs font-semibold">Notas</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-t hover:bg-secondary-light/60 transition-colors">
              <td className="px-3 py-2 text-sm">{formatDateTime(item.observed_at)}</td>
              <td className="px-3 py-2 text-sm font-medium" title={item.vehicle_label}>{item.vehicle_label}</td>
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
});

const MiniSparkline = memo(({ values }: { values: number[] }) => {
  if (values.length < 2) {
    return <span className="text-xs text-gray-400">Sin tendencia suficiente</span>;
  }

  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 100;
      const y = 100 - clamp(value, 0, 1) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 100 100" className="w-full h-14" preserveAspectRatio="none" aria-hidden="true">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="6" className="text-primary/70" />
    </svg>
  );
});

const ReadingsByVehicle = memo(({
  groups,
  onCreateReading,
}: {
  groups: FuelReadingsGroup[];
  onCreateReading: () => void;
}) => {
  const topGroups = groups.slice(0, 8);

  const getLevelTone = (normalized: number | null) => {
    if (normalized === null) return "bg-gray-300";
    if (normalized <= 0.25) return "bg-red-500";
    if (normalized <= 0.5) return "bg-amber-500";
    return "bg-emerald-500";
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3 border-primary/20 bg-gradient-to-r from-primary/5 via-white to-emerald-50/40">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-primary-900">Lecturas actuales por unidad</p>
            <p className="text-xs text-gray-500">Vista rápida del nivel más reciente por vehículo.</p>
          </div>
          <Button variant="outline" className="w-full sm:w-auto" onClick={onCreateReading}>
            <Plus className="w-4 h-4 mr-2" />
            Registrar lectura
          </Button>
        </div>

        <div className="space-y-2">
          {topGroups.map((group) => {
            const level = group.latestNormalized !== null ? Math.round(group.latestNormalized * 100) : null;
            const barWidth = level === null ? 6 : Math.max(6, level);

            return (
              <div key={`bar-${group.vehicleId}`} className="grid grid-cols-[88px_1fr_auto] items-center gap-2">
                <span className="text-xs font-semibold text-gray-700 truncate" title={group.vehicleLabel}>
                  {group.vehicleLabel}
                </span>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className={`h-full ${getLevelTone(group.latestNormalized)}`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-gray-600 min-w-[42px] text-right">
                  {level === null ? "s/d" : `${level}%`}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        {groups.map((group) => {
          const level = group.latestNormalized !== null ? Math.round(group.latestNormalized * 100) : null;
          const levelTone = getLevelTone(group.latestNormalized);
          const recentItems = group.readings.slice(0, 3);

          return (
            <Card key={group.vehicleId} className="p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Car className="w-4 h-4 text-primary shrink-0" />
                  <p className="font-semibold text-primary-900 truncate" title={group.vehicleLabel}>
                    {group.vehicleLabel}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className="text-xs">
                    {group.primaryUnit === "percent" ? "Lectura %" : "Lectura L"}
                  </Badge>
                  <Badge className="bg-slate-100 text-slate-700 text-xs">{group.readings.length} reg.</Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-500">Última lectura</p>
                  <p className="font-semibold text-primary-900">{formatReadingValue(group.latest)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Odómetro</p>
                  <p className="font-semibold text-primary-900">
                    <NumberCell value={group.latest.odometer_km} suffix=" km" />
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Actualizado</p>
                  <p className="font-semibold text-primary-900">{formatShortDate(group.latest.observed_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Nivel relativo</p>
                  <p className="font-semibold text-primary-900">{level === null ? "s/d" : `${level}%`}</p>
                </div>
              </div>

              <div className="space-y-1">
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className={`h-full ${levelTone}`}
                    style={{ width: `${Math.max(6, level ?? 6)}%` }}
                  />
                </div>
                <p className="text-[11px] text-gray-500">
                  {group.primaryUnit === "percent"
                    ? "Escala de porcentaje del tanque"
                    : `Escala relativa respecto al máximo observado (${group.maxLitersReference.toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })} L)`}
                </p>
              </div>

              <div className="rounded-md border border-gray-100 p-2 bg-gray-50">
                <p className="text-xs text-gray-500 mb-1">Tendencia reciente</p>
                <MiniSparkline values={group.trendValues} />
              </div>

              <div className="space-y-1">
                <p className="text-xs text-gray-500">Últimos movimientos</p>
                {recentItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-xs border-b last:border-b-0 py-1">
                    <span className="text-gray-600">{formatDateTime(item.observed_at)}</span>
                    <span className="font-semibold text-primary-900">{formatReadingValue(item)}</span>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
});

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
    refreshCoreData,
    refreshAll,
    defaultAnomalyFilters,
  } = useFuel();

  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isReadingModalOpen, setIsReadingModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("logs");
  const [hasFetchedAnomalies, setHasFetchedAnomalies] = useState(false);

  const [historyFilters, setHistoryFilters] = useState<{
    vehicle_id?: string;
    fuel_type?: FuelType;
    date_from?: string;
    date_to?: string;
    query: string;
  }>({ query: "" });

  const [statusFilters, setStatusFilters] = useState<{ vehicle_id?: string; fuel_type?: FuelType }>({});

  const [anomalyFilters, setAnomalyFilters] = useState<FuelAnomalyFilters>(defaultAnomalyFilters);
  const [readingSortMode, setReadingSortMode] = useState<ReadingSortMode>("plate_asc");
  const [readingsViewMode, setReadingsViewMode] = useState<ReadingsViewMode>("grouped");
  const deferredHistoryQuery = useDeferredValue(historyFilters.query);

  useEffect(() => {
    let cancelled = false;

    const maybeFetchAnomalies = async () => {
      if (activeTab !== "anomalies" || hasFetchedAnomalies) return;
      await fetchAnomalies(defaultAnomalyFilters);
      if (!cancelled) {
        setHasFetchedAnomalies(true);
      }
    };

    maybeFetchAnomalies();

    return () => {
      cancelled = true;
    };
  }, [activeTab, hasFetchedAnomalies, fetchAnomalies, defaultAnomalyFilters]);

  const vehicleMap = useMemo(() => {
    return new Map(vehicles.map((vehicle) => [vehicle.id, vehicle]));
  }, [vehicles]);

  const enrichedLogs = useMemo(() => {
    return logs.map((log) => ({
      ...log,
      vehicle_plate: vehicleMap.get(log.vehicle_id)?.plate_number || log.vehicle_id,
      vehicle_label: getVehicleDisplayLabel(vehicleMap.get(log.vehicle_id), log.vehicle_id),
      vehicle_search_text: getVehicleSearchText(vehicleMap.get(log.vehicle_id), log.vehicle_id),
    }));
  }, [logs, vehicleMap]);

  const enrichedReadings = useMemo(() => {
    return readings.map((reading) => ({
      ...reading,
      vehicle_plate: vehicleMap.get(reading.vehicle_id)?.plate_number || reading.vehicle_id,
      vehicle_label: getVehicleDisplayLabel(vehicleMap.get(reading.vehicle_id), reading.vehicle_id),
      vehicle_search_text: getVehicleSearchText(vehicleMap.get(reading.vehicle_id), reading.vehicle_id),
    }));
  }, [readings, vehicleMap]);

  const filteredLogs = useMemo(() => {
    const q = deferredHistoryQuery.trim().toLowerCase();
    if (!q) return enrichedLogs;

    return enrichedLogs.filter((item) => {
      const plate = item.vehicle_plate?.toLowerCase() || "";
      const unitLabel = item.vehicle_label?.toLowerCase() || "";
      const vehicleText = item.vehicle_search_text?.toLowerCase() || "";
      const station = item.station?.toLowerCase() || "";
      const notes = item.notes?.toLowerCase() || "";
      return plate.includes(q) || unitLabel.includes(q) || vehicleText.includes(q) || station.includes(q) || notes.includes(q);
    });
  }, [enrichedLogs, deferredHistoryQuery]);

  const filteredReadings = useMemo(() => {
    const q = deferredHistoryQuery.trim().toLowerCase();
    if (!q) return enrichedReadings;

    return enrichedReadings.filter((item) => {
      const plate = item.vehicle_plate?.toLowerCase() || "";
      const unitLabel = item.vehicle_label?.toLowerCase() || "";
      const vehicleText = item.vehicle_search_text?.toLowerCase() || "";
      const notes = item.notes?.toLowerCase() || "";
      return plate.includes(q) || unitLabel.includes(q) || vehicleText.includes(q) || notes.includes(q);
    });
  }, [enrichedReadings, deferredHistoryQuery]);

  const groupedReadings = useMemo<FuelReadingsGroup[]>(() => {
    const grouped = new Map<string, FuelReadingRow[]>();

    for (const item of filteredReadings) {
      const current = grouped.get(item.vehicle_id) ?? [];
      current.push(item);
      grouped.set(item.vehicle_id, current);
    }

    const groups = Array.from(grouped.entries())
      .map(([vehicleId, items]) => {
        const sortedItems = [...items].sort(
          (a, b) => new Date(b.observed_at).getTime() - new Date(a.observed_at).getTime()
        );
        const latest = sortedItems[0];
        if (!latest) return null;

        const litersValues = sortedItems
          .filter((reading) => reading.reading_unit === "liters")
          .map((reading) => reading.reading_value);

        const maxLitersReference = Math.max(
          1,
          ...litersValues,
          latest.reading_unit === "liters" ? latest.reading_value : 0
        );

        const primaryUnit = latest.reading_unit;
        const latestNormalized = getReadingNormalized(latest, maxLitersReference);

        const trendValues = sortedItems
          .filter((item) => item.reading_unit === primaryUnit)
          .slice(0, 8)
          .reverse()
          .map((item) => getReadingNormalized(item, maxLitersReference))
          .filter((value): value is number => value !== null);

        return {
          vehicleId,
          vehicleLabel: latest.vehicle_label,
          vehiclePlate: latest.vehicle_plate,
          readings: sortedItems,
          latest,
          latestTimestamp: new Date(latest.observed_at).getTime(),
          latestNormalized,
          maxLitersReference,
          primaryUnit,
          trendValues,
        };
      })
      .filter((item): item is FuelReadingsGroup => item !== null);

    return groups.sort((a, b) => {
      if (readingSortMode === "plate_asc") {
        return a.vehiclePlate.localeCompare(b.vehiclePlate, "es", { sensitivity: "base" });
      }

      if (readingSortMode === "latest_desc") {
        return b.latestTimestamp - a.latestTimestamp;
      }

      const aLevel = a.latestNormalized ?? -1;
      const bLevel = b.latestNormalized ?? -1;
      if (aLevel !== bLevel) return bLevel - aLevel;

      return b.latestTimestamp - a.latestTimestamp;
    });
  }, [filteredReadings, readingSortMode]);

  const groupedReadingsSummary = useMemo(() => {
    const now = Date.now();
    let relativeLevelTotal = 0;
    let relativeLevelCount = 0;
    let lowLevelUnits = 0;
    let updatedLast24h = 0;

    for (const group of groupedReadings) {
      if (group.latestTimestamp >= now - 24 * 60 * 60 * 1000) {
        updatedLast24h += 1;
      }

      if (group.latestNormalized !== null) {
        relativeLevelTotal += group.latestNormalized;
        relativeLevelCount += 1;

        if (group.latestNormalized <= 0.25) {
          lowLevelUnits += 1;
        }
      }
    }

    return {
      units: groupedReadings.length,
      avgRelativeLevelPercent:
        relativeLevelCount > 0 ? Math.round((relativeLevelTotal / relativeLevelCount) * 100) : null,
      updatedLast24h,
      lowLevelUnits,
    };
  }, [groupedReadings]);

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
    setHasFetchedAnomalies(true);
  };

  const handleRefresh = async () => {
    if (hasFetchedAnomalies) {
      await refreshAll();
      return;
    }

    await refreshCoreData();
  };

  const showInitialLoader =
    isLoadingVehicles &&
    vehicles.length === 0 &&
    isLoadingLogs &&
    isLoadingReadings &&
    logs.length === 0 &&
    readings.length === 0;

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
          <Button variant="outline" onClick={handleRefresh}>
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

      {showInitialLoader ? <InitialDataLoader /> : null}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
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
                      {getVehicleDisplayLabel(vehicle)}
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
                  placeholder="Unidad, placa, notas, estacion..."
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

          {!isLoadingReadings && filteredReadings.length > 0 ? (
            <Card className="p-4 space-y-3 border-primary/20 bg-gradient-to-r from-primary/5 via-white to-sky-50/40">
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                <div className="rounded-md border border-slate-200 bg-white p-3">
                  <p className="text-xs text-gray-500">Unidades con lecturas</p>
                  <p className="text-xl font-bold text-primary-900">{groupedReadingsSummary.units}</p>
                </div>
                <div className="rounded-md border border-slate-200 bg-white p-3">
                  <p className="text-xs text-gray-500">Nivel relativo promedio</p>
                  <p className="text-xl font-bold text-primary-900">
                    {groupedReadingsSummary.avgRelativeLevelPercent === null
                      ? "s/d"
                      : `${groupedReadingsSummary.avgRelativeLevelPercent}%`}
                  </p>
                </div>
                <div className="rounded-md border border-slate-200 bg-white p-3">
                  <p className="text-xs text-gray-500">Actualizadas en 24h</p>
                  <p className="text-xl font-bold text-primary-900">{groupedReadingsSummary.updatedLast24h}</p>
                </div>
                <div className="rounded-md border border-slate-200 bg-white p-3">
                  <p className="text-xs text-gray-500">Unidades en nivel bajo</p>
                  <p className="text-xl font-bold text-red-600">{groupedReadingsSummary.lowLevelUnits}</p>
                </div>
              </div>

              <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
                <div className="w-full lg:w-64">
                  <Label>Ordenar lecturas por unidad</Label>
                  <Select
                    value={readingSortMode}
                    onValueChange={(value) =>
                      setReadingSortMode(value as "plate_asc" | "latest_desc" | "level_desc")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Orden" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="plate_asc">Placa A-Z</SelectItem>
                      <SelectItem value="latest_desc">Más recientes</SelectItem>
                      <SelectItem value="level_desc">Mayor nivel relativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant={readingsViewMode === "grouped" ? "default" : "outline"}
                    className={readingsViewMode === "grouped" ? "bg-primary text-white" : ""}
                    onClick={() => setReadingsViewMode("grouped")}
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Vista por unidad
                  </Button>
                  <Button
                    type="button"
                    variant={readingsViewMode === "table" ? "default" : "outline"}
                    className={readingsViewMode === "table" ? "bg-primary text-white" : ""}
                    onClick={() => setReadingsViewMode("table")}
                  >
                    <List className="w-4 h-4 mr-2" />
                    Vista tabla
                  </Button>
                </div>
              </div>
            </Card>
          ) : null}

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
            readingsViewMode === "grouped" ? (
              <ReadingsByVehicle
                groups={groupedReadings}
                onCreateReading={() => setIsReadingModalOpen(true)}
              />
            ) : (
              <ReadingsTable items={filteredReadings} />
            )
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
                        {getVehicleDisplayLabel(vehicle)}
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
              unitLabel={getVehicleDisplayLabel(vehicleMap.get(selectedStatus.vehicle_id), selectedStatus.vehicle_plate)}
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
                        {getVehicleDisplayLabel(vehicle)}
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
              <Button
                onClick={async () => {
                  await applyAnomalyFilters();
                  setHasFetchedAnomalies(true);
                }}
              >
                Aplicar filtros
              </Button>
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
                      <td className="px-3 py-2 text-sm font-medium">
                        {getVehicleDisplayLabel(vehicleMap.get(anomaly.vehicle_id), anomaly.vehicle_plate)}
                      </td>
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

      {!showInitialLoader && isLoadingVehicles && vehicles.length === 0 ? (
        <Card className="p-4">
          <p className="text-sm text-gray-500">Cargando catalogo de unidades...</p>
        </Card>
      ) : null}
    </div>
  );
}
