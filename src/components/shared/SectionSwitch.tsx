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
      className="inline-flex w-fit flex-wrap gap-1 rounded-lg border border-secondary-medium bg-white p-1"
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
              "flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isActive ? "bg-primary text-white" : "text-gray-600 hover:bg-primary-50 hover:text-primary"
            )}
          >
            {option.label}
            {typeof option.count === "number" ? (
              // Colores explicitos: con la variante "secondary" el numero no se
              // leia en la opcion no seleccionada.
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[11px] font-semibold leading-none",
                  isActive ? "bg-white/20 text-white" : "bg-secondary-light text-gray-700"
                )}
              >
                {option.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
