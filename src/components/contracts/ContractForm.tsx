import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Contract,
  CONTRACT_CURRENCIES,
  CONTRACT_INITIAL_STATUSES,
  CONTRACT_STATUS_OPTIONS,
  ContractPayload,
  ContractStatus,
} from '@/types';
import { Loader2 } from 'lucide-react';

interface ContractFormProps {
  contract?: Contract | null;
  /** Devuelve true si se guardó; si falla, el formulario conserva lo escrito. */
  onSubmit: (contractData: ContractPayload) => Promise<boolean> | void;
  onCancel: () => void;
  isLoading?: boolean;
}

const NO_CURRENCY = 'none';

/** Límites del backend (ContractBase), replicados para avisar antes de enviar. */
const LIMITS = { code: 50, name: 120 } as const;

interface ContractFormState {
  description: string;
  start_date: string;
  end_date: string;
  location: string;
  status: ContractStatus;
  contract_number: string;
  sap_order_number: string;
  client: string;
  user_management: string;
  administrator_name: string;
  currency: string;
  contract_amount: string;
  valuation_frequency_days: string;
  approval_lead_days: string;
  warning_pct: string;
  critical_pct: string;
}

const EMPTY_FORM: ContractFormState = {
  description: '',
  start_date: '',
  end_date: '',
  location: '',
  // Sin pantalla para cambiar de estado después, un borrador quedaría así para siempre.
  status: 'activo',
  contract_number: '',
  sap_order_number: '',
  client: '',
  user_management: '',
  administrator_name: '',
  currency: NO_CURRENCY,
  contract_amount: '',
  valuation_frequency_days: '30',
  approval_lead_days: '30',
  warning_pct: '70',
  critical_pct: '90',
};

const toText = (value: string | number | null | undefined) =>
  value === null || value === undefined ? '' : String(value);

