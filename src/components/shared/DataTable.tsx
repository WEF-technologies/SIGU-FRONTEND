import { ReactNode, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Plus } from "lucide-react";
import { SearchFilter } from "./SearchFilter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface Column<T> {
  key: keyof T | "actions";
  header: string;
  render?: (value: any, item: T) => ReactNode;
}

interface DataTableProps<T extends { id: string }> {
  data: T[];
  columns: Column<T>[];
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  onAdd?: () => void;
  title?: string;
  addButtonText?: string;
  isLoading?: boolean;
  searchPlaceholder?: string;
  searchField?: keyof T;
  hideAddButton?: boolean;
}

export function DataTable<T extends { id: string }>({
  data,
  columns,
  onEdit,
  onDelete,
  onAdd,
  title = "",
  addButtonText = "Agregar",
  isLoading = false,
  searchPlaceholder = "Buscar...",
  searchField,
  hideAddButton = false,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");

  // Filtrado de búsqueda memoizado
  const filteredData = useMemo(() => {
    if (!searchField || !searchTerm) return data;
    return data.filter((item) =>
      String(item[searchField])
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    );
  }, [data, searchField, searchTerm]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-primary-900">{title}</h2>
        <div className="flex items-center gap-4">
          {searchField && (
            <SearchFilter
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={setSearchTerm}
            />
          )}
          {onAdd && !hideAddButton && (
            <Button
              onClick={onAdd}
              className="bg-primary hover:bg-primary-600 text-white font-medium px-4 py-2 rounded-lg shadow-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {addButtonText}
            </Button>
          )}
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg border border-secondary-medium shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary-light">
              {columns.map((column) => (
                <TableHead
                  key={String(column.key)}
                  className="font-semibold text-primary-900"
                >
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-8 text-secondary-dark">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-8 text-secondary-dark">
                  {searchTerm ? "No se encontraron resultados" : "No hay datos disponibles"}
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((item) => (
                <TableRow key={item.id} className="hover:bg-secondary-light transition-colors">
                  {columns.map((column) => (
                    <TableCell key={String(column.key)} className="py-4">
                      {column.key === "actions" ? (
                        <div className="flex gap-2">
                          {onEdit && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onEdit(item)}
                              className="border-primary-200 text-primary hover:bg-primary-50"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          )}
                          {onDelete && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onDelete(item)}
                              className="border-red-200 text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ) : column.render ? (
                        column.render(item[column.key as keyof T], item)
                      ) : (
                        String(item[column.key as keyof T] ?? "-")
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
