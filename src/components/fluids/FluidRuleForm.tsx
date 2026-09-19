import { useMemo, useState } from "react";
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
import { FluidProduct, FluidType, Vehicle } from "@/types";
import { FLUID_TYPE_OPTIONS, getProductLabel } from "./fluidConstants";
import { DEFAULT_RULE_FORM, FluidRuleFormValues } from "./fluidFormValues";

const NO_PRODUCT = "none";

interface FluidRuleFormProps {
  initialValues?: FluidRuleFormValues;
  vehicles: Vehicle[];
  products: FluidProduct[];
  isEditing: boolean;
  isSaving: boolean;
  onSubmit: (values: FluidRuleFormValues) => void;
  onCancel: () => void;
}

export function FluidRuleForm({
  initialValues = DEFAULT_RULE_FORM,
  vehicles,
  products,
  isEditing,
  isSaving,
  onSubmit,
  onCancel,
}: FluidRuleFormProps) {
  const [values, setValues] = useState<FluidRuleFormValues>(initialValues);

  /** Solo tiene sentido ofrecer productos del tipo de fluido elegido. */
  const productsForFluidType = useMemo(
    () =>
      products
        .filter((product) => product.fluid_type === values.fluid_type)
        .sort((a, b) => a.code.localeCompare(b.code, "es", { sensitivity: "base" })),
    [products, values.fluid_type]
  );

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(values);
      }}
      className="space-y-4"
    >
      {/* Al editar, la unidad no se cambia: la regla pertenece a esa unidad. */}
      {!isEditing ? (
        <div>
          <Label htmlFor="fluid-rule-vehicle">Unidad</Label>
          <VehiclePicker
            id="fluid-rule-vehicle"
            vehicles={vehicles}
            value={values.vehicle_id}
            onChange={(vehicleId) => setValues((prev) => ({ ...prev, vehicle_id: vehicleId }))}
          />
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <Label htmlFor="fluid-rule-type">Tipo de fluido</Label>
          <Select
            value={values.fluid_type}
            onValueChange={(value) =>
              // Cambiar de tipo invalida el producto elegido antes.
              setValues((prev) => ({ ...prev, fluid_type: value as FluidType, product_id: "" }))
            }
          >
            <SelectTrigger id="fluid-rule-type">
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
        <div>
          <Label htmlFor="fluid-rule-product">Producto asociado (opcional)</Label>
          <Select
            value={values.product_id || NO_PRODUCT}
            onValueChange={(value) =>
              setValues((prev) => ({ ...prev, product_id: value === NO_PRODUCT ? "" : value }))
            }
          >
            <SelectTrigger id="fluid-rule-product">
              <SelectValue placeholder="Sin producto fijo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_PRODUCT}>Sin producto fijo</SelectItem>
              {productsForFluidType.map((product) => (
                <SelectItem key={product.id} value={product.id}>
                  {getProductLabel(product)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div>
          <Label htmlFor="fluid-rule-capacity">Capacidad (L)</Label>
          <Input
            id="fluid-rule-capacity"
            type="number"
            min={0.01}
            step="0.01"
            value={values.capacity_liters}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, capacity_liters: event.target.value }))
            }
            required
          />
        </div>
        <div>
          <Label htmlFor="fluid-rule-interval-km">Intervalo km</Label>
          <Input
            id="fluid-rule-interval-km"
            type="number"
            min={0}
            value={values.interval_km}
            onChange={(event) => setValues((prev) => ({ ...prev, interval_km: event.target.value }))}
            placeholder="Opcional"
          />
        </div>
        <div>
          <Label htmlFor="fluid-rule-interval-days">Intervalo días</Label>
          <Input
            id="fluid-rule-interval-days"
            type="number"
            min={0}
            value={values.interval_days}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, interval_days: event.target.value }))
            }
            placeholder="Opcional"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="fluid-rule-notes">Notas</Label>
        <Textarea
          id="fluid-rule-notes"
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
