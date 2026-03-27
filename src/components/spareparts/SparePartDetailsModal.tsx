
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { SparePart, Vehicle } from "@/types";
import { Package, MapPin, Store, AlertTriangle, Car } from "lucide-react";

interface SparePartDetailsModalProps {
  sparePart: SparePart | null;
  isOpen: boolean;
  onClose: () => void;
  vehicles?: Vehicle[];
}

export function SparePartDetailsModal({ sparePart, isOpen, onClose, vehicles = [] }: SparePartDetailsModalProps) {
  if (!sparePart) return null;

  const isLowStock = sparePart.min_stock != null && sparePart.quantity <= sparePart.min_stock;
  const vehicleMap = new Map(vehicles.map(v => [v.plate_number, v]));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Detalles del Repuesto — <span className="font-mono text-primary">{sparePart.code}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Información básica */}
          <Card className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-gray-500">Código</Label>
                <p className="font-semibold text-base font-mono">{sparePart.code}</p>
              </div>
              <div>
                <Label className="text-xs text-gray-500 flex items-center gap-1">
                  Cantidad Disponible
                  {isLowStock && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                </Label>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className={`font-bold text-lg ${sparePart.quantity === 0 ? 'text-gray-400' : isLowStock ? 'text-amber-600' : 'text-green-600'}`}>
                    {sparePart.quantity} unidades
                  </p>
                  {isLowStock && (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                      Stock Bajo
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div>
              <Label className="text-xs text-gray-500">Descripción</Label>
              <p className="font-medium mt-0.5">{sparePart.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-gray-500">Stock Mínimo</Label>
                <p className="font-medium mt-0.5">{sparePart.min_stock ?? 'No definido'}</p>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Precio Unitario</Label>
                <p className="font-medium mt-0.5">
                  {sparePart.unit_price ? `$${sparePart.unit_price.toLocaleString()}` : 'No definido'}
                </p>
              </div>
            </div>
          </Card>

          {/* Ubicaciones */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                <Label className="text-xs font-semibold text-gray-600">Ubicación en Empresa</Label>
              </div>
              <p className="text-sm text-gray-800">{sparePart.company_location || '—'}</p>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <Store className="w-4 h-4 text-green-600" />
                <Label className="text-xs font-semibold text-gray-600">Tienda de Compra</Label>
              </div>
              <p className="text-sm text-gray-800">{sparePart.store_location || '—'}</p>
            </Card>
          </div>

          {/* Vehículos compatibles */}
          <Card className="p-4">
            <Label className="text-xs font-semibold text-gray-600 mb-3 block">
              Vehículos Compatibles ({(sparePart.compatible_vehicles ?? []).length})
            </Label>
            {(sparePart.compatible_vehicles ?? []).length > 0 ? (
              <div className="space-y-2">
                {sparePart.compatible_vehicles!.map((plate, i) => {
                  const v = vehicleMap.get(plate);
                  return v ? (
                    <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-blue-50 border border-blue-100">
                      <Car className="h-4 w-4 text-blue-500 shrink-0" />
                      <div>
                        <span className="font-semibold text-blue-800 text-sm">{v.plate_number}</span>
                        <span className="mx-2 text-blue-300">·</span>
                        <span className="text-blue-700 text-sm">{v.brand} {v.model}</span>
                        <span className="ml-2 text-xs text-blue-400">{v.year}</span>
                      </div>
                    </div>
                  ) : (
                    <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 border border-gray-200">
                      <Car className="h-4 w-4 text-gray-400 shrink-0" />
                      <span className="text-sm text-gray-600 font-mono">{plate}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">No hay vehículos asociados</p>
            )}
          </Card>

          {/* Información del sistema */}
          <div className="grid grid-cols-2 gap-4 text-xs text-gray-400 px-1">
            <div>
              <span className="block text-gray-400">Creado</span>
              <span className="text-gray-600">{new Date(sparePart.created_at).toLocaleDateString()}</span>
            </div>
            <div>
              <span className="block text-gray-400">Última actualización</span>
              <span className="text-gray-600">{new Date(sparePart.updated_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
