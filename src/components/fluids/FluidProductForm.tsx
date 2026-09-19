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
import { FluidType } from "@/types";
import { FLUID_TYPE_OPTIONS } from "./fluidConstants";
import { DEFAULT_PRODUCT_FORM, FluidProductFormValues } from "./fluidFormValues";

interface FluidProductFormProps {
  initialValues?: FluidProductFormValues;
  isEditing: boolean;
  isSaving: boolean;
  onSubmit: (values: FluidProductFormValues) => void;
  onCancel: () => void;
}

export function FluidProductForm({
  initialValues = DEFAULT_PRODUCT_FORM,
  isEditing,
  isSaving,
  onSubmit,
  onCancel,
}: FluidProductFormProps) {
  // El modal desmonta su contenido al cerrarse, así que el estado arranca
  // limpio en cada apertura sin necesidad de reiniciarlo desde la página.
  const [values, setValues] = useState<FluidProductFormValues>(initialValues);

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
          <Label htmlFor="fluid-product-code">Código</Label>
          <Input
            id="fluid-product-code"
            value={values.code}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))
            }
            required
          />
        </div>
        <div>
          <Label htmlFor="fluid-product-type">Tipo de fluido</Label>
          <Select
            value={values.fluid_type}
            onValueChange={(value) =>
              setValues((prev) => ({ ...prev, fluid_type: value as FluidType }))
            }
          >
            <SelectTrigger id="fluid-product-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FLUID_TYPE_OPTIONS.map((option) => (
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
          <Label htmlFor="fluid-product-name">Nombre</Label>
          <Input
            id="fluid-product-name"
            value={values.name}
            onChange={(event) => setValues((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="Opcional"
          />
        </div>
        <div>
          <Label htmlFor="fluid-product-unit">Unidad</Label>
          <Input
            id="fluid-product-unit"
            value={values.unit}
            onChange={(event) => setValues((prev) => ({ ...prev, unit: event.target.value }))}
            placeholder="litros"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="fluid-product-description">Descripción</Label>
        <Input
          id="fluid-product-description"
          value={values.description}
          onChange={(event) => setValues((prev) => ({ ...prev, description: event.target.value }))}
          placeholder="Opcional"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <Label htmlFor="fluid-product-stock">Stock inicial</Label>
          <Input
            id="fluid-product-stock"
            type="number"
            min={0}
            step="0.01"
            value={values.stock_quantity}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, stock_quantity: event.target.value }))
            }
          />
        </div>
        <div>
          <Label htmlFor="fluid-product-min-stock">Stock mínimo</Label>
          <Input
            id="fluid-product-min-stock"
            type="number"
            min={0}
            step="0.01"
            value={values.min_stock_quantity}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, min_stock_quantity: event.target.value }))
            }
          />
        </div>
      </div>

      <div>
        <Label htmlFor="fluid-product-notes">Notas</Label>
        <Textarea
          id="fluid-product-notes"
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
          {isSaving ? "Guardando..." : isEditing ? "Actualizar" : "Crear"}
        </Button>
      </div>
    </form>
  );
}
