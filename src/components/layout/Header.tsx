
import { Bell, User } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Wrench } from "lucide-react";

const mockMaintenanceNotifications = [
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
];

const mockSparePartRequests = [
  {
    id: "1",
    code: "BRK-001",
    description: "Pastillas de freno delanteras",
    requestedBy: "Juan Pérez",
    date: "2024-01-20",
  },
];

export function Header() {
  const totalNotifications = mockMaintenanceNotifications.length + mockSparePartRequests.length;

  return (
    <header className="h-16 border-b border-secondary-medium bg-white px-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="lg:hidden" />
      </div>

      <div className="flex items-center gap-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="w-5 h-5 text-secondary-dark" />
              {totalNotifications > 0 && (
                <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 bg-red-500 text-white text-xs flex items-center justify-center">
                  {totalNotifications}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 mr-4" align="end">
            <div className="space-y-3">
              <h3 className="font-semibold text-primary-900">Notificaciones</h3>
              
              {mockMaintenanceNotifications.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                    <Wrench className="w-4 h-4" />
                    Mantenimientos Pendientes
                  </h4>
                  {mockMaintenanceNotifications.map((notification) => (
                    <Card key={notification.id} className="mb-2 border-orange-200 bg-orange-50">
                      <CardContent className="p-3">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5" />
                          <div className="flex-1 text-sm">
                            <p className="font-medium text-orange-900">{notification.vehiclePlate}</p>
                            <p className="text-orange-700">{notification.type}</p>
                            <p className="text-xs text-orange-600">
                              Faltan {notification.kilometersLeft} km - Vence: {notification.dueDate}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {mockSparePartRequests.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Solicitudes de Repuestos</h4>
                  {mockSparePartRequests.map((request) => (
                    <Card key={request.id} className="mb-2 border-blue-200 bg-blue-50">
                      <CardContent className="p-3">
                        <div className="text-sm">
                          <p className="font-medium text-blue-900">{request.code}</p>
                          <p className="text-blue-700">{request.description}</p>
                          <p className="text-xs text-blue-600">
                            Solicitado por: {request.requestedBy} - {request.date}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {totalNotifications === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No hay notificaciones pendientes
                </p>
              )}
            </div>
          </PopoverContent>
        </Popover>
        
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="hidden sm:block text-sm">
            <p className="font-medium text-primary-900">Admin User</p>
            <p className="text-xs text-secondary-dark">Administrador</p>
          </div>
        </div>
      </div>
    </header>
  );
}
