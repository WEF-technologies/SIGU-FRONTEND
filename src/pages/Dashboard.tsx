
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Car, UserCheck, FileText, AlertTriangle, MapPin, Wrench } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface DashboardStats {
  totalVehicles: number;
  activeVehicles: number;
  totalDrivers: number;
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
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalVehicles: 24,
    activeVehicles: 18,
    totalDrivers: 15,
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
      route: "/vehiculos",
    },
    {
      title: "Choferes",
      value: stats.totalDrivers,
      subtitle: "Personal conductor",
      icon: UserCheck,
      color: "text-green-600",
      bgColor: "bg-green-50",
      route: "/choferes",
    },
    {
      title: "Contratos Activos",
      value: stats.activeContracts,
      subtitle: "En ejecución",
      icon: FileText,
      color: "text-primary",
      bgColor: "bg-primary-50",
      route: "/contratos",
    },
    {
      title: "Mantenimientos",
      value: stats.pendingMaintenances,
      subtitle: `${stats.urgentMaintenances} urgentes`,
      icon: Wrench,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      route: "/mantenimiento",
      alert: stats.urgentMaintenances > 0,
    },
  ];

  const handleCardClick = (route: string) => {
    navigate(route);
  };

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
          <Card 
            key={index} 
            className="border-secondary-medium hover:shadow-lg transition-all duration-200 cursor-pointer hover:scale-105 relative"
            onClick={() => handleCardClick(card.route)}
          >
            {card.alert && (
              <div className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full animate-pulse">
                <span className="sr-only">Alerta</span>
              </div>
            )}
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
              {card.alert && (
                <div className="flex items-center gap-1 mt-2">
                  <AlertTriangle className="w-3 h-3 text-orange-500" />
                  <span className="text-xs text-orange-600 font-medium">
                    Requiere atención
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Resumen de actividad reciente */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card 
          className="border-secondary-medium cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate("/rutas")}
        >
          <CardHeader>
            <CardTitle className="text-lg text-primary-900 flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Rutas Activas
              <span className="text-xs text-secondary-dark ml-auto">Ver todas →</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { route: "Centro - Aeropuerto", vehicle: "ABC-123", status: "En curso", km: "45 km" },
                { route: "Puerto - Terminal", vehicle: "XYZ-789", status: "Completada", km: "32 km" },
                { route: "Norte - Sur", vehicle: "DEF-456", status: "Pendiente", km: "28 km" },
              ].map((item, index) => (
                <div key={index} className="flex justify-between items-center py-2 border-b border-secondary-medium last:border-b-0">
                  <div>
                    <p className="font-medium text-primary-900">{item.route}</p>
                    <p className="text-sm text-secondary-dark">Vehículo: {item.vehicle} • {item.km}</p>
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

        <Card 
          className="border-secondary-medium cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate("/mantenimiento")}
        >
          <CardHeader>
            <CardTitle className="text-lg text-primary-900 flex items-center gap-2">
              <Wrench className="w-5 h-5" />
              Mantenimientos Recientes
              <span className="text-xs text-secondary-dark ml-auto">Ver todos →</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { vehicle: "ABC-123", type: "M1", date: "2024-01-10", status: "Completado", location: "Taller Central" },
                { vehicle: "XYZ-789", type: "M2", date: "2024-01-12", status: "En proceso", location: "Servicios Norte" },
                { vehicle: "DEF-456", type: "M3", date: "2024-01-15", status: "Programado", location: "Por asignar" },
              ].map((item, index) => (
                <div key={index} className="flex justify-between items-center py-2 border-b border-secondary-medium last:border-b-0">
                  <div>
                    <p className="font-medium text-primary-900">{item.vehicle} - {item.type}</p>
                    <p className="text-sm text-secondary-dark">{item.date} • {item.location}</p>
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
