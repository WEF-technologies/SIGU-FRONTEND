
import { Badge } from "@/components/ui/badge";
import { EntityStatus } from "@/types";

interface StatusBadgeProps {
  status: EntityStatus;
  type?: 'default' | 'maintenance';
}

export function StatusBadge({ status, type = 'default' }: StatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'active':
        return {
          text: 'Activo',
          className: 'bg-green-100 text-green-800 border-green-200'
        };
      case 'inactive':
        return {
          text: 'Inactivo',
          className: 'bg-gray-100 text-gray-800 border-gray-200'
        };
      case 'maintenance':
        return {
          text: 'Mantenimiento',
          className: 'bg-yellow-100 text-yellow-800 border-yellow-200'
        };
      case 'completed':
        return {
          text: 'Completado',
          className: 'bg-blue-100 text-blue-800 border-blue-200'
        };
      default:
        return {
          text: status,
          className: 'bg-gray-100 text-gray-800 border-gray-200'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Badge className={`${config.className} font-medium`}>
      {config.text}
    </Badge>
  );
}
