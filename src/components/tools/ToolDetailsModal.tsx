import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tool } from "@/types";
import { Wrench, Calendar, MapPin, User } from "lucide-react";

interface ToolDetailsModalProps {
  tool: Tool | null;
  isOpen: boolean;
  onClose: () => void;
}

const statusConfig: Record<Tool["status"], { label: string; className: string }> = {
  disponible: { label: "Disponible", className: "bg-green-100 text-green-800 border-green-200" },
  en_uso: { label: "En uso", className: "bg-blue-100 text-blue-800 border-blue-200" },
  en_mantenimiento: { label: "En mantenimiento", className: "bg-amber-100 text-amber-800 border-amber-200" },
  retirada: { label: "Retirada", className: "bg-gray-100 text-gray-800 border-gray-200" },
};

const formatDate = (value?: string) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("es-ES");
};

export function ToolDetailsModal({ tool, isOpen, onClose }: ToolDetailsModalProps) {
  if (!tool) return null;

  const currentStatus = statusConfig[tool.status] || statusConfig.disponible;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5" />
            Detalle de Herramienta - {tool.code}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Card className="p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-gray-600">Código</Label>
                <p className="font-medium font-mono">{tool.code}</p>
              </div>
              <div>
                <Label className="text-sm text-gray-600">Nombre</Label>
                <p className="font-medium">{tool.name}</p>
              </div>
              <div>
                <Label className="text-sm text-gray-600">Categoría</Label>
                <p className="font-medium">{tool.category}</p>
              </div>
              <div>
                <Label className="text-sm text-gray-600">Estado</Label>
                <div className="mt-1">
                  <Badge className={currentStatus.className}>{currentStatus.label}</Badge>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-gray-600 flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  Ubicación
                </Label>
                <p className="font-medium">{tool.location}</p>
              </div>
              <div>
                <Label className="text-sm text-gray-600 flex items-center gap-1">
                  <User className="w-4 h-4" />
                  Asignada a
                </Label>
                <p className="font-medium">{tool.assigned_to || "-"}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-gray-600 flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Fecha de compra
                </Label>
                <p>{formatDate(tool.purchase_date)}</p>
              </div>
              <div>
                <Label className="text-sm text-gray-600 flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Fecha de vencimiento
                </Label>
                <p>{formatDate(tool.expiry_date)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <Label className="text-sm text-gray-600">Notas</Label>
            <p className="mt-1 whitespace-pre-wrap text-gray-800">{tool.notes || "Sin notas"}</p>
          </Card>

          <Card className="p-4">
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <Label className="text-xs text-gray-500">Creada</Label>
                <p>{formatDate(tool.created_at)}</p>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Actualizada</Label>
                <p>{formatDate(tool.updated_at)}</p>
              </div>
            </div>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
