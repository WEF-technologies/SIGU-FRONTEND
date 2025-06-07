
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Contract, Vehicle, User } from '@/types';
import { contractsApi } from '@/services/contractsApi';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, FileText } from 'lucide-react';

interface ContractFormProps {
  contract?: Contract | null;
  onSubmit: (contractData: Omit<Contract, 'id' | 'created_at' | 'updated_at'>) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ContractForm({ contract, onSubmit, onCancel, isLoading = false }: ContractFormProps) {
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

  const [availableVehicles, setAvailableVehicles] = useState<Vehicle[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [vehicles, users] = await Promise.all([
          contractsApi.getAvailableVehicles(),
          contractsApi.getAvailableUsers(),
        ]);
        
        setAvailableVehicles(vehicles);
        setAvailableUsers(users);

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
      } catch (error) {
        console.error('Error loading initial data:', error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los datos iniciales",
          variant: "destructive",
        });
      } finally {
        setLoadingData(false);
      }
    };

    loadInitialData();
  }, [contract, toast]);

  const handleVehicleToggle = (vehicleId: string) => {
    setFormData(prev => ({
      ...prev,
      vehicle_ids: prev.vehicle_ids.includes(vehicleId)
        ? prev.vehicle_ids.filter(id => id !== vehicleId)
        : [...prev.vehicle_ids, vehicleId]
    }));
  };

  const handleUserToggle = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      user_ids: prev.user_ids.includes(userId)
        ? prev.user_ids.filter(id => id !== userId)
        : [...prev.user_ids, userId]
    }));
  };

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

  if (loadingData) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Cargando datos...</span>
      </div>
    );
  }

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

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Vehículos Asignados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
            {availableVehicles.map((vehicle) => (
              <div key={vehicle.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`vehicle-${vehicle.id}`}
                  checked={formData.vehicle_ids.includes(vehicle.id)}
                  onCheckedChange={() => handleVehicleToggle(vehicle.id)}
                />
                <Label htmlFor={`vehicle-${vehicle.id}`} className="flex-1 cursor-pointer">
                  <Badge variant="outline" className="w-full justify-start">
                    {vehicle.plate_number} - {vehicle.brand} {vehicle.model}
                  </Badge>
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Usuarios Asignados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
            {availableUsers.map((user) => (
              <div key={user.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`user-${user.id}`}
                  checked={formData.user_ids.includes(user.id)}
                  onCheckedChange={() => handleUserToggle(user.id)}
                />
                <Label htmlFor={`user-${user.id}`} className="flex-1 cursor-pointer">
                  <Badge variant="outline" className="w-full justify-start">
                    {user.name} {user.last_name || user.lastname}
                  </Badge>
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

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
