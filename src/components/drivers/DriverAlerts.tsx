import { useState, useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DriverAlert } from "@/types";
import { Badge } from "@/components/ui/badge";

interface DriverAlertsProps {
  alerts: DriverAlert[];
}

export function DriverAlerts({ alerts }: DriverAlertsProps) {
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>(() => {
    const stored = localStorage.getItem('dismissedDriverAlerts');
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
    localStorage.setItem('dismissedDriverAlerts', JSON.stringify(dismissedAlerts));
  }, [dismissedAlerts]);

  const handleDismiss = (documentNumber: string) => {
    setDismissedAlerts([...dismissedAlerts, documentNumber]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'due':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'near':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'missing':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'due':
        return 'Vencido';
      case 'near':
        return 'Próximo';
      case 'missing':
        return 'Falta';
      default:
        return 'OK';
    }
  };

  const visibleAlerts = alerts
    .filter(alert => !dismissedAlerts.includes(alert.document_number))
    .filter(alert => alert.status_license !== 'ok' || alert.status_defensive !== 'ok');

  if (visibleAlerts.length === 0) return null;

  return (
    <div className="space-y-3 mb-6">
      {visibleAlerts.map((alert) => {
        const worstStatus = alert.status_license === 'due' || alert.status_defensive === 'due' ? 'due' :
                           alert.status_license === 'near' || alert.status_defensive === 'near' ? 'near' : 'missing';
        
        return (
          <Alert key={alert.document_number} className={`${getStatusColor(worstStatus)} relative`}>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="flex items-center gap-2">
              Alerta: {alert.name} {alert.last_name}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDismiss(alert.document_number)}
                className="absolute right-2 top-2 h-6 w-6 p-0 hover:bg-black/10"
              >
                <X className="h-4 w-4" />
              </Button>
            </AlertTitle>
            <AlertDescription className="mt-2">
              <div className="flex flex-wrap gap-2">
                {alert.status_license !== 'ok' && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Licencia:</span>
                    <Badge variant="outline" className={getStatusColor(alert.status_license)}>
                      {getStatusText(alert.status_license)}
                    </Badge>
                    {alert.license_expiry_date && (
                      <span className="text-sm">
                        {new Date(alert.license_expiry_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                )}
                {alert.status_defensive !== 'ok' && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Manejo Defensivo:</span>
                    <Badge variant="outline" className={getStatusColor(alert.status_defensive)}>
                      {getStatusText(alert.status_defensive)}
                    </Badge>
                    {alert.defensive_driving_expiry_date && (
                      <span className="text-sm">
                        {new Date(alert.defensive_driving_expiry_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        );
      })}
    </div>
  );
}
