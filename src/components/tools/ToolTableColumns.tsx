import { Tool } from "@/types";
import { Badge } from "@/components/ui/badge";
import { ToolActions } from "./ToolActions";

interface Column<T> {
  key: keyof T | "actions";
  header: string;
  render?: (value: any, item: T) => React.ReactNode;
}

interface ToolTableColumnsProps {
  onViewDetails: (tool: Tool) => void;
  onEdit: (tool: Tool) => void;
  onDelete: (tool: Tool) => void;
}

const statusConfig: Record<Tool["status"], { label: string; className: string }> = {
  disponible: { label: "Disponible", className: "bg-green-100 text-green-800 border-green-200" },
  en_uso: { label: "En uso", className: "bg-blue-100 text-blue-800 border-blue-200" },
  en_mantenimiento: { label: "En mantenimiento", className: "bg-amber-100 text-amber-800 border-amber-200" },
  retirada: { label: "Retirada", className: "bg-gray-100 text-gray-800 border-gray-200" },
};

const getExpiryMeta = (expiryDate?: string) => {
  if (!expiryDate) return { text: "-", tone: "text-gray-400" };

  const today = new Date();
  const date = new Date(expiryDate);
  const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { text: `${date.toLocaleDateString("es-ES")} (vencida)`, tone: "text-red-600 font-medium" };
  }
  if (diffDays <= 30) {
    return { text: `${date.toLocaleDateString("es-ES")} (${diffDays} días)`, tone: "text-amber-600 font-medium" };
  }
  return { text: date.toLocaleDateString("es-ES"), tone: "text-gray-700" };
};

export const getToolTableColumns = ({
  onViewDetails,
  onEdit,
  onDelete,
}: ToolTableColumnsProps): Column<Tool>[] => [
  {
    key: "code",
    header: "Código",
    render: (value) => <span className="font-mono text-sm font-semibold">{value}</span>,
  },
  {
    key: "name",
    header: "Nombre",
    render: (value) => <span className="font-medium">{value}</span>,
  },
  {
    key: "category",
    header: "Categoría",
  },
  {
    key: "location",
    header: "Ubicación",
  },
  {
    key: "assigned_to",
    header: "Asignada a",
    render: (value) => (value ? <span>{value}</span> : <span className="text-gray-400">-</span>),
  },
  {
    key: "expiry_date",
    header: "Vencimiento",
    render: (value) => {
      const meta = getExpiryMeta(value);
      return <span className={meta.tone}>{meta.text}</span>;
    },
  },
  {
    key: "status",
    header: "Estado",
    render: (value) => {
      const cfg = statusConfig[value as Tool["status"]] ?? statusConfig.disponible;
      return <Badge className={cfg.className}>{cfg.label}</Badge>;
    },
  },
  {
    key: "actions",
    header: "Acciones",
    render: (_, tool) => (
      <ToolActions
        tool={tool}
        onViewDetails={onViewDetails}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    ),
  },
];
