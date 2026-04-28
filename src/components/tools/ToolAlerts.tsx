import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ToolAlert } from "@/types";
import { AlertTriangle, CheckCircle, Clock } from "lucide-react";

interface ToolAlertsProps {
  alerts: ToolAlert[];
  isLoading?: boolean;
}

const severityOrder: Record<ToolAlert["severity"], number> = {
  critical: 0,
  warning: 1,
  normal: 2,
};

const statusMap: Record<ToolAlert["alert_status"], { label: string; className: string }> = {
  expired: { label: "Vencida", className: "bg-red-100 text-red-700 border-red-200" },
  near: { label: "Próxima", className: "bg-amber-100 text-amber-700 border-amber-200" },
  ok: { label: "OK", className: "bg-green-100 text-green-700 border-green-200" },
};

const severityMap: Record<ToolAlert["severity"], { label: string; className: string }> = {
  critical: { label: "Crítica", className: "bg-red-100 text-red-700 border-red-200" },
  warning: { label: "Advertencia", className: "bg-amber-100 text-amber-700 border-amber-200" },
  normal: { label: "Normal", className: "bg-blue-100 text-blue-700 border-blue-200" },
};

const formatExpiryText = (alert: ToolAlert) => {
  if (!alert.expiry_date) return "Sin fecha de vencimiento";
  const formattedDate = new Date(alert.expiry_date).toLocaleDateString("es-ES");
  if (alert.days_to_expiry == null) return `Vence el ${formattedDate}`;
  if (alert.days_to_expiry < 0) return `Vencida hace ${Math.abs(alert.days_to_expiry)} días (${formattedDate})`;
  if (alert.days_to_expiry === 0) return `Vence hoy (${formattedDate})`;
  return `Vence en ${alert.days_to_expiry} días (${formattedDate})`;
};

export function ToolAlerts({ alerts, isLoading = false }: ToolAlertsProps) {
  if (isLoading) {
    return (
      <Alert>
        <Clock className="h-4 w-4" />
        <AlertDescription>Cargando alertas de herramientas...</AlertDescription>
      </Alert>
    );
  }

  if (!alerts || alerts.length === 0) {
    return (
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          No hay alertas de vencimiento para herramientas en este momento.
        </AlertDescription>
      </Alert>
    );
  }

  const sortedAlerts = [...alerts].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  const criticalCount = alerts.filter((a) => a.severity === "critical").length;
  const warningCount = alerts.filter((a) => a.severity === "warning").length;

  return (
    <div className="space-y-3">
      {criticalCount > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>{criticalCount}</strong> herramienta(s) en estado crítico.
          </AlertDescription>
        </Alert>
      )}

      {warningCount > 0 && (
        <Alert className="border-amber-200 bg-amber-50">
          <Clock className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <strong>{warningCount}</strong> herramienta(s) próximas a vencer.
          </AlertDescription>
        </Alert>
      )}

      <Card className="p-4">
        <h3 className="font-semibold text-lg mb-3">Alertas de Vencimiento</h3>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {sortedAlerts.map((alert) => {
            const statusCfg = statusMap[alert.alert_status] || statusMap.ok;
            const severityCfg = severityMap[alert.severity] || severityMap.normal;

            return (
              <div key={`${alert.tool_id}-${alert.code}`} className="border rounded-lg p-3 bg-gray-50">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-gray-900">
                      {alert.code} - {alert.name}
                    </p>
                    <p className="text-sm text-gray-600">
                      {alert.category} · {alert.location}
                    </p>
                    <p className="text-sm text-gray-600">
                      Estado herramienta: {alert.status.replaceAll("_", " ")}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{formatExpiryText(alert)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge className={statusCfg.className}>{statusCfg.label}</Badge>
                    <Badge className={severityCfg.className}>{severityCfg.label}</Badge>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
