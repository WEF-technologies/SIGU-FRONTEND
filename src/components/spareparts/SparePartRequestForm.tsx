
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SparePart } from "@/types";

interface SparePartRequestFormProps {
  spareParts: SparePart[];
  onSubmit: (request: {
    sparePartId: string;
    code: string;
    description: string;
    requestedBy: string;
    date: string;
    notes?: string;
  }) => void;
  onCancel: () => void;
}

export function SparePartRequestForm({ spareParts, onSubmit, onCancel }: SparePartRequestFormProps) {
  const [selectedSparePartId, setSelectedSparePartId] = useState("");
  const [requestedBy, setRequestedBy] = useState("");
  const [notes, setNotes] = useState("");

  const selectedSparePart = spareParts.find(sp => sp.id === selectedSparePartId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedSparePart || !requestedBy.trim()) {
      return;
    }

    onSubmit({
      sparePartId: selectedSparePart.id,
      code: selectedSparePart.code,
      description: selectedSparePart.description,
      requestedBy: requestedBy.trim(),
      date: new Date().toISOString().split('T')[0],
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Solicitar Repuesto</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="sparePart">Repuesto</Label>
            <select
              id="sparePart"
              value={selectedSparePartId}
              onChange={(e) => setSelectedSparePartId(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
              required
            >
              <option value="">Seleccionar repuesto...</option>
              {spareParts.map((sparePart) => (
                <option key={sparePart.id} value={sparePart.id}>
                  {sparePart.code} - {sparePart.description}
                </option>
              ))}
            </select>
          </div>

          {selectedSparePart && (
            <div className="p-3 bg-gray-50 rounded-md">
              <p><strong>Código:</strong> {selectedSparePart.code}</p>
              <p><strong>Descripción:</strong> {selectedSparePart.description}</p>
              <p><strong>Stock actual:</strong> {selectedSparePart.quantity} unidades</p>
            </div>
          )}

          <div>
            <Label htmlFor="requestedBy">Solicitado por</Label>
            <Input
              id="requestedBy"
              value={requestedBy}
              onChange={(e) => setRequestedBy(e.target.value)}
              placeholder="Nombre de quien solicita"
              required
            />
          </div>

          <div>
            <Label htmlFor="date">Fecha de solicitud</Label>
            <Input
              id="date"
              type="date"
              value={new Date().toISOString().split('T')[0]}
              readOnly
              className="bg-gray-100"
            />
          </div>

          <div>
            <Label htmlFor="notes">Notas adicionales (opcional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Información adicional sobre la solicitud..."
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={!selectedSparePart || !requestedBy.trim()}>
              Enviar Solicitud
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
