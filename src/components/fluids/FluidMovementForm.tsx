import { useState } from "react";
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
import { FluidProduct } from "@/types";
import { FLUID_TYPE_LABELS, ManualFluidMovementType, MOVEMENT_OPTIONS } from "./fluidConstants";
import { createDefaultMovementForm, FluidMovementFormValues } from "./fluidFormValues";

interface FluidMovementFormProps {
  products: FluidProduct[];
  isSaving: boolean;
  onSubmit: (values: FluidMovementFormValues) => void;
  onCancel: () => void;
}

export function FluidMovementForm({
  products,
  isSaving,
  onSubmit,
  onCancel,
}: FluidMovementFormProps) {
  const [values, setValues] = useState<FluidMovementFormValues>(createDefaultMovementForm);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(values);
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <Label htmlFor="fluid-movement-product">Producto</Label>
          <Select
            value={values.product_id}
            onValueChange={(value) => setValues((prev) => ({ ...prev, product_id: value }))}
          >
            <SelectTrigger id="fluid-movement-product">
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
        <div>
          <Label htmlFor="fluid-movement-type">Tipo de movimiento</Label>
          <Select
            value={values.movement_type}
            onValueChange={(value) =>
              setValues((prev) => ({ ...prev, movement_type: value as ManualFluidMovementType }))
            }
          >
            <SelectTrigger id="fluid-movement-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MOVEMENT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <Label htmlFor="fluid-movement-quantity">Cantidad</Label>
          <Input
            id="fluid-movement-quantity"
            type="number"
            min={0.01}
            step="0.01"
            value={values.quantity}
            onChange={(event) => setValues((prev) => ({ ...prev, quantity: event.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="fluid-movement-date">Fecha</Label>
          <Input
            id="fluid-movement-date"
            type="date"
            value={values.occurred_at}
            onChange={(event) => setValues((prev) => ({ ...prev, occurred_at: event.target.value }))}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="fluid-movement-reference">Referencia</Label>
        <Input
          id="fluid-movement-reference"
          value={values.reference}
          onChange={(event) => setValues((prev) => ({ ...prev, reference: event.target.value }))}
          placeholder="Factura, guía, ajuste, etc."
        />
      </div>

      <div>
        <Label htmlFor="fluid-movement-notes">Notas</Label>
        <Textarea
          id="fluid-movement-notes"
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
