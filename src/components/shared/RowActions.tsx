import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Edit, Eye, Trash2 } from "lucide-react";

interface RowActionsProps {
  /** Nombre del registro, para que el lector de pantalla diga "Editar Filtro de aceite". */
  label: string;
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  /** Acciones propias del modulo, antes de las comunes. */
  children?: ReactNode;
}

/**
 * Acciones de una fila: iconos sin borde ni color propio. La fila se lee por
 * sus datos; el color aparece solo al pasar el puntero (rojo para eliminar).
 */
export function RowActions({ label, onView, onEdit, onDelete, children }: RowActionsProps) {
  return (
    <div className="flex flex-nowrap items-center justify-end gap-1">
      {children}
      {onView ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-gray-500 hover:bg-primary-50 hover:text-primary"
          onClick={onView}
          aria-label={`Ver detalles de ${label}`}
          title="Ver detalles"
        >
          <Eye className="h-4 w-4" />
        </Button>
      ) : null}
      {onEdit ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-gray-500 hover:bg-primary-50 hover:text-primary"
          onClick={onEdit}
          aria-label={`Editar ${label}`}
          title="Editar"
        >
          <Edit className="h-4 w-4" />
        </Button>
      ) : null}
      {onDelete ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-gray-500 hover:bg-red-50 hover:text-red-600"
          onClick={onDelete}
          aria-label={`Eliminar ${label}`}
          title="Eliminar"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}
