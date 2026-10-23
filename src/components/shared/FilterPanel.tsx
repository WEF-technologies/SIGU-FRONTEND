import { ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ALL_FILTER_VALUE, FilterOption } from "@/lib/filtering";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, Filter, X } from "lucide-react";

interface FilterPanelProps {
  title?: string;
  /** Cantidad de filtros aplicados; con 0 se oculta "Limpiar". */
  activeCount: number;
  onClear: () => void;
  children: ReactNode;
  /** Filtros secundarios que se muestran con "Más filtros". */
  advanced?: ReactNode;
  /** Contenido extra en la cabecera (resultados, indicador de carga...). */
  headerExtra?: ReactNode;
  /** Contenido bajo la grilla (vistas rapidas, notas...). */
  footer?: ReactNode;
  className?: string;
  gridClassName?: string;
}

/**
 * Contenedor estandar de filtros: misma cabecera, mismo "Limpiar" y misma
 * grilla en todos los modulos. Los filtros se aplican al cambiarlos.
 */
export function FilterPanel({
  title = "Filtros de búsqueda",
  activeCount,
  onClear,
  children,
  advanced,
  headerExtra,
  footer,
  className,
  gridClassName,
}: FilterPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <Card className={cn("space-y-4 p-4", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-primary-900">{title}</h3>
          {activeCount > 0 && (
            <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-white">
              {activeCount} {activeCount === 1 ? "activo" : "activos"}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {headerExtra}
          {activeCount > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClear}
              className="border-red-200 text-red-600 hover:bg-red-50"
            >
              <X className="mr-1 h-4 w-4" />
              Limpiar
            </Button>
          )}
          {advanced && (
            <Button type="button" variant="outline" size="sm" onClick={() => setShowAdvanced((prev) => !prev)}>
              {showAdvanced ? <ChevronUp className="mr-1 h-4 w-4" /> : <ChevronDown className="mr-1 h-4 w-4" />}
              {showAdvanced ? "Menos filtros" : "Más filtros"}
            </Button>
          )}
        </div>
      </div>

      <div className={cn("grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4", gridClassName)}>
        {children}
        {advanced && showAdvanced ? advanced : null}
      </div>

      {footer}
    </Card>
  );
}

interface FilterFieldProps {
  label: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}

export function FilterField({ label, htmlFor, children, className }: FilterFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

interface FilterSelectProps {
  id: string;
  label: string;
  /** "" o "all" = sin filtro. */
  value: string | undefined;
  /** Recibe "" cuando se elige la opcion "Todos". */
  onChange: (value: string) => void;
  options: readonly FilterOption[];
  allLabel?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Desplegable de filtro con la opcion "Todos" al inicio. Radix no admite
 * valores vacios, asi que "Todos" viaja como "all" y se devuelve como "".
 */
export function FilterSelect({
  id,
  label,
  value,
  onChange,
  options,
  allLabel = "Todos",
  disabled,
  className,
}: FilterSelectProps) {
  const selected = value && value !== ALL_FILTER_VALUE ? value : ALL_FILTER_VALUE;
  const validOptions = options.filter((option) => option.value && option.value !== ALL_FILTER_VALUE);
  // Un valor aplicado que ya no esta en la lista se sigue mostrando para poder quitarlo.
  const isMissing = selected !== ALL_FILTER_VALUE && !validOptions.some((option) => option.value === selected);

  return (
    <FilterField label={label} htmlFor={id} className={className}>
      <Select
        value={selected}
        onValueChange={(next) => onChange(next === ALL_FILTER_VALUE ? "" : next)}
        disabled={disabled}
      >
        <SelectTrigger id={id}>
          <SelectValue placeholder={allLabel} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_FILTER_VALUE}>{allLabel}</SelectItem>
          {isMissing && <SelectItem value={selected}>{selected}</SelectItem>}
          {validOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FilterField>
  );
}
