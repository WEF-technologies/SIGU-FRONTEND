import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { DataTable } from "@/components/shared/DataTable";
import { ToolAlerts } from "@/components/tools/ToolAlerts";
import { ToolDetailsModal } from "@/components/tools/ToolDetailsModal";
import { ToolFormModal } from "@/components/tools/ToolFormModal";
import { getToolTableColumns } from "@/components/tools/ToolTableColumns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useTools } from "@/hooks/useTools";
import { Tool, ToolPayload, ToolStatus } from "@/types";
import { Filter, RefreshCw } from "lucide-react";

const STATUS_OPTIONS: Array<{ value: ToolStatus; label: string }> = [
  { value: "disponible", label: "Disponible" },
  { value: "en_uso", label: "En uso" },
  { value: "en_mantenimiento", label: "En mantenimiento" },
  { value: "retirada", label: "Retirada" },
];

export default function Tools() {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    tools,
    alerts,
    isLoadingTools,
    isLoadingAlerts,
    fetchTools,
    fetchAlerts,
    fetchToolById,
    createTool,
    updateTool,
    deleteTool,
  } = useTools();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<Tool | null>(null);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);

  const [filters, setFilters] = useState({
    category: "",
    location: "",
    status: "all",
    assigned_to: "",
  });

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
          await deleteTool(tool);
        },
      }),
    [deleteTool, fetchToolById]
  );

  const applyToolFilters = async () => {
    await fetchTools(filters);
  };

  const clearFilters = async () => {
    const reset = { category: "", location: "", status: "all", assigned_to: "" };
    setFilters(reset);
    await fetchTools(reset);
  };

  const refreshAlerts = async () => {
    await fetchAlerts({
      near_days: alertFilters.near_days,
      include_ok: alertFilters.include_ok,
      category: filters.category,
      location: filters.location,
      status: filters.status as ToolStatus | "all",
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
      <div className="bg-white border border-secondary-medium rounded-lg p-4 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-primary-900">Filtros de herramientas</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Input
            placeholder="Categoría"
            value={filters.category}
            onChange={(e) => setFilters((prev) => ({ ...prev, category: e.target.value }))}
          />
          <Input
            placeholder="Ubicación"
            value={filters.location}
            onChange={(e) => setFilters((prev) => ({ ...prev, location: e.target.value }))}
          />
          <Select
            value={filters.status}
            onValueChange={(value) => setFilters((prev) => ({ ...prev, status: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Asignada a"
            value={filters.assigned_to}
            onChange={(e) => setFilters((prev) => ({ ...prev, assigned_to: e.target.value }))}
          />
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={clearFilters}>Limpiar</Button>
          <Button onClick={applyToolFilters} className="bg-primary hover:bg-primary-600">Aplicar filtros</Button>
        </div>
      </div>

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

          <Button variant="outline" className="md:ml-auto" onClick={refreshAlerts}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualizar alertas
          </Button>
        </div>

        <ToolAlerts alerts={alerts} isLoading={isLoadingAlerts} />
      </div>

      <DataTable
        data={tools}
        columns={columns}
        onAdd={() => {
          setEditingTool(null);
          setIsModalOpen(true);
        }}
        title="Control de Herramientas de Taller"
        addButtonText="Registrar herramienta"
        isLoading={isLoadingTools}
        searchField="code"
        searchPlaceholder="Buscar por código..."
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
