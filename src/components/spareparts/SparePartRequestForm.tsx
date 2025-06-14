
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
}

export function SparePartRequestForm({ onSubmit, onCancel }: SparePartRequestFormProps) {
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [requestedBy, setRequestedBy] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code.trim() || !description.trim() || !requestedBy.trim()) {
      return;
    }

    onSubmit({
      code: code.trim(),
      description: description.trim(),
      requestedBy: requestedBy.trim(),
      date: new Date().toISOString().split('T')[0],
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
              onChange={(e) => setCode(e.target.value)}
              placeholder="Ej: BRK-001, OIL-002..."
              className="mt-1"
              required
            />
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
              value={new Date().toISOString().split('T')[0]}
              readOnly
              className="bg-gray-50 mt-1"
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
              disabled={!code.trim() || !description.trim() || !requestedBy.trim()}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              Enviar Solicitud
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              className="flex-1"
            >
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
