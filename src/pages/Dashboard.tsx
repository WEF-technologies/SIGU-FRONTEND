
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Car,
  UserCheck,
  FileText,
  AlertTriangle,
  MapPin,
  Wrench,
  Siren,
  ChevronRight,
  CheckCircle,
  Clock,
  IdCard,
  Hammer,
} from "lucide-react";
import { useAuthenticatedFetch } from "@/hooks/useAuthenticatedFetch";
import { useMaintenance } from "@/hooks/useMaintenance";
import { MaintenanceAlerts } from "@/components/maintenance/MaintenanceAlerts";
import { DriverAlerts } from "@/components/drivers/DriverAlerts";
import { DriverAlert, ToolAlert } from "@/types";

const API_URL = import.meta.env.VITE_API_URL ?? "";

interface DashboardStats {
  totalVehicles: number;
  activeVehicles: number;
  totalDrivers: number;
  activeContracts: number;
  totalMaintenances: number;
  urgentMaintenances: number;
  nearMaintenances: number;
}

interface MaintenanceRecord {
  id: string;
  vehicle_plate: string;
  type: string;
  date: string;
  description: string;
  location?: string;
  performed_by?: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const authenticatedFetch = useAuthenticatedFetch();
  const { alerts, dismissAlert, vehicles } = useMaintenance();
  const [driverAlerts, setDriverAlerts] = useState<DriverAlert[]>([]);
  const [toolAlerts, setToolAlerts] = useState<ToolAlert[]>([]);
  const [toolAlertQuickFilter, setToolAlertQuickFilter] = useState<"all" | "critical" | "warning">("all");
  const [stats, setStats] = useState<DashboardStats>({
    totalVehicles: 0,
    activeVehicles: 0,
    totalDrivers: 0,
    activeContracts: 0,
    totalMaintenances: 0,
    urgentMaintenances: 0,
    nearMaintenances: 0,
  });
  const [recentMaintenances, setRecentMaintenances] = useState<MaintenanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);

        const vehiclesResponse = await authenticatedFetch(`${API_URL}/api/v1/vehicles/`);
        let vehicles = [];
        if (vehiclesResponse.ok) vehicles = await vehiclesResponse.json();

        let drivers = [];
        try {
          const driversResponse = await authenticatedFetch(`${API_URL}/api/v1/drivers/`);
          if (driversResponse.ok) drivers = await driversResponse.json();
        } catch {}

        let contracts = [];
        try {
          const contractsResponse = await authenticatedFetch(`${API_URL}/api/v1/contracts/`);
          if (contractsResponse.ok) contracts = await contractsResponse.json();
        } catch {}

        let maintenances = [];
        try {
          const maintenancesResponse = await authenticatedFetch(`${API_URL}/api/v1/maintenances/`);
          if (maintenancesResponse.ok) {
            maintenances = await maintenancesResponse.json();
            setRecentMaintenances(maintenances.slice(0, 3));
          }
        } catch {}

        const totalVehicles = vehicles.length;
        const activeVehicles = vehicles.filter(
          (v: any) =>
            v.status === "available" ||
            v.status === "Puerto Ordaz" ||
            v.status === "Barcelona" ||
            v.status === "Ciudad Piar"
        ).length;

        const urgentMaintenances = alerts.filter((a) => a.severity >= 3).length;
        const nearMaintenances = alerts.filter((a) => a.severity === 2).length;

        try {
          const driverAlertsResponse = await authenticatedFetch(`${API_URL}/api/v1/drivers/alerts`);
          if (driverAlertsResponse.ok) {
            const driverAlertsData = await driverAlertsResponse.json();
            setDriverAlerts(Array.isArray(driverAlertsData) ? driverAlertsData : []);
          }
        } catch {}

        try {
          const toolAlertsResponse = await authenticatedFetch(
            `${API_URL}/api/v1/tools/alerts?near_days=30&include_ok=false`
          );
          if (toolAlertsResponse.ok) {
            const toolsAlertsData = await toolAlertsResponse.json();
            setToolAlerts(Array.isArray(toolsAlertsData) ? toolsAlertsData : []);
          }
        } catch {}

        setStats({
          totalVehicles,
          activeVehicles,
          totalDrivers: drivers.length,
          activeContracts: contracts.length,
          totalMaintenances: maintenances.length,
          urgentMaintenances,
          nearMaintenances,
        });
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [authenticatedFetch, alerts]);

  const criticalAlerts = alerts.filter((a) => a.severity >= 3);
  const nearAlerts = alerts.filter((a) => a.severity === 2);
  const criticalDriverAlerts = driverAlerts.filter(
    (d) => d.status_license === "due" || d.status_defensive === "due"
  );
  const criticalToolAlerts = toolAlerts.filter((a) => a.severity === "critical");
  const warningToolAlerts = toolAlerts.filter((a) => a.severity === "warning");
  const sortedToolAlerts = [...toolAlerts].sort((a, b) => {
    const weight = { critical: 0, warning: 1, normal: 2 };
    return weight[a.severity] - weight[b.severity];
  });

  const filteredToolAlerts = sortedToolAlerts.filter((alert) => {
    if (toolAlertQuickFilter === "critical") return alert.severity === "critical";
    if (toolAlertQuickFilter === "warning") return alert.severity === "warning";
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-primary-900">Dashboard</h1>
        <p className="text-secondary-dark mt-1">Resumen general del sistema de gestión vehicular</p>
      </div>

      {/* ─── BANNER ALERTAS CRÍTICAS GLOBALES ────────────────────────── */}
      {!isLoading && (criticalAlerts.length > 0 || criticalDriverAlerts.length > 0) && (
        <div className="rounded-lg border border-red-300 bg-red-600 text-white p-4 flex items-center gap-4 shadow-md">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/15 shrink-0">
            <Siren className="h-5 w-5 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-base leading-tight">Atención inmediata requerida</p>
            <div className="mt-1 flex flex-wrap gap-4 text-sm text-red-100">
              {criticalAlerts.length > 0 && (
                <span className="flex items-center gap-1.5">
                  <Wrench className="h-3.5 w-3.5 text-red-200" />
                  <strong className="text-white">{criticalAlerts.length}</strong>
                  {" "}mantenimiento{criticalAlerts.length !== 1 ? "s" : ""} vencido{criticalAlerts.length !== 1 ? "s" : ""}
                </span>
              )}
              {criticalAlerts.length > 0 && criticalDriverAlerts.length > 0 && (
                <span className="text-red-300">|</span>
              )}
              {criticalDriverAlerts.length > 0 && (
                <span className="flex items-center gap-1.5">
                  <IdCard className="h-3.5 w-3.5 text-red-200" />
                  <strong className="text-white">{criticalDriverAlerts.length}</strong>
                  {" "}chofer{criticalDriverAlerts.length !== 1 ? "es" : ""} con documentos vencidos
                </span>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="bg-white/10 border-white/30 text-white hover:bg-white/20 shrink-0 text-xs"
            onClick={() => navigate("/mantenimiento")}
          >
            Revisar <ChevronRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      )}

      {/* ─── STATS ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Vehículos */}
        <Card
          className="border-secondary-medium hover:shadow-md transition-all cursor-pointer hover:-translate-y-0.5"
          onClick={() => navigate("/vehiculos")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-secondary-dark">Total Vehículos</CardTitle>
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <Car className="w-5 h-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-24" />
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold text-primary-900">{stats.totalVehicles}</div>
                <p className="text-xs text-secondary-dark mt-1">{stats.activeVehicles} operativos</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Choferes */}
        <Card
          className="border-secondary-medium hover:shadow-md transition-all cursor-pointer hover:-translate-y-0.5"
          onClick={() => navigate("/choferes")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-secondary-dark">Choferes</CardTitle>
            <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-24" />
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold text-primary-900">{stats.totalDrivers}</div>
                <p className="text-xs text-secondary-dark mt-1">Personal conductor</p>
              </>
            )}
            {!isLoading && criticalDriverAlerts.length > 0 && (
              <Badge className="mt-1 bg-red-100 text-red-700 text-xs">
                {criticalDriverAlerts.length} doc. vencido{criticalDriverAlerts.length !== 1 ? "s" : ""}
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* Contratos */}
        <Card
          className="border-secondary-medium hover:shadow-md transition-all cursor-pointer hover:-translate-y-0.5"
          onClick={() => navigate("/contratos")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-secondary-dark">Contratos Activos</CardTitle>
            <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-24" />
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold text-primary-900">{stats.activeContracts}</div>
                <p className="text-xs text-secondary-dark mt-1">En ejecución</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Mantenimientos */}
        <Card
          className={`border-secondary-medium hover:shadow-md transition-all cursor-pointer hover:-translate-y-0.5 ${
            stats.urgentMaintenances > 0 ? "border-red-300 bg-red-50/30" : ""
          }`}
          onClick={() => navigate("/mantenimiento")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-secondary-dark">Mantenimientos</CardTitle>
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                stats.urgentMaintenances > 0 ? "bg-red-100" : "bg-orange-50"
              }`}
            >
              <Wrench
                className={`w-5 h-5 ${stats.urgentMaintenances > 0 ? "text-red-600" : "text-orange-600"}`}
              />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-28" />
              </div>
            ) : (
              <div className="text-2xl font-bold text-primary-900">{stats.totalMaintenances}</div>
            )}
            {!isLoading && (
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {stats.urgentMaintenances > 0 && (
                <Badge className="bg-red-100 text-red-700 text-xs">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {stats.urgentMaintenances} vencido{stats.urgentMaintenances !== 1 ? "s" : ""}
                </Badge>
                )}
                {stats.nearMaintenances > 0 && (
                <Badge className="bg-amber-100 text-amber-700 text-xs">
                  <Clock className="w-3 h-3 mr-1" />
                  {stats.nearMaintenances} próximo{stats.nearMaintenances !== 1 ? "s" : ""}
                </Badge>
                )}
                {stats.urgentMaintenances === 0 && stats.nearMaintenances === 0 && (
                <span className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Todo al día
                </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Herramientas */}
        <Card
          className={`border-secondary-medium hover:shadow-md transition-all cursor-pointer hover:-translate-y-0.5 ${
            criticalToolAlerts.length > 0 ? "border-red-300 bg-red-50/30" : ""
          }`}
          onClick={() => navigate("/herramientas")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-secondary-dark">Herramientas</CardTitle>
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                criticalToolAlerts.length > 0 ? "bg-red-100" : "bg-indigo-50"
              }`}
            >
              <Hammer className={`w-5 h-5 ${criticalToolAlerts.length > 0 ? "text-red-600" : "text-indigo-600"}`} />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-28" />
              </div>
            ) : (
              <div className="text-2xl font-bold text-primary-900">{toolAlerts.length}</div>
            )}
            {!isLoading && (
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {criticalToolAlerts.length > 0 && (
                <Badge className="bg-red-100 text-red-700 text-xs">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {criticalToolAlerts.length} crítica{criticalToolAlerts.length !== 1 ? "s" : ""}
                </Badge>
                )}
                {warningToolAlerts.length > 0 && (
                <Badge className="bg-amber-100 text-amber-700 text-xs">
                  <Clock className="w-3 h-3 mr-1" />
                  {warningToolAlerts.length} advertencia{warningToolAlerts.length !== 1 ? "s" : ""}
                </Badge>
                )}
                {toolAlerts.length === 0 && (
                <span className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Todo al día
                </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── ALERTAS DE MANTENIMIENTO ─────────────────────────────────── */}
      <Card
        className={`border-secondary-medium ${
          criticalAlerts.length > 0 ? "border-red-300 shadow-red-100 shadow-md" : ""
        }`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg text-primary-900 flex items-center gap-2">
              {criticalAlerts.length > 0 ? (
                <Siren className="w-5 h-5 text-red-600 animate-pulse" />
              ) : nearAlerts.length > 0 ? (
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              ) : (
                <CheckCircle className="w-5 h-5 text-green-500" />
              )}
              Alertas de Mantenimiento
              {alerts.length > 0 && (
                <Badge
                  className={
                    criticalAlerts.length > 0
                      ? "bg-red-600 text-white"
                      : nearAlerts.length > 0
                      ? "bg-amber-500 text-white"
                      : "bg-green-100 text-green-800"
                  }
                >
                  {alerts.length}
                </Badge>
              )}
            </CardTitle>
            <button
              className="text-sm text-primary hover:underline flex items-center gap-1"
              onClick={() => navigate("/mantenimiento")}
            >
              Ver todas <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : (
            <MaintenanceAlerts
              alerts={alerts}
              onDismiss={dismissAlert}
              compact={true}
              vehicles={vehicles}
            />
          )}
        </CardContent>
      </Card>

      {/* ─── ALERTAS DE HERRAMIENTAS ─────────────────────────────────── */}
      <Card className={`border-secondary-medium ${criticalToolAlerts.length > 0 ? "border-red-300 shadow-red-100 shadow-md" : ""}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg text-primary-900 flex items-center gap-2">
              {criticalToolAlerts.length > 0 ? (
                <Siren className="w-5 h-5 text-red-600 animate-pulse" />
              ) : warningToolAlerts.length > 0 ? (
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              ) : (
                <CheckCircle className="w-5 h-5 text-green-500" />
              )}
              Alertas de Herramientas
              {toolAlerts.length > 0 && (
                <Badge className={criticalToolAlerts.length > 0 ? "bg-red-600 text-white" : "bg-amber-500 text-white"}>
                  {toolAlerts.length}
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 rounded-md border border-secondary-medium p-1">
                <button
                  className={`px-2 py-1 text-xs rounded ${toolAlertQuickFilter === "all" ? "bg-primary text-white" : "text-secondary-dark hover:bg-secondary-light"}`}
                  onClick={() => setToolAlertQuickFilter("all")}
                >
                  Todas
                </button>
                <button
                  className={`px-2 py-1 text-xs rounded ${toolAlertQuickFilter === "critical" ? "bg-red-600 text-white" : "text-secondary-dark hover:bg-secondary-light"}`}
                  onClick={() => setToolAlertQuickFilter("critical")}
                >
                  Críticas
                </button>
                <button
                  className={`px-2 py-1 text-xs rounded ${toolAlertQuickFilter === "warning" ? "bg-amber-500 text-white" : "text-secondary-dark hover:bg-secondary-light"}`}
                  onClick={() => setToolAlertQuickFilter("warning")}
                >
                  Próximas
                </button>
              </div>
              <button
                className="text-sm text-primary hover:underline flex items-center gap-1"
                onClick={() => navigate("/herramientas")}
              >
                Ver todas <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : filteredToolAlerts.length === 0 ? (
            <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md p-3">
              No hay alertas para el filtro seleccionado.
            </div>
          ) : (
            <div className="space-y-2">
              {filteredToolAlerts.slice(0, 5).map((toolAlert) => {
                const severityClass =
                  toolAlert.severity === "critical"
                    ? "bg-red-100 text-red-700"
                    : toolAlert.severity === "warning"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-blue-100 text-blue-700";

                const statusText =
                  toolAlert.alert_status === "expired"
                    ? "Vencida"
                    : toolAlert.alert_status === "near"
                    ? "Próxima"
                    : "OK";

                return (
                  <div
                    key={`${toolAlert.tool_id}-${toolAlert.code}`}
                    className="flex items-center justify-between rounded-md border border-secondary-medium px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-primary-900">
                        {toolAlert.code} - {toolAlert.name}
                      </p>
                      <p className="text-xs text-secondary-dark">
                        {toolAlert.category} · {toolAlert.location}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-gray-100 text-gray-700">{statusText}</Badge>
                      <Badge className={severityClass}>{toolAlert.severity}</Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs"
                        onClick={() => navigate(`/herramientas?toolId=${toolAlert.tool_id}`)}
                      >
                        Abrir
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── ALERTAS DE CHOFERES ─────────────────────────────────────── */}
      <Card className="border-secondary-medium">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg text-primary-900 flex items-center gap-2">
              <UserCheck className="w-5 h-5" />
              Alertas de Choferes
              {driverAlerts.filter(d => d.status_license !== 'ok' || d.status_defensive !== 'ok').length > 0 && (
                <Badge className="bg-red-100 text-red-700">
                  {driverAlerts.filter(d => d.status_license !== 'ok' || d.status_defensive !== 'ok').length}
                </Badge>
              )}
            </CardTitle>
            <button
              className="text-sm text-primary hover:underline flex items-center gap-1"
              onClick={() => navigate("/choferes")}
            >
              Ver todos <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : (
            <DriverAlerts alerts={driverAlerts.slice(0, 5)} />
          )}
          {!isLoading && driverAlerts.length > 5 && (
            <button
              className="mt-3 text-sm text-primary hover:underline"
              onClick={() => navigate("/choferes")}
            >
              Ver todas las alertas ({driverAlerts.length})
            </button>
          )}
        </CardContent>
      </Card>

      {/* ─── ACTIVIDAD RECIENTE ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-secondary-medium">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-primary-900 flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Rutas Activas
              </CardTitle>
              <button className="text-sm text-primary hover:underline" onClick={() => navigate("/rutas")}>
                Ver todas
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2 py-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <div className="text-center py-8 text-secondary-dark">
                <MapPin className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No hay rutas activas registradas</p>
                <button className="mt-2 text-primary hover:underline text-sm" onClick={() => navigate("/rutas")}>
                  Gestionar rutas
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-secondary-medium cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/mantenimiento")}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-primary-900 flex items-center gap-2">
                <Wrench className="w-5 h-5" />
                Mantenimientos Recientes
              </CardTitle>
              <span className="text-sm text-primary">Ver todos</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {isLoading ? (
                <>
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </>
              ) : recentMaintenances.length > 0 ? (
                recentMaintenances.map((item, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center py-2 border-b border-secondary-medium last:border-b-0"
                  >
                    <div>
                      <p className="font-medium text-primary-900 text-sm">
                        {item.vehicle_plate} — {item.type.toUpperCase()}
                      </p>
                      <p className="text-xs text-secondary-dark">
                        {item.date} · {item.location || "Sin ubicación"}
                      </p>
                    </div>
                    <Badge className="bg-green-100 text-green-800 text-xs">Realizado</Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-secondary-dark">
                  <Wrench className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No hay mantenimientos registrados</p>
                  <button
                    className="mt-2 text-primary hover:underline text-sm"
                    onClick={(e) => { e.stopPropagation(); navigate("/mantenimiento"); }}
                  >
                    Registrar mantenimiento
                  </button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
