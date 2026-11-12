import { useState } from "react";
import { MaintenanceAlert, Vehicle } from "@/types";
import { AlertSummaryBanner } from "@/components/shared/AlertSummaryBanner";
import { pluralize } from "@/lib/alertTone";
import { formatKmNumber } from "@/lib/kilometers";
import { getAlertDueKm, getAlertOverdueKm } from "@/lib/maintenanceAlerts";
import { CheckCircle, ChevronDown, ChevronRight, X } from "lucide-react";

interface MaintenanceAlertsProps {
  alerts: MaintenanceAlert[];
  onDismiss?: (alert: MaintenanceAlert) => void;
  /** Versión para el Dashboard: sin banner, sin los vehículos al día y con menos filas. */
  compact?: boolean;
  vehicles?: Vehicle[];
}

interface VehicleAlertGroup {
  plate: string;
  worstSeverity: number;
  maxOverdueKm: number;
  alerts: MaintenanceAlert[];
}

/** Filas visibles antes de "Ver más": la lista no debe empujar el resto de la página. */
const VISIBLE_VEHICLES_COMPACT = 5;
const VISIBLE_VEHICLES_FULL = 8;

const isUrgent = (alert: MaintenanceAlert) => alert.severity >= 2;
const isOverdue = (alert: MaintenanceAlert) => alert.severity >= 3;

function groupByVehicle(alerts: MaintenanceAlert[]): VehicleAlertGroup[] {
  const map = new Map<string, MaintenanceAlert[]>();
  for (const alert of alerts) {
    const list = map.get(alert.vehicle_plate) ?? [];
    list.push(alert);
    map.set(alert.vehicle_plate, list);
  }

  return Array.from(map.entries())
    .map(([plate, vehicleAlerts]) => ({
      plate,
      alerts: vehicleAlerts.sort(
        (a, b) => b.severity - a.severity || a.remaining_km - b.remaining_km
      ),
      worstSeverity: Math.max(...vehicleAlerts.map((a) => a.severity)),
      maxOverdueKm: Math.max(...vehicleAlerts.map(getAlertOverdueKm)),
    }))
    .sort(
      (a, b) =>
        b.worstSeverity - a.worstSeverity ||
        b.maxOverdueKm - a.maxOverdueKm ||
        a.plate.localeCompare(b.plate)
    );
}

const typeLabel = (alert: MaintenanceAlert) => alert.type.toUpperCase();

/** Lo que falta o lo que se pasó, en corto: va en la etiqueta de la fila. */
function shortStatus(alert: MaintenanceAlert): string {
  if (!isOverdue(alert)) return `faltan ${formatKmNumber(alert.remaining_km)} km`;
  const overdueKm = getAlertOverdueKm(alert);
  return overdueKm > 0 ? `+${formatKmNumber(overdueKm)} km` : "toca ya";
}

function chipClass(severity: number): string {
  if (severity >= 4) return "border-red-600 bg-red-600 text-white";
  if (severity === 3) return "border-red-200 bg-red-50 text-red-700";
  return "border-amber-200 bg-amber-50 text-amber-800";
}

function accentClass(severity: number): string {
  if (severity >= 3) return "border-l-red-500";
  if (severity === 2) return "border-l-amber-400";
  return "border-l-emerald-400";
}

