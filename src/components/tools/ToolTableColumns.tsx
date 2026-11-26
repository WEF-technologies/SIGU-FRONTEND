import { Button } from "@/components/ui/button";
import type { Column } from "@/components/shared/DataTable";
import { ExpiryCell } from "@/components/shared/ExpiryCell";
import { RowActions } from "@/components/shared/RowActions";
import { StatusDot, type StatusDotTone } from "@/components/shared/StatusDot";
import { TwoLineCell } from "@/components/shared/TwoLineCell";
import { formatDateOnly } from "@/lib/dates";
import { describeExpiry, getExpiryTone } from "@/lib/expiry";
import { CalendarClock } from "lucide-react";
import { ToolRow } from "./toolExpiry";

const statusConfig: Record<ToolRow["status"], { label: string; tone: StatusDotTone }> = {
  disponible: { label: "Disponible", tone: "green" },
  en_uso: { label: "En uso", tone: "blue" },
  en_mantenimiento: { label: "En mantenimiento", tone: "violet" },
  retirada: { label: "Retirada", tone: "gray" },
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
  // La categoria queda como filtro y en el detalle: en la tabla no ayudaba a decidir.
  { key: "location", header: "Ubicación", render: (_, tool) => locationCell(tool) },
  { key: "expiry_date", header: "Vencimiento", render: (_, tool) => expiryCell(tool), sortValue: expirySortValue },
  {
    key: "status",
    header: "Estado",
    render: (value) => {
      const cfg = statusConfig[value as ToolRow["status"]] ?? statusConfig.disponible;
      return <StatusDot label={cfg.label} tone={cfg.tone} />;
    },
  },
  {
    key: "actions",
    header: "",
    sortable: false,
    render: (_, tool) => (
      <RowActions
        label={tool.name}
        onView={() => onViewDetails(tool)}
        onEdit={() => onEdit(tool)}
        onDelete={() => onDelete(tool)}
      />
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
        variant="ghost"
        onClick={() => onEdit(tool)}
        className="text-primary hover:bg-primary-50 hover:text-primary"
      >
        <CalendarClock className="mr-1.5 h-4 w-4" />
        Actualizar vencimiento
      </Button>
    ),
  },
];
