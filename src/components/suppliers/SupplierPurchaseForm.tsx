import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toDateOnlyLocalValue } from "@/lib/dates";
import { formatAmount, parseAmountInput, toAmountInputValue } from "@/lib/money";
import { SUPPLIER_PURCHASE_LIMITS, SupplierPurchase, SupplierPurchasePayload } from "@/types";

interface SupplierPurchaseFormProps {
  editingPurchase?: SupplierPurchase | null;
  onSubmit: (payload: SupplierPurchasePayload) => Promise<boolean>;
  onCancel: () => void;
}

interface PurchaseFormState {
  purchase_date: string;
  description: string;
  amount: string;
  invoice_number: string;
}

type PurchaseFormErrors = Partial<Record<keyof PurchaseFormState, string>>;

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const createEmptyState = (): PurchaseFormState => ({
  purchase_date: toDateOnlyLocalValue(),
  description: "",
  amount: "",
  invoice_number: "",
});

const toFormState = (purchase: SupplierPurchase): PurchaseFormState => ({
  purchase_date: purchase.purchase_date,
  description: purchase.description,
  amount: toAmountInputValue(purchase.amount),
  invoice_number: purchase.invoice_number ?? "",
});

/**
 * Valida con las mismas reglas del backend para no gastar un viaje en un 400
 * previsible. La unicidad de la factura solo la puede comprobar el backend.
 */
const validate = (state: PurchaseFormState) => {
  const errors: PurchaseFormErrors = {};

  if (!DATE_ONLY_PATTERN.test(state.purchase_date)) {
    errors.purchase_date = "Selecciona la fecha de la compra.";
  }

  const description = state.description.trim();
  if (!description) {
    errors.description = "Describe lo que se compro.";
  } else if (description.length > SUPPLIER_PURCHASE_LIMITS.description) {
    errors.description = `Usa como maximo ${SUPPLIER_PURCHASE_LIMITS.description} caracteres.`;
  }

  const amount = parseAmountInput(state.amount, {
    maxIntegerDigits: SUPPLIER_PURCHASE_LIMITS.amountIntegerDigits,
  });
  if (!amount.ok) errors.amount = amount.error;

  if (state.invoice_number.trim().length > SUPPLIER_PURCHASE_LIMITS.invoiceNumber) {
    errors.invoice_number = `Usa como maximo ${SUPPLIER_PURCHASE_LIMITS.invoiceNumber} caracteres.`;
  }

  return { errors, amount };
};

export function SupplierPurchaseForm({ editingPurchase, onSubmit, onCancel }: SupplierPurchaseFormProps) {
  const [formData, setFormData] = useState<PurchaseFormState>(createEmptyState);
  const [errors, setErrors] = useState<PurchaseFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setFormData(editingPurchase ? toFormState(editingPurchase) : createEmptyState());
    setErrors({});
  }, [editingPurchase]);

  const updateField = <K extends keyof PurchaseFormState>(field: K, value: PurchaseFormState[K]) => {
    setFormData((previous) => ({ ...previous, [field]: value }));
    // El error del campo se limpia al corregirlo; los demas se revalidan al enviar.
    setErrors((previous) => (previous[field] ? { ...previous, [field]: undefined } : previous));
  };

  // Vista previa del monto tal como se guardara, para que no haya dudas con los separadores.
  const amountPreview = useMemo(() => {
    if (!formData.amount.trim()) return null;
    const parsed = parseAmountInput(formData.amount, {
      maxIntegerDigits: SUPPLIER_PURCHASE_LIMITS.amountIntegerDigits,
    });
    return parsed.ok ? formatAmount(parsed.value) : null;
  }, [formData.amount]);

  const isFutureDate =
    DATE_ONLY_PATTERN.test(formData.purchase_date) && formData.purchase_date > toDateOnlyLocalValue();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const { errors: nextErrors, amount } = validate(formData);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !amount.ok) return;

    setIsSubmitting(true);
    try {
      const ok = await onSubmit({
        purchase_date: formData.purchase_date,
        description: formData.description.trim(),
        amount: amount.value,
        invoice_number: formData.invoice_number.trim().toUpperCase() || null,
      });

      if (ok && !editingPurchase) {
        setFormData(createEmptyState());
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const descriptionLength = formData.description.trim().length;

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="purchase-date">Fecha de la compra</Label>
          <Input
            id="purchase-date"
            type="date"
            value={formData.purchase_date}
            onChange={(event) => updateField("purchase_date", event.target.value)}
            aria-invalid={Boolean(errors.purchase_date)}
            aria-describedby="purchase-date-help"
            required
          />
          {errors.purchase_date ? (
            <p id="purchase-date-help" className="text-sm text-red-600">{errors.purchase_date}</p>
          ) : isFutureDate ? (
            <p id="purchase-date-help" className="text-sm text-amber-700">
              La fecha es posterior a hoy. Verifica que sea correcta.
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="purchase-amount">Monto</Label>
          <Input
            id="purchase-amount"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="Ej. 1500,50"
            value={formData.amount}
            onChange={(event) => updateField("amount", event.target.value)}
            aria-invalid={Boolean(errors.amount)}
            aria-describedby="purchase-amount-help"
            required
          />
          <p
            id="purchase-amount-help"
            className={`text-sm ${errors.amount ? "text-red-600" : "text-secondary-dark"}`}
          >
            {errors.amount ??
              (amountPreview ? `Se registrara: ${amountPreview}` : "Sin separadores de miles, maximo 2 decimales.")}
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="purchase-invoice">
          Numero de factura <span className="font-normal text-secondary-dark">(opcional)</span>
        </Label>
        <Input
          id="purchase-invoice"
          value={formData.invoice_number}
          onChange={(event) => updateField("invoice_number", event.target.value.toUpperCase())}
          maxLength={SUPPLIER_PURCHASE_LIMITS.invoiceNumber}
          autoComplete="off"
          placeholder="Ej. FE-00123"
          aria-invalid={Boolean(errors.invoice_number)}
          aria-describedby="purchase-invoice-help"
        />
        <p
          id="purchase-invoice-help"
          className={`text-sm ${errors.invoice_number ? "text-red-600" : "text-secondary-dark"}`}
        >
          {errors.invoice_number ?? "No se puede repetir para el mismo proveedor."}
        </p>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="purchase-description">Descripcion</Label>
          <span
            className={`text-xs ${
              descriptionLength > SUPPLIER_PURCHASE_LIMITS.description ? "text-red-600" : "text-secondary-dark"
            }`}
          >
            {descriptionLength}/{SUPPLIER_PURCHASE_LIMITS.description}
          </span>
        </div>
        <Textarea
          id="purchase-description"
          value={formData.description}
          onChange={(event) => updateField("description", event.target.value)}
          rows={3}
          placeholder="Ej. Filtros de aceite y repuestos de frenos"
          aria-invalid={Boolean(errors.description)}
          aria-describedby={errors.description ? "purchase-description-error" : undefined}
          required
        />
        {errors.description ? (
          <p id="purchase-description-error" className="text-sm text-red-600">{errors.description}</p>
        ) : null}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" className="bg-primary hover:bg-primary-600" disabled={isSubmitting}>
          {isSubmitting ? "Guardando..." : editingPurchase ? "Guardar cambios" : "Registrar compra"}
        </Button>
      </div>
    </form>
  );
}
