
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, X, Plus } from 'lucide-react';

interface MultiSelectOption {
  id: string;
  label: string;
  sublabel?: string;
}

interface MultiSelectProps {
  title: string;
  options: MultiSelectOption[];
  selectedIds: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  placeholder?: string;
  maxHeight?: string;
}

export function MultiSelect({
  title,
  options,
  selectedIds,
  onSelectionChange,
  placeholder = "Buscar...",
  maxHeight = "max-h-48"
}: MultiSelectProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    option.sublabel?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedOptions = options.filter(option => selectedIds.includes(option.id));
  const availableOptions = filteredOptions.filter(option => !selectedIds.includes(option.id));

  const handleAdd = (optionId: string) => {
    onSelectionChange([...selectedIds, optionId]);
  };

  const handleRemove = (optionId: string) => {
    onSelectionChange(selectedIds.filter(id => id !== optionId));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Elementos seleccionados */}
        <div>
          <div className="text-sm font-medium text-gray-700 mb-2">
            Seleccionados ({selectedOptions.length})
          </div>
          <div className="flex flex-wrap gap-2 min-h-[40px] p-2 border rounded-lg bg-gray-50">
            {selectedOptions.length > 0 ? (
              selectedOptions.map((option) => (
                <Badge key={option.id} variant="default" className="flex items-center gap-1">
                  <span>{option.label}</span>
                  {option.sublabel && (
                    <span className="text-xs opacity-75">({option.sublabel})</span>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={() => handleRemove(option.id)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </Badge>
              ))
            ) : (
              <span className="text-gray-500 text-sm">Ningún elemento seleccionado</span>
            )}
          </div>
        </div>

        {/* Búsqueda y selección */}
        <div>
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder={placeholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setIsOpen(true)}
              className="pl-10"
            />
          </div>

          {(isOpen || searchTerm) && (
            <div className={`border rounded-lg bg-white ${maxHeight} overflow-y-auto`}>
              {availableOptions.length > 0 ? (
                <div className="p-2">
                  {availableOptions.map((option) => (
                    <div
                      key={option.id}
                      className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer"
                      onClick={() => handleAdd(option.id)}
                    >
                      <div>
                        <div className="font-medium">{option.label}</div>
                        {option.sublabel && (
                          <div className="text-sm text-gray-500">{option.sublabel}</div>
                        )}
                      </div>
                      <Plus className="w-4 h-4 text-green-600" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-gray-500">
                  {searchTerm ? 'No se encontraron resultados' : 'No hay opciones disponibles'}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Botón para cerrar la búsqueda */}
        {isOpen && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setIsOpen(false);
              setSearchTerm("");
            }}
            className="w-full"
          >
            Cerrar selección
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
