
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Filter, X } from "lucide-react";

export interface VehicleFilters {
  plate: string;
  brandModel: string;
  status: string;
  yearFrom: string;
  yearTo: string;
  maintenancePending: boolean;
}

interface VehicleFiltersProps {
  filters: VehicleFilters;
  onFiltersChange: (filters: VehicleFilters) => void;
  onClearFilters: () => void;
}

export function VehicleFiltersComponent({ filters, onFiltersChange, onClearFilters }: VehicleFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const updateFilter = (key: keyof VehicleFilters, value: string | boolean) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const hasActiveFilters = Object.values(filters).some(value => 
    typeof value === 'boolean' ? value : value !== ''
  );

  return (
    <Card className="p-4 mb-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4" />
          <Label className="font-medium">Filtros de Búsqueda</Label>
          {hasActiveFilters && (
            <span className="bg-primary text-white text-xs px-2 py-1 rounded-full">
              Activos
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClearFilters}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              <X className="w-4 h-4 mr-1" />
              Limpiar
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Contraer' : 'Expandir'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <Label htmlFor="plate">Placa</Label>
          <Input
            id="plate"
            placeholder="ABC-123"
            value={filters.plate}
            onChange={(e) => updateFilter('plate', e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="brandModel">Marca / Modelo</Label>
          <Input
            id="brandModel"
            placeholder="Toyota Hiace"
            value={filters.brandModel}
            onChange={(e) => updateFilter('brandModel', e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="status">Estado</Label>
          <Select value={filters.status} onValueChange={(value) => updateFilter('status', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="available">Operativa</SelectItem>
              <SelectItem value="maintenance">En mantenimiento</SelectItem>
              <SelectItem value="out_of_service">Inactiva</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isExpanded && (
          <>
            <div>
              <Label htmlFor="yearFrom">Año desde</Label>
              <Input
                id="yearFrom"
                type="number"
                placeholder="2020"
                value={filters.yearFrom}
                onChange={(e) => updateFilter('yearFrom', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="yearTo">Año hasta</Label>
              <Input
                id="yearTo"
                type="number"
                placeholder="2024"
                value={filters.yearTo}
                onChange={(e) => updateFilter('yearTo', e.target.value)}
              />
            </div>

            <div className="flex items-center space-x-2 mt-6">
              <Checkbox
                id="maintenancePending"
                checked={filters.maintenancePending}
                onCheckedChange={(checked) => updateFilter('maintenancePending', !!checked)}
              />
              <Label htmlFor="maintenancePending" className="text-sm">
                Solo vehículos con mantenimiento pendiente
              </Label>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
