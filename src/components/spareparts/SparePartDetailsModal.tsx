
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { SparePart } from "@/types";
import { Package, MapPin, Store, AlertTriangle } from "lucide-react";

interface SparePartDetailsModalProps {
  sparePart: SparePart | null;
  isOpen: boolean;
  onClose: () => void;
}

export function SparePartDetailsModal({ sparePart, isOpen, onClose }: SparePartDetailsModalProps) {
  if (!sparePart) return null;

  const isLowStock = sparePart.min_stock && sparePart.quantity <= sparePart.min_stock;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Detalles del Repuesto - {sparePart.code}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información básica */}
          <Card className="p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-gray-600">Código</Label>
                <p className="font-medium text-lg">{sparePart.code}</p>
              </div>
              <div>
                <Label className="text-sm text-gray-600 flex items-center gap-1">
                  Cantidad Disponible
                  {isLowStock && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                </Label>
                <div className="flex items-center gap-2">
                  <p className={`font-medium text-lg ${isLowStock ? 'text-amber-600' : 'text-green-600'}`}>
                    {sparePart.quantity} unidades
                  </p>
                  {isLowStock && (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                      Stock Bajo
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4">
              <Label className="text-sm text-gray-600">Descripción</Label>
              <p className="font-medium">{sparePart.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <Label className="text-sm text-gray-600">Stock Mínimo</Label>
                <p className="font-medium">{sparePart.min_stock || 'No definido'}</p>
              </div>
              <div>
                <Label className="text-sm text-gray-600">Precio Unitario</Label>
                <p className="font-medium">
                  {sparePart.unit_price ? `$${sparePart.unit_price.toLocaleString()}` : 'No definido'}
                </p>
              </div>
            </div>
          </Card>

          {/* Ubicaciones */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-5 h-5 text-blue-600" />
                <Label className="font-medium">Ubicación en la Empresa</Label>
              </div>
              <p className="text-gray-700">{sparePart.company_location}</p>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Store className="w-5 h-5 text-green-600" />
                <Label className="font-medium">Tienda de Compra</Label>
              </div>
              <p className="text-gray-700">{sparePart.store_location}</p>
            </Card>
          </div>

          {/* Vehículos compatibles */}
          <Card className="p-4">
            <Label className="font-medium mb-3 block">Vehículos Compatibles</Label>
            {sparePart.compatible_vehicles && sparePart.compatible_vehicles.length > 0 ? (
              <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                {sparePart.compatible_vehicles.map((plateNumber, index) => (
                  <Badge 
                    key={index} 
                    variant="outline" 
                    className="justify-center p-2 bg-blue-50 text-blue-700 border-blue-200"
                  >
                    {plateNumber}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">No hay vehículos asociados</p>
            )}
          </Card>

          {/* Información adicional */}
          <Card className="p-4">
            <Label className="font-medium mb-3 block">Información del Sistema</Label>
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <Label className="text-xs text-gray-500">Fecha de Creación</Label>
                <p>{new Date(sparePart.created_at).toLocaleDateString()}</p>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Última Actualización</Label>
                <p>{new Date(sparePart.updated_at).toLocaleDateString()}</p>
              </div>
            </div>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
