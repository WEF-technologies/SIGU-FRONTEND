
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelect } from '@/components/contracts/MultiSelect';
import { Contract, Vehicle, User } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, FileText } from 'lucide-react';

interface ContractFormProps {
  contract?: Contract | null;
  onSubmit: (contractData: Omit<Contract, 'id' | 'created_at' | 'updated_at'>) => void;
  onCancel: () => void;
  isLoading?: boolean;
  availableVehicles: Vehicle[];
  availableUsers: User[];
}

export function ContractForm({ 
  contract, 
  onSubmit, 
  onCancel, 
  isLoading = false,
  availableVehicles,
  availableUsers 
}: ContractFormProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    description: '',
    start_date: '',
    end_date: '',
    location: '',
    status: 'active' as Contract['status'],
    contract_code: '',
    vehicle_ids: [] as string[],
    user_ids: [] as string[],
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    if (contract) {
      setFormData({
        description: contract.description,
        start_date: contract.start_date,
        end_date: contract.end_date,
        location: contract.location,
        status: contract.status,
        contract_code: contract.contract_code || '',
        vehicle_ids: contract.vehicles?.map(v => v.id) || [],
        user_ids: contract.users?.map(u => u.id) || [],
      });
    }
  }, [contract]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const selectedVehicles = availableVehicles.filter(v => formData.vehicle_ids.includes(v.id));
    const selectedUsers = availableUsers.filter(u => formData.user_ids.includes(u.id));

    const contractData = {
      description: formData.description,
      start_date: formData.start_date,
      end_date: formData.end_date,
      location: formData.location,
      status: formData.status,
      contract_code: formData.contract_code,
      vehicles: selectedVehicles,
      users: selectedUsers,
      document_url: selectedFile ? `mock://document/${selectedFile.name}` : undefined,
    };

    onSubmit(contractData);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (allowedTypes.includes(file.type)) {
        setSelectedFile(file);
      } else {
        toast({
          title: "Archivo no válido",
          description: "Solo se permiten archivos PDF y Word",
          variant: "destructive",
        });
      }
    }
  };

  // Preparar opciones para los MultiSelect
  const vehicleOptions = availableVehicles.map(vehicle => ({
    id: vehicle.id,
    label: vehicle.plate_number,
    sublabel: `${vehicle.brand} ${vehicle.model}`
  }));

  const userOptions = availableUsers.map(user => ({
    id: user.id,
    label: `${user.name} ${user.last_name || user.lastname}`,
    sublabel: user.document_number
  }));

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="contract_code">Código del Contrato</Label>
          <Input
            id="contract_code"
            value={formData.contract_code}
            onChange={(e) => setFormData(prev => ({ ...prev, contract_code: e.target.value }))}
            placeholder="CNT-2024-001"
            required
          />
        </div>

        <div>
          <Label htmlFor="status">Estado</Label>
          <Select
            value={formData.status}
            onValueChange={(value: Contract['status']) => 
              setFormData(prev => ({ ...prev, status: value }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Activo</SelectItem>
              <SelectItem value="inactive">Inactivo</SelectItem>
              <SelectItem value="terminated">Terminado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="description">Descripción</Label>
        <Input
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="start_date">Fecha de Inicio</Label>
          <Input
            id="start_date"
            type="date"
            value={formData.start_date}
            onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="end_date">Fecha de Fin</Label>
          <Input
            id="end_date"
            type="date"
            value={formData.end_date}
            onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="location">Ubicación</Label>
        <Input
          id="location"
          value={formData.location}
          onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
          required
        />
      </div>

      <div>
        <Label htmlFor="document">Documento del Contrato (PDF o Word)</Label>
        <div className="flex items-center gap-2">
          <Input
            id="document"
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleFileChange}
            className="cursor-pointer"
          />
          <Upload className="w-4 h-4 text-gray-500" />
        </div>
        {selectedFile && (
          <div className="flex items-center gap-2 mt-2">
            <FileText className="w-4 h-4" />
            <span className="text-sm text-gray-600">{selectedFile.name}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MultiSelect
          title="Vehículos Asignados"
          options={vehicleOptions}
          selectedIds={formData.vehicle_ids}
          onSelectionChange={(selectedIds) => 
            setFormData(prev => ({ ...prev, vehicle_ids: selectedIds }))
          }
          placeholder="Buscar vehículos por placa o modelo..."
        />

        <MultiSelect
          title="Usuarios/Choferes Asignados"
          options={userOptions}
          selectedIds={formData.user_ids}
          onSelectionChange={(selectedIds) => 
            setFormData(prev => ({ ...prev, user_ids: selectedIds }))
          }
          placeholder="Buscar usuarios por nombre o documento..."
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancelar
        </Button>
        <Button 
          type="submit" 
          className="bg-primary hover:bg-primary-600"
          disabled={isLoading}
        >
          {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {contract ? "Actualizar" : "Crear"}
        </Button>
      </div>
    </form>
  );
}
