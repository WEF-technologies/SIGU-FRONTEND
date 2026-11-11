import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, Clock, Loader2, Siren } from "lucide-react";

interface DotationAlertBannerProps {
  expiredCount: number;
  nearCount: number;
  nearDays: number;
  isLoading?: boolean;
  hasError?: boolean;
  /** Si se provee, muestra el boton "Ver alertas". */
  onShowAlerts?: () => void;
}

const plural = (count: number, singular: string, pluralForm: string) => (count === 1 ? singular : pluralForm);

/**
 * Resumen de vencimientos que queda siempre arriba del modulo, en cualquier
 * pestaña: rojo si hay vencidas, ambar si solo hay por vencer, verde si todo
 * esta al dia.
 */
export function DotationAlertBanner({
  expiredCount,
  nearCount,
  nearDays,
  isLoading = false,
  hasError = false,
  onShowAlerts,
}: DotationAlertBannerProps) {
  const nearText = `${nearCount} por vencer en los próximos ${nearDays} ${plural(nearDays, "día", "días")}`;

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-slate-600">
        <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
        <p className="text-sm">Revisando vencimientos de dotación...</p>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-slate-300 bg-slate-50 p-4 text-slate-700">
        <AlertTriangle className="h-5 w-5 shrink-0" />
        <p className="text-sm">No se pudieron revisar los vencimientos. Usa "Actualizar" para intentar de nuevo.</p>
      </div>
    );
  }

  if (expiredCount > 0) {
    return (
      <div
        role="alert"
        className="flex flex-col gap-3 rounded-lg bg-red-600 p-4 text-white shadow-md sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-start gap-3">
          <Siren className="mt-0.5 h-6 w-6 shrink-0 animate-pulse" />
          <div>
            <p className="text-lg font-bold leading-tight">
              {expiredCount} {plural(expiredCount, "dotación vencida", "dotaciones vencidas")}
            </p>
            <p className="mt-0.5 text-sm text-red-100">
              {nearCount > 0 ? `Además, ${nearText}. ` : ""}
              Registra la renovación para mantener al personal al día.
            </p>
          </div>
        </div>
        {onShowAlerts && (
          <Button
            type="button"
            onClick={onShowAlerts}
            className="shrink-0 bg-white text-red-700 hover:bg-red-50"
          >
            Ver alertas
          </Button>
        )}
      </div>
    );
  }

  if (nearCount > 0) {
    return (
      <div
        role="status"
        className="flex flex-col gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-start gap-3">
          <Clock className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">
              {nearCount} {plural(nearCount, "dotación", "dotaciones")} por vencer en los próximos {nearDays}{" "}
              {plural(nearDays, "día", "días")}
            </p>
            <p className="text-sm text-amber-700">Planifica la entrega antes de que venzan.</p>
          </div>
        </div>
        {onShowAlerts && (
          <Button
            type="button"
            variant="outline"
            onClick={onShowAlerts}
            className="shrink-0 border-amber-400 bg-white text-amber-900 hover:bg-amber-100"
          >
            Ver alertas
          </Button>
        )}
      </div>
    );
  }

  return (
    <div role="status" className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
      <CheckCircle className="h-5 w-5 shrink-0 text-green-600" />
      <div>
        <p className="font-semibold">Toda la dotación al día</p>
        <p className="text-sm text-green-700">
          No hay entregas vencidas ni por vencer en los próximos {nearDays} {plural(nearDays, "día", "días")}.
        </p>
      </div>
    </div>
  );
}
