import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DotationStaffMember, DotationStaffMemberPayload } from "@/types";

interface DotationStaffFormProps {
  editingStaffMember?: DotationStaffMember | null;
  onSubmit: (payload: DotationStaffMemberPayload) => Promise<boolean>;
  onCancel: () => void;
}

interface StaffFormState {
  name: string;
  last_name: string;
  document_number: string;
  department: string;
  position: string;
  status: string;
  hire_date: string;
  notes: string;
}

const createEmptyState = (): StaffFormState => ({
  name: "",
  last_name: "",
  document_number: "",
  department: "",
  position: "",
  status: "active",
  hire_date: "",
  notes: "",
});

export function DotationStaffForm({ editingStaffMember, onSubmit, onCancel }: DotationStaffFormProps) {
  const [formData, setFormData] = useState<StaffFormState>(createEmptyState());
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!editingStaffMember) {
      setFormData(createEmptyState());
      return;
    }

    setFormData({
      name: editingStaffMember.name,
      last_name: editingStaffMember.last_name,
      document_number: editingStaffMember.document_number,
      department: editingStaffMember.department ?? "",
      position: editingStaffMember.position ?? "",
      status: editingStaffMember.status ?? "active",
      hire_date: editingStaffMember.hire_date ?? "",
      notes: editingStaffMember.notes ?? "",
    });
  }, [editingStaffMember]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const ok = await onSubmit({
        name: formData.name.trim(),
        last_name: formData.last_name.trim(),
        document_number: formData.document_number.trim(),
        department: formData.department.trim() || null,
        position: formData.position.trim() || null,
        status: formData.status.trim() || null,
        hire_date: formData.hire_date || null,
        notes: formData.notes.trim() || null,
      });

      if (ok && !editingStaffMember) {
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
          <Label htmlFor="staff-name">Nombre</Label>
          <Input
            id="staff-name"
            value={formData.name}
            onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="staff-last-name">Apellido</Label>
          <Input
            id="staff-last-name"
            value={formData.last_name}
            onChange={(event) => setFormData((prev) => ({ ...prev, last_name: event.target.value }))}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="staff-document">Documento</Label>
          <Input
            id="staff-document"
            value={formData.document_number}
            onChange={(event) => setFormData((prev) => ({ ...prev, document_number: event.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="staff-status">Estado</Label>
          <Input
            id="staff-status"
            value={formData.status}
            onChange={(event) => setFormData((prev) => ({ ...prev, status: event.target.value }))}
            placeholder="active"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="staff-department">Departamento</Label>
          <Input
            id="staff-department"
            value={formData.department}
            onChange={(event) => setFormData((prev) => ({ ...prev, department: event.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="staff-position">Cargo</Label>
          <Input
            id="staff-position"
            value={formData.position}
            onChange={(event) => setFormData((prev) => ({ ...prev, position: event.target.value }))}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="staff-hire-date">Fecha de ingreso</Label>
        <Input
          id="staff-hire-date"
          type="date"
          value={formData.hire_date}
          onChange={(event) => setFormData((prev) => ({ ...prev, hire_date: event.target.value }))}
        />
      </div>

      <div>
        <Label htmlFor="staff-notes">Notas</Label>
        <Textarea
          id="staff-notes"
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
          {isSubmitting ? "Guardando..." : editingStaffMember ? "Actualizar" : "Crear"}
        </Button>
      </div>
    </form>
  );
}