import { Button } from "@/components/ui/button";
import { Edit, Trash2, Eye } from "lucide-react";
import { VehiclePart } from "@/types";

interface VehiclePartActionsProps {
  part: VehiclePart;
  onEdit: (part: VehiclePart) => void;
  onDelete: (part: VehiclePart) => void;
  onViewDetails: (part: VehiclePart) => void;
}

export function VehiclePartActions({ part, onEdit, onDelete, onViewDetails }: VehiclePartActionsProps) {
  return (
    <div className="flex gap-1">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onViewDetails(part)}
        className="h-8 w-8 p-0 border-blue-200 text-blue-600 hover:bg-blue-50"
        title="Ver detalles"
      >
        <Eye className="w-4 h-4" />
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => onEdit(part)}
        className="h-8 w-8 p-0 border-amber-200 text-amber-600 hover:bg-amber-50"
        title="Editar"
      >
        <Edit className="w-4 h-4" />
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => onDelete(part)}
        className="h-8 w-8 p-0 border-red-200 text-red-600 hover:bg-red-50"
        title="Eliminar"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}