
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Car, Users, FileText, AlertTriangle, MapPin, Wrench } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface DashboardStats {
  totalVehicles: number;
  activeVehicles: number;
  totalUsers: number;
  activeContracts: number;
  pendingMaintenances: number;
  urgentMaintenances: number;
}

interface MaintenanceAlert {
  id: string;
  vehiclePlate: string;
  type: string;
  dueDate: string;
  kilometersLeft: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalVehicles: 24,
    activeVehicles: 18,
    totalUsers: 45,
    activeContracts: 8,
    pendingMaintenances: 5,
    urgentMaintenances: 2,
  });

  const [maintenanceAlerts] = useState<MaintenanceAlert[]>([
    {
      id: "1",
      vehiclePlate: "ABC-123",
      type: "M3 - Cambio de aceite",
      dueDate: "2024-01-15",
      kilometersLeft: 250,
    },
    {
      id: "2",
      vehiclePlate: "XYZ-789",
      type: "M3 - Revisión general",
      dueDate: "2024-01-18",
      kilometersLeft: 100,
    },
  ]);

  const statCards = [
    {
      title: "Total Vehículos",
      value: stats.totalVehicles,
      subtitle: `${stats.activeVehicles} activos`,
      icon: Car,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Usuarios",
      value: stats.totalUsers,
      subtitle: "Personal registrado",
      icon: Users,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Contratos Activos",
      value: stats.activeContracts,
      subtitle: "En ejecución",
      icon: FileText,
      color: "text-primary",
      bgColor: "bg-primary-50",
    },
    {
      title: "Mantenimientos",
      value: stats.pendingMaintenances,
      subtitle: `${stats.urgentMaintenances} urgentes`,
      icon: Wrench,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-primary-900">Dashboard</h1>
        <p className="text-secondary-dark mt-2">
          Resumen general del sistema de gestión vehicular
        </p>
      </div>

      {/* Alertas de mantenimiento */}
      {maintenanceAlerts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-primary-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Alertas de Mantenimiento
          </h2>
          {maintenanceAlerts.map((alert) => (
            <Alert key={alert.id} className="border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                <strong>{alert.vehiclePlate}</strong> - {alert.type}. 
                Faltan {alert.kilometersLeft} km. Vencimiento: {alert.dueDate}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => (
          <Card key={index} className="border-secondary-medium hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-secondary-dark">
                {card.title}
              </CardTitle>
              <div className={`w-10 h-10 rounded-lg ${card.bgColor} flex items-center justify-center`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary-900">{card.value}</div>
              <p className="text-xs text-secondary-dark mt-1">{card.subtitle}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Resumen de actividad reciente */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-secondary-medium">
          <CardHeader>
            <CardTitle className="text-lg text-primary-900 flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Rutas Activas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { route: "Centro - Aeropuerto", vehicle: "ABC-123", status: "En curso" },
                { route: "Puerto - Terminal", vehicle: "XYZ-789", status: "Completada" },
                { route: "Norte - Sur", vehicle: "DEF-456", status: "Pendiente" },
              ].map((item, index) => (
                <div key={index} className="flex justify-between items-center py-2 border-b border-secondary-medium last:border-b-0">
                  <div>
                    <p className="font-medium text-primary-900">{item.route}</p>
                    <p className="text-sm text-secondary-dark">Vehículo: {item.vehicle}</p>
                  </div>
                  <Badge 
                    className={
                      item.status === "En curso" ? "bg-blue-100 text-blue-800" :
                      item.status === "Completada" ? "bg-green-100 text-green-800" :
                      "bg-yellow-100 text-yellow-800"
                    }
                  >
                    {item.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-secondary-medium">
          <CardHeader>
            <CardTitle className="text-lg text-primary-900 flex items-center gap-2">
              <Wrench className="w-5 h-5" />
              Mantenimientos Recientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { vehicle: "ABC-123", type: "M1", date: "2024-01-10", status: "Completado" },
                { vehicle: "XYZ-789", type: "M2", date: "2024-01-12", status: "En proceso" },
                { vehicle: "DEF-456", type: "M3", date: "2024-01-15", status: "Programado" },
              ].map((item, index) => (
                <div key={index} className="flex justify-between items-center py-2 border-b border-secondary-medium last:border-b-0">
                  <div>
                    <p className="font-medium text-primary-900">{item.vehicle} - {item.type}</p>
                    <p className="text-sm text-secondary-dark">{item.date}</p>
                  </div>
                  <Badge 
                    className={
                      item.status === "Completado" ? "bg-green-100 text-green-800" :
                      item.status === "En proceso" ? "bg-blue-100 text-blue-800" :
                      "bg-yellow-100 text-yellow-800"
                    }
                  >
                    {item.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
