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
      // Fondo suave en lugar de rojo solido y sin animacion: se nota sin dominar
      // la pantalla, y el rojo queda para lo que de verdad esta vencido.
      <div
        role="alert"
        className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-900 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-start gap-3">
          <Siren className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div>
            <p className="font-semibold">{critical.title}</p>
            {critical.description ? <p className="text-sm text-red-800">{critical.description}</p> : null}
          </div>
        </div>
        {onShowAlerts && (
          <Button
            type="button"
            variant="outline"
            onClick={onShowAlerts}
            className="shrink-0 border-red-300 bg-white text-red-700 hover:bg-red-100"
          >
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
    // Sin pendientes basta una linea: un recuadro verde grande no aporta nada.
    <p role="status" className="flex items-center gap-2 text-sm text-green-800">
      <CheckCircle className="h-4 w-4 shrink-0 text-green-600" />
      <span className="font-medium">{ok.title}</span>
      {ok.description ? <span className="hidden text-green-700 sm:inline">{ok.description}</span> : null}
    </p>
  );
}
