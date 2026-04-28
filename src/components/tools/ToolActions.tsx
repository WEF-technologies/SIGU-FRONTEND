import { Button } from "@/components/ui/button";
import { Eye, Edit, Trash2 } from "lucide-react";
import { Tool } from "@/types";

interface ToolActionsProps {
  tool: Tool;
  onViewDetails: (tool: Tool) => void;
  onEdit: (tool: Tool) => void;
  onDelete: (tool: Tool) => void;
}

export function ToolActions({ tool, onViewDetails, onEdit, onDelete }: ToolActionsProps) {
  return (
    <div className="flex gap-1">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onViewDetails(tool)}
        className="h-8 w-8 p-0 border-blue-200 text-blue-600 hover:bg-blue-50"
        title="Ver detalles"
      >
        <Eye className="w-4 h-4" />
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={() => onEdit(tool)}
        className="h-8 w-8 p-0 border-amber-200 text-amber-600 hover:bg-amber-50"
        title="Editar"
      >
        <Edit className="w-4 h-4" />
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={() => onDelete(tool)}
        className="h-8 w-8 p-0 border-red-200 text-red-600 hover:bg-red-50"
        title="Eliminar"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}
