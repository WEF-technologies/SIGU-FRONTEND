import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { VehiclePart } from "@/types";
import { Cog, Car, Calendar, MapPin, AlertTriangle } from "lucide-react";

interface VehiclePartDetailsModalProps {
  part: VehiclePart | null;
  isOpen: boolean;
  onClose: () => void;
}

export function VehiclePartDetailsModal({ part, isOpen, onClose }: VehiclePartDetailsModalProps) {
  if (!part) return null;

  const getStatusBadge = (status: string) => {
    const variants = {
      active: { variant: "default" as const, text: "Activo", color: "bg-green-50 text-green-700 border-green-200" },
      maintenance: { variant: "outline" as const, text: "Mantenimiento", color: "bg-amber-50 text-amber-700 border-amber-200" },
      removed: { variant: "outline" as const, text: "Removido", color: "bg-red-50 text-red-700 border-red-200" },
    };
    
    const config = variants[status as keyof typeof variants] || variants.active;
    return (
      <Badge variant={config.variant} className={config.color}>
        {config.text}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cog className="w-5 h-5" />
            Detalles de Parte - {part.code}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información básica */}
          <Card className="p-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-sm text-gray-600">Código</Label>
                <p className="font-medium text-lg">{part.code}</p>
              </div>
              <div>
                <Label className="text-sm text-gray-600">Tipo</Label>
                <p className="font-medium">{part.type}</p>
              </div>
              <div>
                <Label className="text-sm text-gray-600">Estado</Label>
                <div className="mt-1">
                  {getStatusBadge(part.status)}
                </div>
              </div>
            </div>

            {part.serial_number && (
              <div className="mt-4">
                <Label className="text-sm text-gray-600">Número de Serie</Label>
                <p className="font-medium">{part.serial_number}</p>
              </div>
            )}

            {part.position && (
              <div className="mt-4">
                <Label className="text-sm text-gray-600">Posición</Label>
                <p className="font-medium">{part.position}</p>
              </div>
            )}
          </Card>

          {/* Información del vehículo */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Car className="w-5 h-5 text-blue-600" />
              <Label className="font-medium">Vehículo</Label>
            </div>
            <p className="text-gray-700 font-medium">{part.vehicle_plate}</p>
          </Card>

          {/* Fechas e instalación */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-5 h-5 text-green-600" />
                <Label className="font-medium">Instalación</Label>
              </div>
              <div className="space-y-2">
                <div>
                  <Label className="text-sm text-gray-600">Fecha</Label>
                  <p className="text-gray-700">{formatDate(part.installed_date)}</p>
                </div>
                {part.installed_kilometers && (
                  <div>
                    <Label className="text-sm text-gray-600">Kilómetros</Label>
                    <p className="text-gray-700">{part.installed_kilometers.toLocaleString()} km</p>
                  </div>
                )}
              </div>
            </Card>

            {part.status === 'removed' && part.removed_date && (
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <Label className="font-medium">Remoción</Label>
                </div>
                <div className="space-y-2">
                  <div>
                    <Label className="text-sm text-gray-600">Fecha</Label>
                    <p className="text-gray-700">{formatDate(part.removed_date)}</p>
                  </div>
                  {part.removed_kilometers && (
                    <div>
                      <Label className="text-sm text-gray-600">Kilómetros</Label>
                      <p className="text-gray-700">{part.removed_kilometers.toLocaleString()} km</p>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>

          {/* Vida útil y vencimiento */}
          <div className="grid grid-cols-2 gap-4">
            {part.life_kilometers && (
              <Card className="p-4">
                <Label className="font-medium mb-3 block">Vida Útil</Label>
                <div>
                  <Label className="text-sm text-gray-600">Kilómetros de Vida</Label>
                  <p className="font-medium text-lg">{part.life_kilometers.toLocaleString()} km</p>
                </div>
              </Card>
            )}

            {part.expiry_date && (
              <Card className="p-4">
                <Label className="font-medium mb-3 block">Vencimiento</Label>
                <div>
                  <Label className="text-sm text-gray-600">Fecha de Vencimiento</Label>
                  <p className="font-medium text-lg">{formatDate(part.expiry_date)}</p>
                </div>
              </Card>
            )}
          </div>

          {/* Notas */}
          {part.notes && (
            <Card className="p-4">
              <Label className="font-medium mb-3 block">Notas</Label>
              <p className="text-gray-700 whitespace-pre-wrap">{part.notes}</p>
            </Card>
          )}

          {/* Información del sistema */}
          <Card className="p-4">
            <Label className="font-medium mb-3 block">Información del Sistema</Label>
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <Label className="text-xs text-gray-500">Fecha de Creación</Label>
                <p>{formatDate(part.created_at)}</p>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Última Actualización</Label>
                <p>{formatDate(part.updated_at)}</p>
              </div>
            </div>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}