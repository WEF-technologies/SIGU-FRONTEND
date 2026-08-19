import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DotationDeliveryPayload, DotationItem, DotationStaffMember } from "@/types";

interface DotationDeliveryFormProps {
  staffMembers: DotationStaffMember[];
  items: DotationItem[];
  onSubmit: (payload: DotationDeliveryPayload) => Promise<boolean>;
  onCancel: () => void;
}

interface DeliveryFormState {
  staff_member_id: string;
  dotation_item_id: string;
  delivered_at: string;
  quantity: string;
  delivered_by: string;
  notes: string;
}

const today = new Date().toISOString().slice(0, 10);

const createEmptyState = (): DeliveryFormState => ({
  staff_member_id: "",
  dotation_item_id: "",
  delivered_at: today,
  quantity: "1",
  delivered_by: "",
  notes: "",
});

export function DotationDeliveryForm({ staffMembers, items, onSubmit, onCancel }: DotationDeliveryFormProps) {
  const [formData, setFormData] = useState<DeliveryFormState>(createEmptyState());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const staffOptions = useMemo(
    () =>
      [...staffMembers].sort((left, right) =>
        `${left.name} ${left.last_name}`.localeCompare(`${right.name} ${right.last_name}`, "es", {
          sensitivity: "base",
        })
      ),
    [staffMembers]
  );

  const itemOptions = useMemo(
    () =>
      [...items].sort((left, right) => left.name.localeCompare(right.name, "es", { sensitivity: "base" })),
    [items]
  );

  const selectedItem = useMemo(
    () => itemOptions.find((item) => item.id === formData.dotation_item_id) ?? null,
    [formData.dotation_item_id, itemOptions]
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const ok = await onSubmit({
        staff_member_id: formData.staff_member_id,
        dotation_item_id: formData.dotation_item_id,
        delivered_at: formData.delivered_at,
        quantity: Math.max(1, Number.parseInt(formData.quantity, 10) || 1),
        delivered_by: formData.delivered_by.trim() || null,
        notes: formData.notes.trim() || null,
      });

      if (ok) {
        setFormData(createEmptyState());
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDisabled = isSubmitting || staffOptions.length === 0 || itemOptions.length === 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {staffOptions.length === 0 || itemOptions.length === 0 ? (
        <div className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
          Debes tener personal y catálogo cargados para registrar una entrega.
        </div>
      ) : null}

      <div>
        <Label htmlFor="delivery-staff">Personal</Label>
        <Select
          value={formData.staff_member_id || undefined}
          onValueChange={(value) => setFormData((prev) => ({ ...prev, staff_member_id: value }))}
          disabled={isSubmitting || staffOptions.length === 0}
        >
          <SelectTrigger id="delivery-staff">
            <SelectValue placeholder="Selecciona el personal" />
          </SelectTrigger>
          <SelectContent>
            {staffOptions.map((staffMember) => (
              <SelectItem key={staffMember.id} value={staffMember.id}>
                {staffMember.name} {staffMember.last_name} · {staffMember.document_number}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="delivery-item">Item</Label>
        <Select
          value={formData.dotation_item_id || undefined}
          onValueChange={(value) => setFormData((prev) => ({ ...prev, dotation_item_id: value }))}
          disabled={isSubmitting || itemOptions.length === 0}
        >
          <SelectTrigger id="delivery-item">
            <SelectValue placeholder="Selecciona el item" />
          </SelectTrigger>
          <SelectContent>
            {itemOptions.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.name} · {item.code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedItem ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Renovación configurada: {selectedItem.renewal_months} mes{selectedItem.renewal_months !== 1 ? "es" : ""}.
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="delivery-date">Fecha de entrega</Label>
          <Input
            id="delivery-date"
            type="date"
            value={formData.delivered_at}
            onChange={(event) => setFormData((prev) => ({ ...prev, delivered_at: event.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="delivery-quantity">Cantidad</Label>
          <Input
            id="delivery-quantity"
            type="number"
            min="1"
            value={formData.quantity}
            onChange={(event) => setFormData((prev) => ({ ...prev, quantity: event.target.value }))}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="delivery-by">Entregado por</Label>
        <Input
          id="delivery-by"
          value={formData.delivered_by}
          onChange={(event) => setFormData((prev) => ({ ...prev, delivered_by: event.target.value }))}
        />
      </div>

      <div>
        <Label htmlFor="delivery-notes">Notas</Label>
        <Textarea
          id="delivery-notes"
          value={formData.notes}
          onChange={(event) => setFormData((prev) => ({ ...prev, notes: event.target.value }))}
          rows={4}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" className="bg-primary hover:bg-primary-600" disabled={isDisabled}>
          {isSubmitting ? "Guardando..." : "Registrar entrega"}
        </Button>
      </div>
    </form>
  );
}