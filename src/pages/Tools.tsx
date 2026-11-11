import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { DataTable } from "@/components/shared/DataTable";
import { AlertCountBadge } from "@/components/shared/AlertCountBadge";
import { AlertSummaryBanner } from "@/components/shared/AlertSummaryBanner";
import { FilterField, FilterPanel, FilterSelect } from "@/components/shared/FilterPanel";
import { PageHeader } from "@/components/shared/PageHeader";
import { ToolDetailsModal } from "@/components/tools/ToolDetailsModal";
import { ToolFormModal } from "@/components/tools/ToolFormModal";
import { getToolAlertColumns, getToolTableColumns } from "@/components/tools/ToolTableColumns";
import { TOOL_STATUS_OPTIONS, ToolRow, buildToolRows } from "@/components/tools/toolExpiry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTools } from "@/hooks/useTools";
import { useConfirm } from "@/hooks/useConfirm";
import { formatDayCount, pluralize } from "@/lib/alertTone";
import { DEFAULT_NEAR_DAYS, describeExpiry, isExpiryAlert } from "@/lib/expiry";
import {
  FilterOption,
  buildOptionsFromValues,
  countActiveFilters,
  getOptionLabel,
  matchesOption,
} from "@/lib/filtering";
import { Tool, ToolPayload } from "@/types";
import { RefreshCw } from "lucide-react";

type ToolsTab = "alerts" | "tools";

/** Filtros de la tabla; "" = sin filtro. Se aplican en el cliente al cambiarlos. */
const EMPTY_TOOL_FILTERS = { status: "", category: "", location: "", assigned_to: "" };
/** Sin estado elegido, la pestaña Alertas muestra vencidas y por vencer. */
const EMPTY_ALERT_FILTERS = { status: "", near_days: DEFAULT_NEAR_DAYS };

const ALERT_STATUS_OPTIONS: FilterOption[] = [
  { value: "vencida", label: "Vencidas" },
  { value: "por_vencer", label: "Por vencer" },
  { value: "vigente", label: "Vigentes (al día)" },
];

const TOOL_SEARCH_FIELDS: Array<keyof ToolRow> = ["code", "name", "category", "location", "assigned_to"];

