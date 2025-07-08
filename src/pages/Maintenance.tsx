import { useState, useEffect } from "react";
import { DataTable } from "@/components/shared/DataTable";
import { FormModal } from "@/components/shared/FormModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Maintenance as MaintenanceType, Vehicle } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { MaintenanceDetailsModal } from "@/components/maintenance/MaintenanceDetailsModal";
import { useAuthenticatedFetch } from "@/hooks/useAuthenticatedFetch";
import { Eye, Edit, Trash2 } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const maintenanceTypeConfig = {
  M1: { label: "M1 - Preventivo Básico", color: "bg-blue-100 text-blue-800", priority: "low" },
  M2: { label: "M2 - Correctivo", color: "bg-yellow-100 text-yellow-800", priority: "medium" },
  M3: { label: "M3 - Mayor (Crítico)", color: "bg-red-100 text-red-800", priority: "high" },
  M4: { label: "M4 - Especializado", color: "bg-purple-100 text-purple-800", priority: "medium" }
};

export default function Maintenance() {
  const { toast } = useToast();
  const authenticatedFetch = useAuthenticatedFetch();
  const [maintenance, setMaintenance] = useState<MaintenanceType[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [editingMaintenance, setEditingMaintenance] = useState<MaintenanceType | null>(null);
  const [selectedMaintenance, setSelectedMaintenance] = useState<MaintenanceType | null>(null);
  const [formData, setFormData] = useState({
    plate_number: "",
    description: "",
    type: "M1" as 'M1' | 'M2' | 'M3' | 'M4',
    date: new Date().toISOString().split('T')[0],
    kilometers: 0,
    next_maintenance_km: 0,
    location: "",
    performed_by: ""
  });

  // Cargar mantenimientos y vehículos desde el backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Fetching maintenance data...');
        // Fetch maintenance
        const maintenanceResponse = await authenticatedFetch(`${API_URL}/api/v1/maintenance/`);
        console.log('Maintenance response status:', maintenanceResponse.status);
        if (maintenanceResponse.ok) {
          const maintenanceData = await maintenanceResponse.json();
          console.log('Maintenance data received:', maintenanceData);
          setMaintenance(Array.isArray(maintenanceData) ? maintenanceData : []);
        } else {
          console.log('Maintenance fetch failed:', maintenanceResponse.status);
          setMaintenance([]);
        }

        // Fetch vehicles
        const vehiclesResponse = await authenticatedFetch(`${API_URL}/api/v1/vehicles/`);
        console.log('Vehicles response status:', vehiclesResponse.status);
        if (vehiclesResponse.ok) {
          const vehiclesData = await vehiclesResponse.json();
          console.log('Vehicles data received:', vehiclesData);
          setVehicles(Array.isArray(vehiclesData) ? vehiclesData : []);
        } else {
          console.log('Vehicles fetch failed:', vehiclesResponse.status);
          setVehicles([]);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setMaintenance([]);
        setVehicles([]);
      }
    };

    fetchData();
  }, [authenticatedFetch]);

  const columns = [
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
            onClick={() => handleViewDetails(row)}
            className="h-8 w-8 p-0"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleEdit(row)}
            className="h-8 w-8 p-0"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleDelete(row)}
            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];

  const resetForm = () => {
    setFormData({
      plate_number: "",
      description: "",
      type: "M1",
      date: new Date().toISOString().split('T')[0],
      kilometers: 0,
      next_maintenance_km: 0,
      location: "",
      performed_by: ""
    });
    setEditingMaintenance(null);
  };

  const handleAdd = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleEdit = (maintenance: MaintenanceType) => {
    setEditingMaintenance(maintenance);
    setFormData({
      plate_number: maintenance.vehicle_plate || "",
      description: maintenance.description,
      type: maintenance.type,
      date: maintenance.date,
      kilometers: maintenance.kilometers || 0,
      next_maintenance_km: maintenance.next_maintenance_km || 0,
      location: maintenance.location || "",
      performed_by: maintenance.performed_by || ""
    });
    setIsModalOpen(true);
  };

  const handleViewDetails = (maintenance: MaintenanceType) => {
    setSelectedMaintenance(maintenance);
    setIsDetailsModalOpen(true);
  };

  const handleDelete = async (maintenance: MaintenanceType) => {
    try {
      const response = await authenticatedFetch(`${API_URL}/api/v1/maintenance/${maintenance.id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setMaintenance(prev => prev.filter(m => m.id !== maintenance.id));
        toast({
          title: "Mantenimiento eliminado",
          description: "El registro de mantenimiento ha sido eliminado correctamente.",
        });
      }
    } catch (error) {
      console.error('Error deleting maintenance:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.plate_number) {
      toast({
        title: "Error",
        description: "Debe seleccionar un vehículo.",
        variant: "destructive"
      });
      return;
    }

    // Prepare the data for the backend
    const submitData = {
      plate_number: formData.plate_number,
      description: formData.description,
      type: formData.type,
      date: formData.date, // Already in YYYY-MM-DD format from the date input
      kilometers: formData.kilometers || null,
      next_maintenance_km: formData.next_maintenance_km || null,
      location: formData.location || null,
      performed_by: formData.performed_by || null
    };

    console.log('Submitting maintenance data:', submitData);

    try {
      if (editingMaintenance) {
        // PUT request for editing
        const response = await authenticatedFetch(`${API_URL}/api/v1/maintenance/${editingMaintenance.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(submitData),
        });
        
        console.log('PUT response status:', response.status);
        
        if (response.ok) {
          const updated = await response.json();
          console.log('Updated maintenance:', updated);
          setMaintenance(prev => prev.map(m => m.id === editingMaintenance.id ? updated : m));
          toast({
            title: "Mantenimiento actualizado",
            description: `El mantenimiento ${formData.type} ha sido actualizado correctamente.`,
          });
        } else {
          const errorData = await response.text();
          console.error('PUT error response:', errorData);
          toast({
            title: "Error",
            description: "Error al actualizar el mantenimiento.",
            variant: "destructive"
          });
        }
      } else {
        // POST request for creating
        const response = await authenticatedFetch(`${API_URL}/api/v1/maintenance/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(submitData),
        });
        
        console.log('POST response status:', response.status);
        
        if (response.ok) {
          const newMaintenance = await response.json();
          console.log('Created maintenance:', newMaintenance);
          setMaintenance(prev => [...prev, newMaintenance]);
          toast({
            title: "Mantenimiento registrado",
            description: `El mantenimiento ${formData.type} ha sido registrado correctamente.`,
          });
        } else {
          const errorData = await response.text();
          console.error('POST error response:', errorData);
          toast({
            title: "Error",
            description: "Error al crear el mantenimiento.",
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      console.error('Error with maintenance operation:', error);
      toast({
        title: "Error",
        description: "Ocurrió un error al procesar el mantenimiento.",
        variant: "destructive"
      });
    }

    setIsModalOpen(false);
    resetForm();
  };

  return (
    <div className="animate-fade-in">
      <DataTable
        data={maintenance}
        columns={columns}
        onAdd={handleAdd}
        title="Gestión de Mantenimientos"
        addButtonText="Registrar Mantenimiento"
        searchField="vehicle_plate"
        searchPlaceholder="Buscar por placa del vehículo..."
      />

      <FormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingMaintenance ? "Editar Mantenimiento" : "Registrar Mantenimiento"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="plate_number">Vehículo</Label>
            <Select
              value={formData.plate_number}
              onValueChange={(value) => {
                console.log('Selected vehicle plate:', value);
                setFormData({...formData, plate_number: value});
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccione un vehículo" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map((vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.plate_number}>
                    {vehicle.plate_number} - {vehicle.brand} {vehicle.model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="type">Tipo de Mantenimiento</Label>
            <Select
              value={formData.type}
              onValueChange={(value: 'M1' | 'M2' | 'M3' | 'M4') => setFormData({...formData, type: value})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(maintenanceTypeConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <Badge className={config.color} variant="outline">{key}</Badge>
                      <span>{config.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="description">Descripción del Mantenimiento</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Describa detalladamente el mantenimiento realizado"
              required
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date">Fecha de Mantenimiento</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="kilometers">Kilómetros Actuales</Label>
              <Input
                id="kilometers"
                type="number"
                min="0"
                value={formData.kilometers}
                onChange={(e) => setFormData({...formData, kilometers: parseInt(e.target.value) || 0})}
                placeholder="Kilómetros del vehículo"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="next_maintenance_km">Próximo Mantenimiento (km)</Label>
            <Input
              id="next_maintenance_km"
              type="number"
              min="0"
              value={formData.next_maintenance_km}
              onChange={(e) => setFormData({...formData, next_maintenance_km: parseInt(e.target.value) || 0})}
              placeholder="Kilómetros para próximo mantenimiento"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="location">Lugar de Realización</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                placeholder="Taller, concesionario, etc."
              />
            </div>

            <div>
              <Label htmlFor="performed_by">Realizado por</Label>
              <Input
                id="performed_by"
                value={formData.performed_by}
                onChange={(e) => setFormData({...formData, performed_by: e.target.value})}
                placeholder="Nombre del técnico o responsable"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary-600">
              {editingMaintenance ? "Actualizar Mantenimiento" : "Registrar Mantenimiento"}
            </Button>
          </div>
        </form>
      </FormModal>

      <MaintenanceDetailsModal
        maintenance={selectedMaintenance}
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
      />
    </div>
  );
}