const toNullableText = (value: string) => {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const isContractStatus = (value: string): value is ContractStatus =>
  CONTRACT_STATUS_OPTIONS.some((option) => option.value === value);

const mapContractToForm = (contract: Contract): ContractFormState => ({
  description: contract.description,
  start_date: contract.start_date,
  end_date: contract.end_date,
  location: contract.location,
  status: isContractStatus(contract.status) ? contract.status : 'activo',
  contract_number: toText(contract.contract_number),
  sap_order_number: toText(contract.sap_order_number),
  client: toText(contract.client),
  user_management: toText(contract.user_management),
  administrator_name: toText(contract.administrator_name),
  currency: contract.currency ?? NO_CURRENCY,
  contract_amount: toText(contract.contract_amount),
  valuation_frequency_days: toText(contract.valuation_frequency_days ?? 30),
  approval_lead_days: toText(contract.approval_lead_days ?? 30),
  warning_pct: toText(contract.warning_pct ?? 70),
  critical_pct: toText(contract.critical_pct ?? 90),
});

/** Las mismas reglas que valida el backend; devuelve el primer problema o null. */
const validateForm = (form: ContractFormState): string | null => {
  if (!form.description.trim()) return 'La descripción es obligatoria.';
  if (!form.location.trim()) return 'La ubicación es obligatoria.';
  if (form.start_date && form.end_date && form.start_date >= form.end_date) {
    return 'La fecha de inicio debe ser anterior a la fecha de fin.';
  }

  if (form.contract_amount.trim()) {
    const amount = Number(form.contract_amount);
    if (!Number.isFinite(amount) || amount < 0) return 'El monto del contrato no puede ser negativo.';
  }

  const frequency = Number(form.valuation_frequency_days);
  if (!Number.isInteger(frequency) || frequency < 1) {
    return 'La frecuencia de valuación debe ser un número entero de días mayor a 0.';
  }

  const leadDays = Number(form.approval_lead_days);
  if (!Number.isInteger(leadDays) || leadDays < 1) {
    return 'Los días de anticipación para aprobar deben ser un número entero mayor a 0.';
  }

  const warning = Number(form.warning_pct);
  const critical = Number(form.critical_pct);
  if (!Number.isFinite(warning) || !Number.isFinite(critical) || !(warning > 0 && warning < critical && critical <= 100)) {
    return 'Los umbrales deben cumplir: 0 < advertencia < crítico ≤ 100.';
  }

  return null;
};

/** Redondea a 2 decimales, como los guarda el backend. */
const toMoney = (value: number) => Math.round(value * 100) / 100;

const buildPayload = (form: ContractFormState): ContractPayload => ({
  description: form.description.trim(),
  start_date: form.start_date,
  end_date: form.end_date,
  location: form.location.trim(),
  status: form.status,
  contract_number: toNullableText(form.contract_number),
  sap_order_number: toNullableText(form.sap_order_number),
  client: toNullableText(form.client),
  user_management: toNullableText(form.user_management),
  administrator_name: toNullableText(form.administrator_name),
  currency: form.currency === NO_CURRENCY ? null : (form.currency as ContractPayload['currency']),
  contract_amount: form.contract_amount.trim() ? toMoney(Number(form.contract_amount)) : null,
  valuation_frequency_days: Number(form.valuation_frequency_days),
  approval_lead_days: Number(form.approval_lead_days),
  warning_pct: toMoney(Number(form.warning_pct)),
  critical_pct: toMoney(Number(form.critical_pct)),
});

export function ContractForm({
  contract,
  onSubmit,
  onCancel,
  isLoading = false
}: ContractFormProps) {
  const [formData, setFormData] = useState<ContractFormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFormData(contract ? mapContractToForm(contract) : EMPTY_FORM);
    setError(null);
  }, [contract]);

  const update = (patch: Partial<ContractFormState>) => {
    setFormData((prev) => ({ ...prev, ...patch }));
    setError(null);
  };

  // Al crear solo se permite borrador o activo; al editar se muestra el estado actual.
  const statusOptions = CONTRACT_STATUS_OPTIONS.filter(
    (option) => CONTRACT_INITIAL_STATUSES.includes(option.value) || option.value === formData.status
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateForm(formData);
    if (validationError) {
      setError(validationError);
      return;
    }

    const saved = await onSubmit(buildPayload(formData));
    if (saved !== false && !contract) {
      setFormData(EMPTY_FORM);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Label htmlFor="status">Estado</Label>
        <Select
          value={formData.status}
          onValueChange={(value: string) => {
            if (isContractStatus(value)) update({ status: value });
          }}
        >
          <SelectTrigger id="status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="description">Descripción</Label>
        <Input
          id="description"
          value={formData.description}
          onChange={(e) => update({ description: e.target.value })}
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="start_date">Fecha de Inicio</Label>
          <Input
            id="start_date"
            type="date"
            value={formData.start_date}
            onChange={(e) => update({ start_date: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="end_date">Fecha de Fin</Label>
          <Input
            id="end_date"
            type="date"
            value={formData.end_date}
            min={formData.start_date || undefined}
            onChange={(e) => update({ end_date: e.target.value })}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="location">Ubicación</Label>
        <Input
          id="location"
          value={formData.location}
          onChange={(e) => update({ location: e.target.value })}
          required
        />
      </div>

      <fieldset className="space-y-4 rounded-lg border border-gray-200 p-4">
        <legend className="px-1 text-sm font-medium text-gray-700">Datos del contrato (opcional)</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="contract_number">Número de contrato</Label>
            <Input
              id="contract_number"
              value={formData.contract_number}
              maxLength={LIMITS.code}
              onChange={(e) => update({ contract_number: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="sap_order_number">Orden SAP</Label>
            <Input
              id="sap_order_number"
              value={formData.sap_order_number}
              maxLength={LIMITS.code}
              onChange={(e) => update({ sap_order_number: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="client">Cliente</Label>
            <Input
              id="client"
              value={formData.client}
              maxLength={LIMITS.name}
              onChange={(e) => update({ client: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="user_management">Gerencia usuaria</Label>
            <Input
              id="user_management"
              value={formData.user_management}
              maxLength={LIMITS.name}
              onChange={(e) => update({ user_management: e.target.value })}
            />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="administrator_name">Administrador del contrato</Label>
            <Input
              id="administrator_name"
              value={formData.administrator_name}
              maxLength={LIMITS.name}
              onChange={(e) => update({ administrator_name: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="currency">Moneda</Label>
            <Select value={formData.currency} onValueChange={(value) => update({ currency: value })}>
              <SelectTrigger id="currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_CURRENCY}>Sin especificar</SelectItem>
                {CONTRACT_CURRENCIES.map((currency) => (
                  <SelectItem key={currency} value={currency}>{currency}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="contract_amount">Monto del contrato</Label>
            <Input
              id="contract_amount"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={formData.contract_amount}
              onChange={(e) => update({ contract_amount: e.target.value })}
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4 rounded-lg border border-gray-200 p-4">
        <legend className="px-1 text-sm font-medium text-gray-700">Valuaciones</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="valuation_frequency_days">Frecuencia de valuación (días)</Label>
            <Input
              id="valuation_frequency_days"
              type="number"
              inputMode="numeric"
              min="1"
              step="1"
              value={formData.valuation_frequency_days}
              onChange={(e) => update({ valuation_frequency_days: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="approval_lead_days">Anticipación para aprobar (días)</Label>
            <Input
              id="approval_lead_days"
              type="number"
              inputMode="numeric"
              min="1"
              step="1"
              value={formData.approval_lead_days}
              onChange={(e) => update({ approval_lead_days: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="warning_pct">Umbral de advertencia (%)</Label>
            <Input
              id="warning_pct"
              type="number"
              inputMode="decimal"
              min="0.01"
              max="100"
              step="0.01"
              value={formData.warning_pct}
              onChange={(e) => update({ warning_pct: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="critical_pct">Umbral crítico (%)</Label>
            <Input
              id="critical_pct"
              type="number"
              inputMode="decimal"
              min="0.01"
              max="100"
              step="0.01"
              value={formData.critical_pct}
              onChange={(e) => update({ critical_pct: e.target.value })}
              required
            />
          </div>
        </div>
      </fieldset>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          className="bg-primary hover:bg-primary-600"
          disabled={isLoading}
        >
          {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {contract ? "Actualizar" : "Crear"}
        </Button>
      </div>
    </form>
  );
}
