
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface SparePartRequestSubmission {
  code?: string;
  description: string;
  requestedBy: string;
  date: string;
  notes?: string;
  itemType: string;
  targetArea: string;
  targetReference?: string;
}

interface SparePartRequestFormProps {
  onSubmit: (request: SparePartRequestSubmission) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  initialValues?: Partial<SparePartRequestSubmission>;
}

export function SparePartRequestForm({
  onSubmit,
  onCancel,
  isSubmitting = false,
  initialValues,
}: SparePartRequestFormProps) {
  const [code, setCode] = useState(initialValues?.code ?? "");
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [requestedBy, setRequestedBy] = useState(initialValues?.requestedBy ?? "");
  const [requestDate, setRequestDate] = useState(
    initialValues?.date ?? new Date().toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState(initialValues?.notes ?? "");
  const [itemType, setItemType] = useState(initialValues?.itemType ?? "spare_part");
  const [targetArea, setTargetArea] = useState(initialValues?.targetArea ?? "general");
  const [targetReference, setTargetReference] = useState(initialValues?.targetReference ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedCode = code.trim();
    const normalizedItemType = itemType.trim();
    const normalizedTargetArea = targetArea.trim();

    if (!description.trim() || !requestedBy.trim() || !requestDate || !normalizedItemType || !normalizedTargetArea) {
      return;
    }

    onSubmit({
      ...(normalizedCode ? { code: normalizedCode.toUpperCase() } : {}),
      description: description.trim(),
      requestedBy: requestedBy.trim(),
      date: requestDate,
      notes: notes.trim() || undefined,
      itemType: normalizedItemType,
      targetArea: normalizedTargetArea,
      targetReference: targetReference.trim() || undefined,
    });
  };

  const isSubmitDisabled =
    !description.trim() ||
    !requestedBy.trim() ||
    !requestDate ||
    !itemType.trim() ||
    !targetArea.trim() ||
    isSubmitting;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl text-primary-900">Registrar solicitud</CardTitle>
        <p className="text-sm text-gray-600">
          Ingresa los datos del repuesto o insumo esencial que necesitas solicitar.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="code" className="text-sm font-medium text-gray-700">
              Código del repuesto
            </Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Ej: BRK-001, OIL-002..."
              className="mt-1"
            />
            <p className="mt-1 text-xs text-gray-500">
              Si lo indicas, el sistema intentara enlazarlo con inventario. Si no existe, la solicitud igual se registra.
            </p>
          </div>

          <div>
            <Label htmlFor="description" className="text-sm font-medium text-gray-700">
              Descripción del item <span className="text-red-500">*</span>
            </Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción detallada del repuesto o insumo..."
              className="mt-1"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="itemType" className="text-sm font-medium text-gray-700">
                Tipo de item <span className="text-red-500">*</span>
              </Label>
              <Input
                id="itemType"
                value={itemType}
                onChange={(e) => setItemType(e.target.value)}
                placeholder="Ej: spare_part"
                className="mt-1"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Usa <span className="font-medium">spare_part</span> para repuestos o el tipo que corresponda para otros insumos esenciales.
              </p>
            </div>

            <div>
              <Label htmlFor="targetArea" className="text-sm font-medium text-gray-700">
                Area destino <span className="text-red-500">*</span>
              </Label>
              <Input
                id="targetArea"
                value={targetArea}
                onChange={(e) => setTargetArea(e.target.value)}
                placeholder="Ej: general, taller, operaciones..."
                className="mt-1"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="targetReference" className="text-sm font-medium text-gray-700">
              Referencia destino (opcional)
            </Label>
            <Input
              id="targetReference"
              value={targetReference}
              onChange={(e) => setTargetReference(e.target.value)}
              placeholder="Ej: placa, contrato, ruta o identificador interno"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="requestedBy" className="text-sm font-medium text-gray-700">
              Solicitado por <span className="text-red-500">*</span>
            </Label>
            <Input
              id="requestedBy"
              value={requestedBy}
              onChange={(e) => setRequestedBy(e.target.value)}
              placeholder="Nombre de quien solicita"
              className="mt-1"
              required
            />
          </div>

          <div>
            <Label htmlFor="date" className="text-sm font-medium text-gray-700">
              Fecha de solicitud <span className="text-red-500">*</span>
            </Label>
            <Input
              id="date"
              type="date"
              value={requestDate}
              onChange={(e) => setRequestDate(e.target.value)}
              className="mt-1"
              required
            />
          </div>

          <div>
            <Label htmlFor="notes" className="text-sm font-medium text-gray-700">
              Notas adicionales (opcional)
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Información adicional sobre la solicitud, urgencia, etc..."
              rows={3}
              className="mt-1"
            />
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button 
              type="submit" 
              disabled={isSubmitDisabled}
              className="flex-1 bg-primary text-white hover:bg-primary/90"
            >
              {isSubmitting ? "Enviando..." : "Enviar Solicitud"}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              disabled={isSubmitting}
              className="flex-1 text-gray-700 border-gray-300 hover:bg-gray-50"
            >
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
