
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Download, Eye } from "lucide-react";
import { Driver } from "@/types";
import { useToast } from "@/hooks/use-toast";

interface DriverActionsProps {
  driver: Driver;
  onEdit: (driver: Driver) => void;
  onDelete: (driver: Driver) => void;
}

export function DriverActions({ driver, onEdit, onDelete }: DriverActionsProps) {
  const { toast } = useToast();

  const handleDownloadDocument = () => {
    if (driver.document_url) {
      const link = document.createElement('a');
      link.href = driver.document_url;
      link.download = `documento_${driver.document_number}.pdf`;
      link.click();
      toast({
        title: "Descarga iniciada",
        description: "El documento se está descargando.",
      });
    } else {
      toast({
        title: "Sin documento",
        description: "Este chofer no tiene documento cargado.",
        variant: "destructive"
      });
    }
  };

  const handleViewDocument = () => {
    if (driver.document_url) {
      window.open(driver.document_url, '_blank');
      toast({
        title: "Documento abierto",
        description: "El documento se ha abierto en una nueva pestaña.",
      });
    } else {
      toast({
        title: "Sin documento",
        description: "Este chofer no tiene documento cargado.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onEdit(driver)}
        className="border-primary-200 text-primary hover:bg-primary-50"
        title="Editar"
      >
        <Edit className="w-4 h-4" />
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        onClick={handleViewDocument}
        className="border-green-200 text-green-600 hover:bg-green-50"
        title="Ver documento"
      >
        <Eye className="w-4 h-4" />
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        onClick={handleDownloadDocument}
        className="border-blue-200 text-blue-600 hover:bg-blue-50"
        title="Descargar documento"
      >
        <Download className="w-4 h-4" />
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => onDelete(driver)}
        className="border-red-200 text-red-600 hover:bg-red-50"
        title="Eliminar"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}
