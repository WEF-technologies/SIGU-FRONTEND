import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  GUIDE_SEVERITY_OPTIONS,
  GUIDE_STATUS_OPTIONS,
  GuideSeverity,
  GuideStatus,
  TROUBLESHOOTING_CATEGORY_SUGGESTIONS,
  TROUBLESHOOTING_LIMITS,
  TroubleshootingGuide,
  TroubleshootingGuidePayload,
} from "@/types";
import { formatCategory } from "@/components/troubleshooting/guideUtils";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

interface TroubleshootingGuideFormProps {
  editingGuide?: TroubleshootingGuide | null;
  onSubmit: (payload: TroubleshootingGuidePayload) => Promise<boolean>;
  onCancel: () => void;
}

interface GuideFormState {
  code: string;
  title: string;
  category: string;
  symptom: string;
  probable_causes: string;
  resolution_steps: string[];
  severity: GuideSeverity;
  requires_workshop: boolean;
  safety_notes: string;
  prevention_tips: string;
  status: GuideStatus;
  notes: string;
}

const createEmptyState = (): GuideFormState => ({
  code: "",
  title: "",
  category: "",
  symptom: "",
  probable_causes: "",
  resolution_steps: [""],
  severity: "media",
  requires_workshop: false,
  safety_notes: "",
  prevention_tips: "",
  status: "activa",
  notes: "",
});

const selectClassName =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

