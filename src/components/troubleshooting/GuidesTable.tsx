import { useMemo } from "react";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  formatCategory,
  formatSeverity,
  formatStatus,
  getSeverityBadgeClass,
  getStatusBadgeClass,
} from "@/components/troubleshooting/guideUtils";
import { TroubleshootingGuide } from "@/types";
import { Edit, Eye, Trash2 } from "lucide-react";

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

interface GuidesTableProps {
  guides: TroubleshootingGuide[];
  isLoading: boolean;
  page: number;
  pageSize: number;
  hasMore: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onView: (guide: TroubleshootingGuide) => void;
  onEdit: (guide: TroubleshootingGuide) => void;
  onDelete: (guide: TroubleshootingGuide) => void;
  onAdd: () => void;
}

/**
 * Listado paginado del manual.
 *
 * La paginacion y el orden viven en el servidor (`limit`/`offset`, mas recientes
 * primero), asi que la tabla no reordena ni pagina por su cuenta: hacerlo solo
 * sobre la pagina cargada daria un orden falso sobre el total.
 */
export function GuidesTable({
  guides,
  isLoading,
  page,
  pageSize,
  hasMore,
  onPageChange,
  onPageSizeChange,
  onView,
  onEdit,
  onDelete,
  onAdd,
}: GuidesTableProps) {
  const columns = useMemo<Column<TroubleshootingGuide>[]>(
    () => [
      {
        key: "code",
        header: "Falla",
        render: (_, guide) => (
          <div>
            <p className="font-medium text-gray-900">
              {guide.code} · {guide.title}
            </p>
            <p className="line-clamp-2 text-xs text-gray-500">{guide.symptom}</p>
          </div>
        ),
      },
      {
        key: "category",
        header: "Categoria",
        render: (_, guide) => (
          <Badge variant="outline" className="border-primary-200 text-primary-800">
            {formatCategory(guide.category)}
          </Badge>
        ),
      },
      {
        key: "severity",
        header: "Severidad",
        render: (_, guide) => (
          <Badge variant="outline" className={getSeverityBadgeClass(guide.severity)}>
            {formatSeverity(guide.severity)}
          </Badge>
        ),
      },
      {
        key: "resolution_steps",
        header: "Pasos",
        render: (_, guide) => (
          <span className="text-sm text-gray-700">{guide.resolution_steps.length}</span>
        ),
      },
      {
        key: "requires_workshop",
        header: "Taller",
        render: (_, guide) =>
          guide.requires_workshop ? (
            <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700">
              Requiere taller
            </Badge>
          ) : (
            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
              En ruta
            </Badge>
          ),
      },
      {
        key: "status",
        header: "Estado",
        render: (_, guide) => (
          <Badge variant="outline" className={getStatusBadgeClass(guide.status)}>
            {formatStatus(guide.status)}
          </Badge>
        ),
      },
      {
        key: "actions",
        header: "Acciones",
        sortable: false,
        render: (_, guide) => (
          // Sin wrap: las tres acciones caben en una linea y la tabla ya scrollea.
          <div className="flex flex-nowrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-primary-200 text-primary hover:bg-primary-50"
              onClick={() => onView(guide)}
              aria-label={`Ver la falla ${guide.code}`}
            >
              <Eye className="h-4 w-4" />
              Ver
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-primary-200 text-primary hover:bg-primary-50"
              onClick={() => onEdit(guide)}
              aria-label={`Editar la falla ${guide.code}`}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-red-200 text-red-600 hover:bg-red-50"
              onClick={() => onDelete(guide)}
              aria-label={`Eliminar la falla ${guide.code}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [onDelete, onEdit, onView]
  );

  const firstItem = guides.length === 0 ? 0 : page * pageSize + 1;
  const lastItem = page * pageSize + guides.length;

  return (
    <div className="space-y-4">
      <DataTable
        title="Listado general"
        data={guides}
        columns={columns}
        onAdd={onAdd}
        addButtonText="Agregar falla"
        isLoading={isLoading}
        enableColumnSorting={false}
        showPagination={false}
      />

      <div className="flex flex-col gap-3 text-sm text-gray-600 md:flex-row md:items-center md:justify-between">
        <p>
          {guides.length === 0
            ? "Sin resultados para los filtros aplicados"
            : `Mostrando ${firstItem} - ${lastItem} · ordenadas por actualizacion mas reciente`}
        </p>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2">
            <span>Filas</span>
            <select
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              className="h-8 rounded-md border border-gray-300 bg-white px-2 text-sm"
              aria-label="Resultados por pagina"
            >
              {PAGE_SIZE_OPTIONS.map((option) => (
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
              disabled={page === 0 || isLoading}
              onClick={() => onPageChange(page - 1)}
            >
              Anterior
            </Button>
            <span className="min-w-[80px] text-center">Pagina {page + 1}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!hasMore || isLoading}
              onClick={() => onPageChange(page + 1)}
            >
              Siguiente
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
