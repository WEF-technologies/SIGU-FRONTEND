import { useEffect, useState } from "react";
import { MultiSelect } from "@/components/contracts/MultiSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Supplier, SupplierPayload, SUPPLIER_CATEGORY_OPTIONS } from "@/types";

interface SupplierFormProps {
  editingSupplier?: Supplier | null;
  onSubmit: (payload: SupplierPayload) => Promise<boolean>;
  onCancel: () => void;
}

interface SupplierFormState {
  name: string;
  address: string;
  contact_phone: string;
  email: string;
  location: string;
  status: string;
  categories: string[];
  destacado: boolean;
  description: string;
  delivery_time_notes: string;
  notes: string;
}

const createEmptyState = (): SupplierFormState => ({
  name: "",
  address: "",
  contact_phone: "",
  email: "",
  location: "",
  status: "active",
  categories: [],
  destacado: false,
  description: "",
  delivery_time_notes: "",
  notes: "",
});

export function SupplierForm({ editingSupplier, onSubmit, onCancel }: SupplierFormProps) {
  const [formData, setFormData] = useState<SupplierFormState>(createEmptyState());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  useEffect(() => {
    if (!editingSupplier) {
      setFormData(createEmptyState());
      setCategoryError(null);
      return;
    }

    setCategoryError(null);
    setFormData({
      name: editingSupplier.name,
      address: editingSupplier.address ?? "",
      contact_phone: editingSupplier.contact_phone ?? "",
      email: editingSupplier.email ?? "",
      location: editingSupplier.location ?? "",
      status: editingSupplier.status ?? "active",
      categories: editingSupplier.categories ?? [],
      destacado: editingSupplier.destacado,
      description: editingSupplier.description ?? "",
      delivery_time_notes: editingSupplier.delivery_time_notes ?? "",
      notes: editingSupplier.notes ?? "",
    });
  }, [editingSupplier]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const normalizedCategories = Array.from(
      new Set(formData.categories.map((category) => category.trim()).filter(Boolean))
    );

    if (normalizedCategories.length === 0) {
      setCategoryError("Selecciona al menos una categoria.");
      return;
    }

    setCategoryError(null);
    setIsSubmitting(true);

    try {
      const ok = await onSubmit({
        name: formData.name.trim(),
        address: formData.address.trim(),
        contact_phone: formData.contact_phone.trim(),
        email: formData.email.trim() || null,
        location: formData.location.trim(),
        status: formData.status.trim() || "active",
        categories: normalizedCategories,
        destacado: formData.destacado,
        description: formData.description.trim() || null,
        delivery_time_notes: formData.delivery_time_notes.trim() || null,
        notes: formData.notes.trim() || null,
      });

      if (ok && !editingSupplier) {
        setFormData(createEmptyState());
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="supplier-name">Nombre</Label>
          <Input
            id="supplier-name"
            value={formData.name}
            onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="supplier-status">Estado</Label>
          <Input
            id="supplier-status"
            value={formData.status}
            onChange={(event) => setFormData((prev) => ({ ...prev, status: event.target.value }))}
            placeholder="active"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="supplier-address">Direccion</Label>
          <Input
            id="supplier-address"
            value={formData.address}
            onChange={(event) => setFormData((prev) => ({ ...prev, address: event.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="supplier-location">Ubicacion</Label>
          <Input
            id="supplier-location"
            value={formData.location}
            onChange={(event) => setFormData((prev) => ({ ...prev, location: event.target.value }))}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="supplier-phone">Telefono de contacto</Label>
          <Input
            id="supplier-phone"
            type="tel"
            value={formData.contact_phone}
            onChange={(event) => setFormData((prev) => ({ ...prev, contact_phone: event.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="supplier-email">Correo</Label>
          <Input
            id="supplier-email"
            type="email"
            value={formData.email}
            onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="supplier-description">Descripcion</Label>
        <Textarea
          id="supplier-description"
          value={formData.description}
          onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
          rows={3}
        />
      </div>

      <div>
        <Label htmlFor="supplier-delivery-notes">Notas de entrega</Label>
        <Textarea
          id="supplier-delivery-notes"
          value={formData.delivery_time_notes}
          onChange={(event) => setFormData((prev) => ({ ...prev, delivery_time_notes: event.target.value }))}
          rows={3}
        />
      </div>

      <div className="rounded-lg border border-secondary-medium p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-medium text-primary-900">Proveedor destacado</p>
            <p className="text-sm text-secondary-dark">Se incluira en el listado rapido de proveedores priorizados.</p>
          </div>
          <Switch
            checked={formData.destacado}
            onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, destacado: checked }))}
          />
        </div>
      </div>

      <MultiSelect
        title="Categorias"
        options={SUPPLIER_CATEGORY_OPTIONS.map((option) => ({
          id: option.value,
          label: option.label,
        }))}
        selectedIds={formData.categories}
        onSelectionChange={(categories) => {
          setFormData((prev) => ({ ...prev, categories }));
          if (categories.length > 0) {
            setCategoryError(null);
          }
        }}
        placeholder="Buscar categoria..."
      />
      {categoryError ? <p className="text-sm text-red-600">{categoryError}</p> : null}

      <div>
        <Label htmlFor="supplier-notes">Notas</Label>
        <Textarea
          id="supplier-notes"
          value={formData.notes}
          onChange={(event) => setFormData((prev) => ({ ...prev, notes: event.target.value }))}
          rows={4}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" className="bg-primary hover:bg-primary-600" disabled={isSubmitting}>
          {isSubmitting ? "Guardando..." : editingSupplier ? "Actualizar" : "Crear"}
        </Button>
      </div>
    </form>
  );
}