import { useState } from "react";
import { MaintenanceAlert, Vehicle } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronRight,
  X,
  Siren,
} from "lucide-react";

interface MaintenanceAlertsProps {
  alerts: MaintenanceAlert[];
  onDismiss?: (alert: MaintenanceAlert) => void;
  /** Si es true, solo muestra las críticas/próximas (para el Dashboard) */
  compact?: boolean;
  vehicles?: Vehicle[];
}

interface VehicleAlertGroup {
  plate: string;
  worstSeverity: number;
  alerts: MaintenanceAlert[];
}

function groupByVehicle(alerts: MaintenanceAlert[]): VehicleAlertGroup[] {
  const map = new Map<string, MaintenanceAlert[]>();
  for (const a of alerts) {
    const list = map.get(a.vehicle_plate) ?? [];
    list.push(a);
    map.set(a.vehicle_plate, list);
  }
  return Array.from(map.entries())
    .map(([plate, vehicleAlerts]) => ({
      plate,
      alerts: vehicleAlerts.sort((a, b) => b.severity - a.severity),
      worstSeverity: Math.max(...vehicleAlerts.map((a) => a.severity)),
    }))
    .sort((a, b) => b.worstSeverity - a.worstSeverity);
}

function severityLabel(severity: number): string {
  if (severity >= 4) return "CRÍTICO";
  if (severity === 3) return "VENCIDO";
  if (severity === 2) return "PRÓXIMO";
  return "AL DÍA";
}

function severityBadgeClass(severity: number): string {
  if (severity >= 4) return "bg-red-600 text-white";
  if (severity === 3) return "bg-orange-500 text-white";
  if (severity === 2) return "bg-amber-400 text-amber-900";
  return "bg-green-100 text-green-800";
}

function alertRowBg(severity: number): string {
  if (severity >= 4) return "bg-red-50 border-red-200";
  if (severity === 3) return "bg-orange-50 border-orange-200";
  if (severity === 2) return "bg-amber-50 border-amber-200";
  return "bg-green-50 border-green-200";
}

function AlertIcon({ status, severity }: { status: string; severity: number }) {
  if (status === "ok") return <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />;
  if (status === "near") return <Clock className="h-4 w-4 text-amber-500 shrink-0" />;
  if (status === "missing") return <XCircle className="h-4 w-4 text-red-600 shrink-0" />;
  // due
  if (severity >= 4) return <Siren className="h-4 w-4 text-red-600 shrink-0" />;
  return <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0" />;
}

