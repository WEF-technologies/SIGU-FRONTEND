
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SparePartRequestFormProps {
  onSubmit: (request: {
    code: string;
    description: string;
    requestedBy: string;
    date: string;
    notes?: string;
  }) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function SparePartRequestForm({ onSubmit, onCancel, isSubmitting = false }: SparePartRequestFormProps) {
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [requestedBy, setRequestedBy] = useState("");
  const [requestDate, setRequestDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!code.trim() || !description.trim() || !requestedBy.trim() || !requestDate) {
      return;
    }

    onSubmit({
      code: code.trim().toUpperCase(),
      description: description.trim(),
      requestedBy: requestedBy.trim(),
      date: requestDate,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl text-primary-900">Solicitar Repuesto</CardTitle>
        <p className="text-sm text-gray-600">Ingresa los datos del repuesto que necesitas solicitar</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="code" className="text-sm font-medium text-gray-700">
              Código del repuesto <span className="text-red-500">*</span>
            </Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Ej: BRK-001, OIL-002..."
              className="mt-1"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              El código debe existir en el inventario para que el backend acepte la solicitud.
            </p>
          </div>

          <div>
            <Label htmlFor="description" className="text-sm font-medium text-gray-700">
              Descripción del repuesto <span className="text-red-500">*</span>
            </Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción detallada del repuesto..."
              className="mt-1"
              required
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
              Fecha de solicitud
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
              disabled={!code.trim() || !description.trim() || !requestedBy.trim() || !requestDate || isSubmitting}
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
