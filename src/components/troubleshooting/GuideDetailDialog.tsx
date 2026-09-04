import { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TroubleshootingGuide } from "@/types";
import {
  formatCategory,
  formatGuideDate,
  formatSeverity,
  formatStatus,
  getSeverityBadgeClass,
  getStatusBadgeClass,
} from "@/components/troubleshooting/guideUtils";
import { AlertTriangle, Edit, ShieldCheck, Wrench } from "lucide-react";

interface GuideDetailDialogProps {
  guide: TroubleshootingGuide | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (guide: TroubleshootingGuide) => void;
}

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <div>
    <h3 className="text-sm font-semibold uppercase tracking-wide text-secondary-dark">{title}</h3>
    <div className="mt-1 text-sm text-gray-800">{children}</div>
  </div>
);

/**
 * Vista de consulta: es lo que abre quien está frente a la unidad averiada, así
 * que los pasos y las advertencias van primero y sin necesidad de desplazarse.
 */
export function GuideDetailDialog({ guide, isOpen, onClose, onEdit }: GuideDetailDialogProps) {
  if (!guide) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-primary-900">
            {guide.code} · {guide.title}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Detalle de la falla {guide.code} con sus pasos de resolucion.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 flex flex-wrap gap-2">
          <Badge variant="outline" className={getSeverityBadgeClass(guide.severity)}>
            Severidad {formatSeverity(guide.severity)}
          </Badge>
          <Badge variant="outline" className="border-primary-200 text-primary-800">
            {formatCategory(guide.category)}
          </Badge>
          <Badge variant="outline" className={getStatusBadgeClass(guide.status)}>
            {formatStatus(guide.status)}
          </Badge>
          {guide.requires_workshop ? (
            <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700">
              <Wrench className="mr-1 h-3.5 w-3.5" />
              Requiere taller
            </Badge>
          ) : (
            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
              Atendible en ruta
            </Badge>
          )}
        </div>

        <div className="mt-5 space-y-5">
          {guide.safety_notes ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                <div>
                  <p className="text-sm font-semibold text-red-800">Antes de intervenir</p>
                  <p className="mt-1 whitespace-pre-line text-sm text-red-700">
                    {guide.safety_notes}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <Section title="Sintoma">
            <p className="whitespace-pre-line">{guide.symptom}</p>
          </Section>

          {guide.probable_causes ? (
            <Section title="Causas probables">
              <p className="whitespace-pre-line">{guide.probable_causes}</p>
            </Section>
          ) : null}

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-secondary-dark">
              Pasos de resolucion
            </h3>
            {guide.resolution_steps.length > 0 ? (
              <ol className="mt-2 space-y-2">
                {guide.resolution_steps.map((step, index) => (
                  <li
                    key={`${guide.id}-step-${index}`}
                    className="flex items-start gap-3 rounded-lg border border-secondary-medium bg-white p-3"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                      {index + 1}
                    </span>
                    <span className="whitespace-pre-line text-sm text-gray-800">{step}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-1 text-sm text-secondary-dark">Sin pasos registrados.</p>
            )}
          </div>

          {guide.prevention_tips ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                <div>
                  <p className="text-sm font-semibold text-emerald-800">Para que no se repita</p>
                  <p className="mt-1 whitespace-pre-line text-sm text-emerald-700">
                    {guide.prevention_tips}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {guide.notes ? (
            <Section title="Notas">
              <p className="whitespace-pre-line">{guide.notes}</p>
            </Section>
          ) : null}

          <p className="text-xs text-secondary-dark">
            Registrada el {formatGuideDate(guide.created_at)} · Ultima actualizacion{" "}
            {formatGuideDate(guide.updated_at)}
          </p>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          {onEdit ? (
            <Button
              type="button"
              className="bg-primary hover:bg-primary-600 text-white"
              onClick={() => onEdit(guide)}
            >
              <Edit className="h-4 w-4" />
              Editar
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
