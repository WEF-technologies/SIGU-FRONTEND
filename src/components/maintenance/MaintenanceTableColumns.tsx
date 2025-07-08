
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Maintenance as MaintenanceType } from "@/types";
import { maintenanceTypeConfig } from "@/constants/maintenanceTypes";
import { Eye, Edit, Trash2 } from "lucide-react";

interface MaintenanceTableColumnsProps {
  onViewDetails: (maintenance: MaintenanceType) => void;
  onEdit: (maintenance: MaintenanceType) => void;
  onDelete: (maintenance: MaintenanceType) => void;
}

export function getMaintenanceTableColumns({ 
  onViewDetails, 
  onEdit, 
  onDelete 
}: MaintenanceTableColumnsProps) {
  return [
    { key: 'vehicle_plate' as keyof MaintenanceType, header: 'Placa Vehículo' },
    { 
      key: 'type' as keyof MaintenanceType, 
      header: 'Tipo',
      render: (value: MaintenanceType['type']) => {
        const config = maintenanceTypeConfig[value];
        return <Badge className={config.color}>{value}</Badge>;
      }
    },
    { key: 'description' as keyof MaintenanceType, header: 'Descripción' },
    { 
      key: 'date' as keyof MaintenanceType, 
      header: 'Fecha',
      render: (value: any) => new Date(value).toLocaleDateString()
    },
    { 
      key: 'kilometers' as keyof MaintenanceType, 
      header: 'Kilómetros',
      render: (value: any) => value ? value.toLocaleString() + ' km' : 'N/A'
    },
    { 
      key: 'next_maintenance_km' as keyof MaintenanceType, 
      header: 'Próximo Mant. (km)',
      render: (value: any) => value ? value.toLocaleString() + ' km' : 'N/A'
    },
    { 
      key: 'actions' as keyof MaintenanceType, 
      header: 'Acciones',
      render: (value: any, row: MaintenanceType) => (
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onViewDetails(row)}
            className="h-8 w-8 p-0"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onEdit(row)}
            className="h-8 w-8 p-0"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDelete(row)}
            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];
}
