import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CreateFuelLogPayload,
  CreateFuelReadingPayload,
  FuelAnomalyFilters,
  FuelConsumptionAnomaly,
  FuelListFilters,
  FuelLog,
  FuelReading,
  FuelVehicleStatus,
  FuelType,
  Vehicle,
} from "@/types";
import { useAuthenticatedFetch } from "@/hooks/useAuthenticatedFetch";
import { useToast } from "@/hooks/use-toast";
import { FuelApiError, fuelApi } from "@/services/fuelApi";

const API_URL = import.meta.env.VITE_API_URL ?? "";

const EMPTY_LIST_FILTERS: FuelListFilters = {};

const DEFAULT_ANOMALY_FILTERS: FuelAnomalyFilters = {
  lookback: 30,
  min_history: 3,
  threshold_percent: 25,
  min_distance_km: 20,
};

const isSessionExpiredError = (error: unknown) => {
  if (!(error instanceof Error)) return false;
  return error.message.toLowerCase().includes("expirada");
};

const resolveApiErrorMessage = (
  error: unknown,
  fallback: string,
  specificByStatus?: Record<number, string>
): string => {
  if (error instanceof FuelApiError) {
    if (specificByStatus?.[error.status]) {
      return specificByStatus[error.status];
    }
    return error.message || fallback;
  }

  if (error instanceof Error) {
    return error.message || fallback;
  }

  return fallback;
};

const normalizeOptionalText = (value?: string | null) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

const normalizeOptionalNumber = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(value)) return undefined;
  return value;
};

