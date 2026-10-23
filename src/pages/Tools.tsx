import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { DataTable } from "@/components/shared/DataTable";
import { ToolAlerts } from "@/components/tools/ToolAlerts";
import { ToolDetailsModal } from "@/components/tools/ToolDetailsModal";
import { ToolFormModal } from "@/components/tools/ToolFormModal";
import { getToolTableColumns } from "@/components/tools/ToolTableColumns";
import { FilterPanel, FilterSelect } from "@/components/shared/FilterPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useTools } from "@/hooks/useTools";
import { useConfirm } from "@/hooks/useConfirm";
import { buildOptionsFromValues, countActiveFilters, getOptionLabel, matchesOption } from "@/lib/filtering";
import { Tool, ToolPayload, ToolStatus } from "@/types";
import { RefreshCw } from "lucide-react";

const STATUS_OPTIONS: Array<{ value: ToolStatus; label: string }> = [
  { value: "disponible", label: "Disponible" },
  { value: "en_uso", label: "En uso" },
  { value: "en_mantenimiento", label: "En mantenimiento" },
  { value: "retirada", label: "Retirada" },
];

/** Filtros de la tabla; "" = sin filtro. Se aplican en el cliente al cambiarlos. */
interface ToolFilterState {
  category: string;
  location: string;
  status: string;
  assigned_to: string;
}

const EMPTY_TOOL_FILTERS: ToolFilterState = {
  category: "",
  location: "",
  status: "",
  assigned_to: "",
};

export default function Tools() {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    tools,
    alerts,
    isLoadingTools,
    isLoadingAlerts,
    fetchAlerts,
    fetchToolById,
    createTool,
    updateTool,
    deleteTool,
  } = useTools();
  const confirm = useConfirm();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<Tool | null>(null);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);

  const [filters, setFilters] = useState<ToolFilterState>(EMPTY_TOOL_FILTERS);

  const [alertFilters, setAlertFilters] = useState({
    near_days: 30,
    include_ok: false,
  });

  useEffect(() => {
    const toolIdFromQuery = searchParams.get("toolId");
    if (!toolIdFromQuery) return;

    const openToolFromQuery = async () => {
      const detail = await fetchToolById(toolIdFromQuery);
      if (detail) {
        setSelectedTool(detail);
        setIsDetailsModalOpen(true);
      }

      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("toolId");
      setSearchParams(nextParams, { replace: true });
    };

    openToolFromQuery();
  }, [fetchToolById, searchParams, setSearchParams]);

  const columns = useMemo(
    () =>
      getToolTableColumns({
        onViewDetails: async (tool) => {
          const detail = await fetchToolById(tool.id);
          if (detail) {
            setSelectedTool(detail);
            setIsDetailsModalOpen(true);
          }
        },
        onEdit: (tool) => {
          setEditingTool(tool);
          setIsModalOpen(true);
        },
        onDelete: async (tool) => {
          if (!(await confirm({
            title: "Eliminar herramienta",
            description: `Se eliminará ${tool.code} - ${tool.name}. Esta acción no se puede deshacer.`,
          }))) return;
          await deleteTool(tool);
        },
      }),
    [confirm, deleteTool, fetchToolById]
  );

  const filterOptions = useMemo(
    () => ({
      category: buildOptionsFromValues(tools.map((tool) => tool.category)),
      location: buildOptionsFromValues(tools.map((tool) => tool.location)),
      assignedTo: buildOptionsFromValues(tools.map((tool) => tool.assigned_to)),
    }),
    [tools]
  );

  const filteredTools = useMemo(
    () =>
      tools.filter(
        (tool) =>
          matchesOption(filters.category, tool.category) &&
          matchesOption(filters.location, tool.location) &&
          matchesOption(filters.status, tool.status) &&
          matchesOption(filters.assigned_to, tool.assigned_to)
      ),
    [tools, filters]
  );

  const updateFilter = (key: keyof ToolFilterState, value: string) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const refreshAlerts = async () => {
    await fetchAlerts({
      near_days: alertFilters.near_days,
      include_ok: alertFilters.include_ok,
      category: filters.category,
      location: filters.location,
      status: (filters.status || undefined) as ToolStatus | undefined,
    });
  };

  const handleSubmit = async (payload: ToolPayload) => {
    if (editingTool) {
      return updateTool(editingTool.id, payload);
    }
    return createTool(payload);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <FilterPanel
        title="Filtros de herramientas"
        activeCount={countActiveFilters(Object.values(filters))}
        onClear={() => setFilters(EMPTY_TOOL_FILTERS)}
      >
        <FilterSelect
          id="tool-category-filter"
          label="Categoría"
          value={filters.category}
          onChange={(value) => updateFilter("category", value)}
          options={filterOptions.category}
          allLabel="Todas las categorías"
        />
        <FilterSelect
          id="tool-location-filter"
          label="Ubicación"
          value={filters.location}
          onChange={(value) => updateFilter("location", value)}
          options={filterOptions.location}
          allLabel="Todas las ubicaciones"
        />
        <FilterSelect
          id="tool-status-filter"
          label="Estado"
          value={filters.status}
          onChange={(value) => updateFilter("status", value)}
          options={STATUS_OPTIONS}
          allLabel="Todos los estados"
        />
        <FilterSelect
          id="tool-assigned-filter"
          label="Asignada a"
          value={filters.assigned_to}
          onChange={(value) => updateFilter("assigned_to", value)}
          options={filterOptions.assignedTo}
          allLabel="Cualquier responsable"
        />
      </FilterPanel>

      <div className="bg-white border border-secondary-medium rounded-lg p-4 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-end gap-3">
          <div className="w-full md:w-40">
            <Label htmlFor="near-days">Días para alerta</Label>
            <Input
              id="near-days"
              type="number"
              min={1}
              value={alertFilters.near_days}
              onChange={(e) =>
                setAlertFilters((prev) => ({
                  ...prev,
                  near_days: Number(e.target.value) || 30,
                }))
              }
            />
          </div>

          <div className="flex items-center gap-2 pb-1">
            <Checkbox
              id="include-ok"
              checked={alertFilters.include_ok}
              onCheckedChange={(checked) =>
                setAlertFilters((prev) => ({ ...prev, include_ok: checked === true }))
              }
            />
            <Label htmlFor="include-ok">Incluir estatus OK</Label>
          </div>

          <p className="text-xs text-secondary-dark md:ml-auto md:max-w-xs md:text-right">
            Al actualizar, las alertas usan la categoría, ubicación y estado elegidos arriba.
          </p>
          <Button variant="outline" onClick={refreshAlerts}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualizar alertas
          </Button>
        </div>

        <ToolAlerts alerts={alerts} isLoading={isLoadingAlerts} />
      </div>

      <DataTable
        data={filteredTools}
        columns={columns}
        onAdd={() => {
          setEditingTool(null);
          setIsModalOpen(true);
        }}
        title="Control de Herramientas de Taller"
        addButtonText="Registrar herramienta"
        isLoading={isLoadingTools}
        searchFields={["code", "name", "category", "location", "assigned_to", "status"]}
        searchAccessor={(tool) => getOptionLabel(STATUS_OPTIONS, tool.status)}
        searchPlaceholder="Buscar por código, nombre, categoría, ubicación o responsable..."
        defaultSort={{ key: "name", direction: "asc" }}
        initialPageSize={20}
      />

      <ToolFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingTool={editingTool}
        onSubmit={handleSubmit}
      />

      <ToolDetailsModal
        tool={selectedTool}
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
      />
    </div>
  );
}
