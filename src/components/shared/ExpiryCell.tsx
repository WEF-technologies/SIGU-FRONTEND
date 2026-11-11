import { Badge } from "@/components/ui/badge";
import { AlertTone, getAlertToneBadgeClass } from "@/lib/alertTone";

interface ExpiryCellProps {
  /** Fecha ya formateada para mostrar. */
  date: string;
  /** Estado en palabras: "Vencida hace 3 días", "Vence en 5 días"... */
  label?: string;
  tone: AlertTone;
}

/** Fecha y, debajo, su estado con color: una sola columna en lugar de tres. */
export function ExpiryCell({ date, label, tone }: ExpiryCellProps) {
  return (
    <div className="space-y-1">
      <p className="text-gray-900">{date}</p>
      {label ? (
        <Badge variant="outline" className={getAlertToneBadgeClass(tone)}>
          {label}
        </Badge>
      ) : null}
    </div>
  );
}
