import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PartAlert } from "@/types";
import { AlertTriangle, Clock, CheckCircle } from "lucide-react";

interface VehiclePartAlertsProps {
  alerts: PartAlert[];
}

export function VehiclePartAlerts({ alerts }: VehiclePartAlertsProps) {
  if (!alerts || alerts.length === 0) {
    return (
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          No hay alertas de partes de vehículos en este momento.
        </AlertDescription>
      </Alert>
    );
  }

  const criticalAlerts = alerts.filter(alert => 
    alert.status_km === 'due' || alert.status_date === 'due'
  );
  
  const warningAlerts = alerts.filter(alert => 
    alert.status_km === 'near' || alert.status_date === 'near'
  );

  const getStatusIcon = (statusKm: string, statusDate: string) => {
    if (statusKm === 'due' || statusDate === 'due') {
      return <AlertTriangle className="h-4 w-4 text-red-600" />;
    }
    if (statusKm === 'near' || statusDate === 'near') {
      return <Clock className="h-4 w-4 text-amber-600" />;
    }
    return <CheckCircle className="h-4 w-4 text-green-600" />;
  };

  const getStatusBadge = (statusKm: string, statusDate: string) => {
    if (statusKm === 'due' || statusDate === 'due') {
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Vencido</Badge>;
    }
    if (statusKm === 'near' || statusDate === 'near') {
      return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Próximo</Badge>;
    }
    return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">OK</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES');
  };

  return (
    <div className="space-y-4">
      {criticalAlerts.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>{criticalAlerts.length}</strong> parte(s) vencida(s) requieren atención inmediata.
          </AlertDescription>
        </Alert>
      )}

      {warningAlerts.length > 0 && (
        <Alert className="border-amber-200 bg-amber-50">
          <Clock className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <strong>{warningAlerts.length}</strong> parte(s) próxima(s) a vencer.
          </AlertDescription>
        </Alert>
      )}

      <Card className="p-4">
        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          Alertas de Partes de Vehículos
        </h3>
        
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {alerts.map((alert, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                {getStatusIcon(alert.status_km, alert.status_date)}
                <div>
                  <div className="font-medium">
                    {alert.vehicle_plate} - {alert.part_type}
                  </div>
                  <div className="text-sm text-gray-600">
                    {alert.code} {alert.position && `(${alert.position})`}
                  </div>
                  <div className="text-xs text-gray-500">
                    {alert.remaining_km !== null && (
                      <span className="mr-4">
                        Quedan: {Math.max(0, alert.remaining_km).toLocaleString()} km
                      </span>
                    )}
                    {alert.days_to_expiry !== null && (
                      <span>
                        {alert.days_to_expiry > 0 
                          ? `${alert.days_to_expiry} días restantes`
                          : `Vencido hace ${Math.abs(alert.days_to_expiry)} días`
                        }
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                {getStatusBadge(alert.status_km, alert.status_date)}
                <div className="text-xs text-gray-500 mt-1">
                  Instalado: {formatDate(alert.installed_date)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}