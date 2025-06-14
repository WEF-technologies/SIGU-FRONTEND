
import { useState } from "react";
import { DataTable } from "@/components/shared/DataTable";
import { FormModal } from "@/components/shared/FormModal";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Route } from "@/types";

const mockRoutes: Route[] = [
  {
    id: "1",
    contract_id: "1",
    description: "Ruta Norte - Colegio San José",
    from_location: "Barrio Los Alamos",
    to_location: "Colegio San José",
    status: "in_progress",
    kilometers: 15.5,
    created_at: "2024-01-15",
    updated_at: "2024-01-15"
  },
  {
    id: "2",
    contract_id: "1",
    description: "Ruta Sur - Regreso",
    from_location: "Colegio San José",
    to_location: "Barrio Las Flores",
    status: "completed",
    kilometers: 22.3,
    created_at: "2024-01-15",
    updated_at: "2024-01-20"
  }
];

export default function Routes() {
  const [routes, setRoutes] = useState<Route[]>(mockRoutes);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [formData, setFormData] = useState({
    contract_id: "",
    description: "",
    from_location: "",
    to_location: "",
    kilometers: "",
    status: "pending" as 'pending' | 'in_progress' | 'completed'
  });

  const columns = [
    { key: 'description' as keyof Route, header: 'Descripción' },
    { key: 'from_location' as keyof Route, header: 'Origen' },
    { key: 'to_location' as keyof Route, header: 'Destino' },
    { 
      key: 'kilometers' as keyof Route, 
      header: 'Kilometraje (km)',
      render: (value: any) => value ? `${value} km` : '-'
    },
    {
      key: 'status' as keyof Route,
      header: 'Estado',
      render: (value: any) => <StatusBadge status={value} />
    },
    { key: 'actions' as keyof Route, header: 'Acciones' }
  ];

  const handleAdd = () => {
    setEditingRoute(null);
    setFormData({
      contract_id: "",
      description: "",
      from_location: "",
      to_location: "",
      kilometers: "",
      status: "pending" as 'pending' | 'in_progress' | 'completed'
    });
    setIsModalOpen(true);
  };

  const handleEdit = (route: Route) => {
    setEditingRoute(route);
    setFormData({
      contract_id: route.contract_id,
      description: route.description,
      from_location: route.from_location,
      to_location: route.to_location,
      kilometers: route.kilometers?.toString() || "",
      status: route.status || "pending"
    });
    setIsModalOpen(true);
  };

  const handleDelete = (route: Route) => {
    setRoutes(routes.filter(r => r.id !== route.id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingRoute) {
      setRoutes(routes.map(r => 
        r.id === editingRoute.id 
          ? { 
              ...r, 
              ...formData, 
              kilometers: formData.kilometers ? parseFloat(formData.kilometers) : undefined,
              updated_at: new Date().toISOString() 
            }
          : r
      ));
    } else {
      const newRoute: Route = {
        id: Date.now().toString(),
        contract_id: formData.contract_id,
        description: formData.description,
        from_location: formData.from_location,
        to_location: formData.to_location,
        kilometers: formData.kilometers ? parseFloat(formData.kilometers) : undefined,
        status: formData.status,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setRoutes([...routes, newRoute]);
    }
    
    setIsModalOpen(false);
  };

  return (
    <div>
      <DataTable
        data={routes}
        columns={columns}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        title="Gestión de Rutas"
        addButtonText="Agregar Ruta"
        searchField="description"
        searchPlaceholder="Buscar ruta..."
      />

      <FormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRoute ? "Editar Ruta" : "Agregar Ruta"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="contract_id">ID del Contrato</Label>
            <Input
              id="contract_id"
              value={formData.contract_id}
              onChange={(e) => setFormData({...formData, contract_id: e.target.value})}
              placeholder="Ingrese el ID del contrato"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Describa la ruta"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="from_location">Ubicación de Origen</Label>
              <Input
                id="from_location"
                value={formData.from_location}
                onChange={(e) => setFormData({...formData, from_location: e.target.value})}
                placeholder="Ingrese el origen"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="to_location">Ubicación de Destino</Label>
              <Input
                id="to_location"
                value={formData.to_location}
                onChange={(e) => setFormData({...formData, to_location: e.target.value})}
                placeholder="Ingrese el destino"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="kilometers">Kilometraje Aproximado (km)</Label>
            <Input
              id="kilometers"
              type="number"
              step="0.1"
              value={formData.kilometers}
              onChange={(e) => setFormData({...formData, kilometers: e.target.value})}
              placeholder="Ingrese el kilometraje aproximado"
            />
          </div>

          <div>
            <Label htmlFor="status">Estado</Label>
            <Select
              value={formData.status}
              onValueChange={(value: 'pending' | 'in_progress' | 'completed') => setFormData({...formData, status: value})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="in_progress">En Progreso</SelectItem>
                <SelectItem value="completed">Completada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit">
              {editingRoute ? "Actualizar Ruta" : "Crear Ruta"}
            </Button>
          </div>
        </form>
      </FormModal>
    </div>
  );
}
