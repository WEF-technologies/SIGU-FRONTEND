import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { VehiclePart, Vehicle } from "@/types";

const formSchema = z.object({
  vehicle_plate: z.string().min(1, "Selecciona un vehículo"),
  type: z.string().min(1, "El tipo es requerido"),
  code: z.string().min(1, "El código es requerido"),
  serial_number: z.string().optional(),
  position: z.string().optional(),
  installed_date: z.string().min(1, "La fecha de instalación es requerida"),
  installed_kilometers: z.number().min(0).optional(),
  life_kilometers: z.number().min(0).optional(),
  expiry_date: z.string().optional(),
  status: z.enum(["active", "removed", "maintenance"]).default("active"),
  removed_date: z.string().optional(),
  removed_kilometers: z.number().min(0).optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface VehiclePartFormProps {
  editingPart?: VehiclePart | null;
  vehicles: Vehicle[];
  onSubmit: (data: FormData) => Promise<void>;
  onCancel: () => void;
}

const partTypes = [
  "Llantas",
  "Frenos",
  "Filtros",
  "Aceite",
  "Batería",
  "Amortiguadores",
  "Correa",
  "Embrague",
  "Motor",
  "Transmisión",
  "Otro"
];

export function VehiclePartForm({ editingPart, vehicles, onSubmit, onCancel }: VehiclePartFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vehicle_plate: "",
      type: "",
      code: "",
      serial_number: "",
      position: "",
      installed_date: "",
      installed_kilometers: undefined,
      life_kilometers: undefined,
      expiry_date: "",
      status: "active",
      removed_date: "",
      removed_kilometers: undefined,
      notes: "",
    },
  });

  useEffect(() => {
    if (editingPart) {
      form.reset({
        vehicle_plate: editingPart.vehicle_plate,
        type: editingPart.type,
        code: editingPart.code,
        serial_number: editingPart.serial_number || "",
        position: editingPart.position || "",
        installed_date: editingPart.installed_date,
        installed_kilometers: editingPart.installed_kilometers || undefined,
        life_kilometers: editingPart.life_kilometers || undefined,
        expiry_date: editingPart.expiry_date || "",
        status: editingPart.status,
        removed_date: editingPart.removed_date || "",
        removed_kilometers: editingPart.removed_kilometers || undefined,
        notes: editingPart.notes || "",
      });
    }
  }, [editingPart, form]);

  const handleSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
      if (!editingPart) {
        form.reset();
      }
    } catch (error) {
      console.error("Error submitting form:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const watchStatus = form.watch("status");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="vehicle_plate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vehículo</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar vehículo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {vehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.plate_number}>
                        {vehicle.plate_number} - {vehicle.brand} {vehicle.model}
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
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Parte</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {partTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Código</FormLabel>
                <FormControl>
                  <Input placeholder="Código de la parte" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="serial_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Número de Serie</FormLabel>
                <FormControl>
                  <Input placeholder="Número de serie" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="position"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Posición</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: Delantero izquierdo" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estado</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="maintenance">Mantenimiento</SelectItem>
                    <SelectItem value="removed">Removido</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="installed_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha de Instalación</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="installed_kilometers"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Kilómetros de Instalación</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="0"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="life_kilometers"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vida Útil (km)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="0"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
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
                <FormLabel>Fecha de Vencimiento</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {watchStatus === "removed" && (
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="removed_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha de Remoción</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="removed_kilometers"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kilómetros de Remoción</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="0"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notas</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Observaciones adicionales..."
                  className="resize-none"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={isSubmitting} className="flex-1">
            {isSubmitting ? "Guardando..." : editingPart ? "Actualizar" : "Crear"}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Cancelar
          </Button>
        </div>
      </form>
    </Form>
  );
}