function AlertDetail({
  alert,
  onDismiss,
}: {
  alert: MaintenanceAlert;
  onDismiss?: (a: MaintenanceAlert) => void;
}) {
  const overdue = isOverdue(alert);
  const overdueKm = getAlertOverdueKm(alert);
  const dueKm = formatKmNumber(getAlertDueKm(alert));
  const history =
    alert.last_km === null ? "Nunca registrado" : `Último a los ${formatKmNumber(alert.last_km)} km`;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 py-1.5 text-sm">
      <span className="w-10 shrink-0 font-semibold text-slate-800">{typeLabel(alert)}</span>
      <span className="min-w-0 flex-1 text-slate-600">
        {history} · {overdue ? "tocaba" : "toca"} a los {dueKm} km
      </span>
      <span
        className={`shrink-0 font-medium ${
          overdue ? "text-red-700" : alert.severity === 2 ? "text-amber-700" : "text-slate-500"
        }`}
      >
        {!overdue
          ? `Faltan ${formatKmNumber(alert.remaining_km)} km`
          : overdueKm > 0
          ? `+${formatKmNumber(overdueKm)} km excedidos`
          : "Toca ya"}
      </span>
      {onDismiss && isUrgent(alert) && (
        <button
          type="button"
          onClick={() => onDismiss(alert)}
          className="shrink-0 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          title="Descartar alerta"
          aria-label={`Descartar alerta ${typeLabel(alert)} de ${alert.vehicle_plate}`}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

/** Una línea por vehículo; el detalle por tipo solo aparece al abrirla. */
function VehicleRow({
  group,
  vehicleLabel,
  showOkTypes,
  onDismiss,
}: {
  group: VehicleAlertGroup;
  vehicleLabel?: string;
  showOkTypes: boolean;
  onDismiss?: (a: MaintenanceAlert) => void;
}) {
  const [open, setOpen] = useState(false);
  const urgentAlerts = group.alerts.filter(isUrgent);
  const detailAlerts = showOkTypes ? group.alerts : urgentAlerts;
  const currentKm = Math.max(...group.alerts.map((a) => a.current_km));

  return (
    <div
      className={`overflow-hidden rounded-md border border-l-4 border-slate-200 bg-white ${accentClass(
        group.worstSeverity
      )}`}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-slate-50"
      >
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
        )}
        <span className="shrink-0 font-semibold text-slate-900">{group.plate}</span>
        {vehicleLabel && (
          <span className="hidden max-w-[16rem] shrink truncate text-sm text-slate-500 md:inline">
            {vehicleLabel}
          </span>
        )}
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          {urgentAlerts.map((alert) => (
            <span
              key={alert.type}
              className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${chipClass(
                alert.severity
              )}`}
            >
              <span className="font-bold">{typeLabel(alert)}</span> {shortStatus(alert)}
            </span>
          ))}
          {urgentAlerts.length === 0 && (
            <span className="text-xs text-slate-500">Sin mantenimientos pendientes</span>
          )}
        </span>
        <span className="hidden shrink-0 text-xs text-slate-500 sm:inline">
          {formatKmNumber(currentKm)} km
        </span>
      </button>

      {open && (
        <div className="divide-y divide-slate-100 border-t border-slate-100 bg-slate-50/60 px-3 py-1 pl-10">
          {detailAlerts.map((alert) => (
            <AlertDetail key={alert.type} alert={alert} onDismiss={onDismiss} />
          ))}
        </div>
      )}
    </div>
  );
}

export function MaintenanceAlerts({ alerts, onDismiss, compact = false, vehicles = [] }: MaintenanceAlertsProps) {
  const [showAllUrgent, setShowAllUrgent] = useState(false);
  const [showOkVehicles, setShowOkVehicles] = useState(false);

  const vehicleLabels = new Map(vehicles.map((v) => [v.plate_number, `${v.brand} ${v.model}`]));
  const groups = groupByVehicle(alerts);
  const urgentGroups = groups.filter((g) => g.worstSeverity >= 2);
  const okGroups = groups.filter((g) => g.worstSeverity < 2);

  const overdueVehicles = urgentGroups.filter((g) => g.worstSeverity >= 3).length;
  const nearVehicles = urgentGroups.length - overdueVehicles;
  const overdueCount = alerts.filter(isOverdue).length;
  const nearCount = alerts.filter((a) => a.severity === 2).length;

  const limit = compact ? VISIBLE_VEHICLES_COMPACT : VISIBLE_VEHICLES_FULL;
  const visibleGroups = showAllUrgent ? urgentGroups : urgentGroups.slice(0, limit);
  const extraVehicles = urgentGroups.length - limit;

  const overdueVehiclesText = `${overdueVehicles} ${pluralize(overdueVehicles, "vehículo", "vehículos")} con mantenimiento vencido`;
  const nearVehiclesText = `${nearVehicles} ${pluralize(nearVehicles, "vehículo", "vehículos")} con mantenimiento próximo`;
  const overdueCountText = `${overdueCount} ${pluralize(overdueCount, "mantenimiento vencido", "mantenimientos vencidos")}`;
  const nearCountText = `${nearCount} ${pluralize(nearCount, "próximo", "próximos")}`;

  const renderRow = (group: VehicleAlertGroup) => (
    <VehicleRow
      key={group.plate}
      group={group}
      vehicleLabel={vehicleLabels.get(group.plate)}
      showOkTypes={!compact}
      onDismiss={onDismiss}
    />
  );

  return (
    <div className="space-y-3">
      {!compact && (
        <AlertSummaryBanner
          criticalCount={overdueVehicles}
          warningCount={nearVehicles}
          critical={{
            title: overdueVehiclesText,
            description: nearCount > 0 ? `${overdueCountText} · ${nearCountText}` : overdueCountText,
          }}
          warning={{
            title: nearVehiclesText,
            description: "Planificar en los próximos días para evitar vencimientos.",
          }}
          ok={{
            title: "Todos los mantenimientos al día",
            description: "No hay mantenimientos vencidos ni próximos.",
          }}
        />
      )}

      {compact && urgentGroups.length === 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
          <CheckCircle className="h-5 w-5 shrink-0 text-green-600" />
          <div>
            <p className="font-semibold">Todos los mantenimientos al día</p>
            <p className="text-sm text-green-700">No hay mantenimientos vencidos ni próximos.</p>
          </div>
        </div>
      )}

      {compact && urgentGroups.length > 0 && (
        <p className="text-sm text-slate-600">
          {[overdueVehicles > 0 ? overdueVehiclesText : null, nearVehicles > 0 ? nearVehiclesText : null]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}

      {visibleGroups.length > 0 && <div className="space-y-1.5">{visibleGroups.map(renderRow)}</div>}

      {extraVehicles > 0 && (
        <button
          type="button"
          className="text-sm font-medium text-primary hover:underline"
          onClick={() => setShowAllUrgent((value) => !value)}
        >
          {showAllUrgent
            ? "Ver menos"
            : `Ver ${extraVehicles} ${pluralize(extraVehicles, "vehículo", "vehículos")} más`}
        </button>
      )}

      {!compact && okGroups.length > 0 && (
        <div className="space-y-1.5">
          <button
            type="button"
            aria-expanded={showOkVehicles}
            className="flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:underline"
            onClick={() => setShowOkVehicles((value) => !value)}
          >
            <CheckCircle className="h-4 w-4" />
            Al día ({okGroups.length} {pluralize(okGroups.length, "vehículo", "vehículos")})
            {showOkVehicles ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </button>
          {showOkVehicles && okGroups.map(renderRow)}
        </div>
      )}
    </div>
  );
}