function AlertRow({
  alert,
  onDismiss,
}: {
  alert: MaintenanceAlert;
  onDismiss?: (a: MaintenanceAlert) => void;
}) {
  const isOverdue = alert.status === "due" || alert.status === "missing";
  return (
    <div
      className={`flex items-center justify-between gap-2 px-3 py-2 rounded border text-sm ${alertRowBg(
        alert.severity
      )}`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <AlertIcon status={alert.status} severity={alert.severity} />
        <span className="font-semibold uppercase tracking-wide">{alert.type}</span>
        <span className="text-gray-600 truncate">
          {alert.status === "missing"
            ? "Nunca realizado"
            : alert.last_km
            ? `Último: ${alert.last_km.toLocaleString()} km`
            : "Sin registro previo"}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {isOverdue ? (
          <span className="text-red-700 font-bold text-xs">
            +{Math.abs(alert.remaining_km).toLocaleString()} km excedidos
          </span>
        ) : alert.remaining_km > 0 ? (
          <span className="text-gray-600 text-xs">
            Faltan {alert.remaining_km.toLocaleString()} km
          </span>
        ) : null}
        <span className="text-xs text-gray-500">({alert.current_km.toLocaleString()} km actuales)</span>
        {onDismiss && (
          <button
            onClick={() => onDismiss(alert)}
            className="ml-1 p-0.5 rounded hover:bg-black/10 text-gray-400 hover:text-gray-600"
            title="Descartar alerta"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function VehicleGroup({
  group,
  defaultOpen,
  onDismiss,
  vehicleLabel,
}: {
  group: VehicleAlertGroup;
  defaultOpen: boolean;
  onDismiss?: (a: MaintenanceAlert) => void;
  vehicleLabel?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const criticalCount = group.alerts.filter((a) => a.severity >= 3).length;
  const nearCount = group.alerts.filter((a) => a.severity === 2).length;

  return (
    <div className={`rounded-lg border ${alertRowBg(group.worstSeverity)} overflow-hidden`}>
      {/* Header row - clickable */}
      <button
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-black/5 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-3 min-w-0">
          {open ? (
            <ChevronDown className="h-4 w-4 text-gray-500 shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-500 shrink-0" />
          )}
          <div className="min-w-0">
            <span className="font-bold text-base">{group.plate}</span>
            {vehicleLabel && (
              <span className="ml-2 text-sm text-gray-500 font-normal">{vehicleLabel}</span>
            )}
          </div>
          <Badge className={`text-xs font-bold px-2 py-0.5 shrink-0 ${severityBadgeClass(group.worstSeverity)}`}>
            {severityLabel(group.worstSeverity)}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-600 shrink-0">
          {criticalCount > 0 && (
            <span className="bg-red-100 text-red-700 font-semibold px-2 py-0.5 rounded-full">
              {criticalCount} vencido{criticalCount !== 1 ? "s" : ""}
            </span>
          )}
          {nearCount > 0 && (
            <span className="bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">
              {nearCount} próximo{nearCount !== 1 ? "s" : ""}
            </span>
          )}
          <span className="text-gray-400">{group.alerts.length} tipo{group.alerts.length !== 1 ? "s" : ""}</span>
        </div>
      </button>

      {/* Alert rows */}
      {open && (
        <div className="px-4 pb-3 space-y-1.5">
          {group.alerts.map((alert) => (
            <AlertRow
              key={`${alert.vehicle_plate}-${alert.type}`}
              alert={alert}
              onDismiss={onDismiss}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function MaintenanceAlerts({ alerts, onDismiss, compact = false, vehicles = [] }: MaintenanceAlertsProps) {
  const vehicleMap = new Map(vehicles.map(v => [v.plate_number, `${v.brand} ${v.model}`]));
  const [showAll, setShowAll] = useState(false);

  const criticalAlerts = alerts.filter((a) => a.severity >= 3);
  const nearAlerts = alerts.filter((a) => a.severity === 2);
  const okAlerts = alerts.filter((a) => a.severity === 1);

  // Group only critical+near for grouping view
  const urgentAlerts = compact
    ? alerts.filter((a) => a.severity >= 2)
    : alerts;

  const groups = groupByVehicle(urgentAlerts);
  const criticalGroups = groups.filter((g) => g.worstSeverity >= 3);
  const nearGroups = groups.filter((g) => g.worstSeverity === 2);
  const okGroups = groups.filter((g) => g.worstSeverity === 1);

  if (alerts.length === 0) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 border border-green-200 text-green-800">
        <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
        <div>
          <p className="font-semibold">Todos los mantenimientos al día</p>
          <p className="text-sm text-green-600">No hay alertas pendientes en este momento.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ─── BANNER DE ALERTA CRITICA ──────────────────────────────── */}
      {criticalAlerts.length > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-red-600 text-white shadow-md">
          <Siren className="h-6 w-6 shrink-0 mt-0.5 animate-pulse" />
          <div>
            <p className="font-bold text-lg leading-tight">
              {criticalAlerts.length} alerta{criticalAlerts.length !== 1 ? "s" : ""} crítica
              {criticalAlerts.length !== 1 ? "s" : ""} — Atención inmediata requerida
            </p>
            <p className="text-red-100 text-sm mt-0.5">
              {criticalGroups.length} vehículo{criticalGroups.length !== 1 ? "s" : ""} con mantenimiento vencido o nunca realizado.
            </p>
          </div>
        </div>
      )}

      {/* ─── BANNER PRÓXIMOS (solo si no hay críticos) ─────────────── */}
      {criticalAlerts.length === 0 && nearAlerts.length > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 border border-amber-300 text-amber-900">
          <Clock className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">
              {nearAlerts.length} mantenimiento{nearAlerts.length !== 1 ? "s" : ""} próximo
              {nearAlerts.length !== 1 ? "s" : ""}
            </p>
            <p className="text-amber-700 text-sm">Planificar en los próximos días para evitar vencimientos.</p>
          </div>
        </div>
      )}

      {/* ─── VEHICULOS CRITICOS ────────────────────────────────────── */}
      {criticalGroups.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-bold text-red-700 uppercase tracking-wide flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4" />
            Vencidos / Críticos ({criticalGroups.length})
          </h4>
          {criticalGroups.map((g) => (
            <VehicleGroup
              key={g.plate}
              group={g}
              defaultOpen={true}
              onDismiss={onDismiss}
              vehicleLabel={vehicleMap.get(g.plate)}
            />
          ))}
        </div>
      )}

      {/* ─── VEHICULOS PROXIMOS ────────────────────────────────────── */}
      {nearGroups.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-bold text-amber-700 uppercase tracking-wide flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            Próximos ({nearGroups.length})
          </h4>
          {nearGroups.map((g) => (
            <VehicleGroup
              key={g.plate}
              group={g}
              defaultOpen={criticalGroups.length === 0}
              onDismiss={onDismiss}
              vehicleLabel={vehicleMap.get(g.plate)}
            />
          ))}
        </div>
      )}

      {/* ─── VEHICULOS AL DIA (colapsado) ──────────────────────────── */}
      {!compact && okGroups.length > 0 && (
        <div className="space-y-2">
          <button
            className="text-sm font-semibold text-green-700 flex items-center gap-1.5 hover:underline"
            onClick={() => setShowAll((v) => !v)}
          >
            <CheckCircle className="h-4 w-4" />
            Al día ({okGroups.length} vehículos)
            {showAll ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </button>
          {showAll && (
            <div className="space-y-2">
              {okGroups.map((g) => (
                <VehicleGroup key={g.plate} group={g} defaultOpen={false} onDismiss={onDismiss} vehicleLabel={vehicleMap.get(g.plate)} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Resumen de estado cuando es compact */}
      {compact && okAlerts.length > 0 && (
        <p className="text-xs text-gray-500">
          + {okAlerts.length} mantenimiento{okAlerts.length !== 1 ? "s" : ""} al día (no se muestran)
        </p>
      )}
    </div>
  );
}
