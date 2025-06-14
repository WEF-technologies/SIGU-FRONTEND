
import { Badge } from "@/components/ui/badge";
import { EntityStatus } from "@/types";

interface StatusBadgeProps {
  status: EntityStatus | string;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  text?: string;
  type?: 'default' | 'maintenance';
}

export function StatusBadge({ status, variant, text, type = 'default' }: StatusBadgeProps) {
  const getStatusConfig = () => {
    // Handle spare part request statuses
    if (status === 'pending') {
      return {
        text: text || 'Pendiente',
        className: 'bg-yellow-100 text-yellow-800 border-yellow-200'
      };
    }
    if (status === 'approved') {
      return {
        text: text || 'Aprobado',
        className: 'bg-green-100 text-green-800 border-green-200'
      };
    }
    if (status === 'rejected') {
      return {
        text: text || 'Rechazado',
        className: 'bg-red-100 text-red-800 border-red-200'
      };
    }

    // Handle entity statuses
    switch (status) {
      case 'active':
        return {
          text: text || 'Activo',
          className: 'bg-green-100 text-green-800 border-green-200'
        };
      case 'inactive':
        return {
          text: text || 'Inactivo',
          className: 'bg-gray-100 text-gray-800 border-gray-200'
        };
      case 'maintenance':
        return {
          text: text || 'Mantenimiento',
          className: 'bg-yellow-100 text-yellow-800 border-yellow-200'
        };
      case 'completed':
        return {
          text: text || 'Completado',
          className: 'bg-blue-100 text-blue-800 border-blue-200'
        };
      default:
        return {
          text: text || status,
          className: 'bg-gray-100 text-gray-800 border-gray-200'
        };
    }
  };

  // If variant is provided, use predefined Badge variants
  if (variant) {
    const displayText = text || (typeof status === 'string' ? status : '');
    return (
      <Badge variant={variant} className="font-medium">
        {displayText}
      </Badge>
    );
  }

  const config = getStatusConfig();

  return (
    <Badge className={`${config.className} font-medium`}>
      {config.text}
    </Badge>
  );
}
