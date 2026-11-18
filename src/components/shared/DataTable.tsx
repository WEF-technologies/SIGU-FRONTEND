import { ReactNode, useDeferredValue, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowDown, ArrowUp, ArrowUpDown, Edit, Plus, Trash2 } from "lucide-react";
import { SearchFilter } from "./SearchFilter";
import { matchesSearch } from "@/lib/filtering";
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
  sortable?: boolean;
  sortValue?: (item: T) => string | number | Date | null | undefined;
  /** No mostrar esta columna en la vista de tarjetas (móvil). */
  hideOnMobile?: boolean;
}

type SortDirection = "asc" | "desc";

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
  searchFields?: Array<keyof T>;
  searchAccessor?: (item: T) => string;
  defaultSort?: { key: keyof T; direction?: SortDirection };
  enableColumnSorting?: boolean;
  pageSizeOptions?: number[];
  initialPageSize?: number;
  showPagination?: boolean;
  hideAddButton?: boolean;
  /**
   * Título de cada tarjeta en móvil. Por defecto se usa la primera columna
   * (que entonces no se repite en el cuerpo de la tarjeta).
   */
  mobileTitle?: (item: T) => ReactNode;
}

const toComparableValue = (value: unknown): string | number | null => {
  if (value === null || value === undefined) return null;

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "";

    const maybeDate = Date.parse(trimmed);
    if (!Number.isNaN(maybeDate) && /[-/:]/.test(trimmed)) {
      return maybeDate;
    }

    const numericText = trimmed.replace(/,/g, "");
    const maybeNumber = Number(numericText);
    if (!Number.isNaN(maybeNumber) && /^-?\d+(\.\d+)?$/.test(numericText)) {
      return maybeNumber;
    }

    return trimmed.toLowerCase();
  }

  return String(value).toLowerCase();
};

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
  searchFields,
  searchAccessor,
  defaultSort,
  enableColumnSorting = true,
  pageSizeOptions = [10, 20, 50],
  initialPageSize = 10,
  showPagination = true,
  hideAddButton = false,
  mobileTitle,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<keyof T | null>(defaultSort?.key ?? null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultSort?.direction ?? "asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const deferredSearchTerm = useDeferredValue(searchTerm);

  const normalizedPageSizeOptions = useMemo(() => {
    const base = Array.from(new Set([...pageSizeOptions, initialPageSize]))
      .filter((value) => Number.isInteger(value) && value > 0)
      .sort((a, b) => a - b);

    return base.length > 0 ? base : [10, 20, 50];
  }, [pageSizeOptions, initialPageSize]);

  const effectiveSearchFields = useMemo(() => {
    if (searchFields && searchFields.length > 0) return searchFields;
    return searchField ? [searchField] : [];
  }, [searchField, searchFields]);

  const searchableByLocalFields =
    effectiveSearchFields.length > 0 || typeof searchAccessor === "function";

  // Filtrado de búsqueda memoizado
  const filteredData = useMemo(() => {
    if (!deferredSearchTerm.trim() || !searchableByLocalFields) return data;

    return data.filter((item) =>
      matchesSearch(deferredSearchTerm, [
        ...effectiveSearchFields.map((field) => item[field]),
        searchAccessor ? searchAccessor(item) : "",
      ])
    );
  }, [data, deferredSearchTerm, effectiveSearchFields, searchAccessor, searchableByLocalFields]);

  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;

    const column = columns.find((item) => item.key === sortKey);
    const direction = sortDirection === "asc" ? 1 : -1;

    return [...filteredData].sort((a, b) => {
      const leftRaw = column?.sortValue ? column.sortValue(a) : a[sortKey];
      const rightRaw = column?.sortValue ? column.sortValue(b) : b[sortKey];

      const left = toComparableValue(leftRaw);
      const right = toComparableValue(rightRaw);

      if (left === right) return 0;
      if (left === null) return 1;
      if (right === null) return -1;

      if (typeof left === "number" && typeof right === "number") {
        return (left - right) * direction;
      }

      return String(left).localeCompare(String(right), "es", {
        sensitivity: "base",
        numeric: true,
      }) * direction;
    });
  }, [columns, filteredData, sortDirection, sortKey]);

  const totalItems = sortedData.length;
  const totalPages = showPagination ? Math.max(1, Math.ceil(totalItems / pageSize)) : 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);

  useEffect(() => {
    setCurrentPage(1);
  }, [deferredSearchTerm, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedData = useMemo(() => {
    if (!showPagination) return sortedData;
    const start = (safeCurrentPage - 1) * pageSize;
    const end = start + pageSize;
    return sortedData.slice(start, end);
  }, [pageSize, safeCurrentPage, showPagination, sortedData]);

  const fromItem = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const toItem = totalItems === 0 ? 0 : Math.min(safeCurrentPage * pageSize, totalItems);

  const handleSort = (column: Column<T>) => {
    if (!enableColumnSorting || column.key === "actions" || column.sortable === false) return;

    const key = column.key as keyof T;
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDirection("asc");
  };

  const getSortIcon = (column: Column<T>) => {
    if (column.key === "actions" || column.sortable === false || !enableColumnSorting) return null;
    if (sortKey !== column.key) return <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />;
    return sortDirection === "asc" ? (
      <ArrowUp className="w-3.5 h-3.5 text-primary" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-primary" />
    );
  };

  const renderCellValue = (column: Column<T>, item: T): ReactNode =>
    column.render
      ? column.render(item[column.key as keyof T], item)
      : String(item[column.key as keyof T] ?? "-");

  const renderDefaultActions = (item: T, large = false) => (
    <div className="flex gap-2">
      {onEdit && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEdit(item)}
          className={`border-primary-200 text-primary hover:bg-primary-50 ${large ? "h-10 flex-1 gap-1.5" : ""}`}
          title="Editar"
          aria-label="Editar"
        >
          <Edit className="w-4 h-4" />
          {large && <span>Editar</span>}
        </Button>
      )}
      {onDelete && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDelete(item)}
          className={`border-red-200 text-red-600 hover:bg-red-50 ${large ? "h-10 flex-1 gap-1.5" : ""}`}
          title="Eliminar"
          aria-label="Eliminar"
        >
          <Trash2 className="w-4 h-4" />
          {large && <span>Eliminar</span>}
        </Button>
      )}
    </div>
  );

  // ── Vista de tarjetas (móvil) ─────────────────────────────────────────────
  const actionsColumn = columns.find((column) => column.key === "actions");
  const hasActions = Boolean(actionsColumn?.render || onEdit || onDelete);
  const dataColumns = columns.filter((column) => column.key !== "actions");
  const titleColumn = mobileTitle ? undefined : dataColumns[0];
  const cardBodyColumns = dataColumns.filter(
    (column) => column !== titleColumn && !column.hideOnMobile
  );

  const sortableColumns = enableColumnSorting
    ? dataColumns.filter((column) => column.sortable !== false && column.header)
    : [];
  const mobileSortValue = sortKey ? `${String(sortKey)}:${sortDirection}` : "";
  const handleMobileSortChange = (value: string) => {
    if (!value) {
      setSortKey(null);
      return;
    }
    const separator = value.lastIndexOf(":");
    setSortKey(value.slice(0, separator) as keyof T);
    setSortDirection(value.slice(separator + 1) as SortDirection);
  };

  const renderCard = (item: T) => (
    <li key={item.id} className="p-4 space-y-3">
      <div className="font-semibold text-base text-primary-900 break-words">
        {mobileTitle ? mobileTitle(item) : titleColumn ? renderCellValue(titleColumn, item) : null}
      </div>
      {cardBodyColumns.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          {cardBodyColumns.map((column) => (
            <div key={String(column.key)} className="min-w-0 break-words">
              {column.header && <dt className="text-xs text-gray-500">{column.header}</dt>}
              <dd className="mt-0.5 text-gray-900">{renderCellValue(column, item)}</dd>
            </div>
          ))}
        </dl>
      )}
      {hasActions && (
        <div className="pt-1 [&_button]:min-h-10 [&_button]:min-w-10">
          {actionsColumn?.render ? (
            <div className="flex flex-wrap gap-2">{actionsColumn.render(null, item)}</div>
          ) : (
            renderDefaultActions(item, true)
          )}
        </div>
      )}
    </li>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
        <h2 className="text-2xl font-bold text-primary-900">{title}</h2>
        <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:flex-wrap md:items-center">
          {searchableByLocalFields && (
            <SearchFilter
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={setSearchTerm}
              className="w-full md:w-64"
            />
          )}
          {sortableColumns.length > 0 && (
            // En la tabla se ordena tocando la cabecera; en las tarjetas no hay cabecera.
            <select
              value={mobileSortValue}
              onChange={(event) => handleMobileSortChange(event.target.value)}
              className="md:hidden h-10 w-full rounded-md border border-input bg-background px-3 text-base"
              aria-label="Ordenar por"
            >
              <option value="">Sin ordenar</option>
              {sortableColumns.map((column) => (
                <optgroup key={String(column.key)} label={column.header}>
                  <option value={`${String(column.key)}:asc`}>{column.header} (ascendente)</option>
                  <option value={`${String(column.key)}:desc`}>{column.header} (descendente)</option>
                </optgroup>
              ))}
            </select>
          )}
          {onAdd && !hideAddButton && (
            <Button
              onClick={onAdd}
              className="w-full md:w-auto bg-primary hover:bg-primary-600 text-white font-medium px-4 py-2 rounded-lg shadow-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {addButtonText}
            </Button>
          )}
        </div>
      </div>

      {/* Tarjetas (móvil) */}
      <div className="md:hidden bg-white rounded-lg border border-secondary-medium shadow-sm">
        {isLoading ? (
          <p className="text-center py-8 text-secondary-dark">Cargando...</p>
        ) : paginatedData.length === 0 ? (
          <p className="text-center py-8 text-secondary-dark">
            {searchTerm ? "No se encontraron resultados" : "No hay datos disponibles"}
          </p>
        ) : (
          <ul className="divide-y divide-secondary-medium">{paginatedData.map(renderCard)}</ul>
        )}
      </div>

      {/* Tabla */}
      <div className="hidden md:block bg-white rounded-lg border border-secondary-medium shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary-light">
              {columns.map((column) => (
                <TableHead
                  key={String(column.key)}
                  className="font-semibold text-primary-900"
                >
                  {column.key === "actions" || column.sortable === false || !enableColumnSorting ? (
                    column.header
                  ) : (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 hover:text-primary transition-colors"
                      onClick={() => handleSort(column)}
                    >
                      <span>{column.header}</span>
                      {getSortIcon(column)}
                    </button>
                  )}
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
            ) : paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-8 text-secondary-dark">
                  {searchTerm ? "No se encontraron resultados" : "No hay datos disponibles"}
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((item) => (
                <TableRow key={item.id} className="hover:bg-secondary-light transition-colors">
                  {columns.map((column) => (
                    <TableCell key={String(column.key)} className="py-4">
                      {column.key === "actions"
                        ? // Render personalizado tiene prioridad sobre los botones por defecto
                          column.render
                          ? column.render(null, item)
                          : renderDefaultActions(item)
                        : renderCellValue(column, item)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {!isLoading && showPagination && totalItems > 0 && (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-sm text-gray-600">
          <p>
            Mostrando {fromItem} - {toItem} de {totalItems} elementos
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2">
              <span>Filas</span>
              <select
                value={pageSize}
                onChange={(event) => setPageSize(Number(event.target.value))}
                className="h-8 rounded-md border border-gray-300 bg-white px-2 text-base md:text-sm"
              >
                {normalizedPageSizeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={safeCurrentPage <= 1}
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              >
                Anterior
              </Button>
              <span className="min-w-[90px] text-center">
                Página {safeCurrentPage} de {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={safeCurrentPage >= totalPages}
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
