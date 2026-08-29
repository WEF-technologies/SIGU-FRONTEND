import { useState, useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DriverAlert } from "@/types";
import { Badge } from "@/components/ui/badge";
import {
  formatAlertDate,
  getDriverAlertStatusColor,
  getDriverAlertStatusText,
  getWorstStatus,
  hasActiveAlert,
} from "./driverAlertStatus";

interface DriverAlertsProps {
  alerts: DriverAlert[];
  /** Si se provee, cada alerta es clicable para ir/enfocar al chofer. */
  onSelectDriver?: (documentNumber: string) => void;
}

const DISMISSED_KEY = "dismissedDriverAlerts";

const readDismissed = (): string[] => {
  try {
    const stored = localStorage.getItem(DISMISSED_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [];
  }
};

export function DriverAlerts({ alerts, onSelectDriver }: DriverAlertsProps) {
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>(readDismissed);

  useEffect(() => {
    try {
      localStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissedAlerts));
    } catch {
      // Almacenamiento no disponible (modo privado, cuota llena, etc.)
    }
  }, [dismissedAlerts]);

  const handleDismiss = (documentNumber: string) => {
    setDismissedAlerts([...dismissedAlerts, documentNumber]);
  };

  const activeAlerts = alerts.filter(hasActiveAlert);
  const visibleAlerts = activeAlerts.filter(
    (alert) => !dismissedAlerts.includes(alert.document_number)
  );
  const hiddenCount = activeAlerts.length - visibleAlerts.length;

  if (activeAlerts.length === 0) return null;

  return (
    <div className="space-y-3 mb-6">
      {visibleAlerts.map((alert) => {
        const worstStatus = getWorstStatus(alert);
        const licenseDate = formatAlertDate(alert.license_expiry_date);
        const defensiveDate = formatAlertDate(alert.defensive_driving_expiry_date);

        return (
          <Alert
            key={alert.document_number}
            className={`${getDriverAlertStatusColor(worstStatus)} relative ${
              onSelectDriver ? "cursor-pointer transition-shadow hover:shadow-md" : ""
            }`}
            onClick={onSelectDriver ? () => onSelectDriver(alert.document_number) : undefined}
          >
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="flex items-center gap-2">
              Alerta: {alert.name} {alert.last_name}
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDismiss(alert.document_number);
                }}
                className="absolute right-2 top-2 h-6 w-6 p-0 hover:bg-black/10"
              >
                <X className="h-4 w-4" />
              </Button>
            </AlertTitle>
            <AlertDescription className="mt-2">
              <div className="flex flex-wrap items-center gap-2">
                {alert.status_license !== "ok" && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Licencia:</span>
                    <Badge variant="outline" className={getDriverAlertStatusColor(alert.status_license)}>
                      {getDriverAlertStatusText(alert.status_license)}
                    </Badge>
                    {licenseDate && <span className="text-sm">{licenseDate}</span>}
                  </div>
                )}
                {alert.status_defensive !== "ok" && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Manejo Defensivo:</span>
                    <Badge variant="outline" className={getDriverAlertStatusColor(alert.status_defensive)}>
                      {getDriverAlertStatusText(alert.status_defensive)}
                    </Badge>
                    {defensiveDate && <span className="text-sm">{defensiveDate}</span>}
                  </div>
                )}
                {onSelectDriver && (
                  <span className="ml-auto text-xs font-medium underline underline-offset-2">
                    Ver chofer
                  </span>
                )}
              </div>
            </AlertDescription>
          </Alert>
        );
      })}
      {hiddenCount > 0 && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>
            {hiddenCount} alerta{hiddenCount !== 1 ? "s" : ""} descartada{hiddenCount !== 1 ? "s" : ""}.
          </span>
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-sm"
            onClick={() => setDismissedAlerts([])}
          >
            Mostrar de nuevo
          </Button>
        </div>
      )}
    </div>
  );
}
