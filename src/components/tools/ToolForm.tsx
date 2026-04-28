import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tool, ToolPayload, ToolStatus } from "@/types";

const toolStatuses: Array<{ value: ToolStatus; label: string }> = [
  { value: "disponible", label: "Disponible" },
  { value: "en_uso", label: "En uso" },
  { value: "en_mantenimiento", label: "En mantenimiento" },
  { value: "retirada", label: "Retirada" },
];

const formSchema = z
  .object({
    code: z.string().trim().min(1, "El código es requerido"),
    name: z.string().trim().min(1, "El nombre es requerido"),
    category: z.string().trim().min(1, "La categoría es requerida"),
    location: z.string().trim().min(1, "La ubicación es requerida"),
    status: z.enum(["disponible", "en_uso", "en_mantenimiento", "retirada"]),
    assigned_to: z.string().optional(),
    purchase_date: z.string().optional(),
    expiry_date: z.string().optional(),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.purchase_date || !data.expiry_date) return;
    const purchaseDate = new Date(data.purchase_date);
    const expiryDate = new Date(data.expiry_date);

    if (expiryDate.getTime() < purchaseDate.getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["expiry_date"],
        message: "La fecha de vencimiento no puede ser menor a la fecha de compra.",
      });
    }
  });

type FormData = z.infer<typeof formSchema>;

interface ToolFormProps {
  editingTool?: Tool | null;
  onSubmit: (payload: ToolPayload) => Promise<boolean>;
  onCancel: () => void;
}

const sanitizeOptional = (value?: string) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

export function ToolForm({ editingTool, onSubmit, onCancel }: ToolFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: "",
      name: "",
      category: "",
      location: "",
      status: "disponible",
      assigned_to: "",
      purchase_date: "",
      expiry_date: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (!editingTool) return;

    form.reset({
      code: editingTool.code,
      name: editingTool.name,
      category: editingTool.category,
      location: editingTool.location,
      status: editingTool.status,
      assigned_to: editingTool.assigned_to || "",
      purchase_date: editingTool.purchase_date || "",
      expiry_date: editingTool.expiry_date || "",
      notes: editingTool.notes || "",
    });
  }, [editingTool, form]);

  const handleSubmit = async (data: FormData) => {
    const payload: ToolPayload = {
      code: data.code.trim(),
      name: data.name.trim(),
      category: data.category.trim(),
      location: data.location.trim(),
      status: data.status,
      assigned_to: sanitizeOptional(data.assigned_to),
      purchase_date: sanitizeOptional(data.purchase_date),
      expiry_date: sanitizeOptional(data.expiry_date),
      notes: sanitizeOptional(data.notes),
    };

    setIsSubmitting(true);
    try {
      const ok = await onSubmit(payload);
      if (ok && !editingTool) {
        form.reset();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Código</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: EXT-001" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: Extintor ABC 10lb" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoría</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: Seguridad" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ubicación</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: Taller principal" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estado</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar estado" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {toolStatuses.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="assigned_to"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Asignada a (opcional)</FormLabel>
                <FormControl>
                  <Input placeholder="Nombre del responsable" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="purchase_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha de compra (opcional)</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="expiry_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha de vencimiento (opcional)</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notas</FormLabel>
              <FormControl>
                <Textarea placeholder="Observaciones sobre la herramienta" rows={3} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={isSubmitting} className="flex-1">
            {isSubmitting ? "Guardando..." : editingTool ? "Actualizar" : "Crear"}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Cancelar
          </Button>
        </div>
      </form>
    </Form>
  );
}
