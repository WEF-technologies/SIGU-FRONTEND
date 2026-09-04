import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TroubleshootingGuide } from "@/types";

interface DeleteGuideDialogProps {
  guide: TroubleshootingGuide | null;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: (guide: TroubleshootingGuide) => void;
}

/**
 * Confirmacion de borrado. Nombra la falla concreta para que un clic de mas no
 * se lleve por delante una guia que alguien puede necesitar en ruta.
 */
export function DeleteGuideDialog({
  guide,
  isDeleting,
  onCancel,
  onConfirm,
}: DeleteGuideDialogProps) {
  return (
    <AlertDialog
      open={Boolean(guide)}
      onOpenChange={(open) => {
        if (!open && !isDeleting) onCancel();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-primary-900">Eliminar falla del manual</AlertDialogTitle>
          <AlertDialogDescription>
            {guide
              ? `Se eliminara ${guide.code} · ${guide.title}. Esta accion no se puede deshacer.`
              : ""}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className="bg-red-600 text-white hover:bg-red-700"
            disabled={isDeleting}
            onClick={(event) => {
              // El dialogo se cierra al terminar la mutacion, no al hacer clic.
              event.preventDefault();
              if (guide) onConfirm(guide);
            }}
          >
            {isDeleting ? "Eliminando..." : "Eliminar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