export function TroubleshootingGuideForm({
  editingGuide,
  onSubmit,
  onCancel,
}: TroubleshootingGuideFormProps) {
  const [formData, setFormData] = useState<GuideFormState>(createEmptyState());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stepsError, setStepsError] = useState<string | null>(null);

  useEffect(() => {
    setStepsError(null);

    if (!editingGuide) {
      setFormData(createEmptyState());
      return;
    }

    setFormData({
      code: editingGuide.code,
      title: editingGuide.title,
      category: editingGuide.category,
      symptom: editingGuide.symptom,
      probable_causes: editingGuide.probable_causes ?? "",
      // Siempre deja al menos un campo visible para editar.
      resolution_steps:
        editingGuide.resolution_steps.length > 0 ? [...editingGuide.resolution_steps] : [""],
      severity: editingGuide.severity,
      requires_workshop: editingGuide.requires_workshop,
      safety_notes: editingGuide.safety_notes ?? "",
      prevention_tips: editingGuide.prevention_tips ?? "",
      status: editingGuide.status,
      notes: editingGuide.notes ?? "",
    });
  }, [editingGuide]);

  const updateStep = (index: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      resolution_steps: prev.resolution_steps.map((step, position) =>
        position === index ? value : step
      ),
    }));
    setStepsError(null);
  };

  const addStep = () => {
    setFormData((prev) =>
      prev.resolution_steps.length >= TROUBLESHOOTING_LIMITS.maxSteps
        ? prev
        : { ...prev, resolution_steps: [...prev.resolution_steps, ""] }
    );
  };

  const removeStep = (index: number) => {
    setFormData((prev) => {
      const remaining = prev.resolution_steps.filter((_, position) => position !== index);
      return { ...prev, resolution_steps: remaining.length > 0 ? remaining : [""] };
    });
    setStepsError(null);
  };

  const moveStep = (index: number, direction: -1 | 1) => {
    setFormData((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.resolution_steps.length) return prev;

      const steps = [...prev.resolution_steps];
      [steps[index], steps[target]] = [steps[target], steps[index]];
      return { ...prev, resolution_steps: steps };
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const normalizedSteps = formData.resolution_steps.map((step) => step.trim()).filter(Boolean);

    if (normalizedSteps.length === 0) {
      setStepsError("Agrega al menos un paso de resolucion.");
      return;
    }

    if (normalizedSteps.length > TROUBLESHOOTING_LIMITS.maxSteps) {
      setStepsError(`El manual admite maximo ${TROUBLESHOOTING_LIMITS.maxSteps} pasos.`);
      return;
    }

    setStepsError(null);
    setIsSubmitting(true);

    try {
      const ok = await onSubmit({
        code: formData.code.trim().toUpperCase(),
        title: formData.title.trim(),
        category: formData.category.trim().toLowerCase(),
        symptom: formData.symptom.trim(),
        probable_causes: formData.probable_causes.trim() || null,
        resolution_steps: normalizedSteps,
        severity: formData.severity,
        requires_workshop: formData.requires_workshop,
        safety_notes: formData.safety_notes.trim() || null,
        prevention_tips: formData.prevention_tips.trim() || null,
        status: formData.status,
        notes: formData.notes.trim() || null,
      });

      if (ok && !editingGuide) {
        setFormData(createEmptyState());
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepsLimitReached = formData.resolution_steps.length >= TROUBLESHOOTING_LIMITS.maxSteps;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="guide-code">Codigo</Label>
          <Input
            id="guide-code"
            value={formData.code}
            onChange={(event) => setFormData((prev) => ({ ...prev, code: event.target.value }))}
            maxLength={TROUBLESHOOTING_LIMITS.code}
            placeholder="FAL-001"
            required
          />
          <p className="mt-1 text-xs text-secondary-dark">
            Identificador unico de la falla. Se guarda en mayusculas.
          </p>
        </div>
        <div>
          <Label htmlFor="guide-category">Categoria</Label>
          <Input
            id="guide-category"
            list="guide-category-suggestions"
            value={formData.category}
            onChange={(event) => setFormData((prev) => ({ ...prev, category: event.target.value }))}
            maxLength={TROUBLESHOOTING_LIMITS.category}
            placeholder="motor, frenos, sistema electrico..."
            required
          />
          <datalist id="guide-category-suggestions">
            {TROUBLESHOOTING_CATEGORY_SUGGESTIONS.map((suggestion) => (
              <option key={suggestion} value={suggestion}>
                {formatCategory(suggestion)}
              </option>
            ))}
          </datalist>
        </div>
      </div>

      <div>
        <Label htmlFor="guide-title">Titulo</Label>
        <Input
          id="guide-title"
          value={formData.title}
          onChange={(event) => setFormData((prev) => ({ ...prev, title: event.target.value }))}
          maxLength={TROUBLESHOOTING_LIMITS.title}
          placeholder="La unidad no enciende en frio"
          required
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="guide-severity">Severidad</Label>
          <select
            id="guide-severity"
            value={formData.severity}
            onChange={(event) =>
              setFormData((prev) => ({ ...prev, severity: event.target.value as GuideSeverity }))
            }
            className={selectClassName}
          >
            {GUIDE_SEVERITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="guide-status">Estado</Label>
          <select
            id="guide-status"
            value={formData.status}
            onChange={(event) =>
              setFormData((prev) => ({ ...prev, status: event.target.value as GuideStatus }))
            }
            className={selectClassName}
          >
            {GUIDE_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <Label htmlFor="guide-symptom">Sintoma</Label>
        <Textarea
          id="guide-symptom"
          value={formData.symptom}
          onChange={(event) => setFormData((prev) => ({ ...prev, symptom: event.target.value }))}
          maxLength={TROUBLESHOOTING_LIMITS.longText}
          rows={3}
          placeholder="Como se manifiesta la falla en la unidad"
          required
        />
      </div>

      <div>
        <Label htmlFor="guide-causes">Causas probables</Label>
        <Textarea
          id="guide-causes"
          value={formData.probable_causes}
          onChange={(event) =>
            setFormData((prev) => ({ ...prev, probable_causes: event.target.value }))
          }
          maxLength={TROUBLESHOOTING_LIMITS.longText}
          rows={3}
        />
      </div>

      <div className="rounded-lg border border-secondary-medium p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-medium text-primary-900">Pasos de resolucion</p>
            <p className="text-sm text-secondary-dark">
              En orden, tal como debe seguirlos el operador ({formData.resolution_steps.length}/
              {TROUBLESHOOTING_LIMITS.maxSteps}).
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addStep}
            disabled={stepsLimitReached}
            className="border-primary-200 text-primary hover:bg-primary-50"
          >
            <Plus className="h-4 w-4" />
            Agregar paso
          </Button>
        </div>

        <div className="mt-4 space-y-2">
          {formData.resolution_steps.map((step, index) => (
            <div key={index} className="flex items-start gap-2">
              <span className="mt-2 w-6 shrink-0 text-sm font-semibold text-primary-900">
                {index + 1}.
              </span>
              <Textarea
                value={step}
                onChange={(event) => updateStep(index, event.target.value)}
                rows={2}
                placeholder={`Paso ${index + 1}`}
                aria-label={`Paso ${index + 1}`}
              />
              {/* Controles compactos en fila: apilados alargaban demasiado cada paso. */}
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => moveStep(index, -1)}
                  disabled={index === 0}
                  aria-label={`Subir paso ${index + 1}`}
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => moveStep(index, 1)}
                  disabled={index === formData.resolution_steps.length - 1}
                  aria-label={`Bajar paso ${index + 1}`}
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 border-red-200 text-red-600 hover:bg-red-50"
                  onClick={() => removeStep(index)}
                  aria-label={`Eliminar paso ${index + 1}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {stepsError ? <p className="mt-2 text-sm text-red-600">{stepsError}</p> : null}
      </div>

      <div className="rounded-lg border border-secondary-medium p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-medium text-primary-900">Requiere taller</p>
            <p className="text-sm text-secondary-dark">
              Marcalo si la falla no puede resolverse en ruta y la unidad debe entrar a taller.
            </p>
          </div>
          <Switch
            checked={formData.requires_workshop}
            onCheckedChange={(checked) =>
              setFormData((prev) => ({ ...prev, requires_workshop: checked }))
            }
          />
        </div>
      </div>

      <div>
        <Label htmlFor="guide-safety">Notas de seguridad</Label>
        <Textarea
          id="guide-safety"
          value={formData.safety_notes}
          onChange={(event) =>
            setFormData((prev) => ({ ...prev, safety_notes: event.target.value }))
          }
          maxLength={TROUBLESHOOTING_LIMITS.longText}
          rows={3}
          placeholder="Precauciones antes de intervenir la unidad"
        />
      </div>

      <div>
        <Label htmlFor="guide-prevention">Recomendaciones de prevencion</Label>
        <Textarea
          id="guide-prevention"
          value={formData.prevention_tips}
          onChange={(event) =>
            setFormData((prev) => ({ ...prev, prevention_tips: event.target.value }))
          }
          maxLength={TROUBLESHOOTING_LIMITS.longText}
          rows={3}
          placeholder="Como evitar que la falla se repita"
        />
      </div>

      <div>
        <Label htmlFor="guide-notes">Notas</Label>
        <Textarea
          id="guide-notes"
          value={formData.notes}
          onChange={(event) => setFormData((prev) => ({ ...prev, notes: event.target.value }))}
          maxLength={TROUBLESHOOTING_LIMITS.longText}
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" className="bg-primary hover:bg-primary-600" disabled={isSubmitting}>
          {isSubmitting ? "Guardando..." : editingGuide ? "Actualizar" : "Crear"}
        </Button>
      </div>
    </form>
  );
}
