import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CreateFuelReadingPayload, FuelReadingUnit, FuelType, Vehicle } from "@/types";

const FUEL_TYPE_OPTIONS: Array<{ value: FuelType; label: string }> = [
  { value: "gasoil", label: "Gasoil" },
  { value: "gasolina", label: "Gasolina" },
];

const READING_UNIT_OPTIONS: Array<{ value: FuelReadingUnit; label: string }> = [
  { value: "liters", label: "Litros" },
  { value: "percent", label: "Porcentaje" },
];

const formSchema = z
  .object({
    vehicle_id: z.string().uuid("Selecciona una unidad valida."),
    fuel_type: z.enum(["gasoil", "gasolina"]),
    reading_value: z.number().min(0, "La lectura no puede ser negativa."),
    reading_unit: z.enum(["liters", "percent"]),
    observed_at: z.string().min(1, "La fecha y hora de observacion es requerida."),
    odometer_km: z.number().min(0, "Kilometraje no puede ser negativo.").optional(),
    notes: z.string().max(500, "Maximo 500 caracteres.").optional(),
  })
  .superRefine((data, ctx) => {
    if (data.reading_unit === "percent" && data.reading_value > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reading_value"],
        message: "Si la unidad es porcentaje, la lectura debe estar entre 0 y 100.",
      });
    }
  });

type FormData = z.infer<typeof formSchema>;

interface FuelReadingFormProps {
  vehicles: Vehicle[];
  onSubmit: (payload: CreateFuelReadingPayload) => Promise<boolean>;
  onCancel: () => void;
}

const toLocalDatetime = () => {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  const year = now.getFullYear();
  const month = pad(now.getMonth() + 1);
  const day = pad(now.getDate());
  const hours = pad(now.getHours());
  const minutes = pad(now.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const sanitizeOptionalText = (value?: string) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

export function FuelReadingForm({ vehicles, onSubmit, onCancel }: FuelReadingFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vehicle_id: "",
      fuel_type: "gasoil",
      reading_value: undefined,
      reading_unit: "liters",
      observed_at: toLocalDatetime(),
      odometer_km: undefined,
      notes: "",
    },
  });

  useEffect(() => {
    form.setValue("observed_at", toLocalDatetime());
  }, [form]);

  const readingUnit = form.watch("reading_unit");

  const handleSubmit = async (data: FormData) => {
    setIsSubmitting(true);

    try {
      const ok = await onSubmit({
        vehicle_id: data.vehicle_id,
        fuel_type: data.fuel_type,
        reading_value: data.reading_value,
        reading_unit: data.reading_unit,
        observed_at: new Date(data.observed_at).toISOString(),
        odometer_km: data.odometer_km,
        notes: sanitizeOptionalText(data.notes),
      });

      if (ok) {
        form.reset({
          vehicle_id: "",
          fuel_type: "gasoil",
          reading_value: undefined,
          reading_unit: "liters",
          observed_at: toLocalDatetime(),
          odometer_km: undefined,
          notes: "",
        });
      }

      return ok;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="vehicle_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unidad</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar unidad" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {vehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
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
            name="fuel_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de combustible</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {FUEL_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="reading_unit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unidad de lectura</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar unidad" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {READING_UNIT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
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
            name="reading_value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{readingUnit === "percent" ? "Valor (%)" : "Valor (L)"}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0"
                    value={field.value ?? ""}
                    onChange={(event) =>
                      field.onChange(event.target.value === "" ? undefined : Number(event.target.value))
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="odometer_km"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Kilometraje (opcional)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="1"
                    placeholder="0"
                    value={field.value ?? ""}
                    onChange={(event) =>
                      field.onChange(event.target.value === "" ? undefined : Number(event.target.value))
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="observed_at"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fecha y hora de observacion</FormLabel>
              <FormControl>
                <Input type="datetime-local" value={field.value} onChange={field.onChange} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notas (opcional)</FormLabel>
              <FormControl>
                <Textarea rows={3} placeholder="Observaciones" {...field} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={isSubmitting} className="flex-1">
            {isSubmitting ? "Guardando..." : "Registrar lectura"}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Cancelar
          </Button>
        </div>
      </form>
    </Form>
  );
}
