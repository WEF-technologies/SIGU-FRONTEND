
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FilterField, FilterPanel, FilterSelect } from "@/components/shared/FilterPanel";
import { SearchFilter } from "@/components/shared/SearchFilter";
import { countActiveFilters, FilterOption } from "@/lib/filtering";

export interface VehicleFilters {
  query: string;
  status: string;
  brand: string;
  yearFrom: string;
  yearTo: string;
  maintenanceOverdue: boolean;
}

interface VehicleFiltersProps {
  filters: VehicleFilters;
  onFiltersChange: (filters: VehicleFilters) => void;
  onClearFilters: () => void;
  statusOptions: FilterOption[];
  brandOptions: FilterOption[];
}

export function VehicleFiltersComponent({
  filters,
  onFiltersChange,
  onClearFilters,
  statusOptions,
  brandOptions,
}: VehicleFiltersProps) {
  const updateFilter = <K extends keyof VehicleFilters>(key: K, value: VehicleFilters[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const activeCount = countActiveFilters([
    filters.query,
    filters.status,
    filters.brand,
    filters.yearFrom,
    filters.yearTo,
    filters.maintenanceOverdue,
  ]);

  return (
    <FilterPanel
      activeCount={activeCount}
      onClear={onClearFilters}
      gridClassName="xl:grid-cols-3"
      advanced={
        <>
          <FilterField label="Año desde" htmlFor="vehicle-year-from">
            <Input
              id="vehicle-year-from"
              type="number"
              placeholder="2005"
              value={filters.yearFrom}
              onChange={(e) => updateFilter("yearFrom", e.target.value)}
            />
          </FilterField>
          <FilterField label="Año hasta" htmlFor="vehicle-year-to">
            <Input
              id="vehicle-year-to"
              type="number"
              placeholder={String(new Date().getFullYear())}
              value={filters.yearTo}
              onChange={(e) => updateFilter("yearTo", e.target.value)}
            />
          </FilterField>
          <div className="flex items-center space-x-2 md:pt-7">
            <Checkbox
              id="vehicle-maintenance-overdue"
              checked={filters.maintenanceOverdue}
              onCheckedChange={(checked) => updateFilter("maintenanceOverdue", checked === true)}
            />
            <Label htmlFor="vehicle-maintenance-overdue" className="text-sm">
              Solo con mantenimiento vencido
            </Label>
          </div>
        </>
      }
    >
      <FilterField label="Búsqueda" htmlFor="vehicle-search">
        <SearchFilter
          id="vehicle-search"
          className="w-full"
          placeholder="Placa, marca, modelo, estado o sede..."
          value={filters.query}
          onChange={(value) => updateFilter("query", value)}
        />
      </FilterField>

      <FilterSelect
        id="vehicle-status-filter"
        label="Estado / Sede"
        value={filters.status}
        onChange={(value) => updateFilter("status", value)}
        options={statusOptions}
        allLabel="Todos los estados"
      />

      <FilterSelect
        id="vehicle-brand-filter"
        label="Marca"
        value={filters.brand}
        onChange={(value) => updateFilter("brand", value)}
        options={brandOptions}
        allLabel="Todas las marcas"
      />
    </FilterPanel>
  );
}
