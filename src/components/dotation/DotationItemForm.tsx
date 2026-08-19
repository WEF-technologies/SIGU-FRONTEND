import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DotationItem, DotationItemPayload } from "@/types";

interface DotationItemFormProps {
  editingItem?: DotationItem | null;
  onSubmit: (payload: DotationItemPayload) => Promise<boolean>;
  onCancel: () => void;
}

interface ItemFormState {
  code: string;
  name: string;
  category: string;
  renewal_months: string;
  status: string;
  description: string;
}

const createEmptyState = (): ItemFormState => ({
  code: "",
  name: "",
  category: "",
  renewal_months: "12",
  status: "active",
  description: "",
});

export function DotationItemForm({ editingItem, onSubmit, onCancel }: DotationItemFormProps) {
  const [formData, setFormData] = useState<ItemFormState>(createEmptyState());
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!editingItem) {
      setFormData(createEmptyState());
      return;
    }

    setFormData({
      code: editingItem.code,
      name: editingItem.name,
      category: editingItem.category,
      renewal_months: String(editingItem.renewal_months),
      status: editingItem.status ?? "active",
      description: editingItem.description ?? "",
    });
  }, [editingItem]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const ok = await onSubmit({
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim(),
        category: formData.category.trim(),
        renewal_months: Math.max(1, Number.parseInt(formData.renewal_months, 10) || 1),
        status: formData.status.trim() || null,
        description: formData.description.trim() || null,
      });

      if (ok && !editingItem) {
        setFormData(createEmptyState());
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="item-code">Código</Label>
          <Input
            id="item-code"
            value={formData.code}
            onChange={(event) => setFormData((prev) => ({ ...prev, code: event.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="item-name">Nombre</Label>
          <Input
            id="item-name"
            value={formData.name}
            onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="item-category">Categoría</Label>
          <Input
            id="item-category"
            value={formData.category}
            onChange={(event) => setFormData((prev) => ({ ...prev, category: event.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="item-renewal">Meses de renovación</Label>
          <Input
            id="item-renewal"
            type="number"
            min="1"
            value={formData.renewal_months}
            onChange={(event) => setFormData((prev) => ({ ...prev, renewal_months: event.target.value }))}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="item-status">Estado</Label>
        <Input
          id="item-status"
          value={formData.status}
          onChange={(event) => setFormData((prev) => ({ ...prev, status: event.target.value }))}
          placeholder="active"
        />
      </div>

      <div>
        <Label htmlFor="item-description">Descripción</Label>
        <Textarea
          id="item-description"
          value={formData.description}
          onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
          rows={4}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" className="bg-primary hover:bg-primary-600" disabled={isSubmitting}>
          {isSubmitting ? "Guardando..." : editingItem ? "Actualizar" : "Crear"}
        </Button>
      </div>
    </form>
  );
}