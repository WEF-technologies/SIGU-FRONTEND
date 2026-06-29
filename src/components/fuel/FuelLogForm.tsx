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
import { CreateFuelLogPayload, FuelType, Vehicle } from "@/types";

const FUEL_TYPE_OPTIONS: Array<{ value: FuelType; label: string }> = [
  { value: "gasoil", label: "Gasoil" },
  { value: "gasolina", label: "Gasolina" },
];

const formSchema = z.object({
  vehicle_id: z.string().uuid("Selecciona una unidad valida."),
  fuel_type: z.enum(["gasoil", "gasolina"]),
  liters: z.number().positive("Litros debe ser mayor que 0."),
  total_cost: z.number().min(0, "Costo total no puede ser negativo."),
  fueled_at: z.string().min(1, "La fecha y hora de carga es requerida."),
  odometer_km: z.number().min(0, "Kilometraje no puede ser negativo.").optional(),
  station: z.string().max(120, "Maximo 120 caracteres.").optional(),
  notes: z.string().max(500, "Maximo 500 caracteres.").optional(),
});

type FormData = z.infer<typeof formSchema>;

interface FuelLogFormProps {
  vehicles: Vehicle[];
  onSubmit: (payload: CreateFuelLogPayload) => Promise<boolean>;
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

export function FuelLogForm({ vehicles, onSubmit, onCancel }: FuelLogFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vehicle_id: "",
      fuel_type: "gasoil",
      liters: undefined,
      total_cost: undefined,
      fueled_at: toLocalDatetime(),
      odometer_km: undefined,
      station: "",
      notes: "",
    },
  });

  useEffect(() => {
    form.setValue("fueled_at", toLocalDatetime());
  }, [form]);

  const handleSubmit = async (data: FormData) => {
    setIsSubmitting(true);

    try {
      const ok = await onSubmit({
        vehicle_id: data.vehicle_id,
        fuel_type: data.fuel_type,
        liters: data.liters,
        total_cost: data.total_cost,
        fueled_at: new Date(data.fueled_at).toISOString(),
        odometer_km: data.odometer_km,
        station: sanitizeOptionalText(data.station),
        notes: sanitizeOptionalText(data.notes),
      });

      if (ok) {
        form.reset({
          vehicle_id: "",
          fuel_type: "gasoil",
          liters: undefined,
          total_cost: undefined,
          fueled_at: toLocalDatetime(),
          odometer_km: undefined,
          station: "",
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
            name="liters"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Litros</FormLabel>
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
            name="total_cost"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Costo total</FormLabel>
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
          name="fueled_at"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fecha y hora de carga</FormLabel>
              <FormControl>
                <Input type="datetime-local" value={field.value} onChange={field.onChange} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="station"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estacion (opcional)</FormLabel>
                <FormControl>
                  <Input placeholder="Nombre de la estacion" {...field} value={field.value ?? ""} />
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
                  <Textarea rows={2} placeholder="Observaciones" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={isSubmitting} className="flex-1">
            {isSubmitting ? "Guardando..." : "Registrar carga"}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Cancelar
          </Button>
        </div>
      </form>
    </Form>
  );
}