export default function Tools() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { tools, isLoadingTools, hasToolsError, refreshTools, fetchToolById, createTool, updateTool, deleteTool } =
    useTools();
  const confirm = useConfirm();

  const [activeTab, setActiveTab] = useState<ToolsTab>("alerts");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<Tool | null>(null);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [filters, setFilters] = useState(EMPTY_TOOL_FILTERS);
  const [alertFilters, setAlertFilters] = useState(EMPTY_ALERT_FILTERS);
  const nearDays = alertFilters.near_days;

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

  const toolRows = useMemo(() => buildToolRows(tools, nearDays), [tools, nearDays]);

  const expiredCount = toolRows.filter((tool) => tool.expiry_status === "vencida").length;
  const nearCount = toolRows.filter((tool) => tool.expiry_status === "por_vencer").length;

  const alertRows = useMemo(
    () =>
      toolRows.filter((tool) =>
        tool.expiry_status === null
          ? false
          : alertFilters.status
            ? tool.expiry_status === alertFilters.status
            : isExpiryAlert(tool.expiry_status)
      ),
    [alertFilters.status, toolRows]
  );

  const openEdit = (tool: Tool) => {
    setEditingTool(tool);
    setIsModalOpen(true);
  };

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
        onEdit: openEdit,
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

  const alertColumns = useMemo(() => getToolAlertColumns({ onEdit: openEdit }), []);

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
      toolRows.filter(
        (tool) =>
          matchesOption(filters.status, tool.status) &&
          matchesOption(filters.category, tool.category) &&
          matchesOption(filters.location, tool.location) &&
          matchesOption(filters.assigned_to, tool.assigned_to)
      ),
    [toolRows, filters]
  );

  const updateFilter = (key: keyof typeof EMPTY_TOOL_FILTERS, value: string) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const showAlertsTab = () => {
    setAlertFilters((prev) => ({ ...prev, status: "" }));
    setActiveTab("alerts");
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshTools();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSubmit = async (payload: ToolPayload) => {
    if (editingTool) {
      return updateTool(editingTool.id, payload);
    }
    return createTool(payload);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Herramientas"
        description="Herramientas de taller, dónde están y cuándo vencen."
        actions={
          <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        }
      />

      <AlertSummaryBanner
        criticalCount={expiredCount}
        warningCount={nearCount}
        critical={{
          title: `${expiredCount} ${pluralize(expiredCount, "herramienta vencida", "herramientas vencidas")}`,
          description: `${
            nearCount > 0 ? `Además, ${nearCount} por vencer en los próximos ${formatDayCount(nearDays)}. ` : ""
          }Revísalas y actualiza su fecha de vencimiento.`,
        }}
        warning={{
          title: `${nearCount} ${pluralize(nearCount, "herramienta", "herramientas")} por vencer en los próximos ${formatDayCount(nearDays)}`,
          description: "Planifica su revisión antes de que venzan.",
        }}
        ok={{
          title: "Herramientas al día",
          description: `No hay herramientas vencidas ni por vencer en los próximos ${formatDayCount(nearDays)}.`,
        }}
        isLoading={isLoadingTools && tools.length === 0}
        loadingText="Revisando vencimientos de herramientas..."
        hasError={hasToolsError}
        errorText='No se pudieron revisar los vencimientos. Usa "Actualizar" para intentar de nuevo.'
        onShowAlerts={activeTab !== "alerts" ? showAlertsTab : undefined}
      />

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ToolsTab)} className="w-full">
        <TabsList className="grid w-full grid-cols-2 gap-2">
          <TabsTrigger value="alerts" className="gap-2">
            Alertas
            <AlertCountBadge criticalCount={expiredCount} warningCount={nearCount} />
          </TabsTrigger>
          <TabsTrigger value="tools">Herramientas</TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="space-y-4">
          <FilterPanel
            title="Filtros"
            activeCount={countActiveFilters([alertFilters.status, alertFilters.near_days !== DEFAULT_NEAR_DAYS])}
            onClear={() => setAlertFilters(EMPTY_ALERT_FILTERS)}
            advanced={
              <FilterField label="Avisar con (días de anticipación)" htmlFor="tools-alert-near">
                <Input
                  id="tools-alert-near"
                  type="number"
                  min="0"
                  max="365"
                  value={alertFilters.near_days}
                  onChange={(event) =>
                    setAlertFilters((prev) => ({ ...prev, near_days: Math.max(0, Number(event.target.value) || 0) }))
                  }
                />
              </FilterField>
            }
          >
            <FilterSelect
              id="tools-alert-status"
              label="Estado"
              value={alertFilters.status}
              onChange={(value) => setAlertFilters((prev) => ({ ...prev, status: value }))}
              options={ALERT_STATUS_OPTIONS}
              allLabel="Vencidas y por vencer"
            />
          </FilterPanel>

          <DataTable
            data={alertRows}
            columns={alertColumns}
            title="Alertas de vencimiento"
            hideAddButton
            isLoading={isLoadingTools}
            searchFields={TOOL_SEARCH_FIELDS}
            searchAccessor={(tool) =>
              tool.expiry_status && tool.days_to_expiry !== null
                ? describeExpiry(tool.expiry_status, tool.days_to_expiry)
                : ""
            }
            searchPlaceholder="Buscar por código, nombre, ubicación o responsable..."
            defaultSort={{ key: "expiry_date", direction: "asc" }}
            initialPageSize={20}
          />
        </TabsContent>

        <TabsContent value="tools" className="space-y-4">
          <FilterPanel
            title="Filtros"
            activeCount={countActiveFilters(Object.values(filters))}
            onClear={() => setFilters(EMPTY_TOOL_FILTERS)}
            advanced={
              <>
                <FilterSelect
                  id="tool-category-filter"
                  label="Categoría"
                  value={filters.category}
                  onChange={(value) => updateFilter("category", value)}
                  options={filterOptions.category}
                  allLabel="Todas"
                />
                <FilterSelect
                  id="tool-location-filter"
                  label="Ubicación"
                  value={filters.location}
                  onChange={(value) => updateFilter("location", value)}
                  options={filterOptions.location}
                  allLabel="Todas"
                />
                <FilterSelect
                  id="tool-assigned-filter"
                  label="Asignada a"
                  value={filters.assigned_to}
                  onChange={(value) => updateFilter("assigned_to", value)}
                  options={filterOptions.assignedTo}
                  allLabel="Cualquiera"
                />
              </>
            }
          >
            <FilterSelect
              id="tool-status-filter"
              label="Estado"
              value={filters.status}
              onChange={(value) => updateFilter("status", value)}
              options={TOOL_STATUS_OPTIONS}
            />
          </FilterPanel>

          <DataTable
            data={filteredTools}
            columns={columns}
            onAdd={() => {
              setEditingTool(null);
              setIsModalOpen(true);
            }}
            title="Herramientas"
            addButtonText="Registrar herramienta"
            isLoading={isLoadingTools}
            searchFields={TOOL_SEARCH_FIELDS}
            searchAccessor={(tool) => getOptionLabel(TOOL_STATUS_OPTIONS, tool.status)}
            searchPlaceholder="Buscar por código, nombre, ubicación o responsable..."
            defaultSort={{ key: "name", direction: "asc" }}
            initialPageSize={20}
          />
        </TabsContent>
      </Tabs>

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
