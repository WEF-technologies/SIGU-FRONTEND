
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Driver, Contract } from "@/types";
import { useToast } from "@/hooks/use-toast";

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
    telephone: driver?.telephone || "",
    address: driver?.address || "",
    contract_id: driver?.contract_id || "",
    license_expiry_date: driver?.license_expiry_date || "",
    defensive_driving_expiry_date: driver?.defensive_driving_expiry_date || ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      status: 'active' as 'active' | 'inactive'
    });
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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="license_expiry_date">Vencimiento Licencia</Label>
          <Input
            id="license_expiry_date"
            type="date"
            value={formData.license_expiry_date}
            onChange={(e) => setFormData({...formData, license_expiry_date: e.target.value})}
          />
        </div>
        <div>
          <Label htmlFor="defensive_driving_expiry_date">Vencimiento Manejo Defensivo</Label>
          <Input
            id="defensive_driving_expiry_date"
            type="date"
            value={formData.defensive_driving_expiry_date}
            onChange={(e) => setFormData({...formData, defensive_driving_expiry_date: e.target.value})}
          />
        </div>
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
                {contract.description}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          className="text-gray-700 border-gray-300 hover:bg-gray-50"
        >
          Cancelar
        </Button>
        <Button 
          type="submit"
          className="bg-primary text-white hover:bg-primary/90"
        >
          {driver ? "Actualizar Chofer" : "Crear Chofer"}
        </Button>
      </div>
    </form>
  );
}