export const useFuel = () => {
  const authenticatedFetch = useAuthenticatedFetch();
  const { toast } = useToast();

  const fetchRef = useRef(authenticatedFetch);
  fetchRef.current = authenticatedFetch;

  const [logs, setLogs] = useState<FuelLog[]>([]);
  const [readings, setReadings] = useState<FuelReading[]>([]);
  const [anomalies, setAnomalies] = useState<FuelConsumptionAnomaly[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [isLoadingReadings, setIsLoadingReadings] = useState(false);
  const [isLoadingAnomalies, setIsLoadingAnomalies] = useState(false);
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(false);

  const [logsError, setLogsError] = useState<string | null>(null);
  const [readingsError, setReadingsError] = useState<string | null>(null);
  const [anomaliesError, setAnomaliesError] = useState<string | null>(null);
  const [vehiclesError, setVehiclesError] = useState<string | null>(null);

  const [statusByVehicle, setStatusByVehicle] = useState<Record<string, FuelVehicleStatus | null>>({});
  const [statusLoadingByVehicle, setStatusLoadingByVehicle] = useState<Record<string, boolean>>({});
  const [statusErrorByVehicle, setStatusErrorByVehicle] = useState<Record<string, string | null>>({});

  const lastLogFiltersRef = useRef<FuelListFilters>(EMPTY_LIST_FILTERS);
  const lastReadingFiltersRef = useRef<FuelListFilters>(EMPTY_LIST_FILTERS);
  const lastAnomalyFiltersRef = useRef<FuelAnomalyFilters>(DEFAULT_ANOMALY_FILTERS);

  const fetchVehicles = useCallback(async () => {
    setIsLoadingVehicles(true);
    setVehiclesError(null);

    try {
      const response = await fetchRef.current(`${API_URL}/api/v1/vehicles/`);

      if (!response.ok) {
        throw new Error(`No se pudo obtener la lista de vehiculos (${response.status})`);
      }

      const payload = await response.json();
      const items = Array.isArray(payload) ? payload : [];
      setVehicles(items);
      return items as Vehicle[];
    } catch (error) {
      if (!isSessionExpiredError(error)) {
        console.error("Error fetching vehicles for fuel module:", error);
      }
      const message = resolveApiErrorMessage(error, "No se pudo cargar el listado de unidades.");
      setVehiclesError(message);
      setVehicles([]);
      return [];
    } finally {
      setIsLoadingVehicles(false);
    }
  }, []);

  const fetchLogs = useCallback(async (filters: FuelListFilters = EMPTY_LIST_FILTERS) => {
    lastLogFiltersRef.current = filters;
    setIsLoadingLogs(true);
    setLogsError(null);

    try {
      const data = await fuelApi.listLogs(fetchRef.current, filters);
      setLogs(Array.isArray(data) ? data : []);
    } catch (error) {
      if (!isSessionExpiredError(error)) {
        console.error("Error fetching fuel logs:", error);
      }
      const message = resolveApiErrorMessage(error, "No se pudo cargar el historial de cargas.");
      setLogsError(message);
      setLogs([]);
    } finally {
      setIsLoadingLogs(false);
    }
  }, []);

  const fetchReadings = useCallback(async (filters: FuelListFilters = EMPTY_LIST_FILTERS) => {
    lastReadingFiltersRef.current = filters;
    setIsLoadingReadings(true);
    setReadingsError(null);

    try {
      const data = await fuelApi.listReadings(fetchRef.current, filters);
      setReadings(Array.isArray(data) ? data : []);
    } catch (error) {
      if (!isSessionExpiredError(error)) {
        console.error("Error fetching fuel readings:", error);
      }
      const message = resolveApiErrorMessage(error, "No se pudo cargar el historial de lecturas.");
      setReadingsError(message);
      setReadings([]);
    } finally {
      setIsLoadingReadings(false);
    }
  }, []);

  const fetchAnomalies = useCallback(
    async (filters: FuelAnomalyFilters = DEFAULT_ANOMALY_FILTERS) => {
      lastAnomalyFiltersRef.current = {
        ...DEFAULT_ANOMALY_FILTERS,
        ...filters,
      };

      setIsLoadingAnomalies(true);
      setAnomaliesError(null);

      try {
        const data = await fuelApi.listAnomalies(fetchRef.current, lastAnomalyFiltersRef.current);
        const sorted = (Array.isArray(data) ? data : []).sort((a, b) => {
          const severityWeight = (s: FuelConsumptionAnomaly["severity"]) => (s === "critical" ? 2 : 1);
          const bySeverity = severityWeight(b.severity) - severityWeight(a.severity);
          if (bySeverity !== 0) return bySeverity;
          return Math.abs(b.deviation_percent) - Math.abs(a.deviation_percent);
        });
        setAnomalies(sorted);
      } catch (error) {
        if (!isSessionExpiredError(error)) {
          console.error("Error fetching fuel anomalies:", error);
        }
        const message = resolveApiErrorMessage(error, "No se pudo cargar la vista de anomalias.");
        setAnomaliesError(message);
        setAnomalies([]);
      } finally {
        setIsLoadingAnomalies(false);
      }
    },
    []
  );

  const fetchVehicleStatus = useCallback(async (vehicleId: string, fuelType?: FuelType) => {
    setStatusLoadingByVehicle((prev) => ({ ...prev, [vehicleId]: true }));
    setStatusErrorByVehicle((prev) => ({ ...prev, [vehicleId]: null }));

    try {
      const status = await fuelApi.getVehicleStatus(fetchRef.current, vehicleId, fuelType);
      setStatusByVehicle((prev) => ({ ...prev, [vehicleId]: status }));
      return status;
    } catch (error) {
      if (!isSessionExpiredError(error)) {
        console.error("Error fetching vehicle fuel status:", error);
      }

      const message = resolveApiErrorMessage(error, "No se pudo obtener el estado de la unidad.", {
        404: "Sin observaciones registradas para esta unidad.",
      });

      setStatusErrorByVehicle((prev) => ({ ...prev, [vehicleId]: message }));
      setStatusByVehicle((prev) => ({ ...prev, [vehicleId]: null }));
      return null;
    } finally {
      setStatusLoadingByVehicle((prev) => ({ ...prev, [vehicleId]: false }));
    }
  }, []);

  const clearVehicleStatus = useCallback((vehicleId: string) => {
    setStatusByVehicle((prev) => {
      const next = { ...prev };
      delete next[vehicleId];
      return next;
    });

    setStatusErrorByVehicle((prev) => {
      const next = { ...prev };
      delete next[vehicleId];
      return next;
    });

    setStatusLoadingByVehicle((prev) => {
      const next = { ...prev };
      delete next[vehicleId];
      return next;
    });
  }, []);

  const getLogById = useCallback(async (logId: string) => {
    return fuelApi.getLogById(fetchRef.current, logId);
  }, []);

  const getReadingById = useCallback(async (readingId: string) => {
    return fuelApi.getReadingById(fetchRef.current, readingId);
  }, []);

  const createLog = useCallback(async (payload: CreateFuelLogPayload) => {
    try {
      const normalizedPayload: CreateFuelLogPayload = {
        vehicle_id: payload.vehicle_id,
        fuel_type: payload.fuel_type,
        liters: payload.liters,
        total_cost: payload.total_cost,
        fueled_at: payload.fueled_at,
        odometer_km: normalizeOptionalNumber(payload.odometer_km),
        station: normalizeOptionalText(payload.station),
        notes: normalizeOptionalText(payload.notes),
      };

      const created = await fuelApi.createLog(fetchRef.current, normalizedPayload);

      toast({
        title: "Carga registrada",
        description: `Se registraron ${created.liters.toLocaleString()} L para la unidad seleccionada.`,
      });

      await fetchLogs(lastLogFiltersRef.current);
      return true;
    } catch (error) {
      if (!isSessionExpiredError(error)) {
        console.error("Error creating fuel log:", error);
      }

      const message = resolveApiErrorMessage(error, "No se pudo registrar la carga.", {
        400: "Verifica los datos de la carga antes de enviar.",
        404: "La unidad seleccionada no existe.",
        422: "Los datos enviados tienen campos invalidos.",
      });

      toast({
        title: "Error al registrar carga",
        description: message,
        variant: "destructive",
      });

      return false;
    }
  }, [fetchLogs, toast]);

  const createReading = useCallback(async (payload: CreateFuelReadingPayload) => {
    try {
      const normalizedPayload: CreateFuelReadingPayload = {
        vehicle_id: payload.vehicle_id,
        fuel_type: payload.fuel_type,
        reading_value: payload.reading_value,
        reading_unit: payload.reading_unit,
        observed_at: payload.observed_at,
        odometer_km: normalizeOptionalNumber(payload.odometer_km),
        notes: normalizeOptionalText(payload.notes),
      };

      const created = await fuelApi.createReading(fetchRef.current, normalizedPayload);

      toast({
        title: "Lectura registrada",
        description:
          created.reading_unit === "percent"
            ? `Se registro una lectura de ${created.reading_value}% para la unidad.`
            : `Se registro una lectura de ${created.reading_value.toLocaleString()} L para la unidad.`,
      });

      await fetchReadings(lastReadingFiltersRef.current);
      return true;
    } catch (error) {
      if (!isSessionExpiredError(error)) {
        console.error("Error creating fuel reading:", error);
      }

      const message = resolveApiErrorMessage(error, "No se pudo registrar la lectura.", {
        400: "Verifica los datos de la lectura antes de enviar.",
        404: "La unidad seleccionada no existe.",
        422: "Los datos enviados tienen campos invalidos.",
      });

      toast({
        title: "Error al registrar lectura",
        description: message,
        variant: "destructive",
      });

      return false;
    }
  }, [fetchReadings, toast]);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      fetchVehicles(),
      fetchLogs(lastLogFiltersRef.current),
      fetchReadings(lastReadingFiltersRef.current),
      fetchAnomalies(lastAnomalyFiltersRef.current),
    ]);
  }, [fetchVehicles, fetchLogs, fetchReadings, fetchAnomalies]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const isAnyLoading = useMemo(
    () => isLoadingVehicles || isLoadingLogs || isLoadingReadings || isLoadingAnomalies,
    [isLoadingVehicles, isLoadingLogs, isLoadingReadings, isLoadingAnomalies]
  );

  return {
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
    isAnyLoading,
    logsError,
    readingsError,
    anomaliesError,
    vehiclesError,
    fetchVehicles,
    fetchLogs,
    fetchReadings,
    fetchAnomalies,
    fetchVehicleStatus,
    clearVehicleStatus,
    getLogById,
    getReadingById,
    createLog,
    createReading,
    refreshAll,
    defaultAnomalyFilters: DEFAULT_ANOMALY_FILTERS,
  };
};
