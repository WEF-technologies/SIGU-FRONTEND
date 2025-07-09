
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Car, UserCheck, FileText, AlertTriangle, MapPin, Wrench } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuthenticatedFetch } from "@/hooks/useAuthenticatedFetch";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface DashboardStats {
  totalVehicles: number;
  activeVehicles: number;
  totalDrivers: number;
  activeContracts: number;
  totalMaintenances: number;
  urgentMaintenances: number;
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
  const [stats, setStats] = useState<DashboardStats>({
    totalVehicles: 0,
    activeVehicles: 0,
    totalDrivers: 0,
    activeContracts: 0,
    totalMaintenances: 0,
    urgentMaintenances: 0,
  });
  const [recentMaintenances, setRecentMaintenances] = useState<MaintenanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch vehicles
        const vehiclesResponse = await authenticatedFetch(`${API_URL}/api/v1/vehicles/`);
        let vehicles = [];
        if (vehiclesResponse.ok) {
          vehicles = await vehiclesResponse.json();
        }

        // Fetch users (not drivers - drivers is separate)
        const usersResponse = await authenticatedFetch(`${API_URL}/api/v1/users/`);
        let users = [];
        if (usersResponse.ok) {
          users = await usersResponse.json();
        }

        // Fetch drivers
        let drivers = [];
        try {
          const driversResponse = await authenticatedFetch(`${API_URL}/api/v1/drivers/`);
          if (driversResponse.ok) {
            drivers = await driversResponse.json();
          }
        } catch (error) {
          console.log('Drivers endpoint not available:', error);
        }

        // Fetch contracts
        let contracts = [];
        try {
          const contractsResponse = await authenticatedFetch(`${API_URL}/api/v1/contracts/`);
          if (contractsResponse.ok) {
            contracts = await contractsResponse.json();
          }
        } catch (error) {
          console.log('Contracts endpoint not available:', error);
        }

        // Fetch maintenances
        let maintenances = [];
        try {
          const maintenancesResponse = await authenticatedFetch(`${API_URL}/api/v1/maintenances/`);
          if (maintenancesResponse.ok) {
            maintenances = await maintenancesResponse.json();
            setRecentMaintenances(maintenances.slice(0, 3)); // Show only last 3
          }
        } catch (error) {
          console.log('Maintenances endpoint not available:', error);
        }

        // Calculate real stats
        const totalVehicles = vehicles.length;
        const activeVehicles = vehicles.filter((v: any) => 
          v.status === 'available' || v.status === 'Puerto Ordaz' || 
          v.status === 'Barcelona' || v.status === 'Ciudad Piar'
        ).length;
        
        const totalDrivers = drivers.length; // Use actual drivers, not users
        const activeContracts = contracts.length;
        const totalMaintenances = maintenances.length;

        // Calculate urgent maintenances (for now, we'll consider recent ones as urgent)
        const urgentMaintenances = 0; // No real calculation yet

        setStats({
          totalVehicles,
          activeVehicles,
          totalDrivers,
          activeContracts,
          totalMaintenances,
          urgentMaintenances,
        });

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [authenticatedFetch]);

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
      value: stats.totalMaintenances,
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-primary-900">Dashboard</h1>
        <p className="text-secondary-dark mt-2">
          Resumen general del sistema de gestión vehicular
        </p>
      </div>

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

      {/* Sección de actividad reciente */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rutas - Empty state since no real data */}
        <Card className="border-secondary-medium">
          <CardHeader>
            <CardTitle className="text-lg text-primary-900 flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Rutas Activas
              <span className="text-xs text-secondary-dark ml-auto cursor-pointer" onClick={() => navigate("/rutas")}>Ver todas →</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-secondary-dark">
              <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No hay rutas activas registradas</p>
              <button 
                onClick={() => navigate("/rutas")}
                className="mt-2 text-primary hover:underline text-sm"
              >
                Gestionar rutas
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Mantenimientos Recientes */}
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
              {recentMaintenances.length > 0 ? (
                recentMaintenances.map((item, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b border-secondary-medium last:border-b-0">
                    <div>
                      <p className="font-medium text-primary-900">{item.vehicle_plate} - {item.type}</p>
                      <p className="text-sm text-secondary-dark">{item.date} • {item.location || 'Sin ubicación'}</p>
                    </div>
                    <Badge className="bg-green-100 text-green-800">
                      Completado
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-secondary-dark">
                  <Wrench className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No hay mantenimientos registrados</p>
                  <button 
                    onClick={() => navigate("/mantenimiento")}
                    className="mt-2 text-primary hover:underline text-sm"
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
