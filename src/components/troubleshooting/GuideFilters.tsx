import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCategory } from "@/components/troubleshooting/guideUtils";
import {
  GUIDE_SEVERITY_OPTIONS,
  GUIDE_STATUS_OPTIONS,
  TroubleshootingGuideFilters,
} from "@/types";
import { Loader2, Search, Wrench } from "lucide-react";

interface GuideFiltersProps {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  filters: TroubleshootingGuideFilters;
  onFiltersChange: (patch: Partial<TroubleshootingGuideFilters>) => void;
  categories: string[];
  hasActiveFilters: boolean;
  isFetching: boolean;
  onClear: () => void;
}

const selectClassName =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

const workshopViews = [
  { label: "Todas", value: undefined, activeClass: "bg-primary hover:bg-primary-600 text-white" },
  {
    label: "Resolubles en ruta",
    value: false,
    activeClass: "bg-emerald-600 hover:bg-emerald-700 text-white",
  },
  {
    label: "Requieren taller",
    value: true,
    activeClass: "bg-orange-500 hover:bg-orange-600 text-white",
  },
] as const;

/**
 * Filtros del manual. Todos se resuelven en el servidor: la busqueda va con
 * retardo desde la pagina y los desplegables se aplican al cambiarlos, sin
 * boton intermedio.
 */
export function GuideFilters({
  searchTerm,
  onSearchTermChange,
  filters,
  onFiltersChange,
  categories,
  hasActiveFilters,
  isFetching,
  onClear,
}: GuideFiltersProps) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <CardTitle className="text-xl text-primary-900">Buscar en el manual</CardTitle>
        <div className="flex items-center gap-2 text-sm text-secondary-dark" aria-live="polite">
          {isFetching ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Buscando...
            </>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <Label htmlFor="guide-search">Busqueda</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary-dark" />
              <Input
                id="guide-search"
                type="search"
                className="pl-9"
                value={searchTerm}
                onChange={(event) => onSearchTermChange(event.target.value)}
                placeholder="Codigo, titulo o sintoma"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="guide-category-filter">Categoria</Label>
            <select
              id="guide-category-filter"
              value={filters.category ?? ""}
              onChange={(event) => onFiltersChange({ category: event.target.value })}
              className={selectClassName}
            >
              <option value="">Todas</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {formatCategory(category)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="guide-severity-filter">Severidad</Label>
            <select
              id="guide-severity-filter"
              value={filters.severity ?? ""}
              onChange={(event) => onFiltersChange({ severity: event.target.value })}
              className={selectClassName}
            >
              <option value="">Todas</option>
              {GUIDE_SEVERITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="guide-status-filter">Estado</Label>
            <select
              id="guide-status-filter"
              value={filters.status ?? ""}
              onChange={(event) => onFiltersChange({ status: event.target.value })}
              className={selectClassName}
            >
              <option value="">Todos</option>
              {GUIDE_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-secondary-medium bg-secondary-light/60 p-3">
          <span className="text-sm font-medium text-primary-900">Vista rapida:</span>
          {workshopViews.map((view) => {
            const isActive = filters.requires_workshop === view.value;

            return (
              <Button
                key={view.label}
                type="button"
                variant={isActive ? "default" : "outline"}
                className={
                  isActive
                    ? view.activeClass
                    : "border-primary-200 bg-white text-primary hover:bg-primary-50"
                }
                onClick={() => onFiltersChange({ requires_workshop: view.value })}
              >
                {view.value === true ? <Wrench className="h-4 w-4" /> : null}
                {view.label}
              </Button>
            );
          })}

          {hasActiveFilters ? (
            <Button
              type="button"
              variant="ghost"
              className="ml-auto text-primary hover:bg-primary-50"
              onClick={onClear}
            >
              Limpiar filtros
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
