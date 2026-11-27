import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { FilterOption, normalizeSearchText } from "@/lib/filtering";
import { getVehicleStatusAppearance } from "@/constants/vehicleLocations";

interface VehicleStatusSummaryProps {
  statuses: string[];
  options: FilterOption[];
  selected: string;
  onSelect: (value: string) => void;
}

/**
 * Cuántas unidades hay en cada sede y estado. Cada botón filtra la lista; las
 * sedes van primero porque es lo que más se consulta.
 */
export function VehicleStatusSummary({ statuses, options, selected, onSelect }: VehicleStatusSummaryProps) {
  const counts = new Map<string, number>();
  statuses.forEach((status) => {
    const key = normalizeSearchText(status);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });

  const items = options
    .map((option) => ({
      option,
      count: counts.get(normalizeSearchText(option.value)) ?? 0,
      appearance: getVehicleStatusAppearance(option.value),
    }))
    .filter((item) => item.count > 0)
    .sort((a, b) => {
      if (a.appearance.kind !== b.appearance.kind) return a.appearance.kind === "sede" ? -1 : 1;
      return 0;
    });

  if (items.length === 0) return null;

  const selectedKey = normalizeSearchText(selected);
  const noneSelected = selectedKey === "" || selectedKey === "all";

  return (
    <div role="group" aria-label="Filtrar por sede o estado" className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onSelect("")}
        aria-pressed={noneSelected}
        className={cn(
          "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          noneSelected
            ? "border-primary-900 bg-primary-900 text-white"
            : "border-secondary-medium bg-white text-primary-900 hover:bg-secondary-light"
        )}
      >
        Todas
        <span className="tabular-nums opacity-80">{statuses.length}</span>
      </button>

      {items.map(({ option, count, appearance }) => {
        const isSelected = normalizeSearchText(option.value) === selectedKey;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onSelect(isSelected ? "" : option.value)}
            aria-pressed={isSelected}
            title={appearance.description}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              appearance.badgeClassName,
              isSelected ? "ring-2 ring-current ring-offset-1" : "opacity-90 hover:opacity-100"
            )}
          >
            {appearance.kind === "sede" ? (
              <MapPin className="h-4 w-4" aria-hidden="true" />
            ) : (
              <span className={cn("h-2 w-2 rounded-full", appearance.accentClassName)} aria-hidden="true" />
            )}
            {appearance.label}
            <span className="tabular-nums font-bold">{count}</span>
          </button>
        );
      })}
    </div>
  );
}
