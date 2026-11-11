import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, Clock, Loader2, Siren } from "lucide-react";

interface BannerText {
  title: string;
  description?: string;
}

interface AlertSummaryBannerProps {
  criticalCount: number;
  warningCount: number;
  /** Textos para cada caso; el modulo arma los suyos con sus conteos. */
  critical: BannerText;
  warning: BannerText;
  ok: BannerText;
  isLoading?: boolean;
  loadingText?: string;
  hasError?: boolean;
  errorText?: string;
  /** Si se provee, muestra el boton para ir a la pestaña de alertas. */
  onShowAlerts?: () => void;
  showAlertsLabel?: string;
}

/**
 * Resumen de alertas que queda siempre arriba del modulo, en cualquier
 * pestaña: rojo si hay criticas, ambar si solo hay advertencias, verde si
 * todo esta al dia. Mismo aspecto en todos los modulos.
 */
export function AlertSummaryBanner({
  criticalCount,
  warningCount,
  critical,
  warning,
  ok,
  isLoading = false,
  loadingText = "Revisando alertas...",
  hasError = false,
  errorText = 'No se pudieron revisar las alertas. Usa "Actualizar" para intentar de nuevo.',
  onShowAlerts,
  showAlertsLabel = "Ver alertas",
}: AlertSummaryBannerProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-slate-600">
        <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
        <p className="text-sm">{loadingText}</p>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-slate-300 bg-slate-50 p-4 text-slate-700">
        <AlertTriangle className="h-5 w-5 shrink-0" />
        <p className="text-sm">{errorText}</p>
      </div>
    );
  }

  if (criticalCount > 0) {
    return (
      <div
        role="alert"
        className="flex flex-col gap-3 rounded-lg bg-red-600 p-4 text-white shadow-md sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-start gap-3">
          <Siren className="mt-0.5 h-6 w-6 shrink-0 animate-pulse" />
          <div>
            <p className="text-lg font-bold leading-tight">{critical.title}</p>
            {critical.description ? <p className="mt-0.5 text-sm text-red-100">{critical.description}</p> : null}
          </div>
        </div>
        {onShowAlerts && (
          <Button type="button" onClick={onShowAlerts} className="shrink-0 bg-white text-red-700 hover:bg-red-50">
            {showAlertsLabel}
          </Button>
        )}
      </div>
    );
  }

  if (warningCount > 0) {
    return (
      <div
        role="status"
        className="flex flex-col gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-start gap-3">
          <Clock className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">{warning.title}</p>
            {warning.description ? <p className="text-sm text-amber-700">{warning.description}</p> : null}
          </div>
        </div>
        {onShowAlerts && (
          <Button
            type="button"
            variant="outline"
            onClick={onShowAlerts}
            className="shrink-0 border-amber-400 bg-white text-amber-900 hover:bg-amber-100"
          >
            {showAlertsLabel}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div role="status" className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
      <CheckCircle className="h-5 w-5 shrink-0 text-green-600" />
      <div>
        <p className="font-semibold">{ok.title}</p>
        {ok.description ? <p className="text-sm text-green-700">{ok.description}</p> : null}
      </div>
    </div>
  );
}
