import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { Driver } from "@/types";

interface DriverActionsProps {
  driver: Driver;
  onEdit: (driver: Driver) => void;
  onDelete: (driver: Driver) => void;
}

export function DriverActions({ driver, onEdit, onDelete }: DriverActionsProps) {
  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onEdit(driver)}
        className="border-primary-200 text-primary hover:bg-primary-50"
        title="Editar"
      >
        <Edit className="w-4 h-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onDelete(driver)}
        className="border-red-200 text-red-600 hover:bg-red-50"
        title="Eliminar"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}