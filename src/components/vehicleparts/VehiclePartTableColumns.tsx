import { VehiclePart } from "@/types";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { VehiclePartActions } from "./VehiclePartActions";

interface Column<T> {
  key: keyof T | 'actions';
  header: string;
  render?: (value: any, item: T) => React.ReactNode;
}

interface VehiclePartTableColumnsProps {
  onViewDetails: (part: VehiclePart) => void;
  onEdit: (part: VehiclePart) => void;
  onDelete: (part: VehiclePart) => void;
}

export const getVehiclePartTableColumns = ({
  onViewDetails,
  onEdit,
  onDelete,
}: VehiclePartTableColumnsProps): Column<VehiclePart>[] => [
  {
    key: "vehicle_plate",
    header: "Vehículo",
    render: (value) => (
      <div className="font-medium">{value}</div>
    ),
  },
  {
    key: "type",
    header: "Tipo",
    render: (value) => (
      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
        {value}
      </Badge>
    ),
  },
  {
    key: "code",
    header: "Código",
    render: (value) => (
      <div className="font-mono text-sm">{value}</div>
    ),
  },
  {
    key: "position",
    header: "Posición",
    render: (value) => {
      return value ? (
        <div className="text-sm">{value}</div>
      ) : (
        <span className="text-gray-400">-</span>
      );
    },
  },
  {
    key: "installed_date",
    header: "F. Instalación",
    render: (value) => {
      return <div className="text-sm">{new Date(value).toLocaleDateString('es-ES')}</div>;
    },
  },
  {
    key: "installed_kilometers",
    header: "Km Instalación",
    render: (value) => {
      return value ? (
        <div className="text-sm">{value.toLocaleString()} km</div>
      ) : (
        <span className="text-gray-400">-</span>
      );
    },
  },
  {
    key: "life_kilometers",
    header: "Vida Útil (km)",
    render: (value) => {
      return value ? (
        <div className="text-sm font-medium">{value.toLocaleString()} km</div>
      ) : (
        <span className="text-gray-400">-</span>
      );
    },
  },
  {
    key: "expiry_date",
    header: "F. Vencimiento",
    render: (value) => {
      if (!value) return <span className="text-gray-400">-</span>;
      
      const expiryDate = new Date(value);
      const today = new Date();
      const isExpired = expiryDate < today;
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      return (
        <div className="text-sm">
          <div className={isExpired ? "text-red-600 font-medium" : ""}>
            {expiryDate.toLocaleDateString('es-ES')}
          </div>
          {isExpired && (
            <div className="text-xs text-red-500">Vencido</div>
          )}
          {!isExpired && daysUntilExpiry <= 30 && (
            <div className="text-xs text-amber-600">{daysUntilExpiry} días</div>
          )}
        </div>
      );
    },
  },
  {
    key: "status",
    header: "Estado",
    render: (value) => {
      const statusMap = {
        active: { label: "Activo", variant: "default" as const },
        maintenance: { label: "Mantenimiento", variant: "outline" as const },
        removed: { label: "Removido", variant: "secondary" as const },
      };
      
      const config = statusMap[value as keyof typeof statusMap] || statusMap.active;
      
      return <StatusBadge status={value} text={config.label} variant={config.variant} />;
    },
  },
  {
    key: "actions",
    header: "Acciones",
    render: (_, part) => {
      return (
        <VehiclePartActions
          part={part}
          onViewDetails={onViewDetails}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      );
    },
  },
];