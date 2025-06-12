
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";

interface Vehicle {
  plate_number: string;
  brand: string;
  model: string;
}

interface VehicleSelectorProps {
  vehicles: Vehicle[];
  selectedVehicles: string[];
  onSelectionChange: (selected: string[]) => void;
}

export function VehicleSelector({ vehicles, selectedVehicles, onSelectionChange }: VehicleSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const filteredVehicles = vehicles.filter(vehicle => 
    !selectedVehicles.includes(vehicle.plate_number) &&
    (vehicle.plate_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
     vehicle.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
     vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAddVehicle = (plateNumber: string) => {
    onSelectionChange([...selectedVehicles, plateNumber]);
    setSearchTerm("");
    setShowDropdown(false);
  };

  const handleRemoveVehicle = (plateNumber: string) => {
    onSelectionChange(selectedVehicles.filter(p => p !== plateNumber));
  };

  return (
    <div className="space-y-3">
      <Label>Vehículos Compatibles</Label>
      
      {/* Vehículos seleccionados */}
      {selectedVehicles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedVehicles.map((plateNumber) => {
            const vehicle = vehicles.find(v => v.plate_number === plateNumber);
            return (
              <Badge 
                key={plateNumber} 
                variant="outline" 
                className="bg-blue-50 text-blue-700 border-blue-200 pr-1"
              >
                {plateNumber} - {vehicle?.brand} {vehicle?.model}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 ml-1 hover:bg-blue-100"
                  onClick={() => handleRemoveVehicle(plateNumber)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </Badge>
            );
          })}
        </div>
      )}

      {/* Buscador y selector */}
      <div className="relative">
        <div className="flex gap-2">
          <Input
            placeholder="Buscar vehículo por placa, marca o modelo..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowDropdown(e.target.value.length > 0);
            }}
            onFocus={() => setShowDropdown(searchTerm.length > 0)}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Dropdown de opciones */}
        {showDropdown && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
            {filteredVehicles.length > 0 ? (
              filteredVehicles.map((vehicle) => (
                <button
                  key={vehicle.plate_number}
                  type="button"
                  className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center justify-between"
                  onClick={() => handleAddVehicle(vehicle.plate_number)}
                >
                  <div>
                    <span className="font-medium">{vehicle.plate_number}</span>
                    <span className="text-gray-500 ml-2">
                      {vehicle.brand} {vehicle.model}
                    </span>
                  </div>
                  <Plus className="w-4 h-4 text-gray-400" />
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-gray-500 text-center">
                {searchTerm ? 'No se encontraron vehículos' : 'Escriba para buscar vehículos'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
