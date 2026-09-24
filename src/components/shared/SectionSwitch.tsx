import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface SectionSwitchOption<T extends string> {
  value: T;
  label: string;
  /** Contador opcional, para no perder los totales que mostraban las pestañas. */
  count?: number;
}

interface SectionSwitchProps<T extends string> {
  options: readonly SectionSwitchOption<T>[];
  value: T;
  onChange: (value: T) => void;
  "aria-label": string;
}

/**
 * Conmutador entre las vistas de una misma sección.
 *
 * Las pestañas de arriba responden a "qué quiero hacer" (registrar, consultar,
 * atender pendientes); esto elige la vista dentro de esa respuesta. Mantenerlo
 * en un segundo nivel evita una fila de diez pestañas donde todas pesan igual.
 */
export function SectionSwitch<T extends string>({
  options,
  value,
  onChange,
  "aria-label": ariaLabel,
}: SectionSwitchProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="inline-flex flex-wrap gap-1 rounded-lg border border-secondary-medium bg-secondary-light/60 p-1"
    >
      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-white text-primary-900 shadow-sm"
                : "text-secondary-dark hover:text-primary-900"
            )}
          >
            {option.label}
            {typeof option.count === "number" ? (
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                {option.count}
              </Badge>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
