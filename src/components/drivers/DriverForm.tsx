
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Driver, Contract } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Upload, Download } from "lucide-react";

interface DriverFormProps {
  driver?: Driver;
  contracts: Contract[];
  onSubmit: (data: Omit<Driver, 'id' | 'created_at' | 'updated_at'>) => void;
  onCancel: () => void;
}

export function DriverForm({ driver, contracts, onSubmit, onCancel }: DriverFormProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: driver?.name || "",
    last_name: driver?.last_name || "",
    document_number: driver?.document_number || "",
    license_type: driver?.license_type || "",
    telephone: driver?.telephone || "",
    blood_type: driver?.blood_type || "",
    address: driver?.address || "",
    contract_id: driver?.contract_id || "",
    status: driver?.status || "active" as 'active' | 'inactive',
    document_url: driver?.document_url || ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const selectedContract = contracts.find(c => c.id === formData.contract_id);
    
    onSubmit({
      ...formData,
      contract: selectedContract
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const fileUrl = URL.createObjectURL(file);
      setFormData({...formData, document_url: fileUrl});
      toast({
        title: "Documento cargado",
        description: `${file.name} ha sido cargado correctamente.`,
      });
    }
  };

  const handleUploadButtonClick = () => {
    const fileInput = document.getElementById('document') as HTMLInputElement;
    fileInput?.click();
  };

  const handleDownloadDocument = () => {
    if (formData.document_url) {
      const link = document.createElement('a');
      link.href = formData.document_url;
      link.download = `documento_${formData.document_number}.pdf`;
      link.click();
      toast({
        title: "Descarga iniciada",
        description: "El documento se está descargando.",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Nombre</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            placeholder="Ingrese el nombre"
            required
          />
        </div>
        
        <div>
          <Label htmlFor="last_name">Apellido</Label>
          <Input
            id="last_name"
            value={formData.last_name}
            onChange={(e) => setFormData({...formData, last_name: e.target.value})}
            placeholder="Ingrese el apellido"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="document_number">Número de Cédula</Label>
          <Input
            id="document_number"
            value={formData.document_number}
            onChange={(e) => setFormData({...formData, document_number: e.target.value})}
            placeholder="Ingrese el número de cédula"
            required
          />
        </div>
        
        <div>
          <Label htmlFor="blood_type">Tipo de Sangre</Label>
          <Select
            value={formData.blood_type}
            onValueChange={(value) => setFormData({...formData, blood_type: value})}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="A+">A+</SelectItem>
              <SelectItem value="A-">A-</SelectItem>
              <SelectItem value="B+">B+</SelectItem>
              <SelectItem value="B-">B-</SelectItem>
              <SelectItem value="AB+">AB+</SelectItem>
              <SelectItem value="AB-">AB-</SelectItem>
              <SelectItem value="O+">O+</SelectItem>
              <SelectItem value="O-">O-</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="license_type">Tipo de Licencia</Label>
          <Select
            value={formData.license_type}
            onValueChange={(value) => setFormData({...formData, license_type: value})}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="A1">A1 - Motocicletas</SelectItem>
              <SelectItem value="A2">A2 - Motocicletas</SelectItem>
              <SelectItem value="B1">B1 - Automóviles</SelectItem>
              <SelectItem value="B2">B2 - Camionetas</SelectItem>
              <SelectItem value="C1">C1 - Camiones</SelectItem>
              <SelectItem value="C2">C2 - Buses</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="telephone">Teléfono</Label>
          <Input
            id="telephone"
            value={formData.telephone}
            onChange={(e) => setFormData({...formData, telephone: e.target.value})}
            placeholder="Ingrese el teléfono"
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="address">Dirección</Label>
        <Textarea
          id="address"
          value={formData.address}
          onChange={(e) => setFormData({...formData, address: e.target.value})}
          placeholder="Ingrese la dirección completa"
          rows={2}
        />
      </div>

      <div>
        <Label htmlFor="contract_id">Contrato</Label>
        <Select
          value={formData.contract_id}
          onValueChange={(value) => setFormData({...formData, contract_id: value})}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar contrato" />
          </SelectTrigger>
          <SelectContent>
            {contracts.map((contract) => (
              <SelectItem key={contract.id} value={contract.id}>
                {contract.contract_code} - {contract.description}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="document">Documento</Label>
        <div className="flex items-center gap-2">
          <Input
            id="document"
            type="file"
            onChange={handleFileUpload}
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            className="flex-1"
            style={{ display: 'none' }}
          />
          <Button type="button" variant="outline" size="sm" onClick={handleUploadButtonClick}>
            <Upload className="w-4 h-4" />
          </Button>
          {formData.document_url && (
            <Button type="button" variant="outline" size="sm" onClick={handleDownloadDocument}>
              <Download className="w-4 h-4" />
            </Button>
          )}
        </div>
        {formData.document_url && (
          <p className="text-sm text-green-600 mt-1">Documento cargado correctamente</p>
        )}
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">
          {driver ? "Actualizar Chofer" : "Crear Chofer"}
        </Button>
      </div>
    </form>
  );
}
