
import { Maintenance } from "@/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { maintenanceTypeConfig } from "@/constants/maintenanceTypes";
import { CalendarDays, Gauge, MapPin, User, Wrench, Car, Package } from "lucide-react";

interface MaintenanceDetailsModalProps {
  maintenance: Maintenance | null;
  isOpen: boolean;
  onClose: () => void;
}

export function MaintenanceDetailsModal({ maintenance, isOpen, onClose }: MaintenanceDetailsModalProps) {
  if (!maintenance) return null;

  const config = maintenanceTypeConfig[maintenance.type];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5" />
            Detalles del Mantenimiento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información básica */}
          <Card className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-gray-600 flex items-center gap-1">
                  <Car className="w-4 h-4" />
                  Vehículo
                </Label>
                <p className="font-medium">{maintenance.vehicle_plate}</p>
              </div>
              <div>
                <Label className="text-sm text-gray-600">Tipo de Mantenimiento</Label>
                <Badge variant="outline" className={config.color}>{maintenance.type.toUpperCase()}</Badge>
              </div>
              <div>
                <Label className="text-sm text-gray-600 flex items-center gap-1">
                  <CalendarDays className="w-4 h-4" />
                  Fecha
                </Label>
                <p className="font-medium">{new Date(maintenance.date).toLocaleDateString()}</p>
              </div>
              <div>
                <Label className="text-sm text-gray-600 flex items-center gap-1">
                  <Gauge className="w-4 h-4" />
                  Kilometraje
                </Label>
                <p className="font-medium">
                  {maintenance.kilometers ? `${maintenance.kilometers.toLocaleString()} km` : 'No registrado'}
                </p>
              </div>
            </div>
          </Card>

          {/* Descripción */}
          <Card className="p-4">
            <div>
              <Label className="text-sm text-gray-600">Descripción del Mantenimiento</Label>
              <p className="mt-2 text-sm bg-gray-50 p-3 rounded-md">{maintenance.description}</p>
            </div>
          </Card>

          {/* Información adicional */}
          <Card className="p-4">
            <h3 className="font-medium mb-4">Información Adicional</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-gray-600 flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  Lugar de Realización
                </Label>
                <p className="font-medium">{maintenance.location || 'No especificado'}</p>
              </div>
              <div>
                <Label className="text-sm text-gray-600 flex items-center gap-1">
                  <User className="w-4 h-4" />
                  Realizado por
                </Label>
                <p className="font-medium">{maintenance.performed_by || 'No especificado'}</p>
              </div>
            </div>
          </Card>

          {/* Repuestos utilizados */}
          {(maintenance.spare_part_description || maintenance.spare_part_id) && (
            <Card className="p-4">
              <div>
                <Label className="text-sm text-gray-600 flex items-center gap-1">
                  <Package className="w-4 h-4" />
                  Repuestos Utilizados
                </Label>
                <p className="font-medium mt-2">
                  {maintenance.spare_part_description || 'Repuesto registrado'}
                </p>
              </div>
            </Card>
          )}

          {/* Información de registro */}
          <div className="text-xs text-gray-500 pt-4 border-t">
            <p>Creado: {new Date(maintenance.created_at).toLocaleString()}</p>
            <p>Última actualización: {new Date(maintenance.updated_at).toLocaleString()}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
