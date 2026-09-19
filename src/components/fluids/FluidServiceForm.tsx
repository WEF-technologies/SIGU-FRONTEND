import { useState } from "react";
import { VehiclePicker } from "@/components/shared/VehiclePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FluidProduct, Vehicle } from "@/types";
import { FLUID_TYPE_LABELS } from "./fluidConstants";
import { createDefaultServiceForm, FluidServiceFormValues } from "./fluidFormValues";

interface FluidServiceFormProps {
  vehicles: Vehicle[];
  products: FluidProduct[];
  isSaving: boolean;
  onSubmit: (values: FluidServiceFormValues) => void;
  onCancel: () => void;
}

export function FluidServiceForm({
  vehicles,
  products,
  isSaving,
  onSubmit,
  onCancel,
}: FluidServiceFormProps) {
  const [values, setValues] = useState<FluidServiceFormValues>(createDefaultServiceForm);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(values);
      }}
      className="space-y-4"
    >
      <div>
        <Label htmlFor="fluid-service-vehicle">Unidad</Label>
        <VehiclePicker
          id="fluid-service-vehicle"
          vehicles={vehicles}
          value={values.vehicle_id}
          onChange={(vehicleId) => setValues((prev) => ({ ...prev, vehicle_id: vehicleId }))}
        />
      </div>

      <div>
        <Label htmlFor="fluid-service-product">Producto</Label>
        <Select
          value={values.product_id}
          onValueChange={(value) => setValues((prev) => ({ ...prev, product_id: value }))}
        >
          <SelectTrigger id="fluid-service-product">
            <SelectValue placeholder="Selecciona producto" />
          </SelectTrigger>
          <SelectContent>
            {products.map((product) => (
              <SelectItem key={product.id} value={product.id}>
                {product.code} · {FLUID_TYPE_LABELS[product.fluid_type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div>
          <Label htmlFor="fluid-service-quantity">Cantidad (L)</Label>
          <Input
            id="fluid-service-quantity"
            type="number"
            min={0.01}
            step="0.01"
            value={values.quantity}
            onChange={(event) => setValues((prev) => ({ ...prev, quantity: event.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="fluid-service-odometer">Odómetro (km)</Label>
          <Input
            id="fluid-service-odometer"
            type="number"
            min={0}
            value={values.odometer_km}
            onChange={(event) => setValues((prev) => ({ ...prev, odometer_km: event.target.value }))}
            placeholder="Opcional"
          />
        </div>
        <div>
          <Label htmlFor="fluid-service-date">Fecha de servicio</Label>
          <Input
            id="fluid-service-date"
            type="date"
            value={values.serviced_at}
            onChange={(event) => setValues((prev) => ({ ...prev, serviced_at: event.target.value }))}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="fluid-service-notes">Notas</Label>
        <Textarea
          id="fluid-service-notes"
          rows={3}
          value={values.notes}
          onChange={(event) => setValues((prev) => ({ ...prev, notes: event.target.value }))}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Registrando..." : "Registrar"}
        </Button>
      </div>
    </form>
  );
}
