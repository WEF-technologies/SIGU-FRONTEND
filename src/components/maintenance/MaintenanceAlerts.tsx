import { MaintenanceAlert } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, CheckCircle, XCircle, X } from "lucide-react";

interface MaintenanceAlertsProps {
  alerts: MaintenanceAlert[];
  onDismiss?: (alert: MaintenanceAlert) => void;
}

export function MaintenanceAlerts({ alerts, onDismiss }: MaintenanceAlertsProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ok':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'near':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'due':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'missing':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string, severity: number) => {
    switch (status) {
      case 'ok':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'near':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'due':
        return severity >= 4 ? 'bg-red-100 text-red-800 border-red-200' : 'bg-orange-100 text-orange-800 border-orange-200';
      case 'missing':
        return 'bg-red-200 text-red-900 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ok':
        return 'Al día';
      case 'near':
        return 'Próximo';
      case 'due':
        return 'Vencido';
      case 'missing':
        return 'Nunca realizado';
      default:
        return status;
    }
  };

  const criticalAlerts = alerts.filter(alert => alert.severity >= 3);
  const nearAlerts = alerts.filter(alert => alert.severity === 2);
  const okAlerts = alerts.filter(alert => alert.severity === 1);

  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Alertas de Mantenimiento
          </CardTitle>
          <CardDescription>
            No hay alertas de mantenimiento en este momento
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Alertas de Mantenimiento
          </CardTitle>
          <CardDescription>
            Estado de mantenimientos por vehículo y tipo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Critical Alerts */}
          {criticalAlerts.length > 0 && (
            <div>
              <h4 className="font-medium text-sm text-red-600 mb-2">Críticos - Requieren Atención Inmediata</h4>
              <div className="space-y-2">
                {criticalAlerts.map((alert) => (
                  <Alert key={`${alert.vehicle_plate}-${alert.type}`} className="border-red-200 bg-red-50">
                    <AlertDescription className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(alert.status)}
                        <span className="font-medium">{alert.vehicle_plate}</span>
                        <Badge variant="outline" className="text-xs">
                          {alert.type.toUpperCase()}
                        </Badge>
                        <span className="text-sm">
                          {alert.last_km ? `Último: ${alert.last_km.toLocaleString()} km` : 'Nunca realizado'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(alert.status, alert.severity)}>
                          {getStatusLabel(alert.status)}
                        </Badge>
                        <span className="text-sm text-gray-600">
                          Actual: {alert.current_km.toLocaleString()} km
                        </span>
                        {onDismiss && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDismiss(alert)}
                            className="h-6 w-6 p-0 hover:bg-red-100"
                          >
                            <X className="h-4 w-4 text-red-600" />
                          </Button>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            </div>
          )}

          {/* Near Alerts */}
          {nearAlerts.length > 0 && (
            <div>
              <h4 className="font-medium text-sm text-yellow-600 mb-2">Próximos - Planificar Pronto</h4>
              <div className="space-y-2">
                {nearAlerts.map((alert) => (
                  <Alert key={`${alert.vehicle_plate}-${alert.type}`} className="border-yellow-200 bg-yellow-50">
                    <AlertDescription className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(alert.status)}
                        <span className="font-medium">{alert.vehicle_plate}</span>
                        <Badge variant="outline" className="text-xs">
                          {alert.type.toUpperCase()}
                        </Badge>
                        <span className="text-sm">
                          Último: {alert.last_km?.toLocaleString()} km
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(alert.status, alert.severity)}>
                          Faltan {alert.remaining_km.toLocaleString()} km
                        </Badge>
                        <span className="text-sm text-gray-600">
                          Actual: {alert.current_km.toLocaleString()} km
                        </span>
                        {onDismiss && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDismiss(alert)}
                            className="h-6 w-6 p-0 hover:bg-yellow-100"
                          >
                            <X className="h-4 w-4 text-yellow-600" />
                          </Button>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            </div>
          )}

          {/* OK Alerts - Collapsed by default */}
          {okAlerts.length > 0 && (
            <details className="space-y-2">
              <summary className="font-medium text-sm text-green-600 mb-2 cursor-pointer">
                Al día ({okAlerts.length}) - Ver detalles
              </summary>
              <div className="space-y-2 ml-4">
                {okAlerts.map((alert) => (
                  <div 
                    key={`${alert.vehicle_plate}-${alert.type}`} 
                    className="flex items-center justify-between p-2 rounded-md border border-green-200 bg-green-50"
                  >
                    <div className="flex items-center gap-2">
                      {getStatusIcon(alert.status)}
                      <span className="font-medium text-sm">{alert.vehicle_plate}</span>
                      <Badge variant="outline" className="text-xs">
                        {alert.type.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Badge className={getStatusColor(alert.status, alert.severity)}>
                        {alert.remaining_km.toLocaleString()} km disponibles
                      </Badge>
                      <span className="text-gray-600">
                        {alert.current_km.toLocaleString()} km
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  );
}