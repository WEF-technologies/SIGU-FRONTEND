import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Column } from "@/components/shared/DataTable";
import { ExpiryCell } from "@/components/shared/ExpiryCell";
import { TwoLineCell } from "@/components/shared/TwoLineCell";
import { formatDateOnly } from "@/lib/dates";
import { describeExpiry, getExpiryTone } from "@/lib/expiry";
import { CalendarClock } from "lucide-react";
import { ToolActions } from "./ToolActions";
import { ToolRow } from "./toolExpiry";

const statusConfig: Record<ToolRow["status"], { label: string; className: string }> = {
  disponible: { label: "Disponible", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  en_uso: { label: "En uso", className: "border-blue-200 bg-blue-50 text-blue-700" },
  en_mantenimiento: { label: "En mantenimiento", className: "border-violet-200 bg-violet-50 text-violet-700" },
  retirada: { label: "Retirada", className: "border-slate-200 bg-slate-100 text-slate-600" },
};

const toolCell = (tool: ToolRow) => <TwoLineCell primary={tool.name} secondary={tool.code} />;

const locationCell = (tool: ToolRow) => (
  <TwoLineCell primary={tool.location || "-"} secondary={tool.assigned_to ? `Asignada a ${tool.assigned_to}` : null} />
);

const expiryCell = (tool: ToolRow) => {
  if (!tool.expiry_date) return <span className="text-gray-400">Sin vencimiento</span>;
  const date = formatDateOnly(tool.expiry_date);
  if (!tool.expiry_status || tool.days_to_expiry === null) return <ExpiryCell date={date} tone="muted" />;
  return (
    <ExpiryCell
      date={date}
      label={describeExpiry(tool.expiry_status, tool.days_to_expiry)}
      tone={getExpiryTone(tool.expiry_status)}
    />
  );
};

const expirySortValue = (tool: ToolRow) => tool.expiry_date ?? null;

interface ToolTableColumnsProps {
  onViewDetails: (tool: ToolRow) => void;
  onEdit: (tool: ToolRow) => void;
  onDelete: (tool: ToolRow) => void;
}

export const getToolTableColumns = ({ onViewDetails, onEdit, onDelete }: ToolTableColumnsProps): Column<ToolRow>[] => [
  { key: "name", header: "Herramienta", render: (_, tool) => toolCell(tool) },
  { key: "category", header: "Categoría" },
  { key: "location", header: "Ubicación", render: (_, tool) => locationCell(tool) },
  { key: "expiry_date", header: "Vencimiento", render: (_, tool) => expiryCell(tool), sortValue: expirySortValue },
  {
    key: "status",
    header: "Estado",
    render: (value) => {
      const cfg = statusConfig[value as ToolRow["status"]] ?? statusConfig.disponible;
      return (
        <Badge variant="outline" className={cfg.className}>
          {cfg.label}
        </Badge>
      );
    },
  },
  {
    key: "actions",
    header: "Acciones",
    sortable: false,
    render: (_, tool) => (
      <ToolActions tool={tool} onViewDetails={onViewDetails} onEdit={onEdit} onDelete={onDelete} />
    ),
  },
];

/** Columnas de la pestaña Alertas: lo justo para decidir y el boton para resolver. */
export const getToolAlertColumns = ({ onEdit }: Pick<ToolTableColumnsProps, "onEdit">): Column<ToolRow>[] => [
  { key: "name", header: "Herramienta", render: (_, tool) => toolCell(tool) },
  { key: "location", header: "Ubicación", render: (_, tool) => locationCell(tool) },
  { key: "expiry_date", header: "Vencimiento", render: (_, tool) => expiryCell(tool), sortValue: expirySortValue },
  {
    key: "actions",
    header: "",
    sortable: false,
    render: (_, tool) => (
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => onEdit(tool)}
        className="border-primary-200 text-primary hover:bg-primary-50"
      >
        <CalendarClock className="mr-1.5 h-4 w-4" />
        Actualizar vencimiento
      </Button>
    ),
  },
];
