import { useState, useEffect } from "react";
import { DataTable } from "@/components/shared/DataTable";
import { FormModal } from "@/components/shared/FormModal";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Route } from "@/types";
import { Plus } from "lucide-react";
import { useAuthenticatedFetch } from "@/hooks/useAuthenticatedFetch";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function Routes() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [formData, setFormData] = useState({
    contract_description: "",
    description: "",
    from_location: "",
    to_location: "",
    kilometers: "",
    status: "pending" as 'pending' | 'in_progress' | 'completed'
  });
  const authenticatedFetch = useAuthenticatedFetch();

  // Cargar rutas desde el backend
  useEffect(() => {
    authenticatedFetch(`${API_URL}/api/v1/routes/`)
      .then(res => res.ok ? res.json() : [])
      .then(data => setRoutes(Array.isArray(data) ? data : []))
      .catch(error => {
        console.error('Error loading routes:', error);
        setRoutes([]);
      });
  }, [authenticatedFetch]);

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
    {
      key: 'actions' as keyof Route,
      header: 'Acciones',
      render: (_: any, route: Route) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleEdit(route)}
        >
          Editar
        </Button>
      )
    }
  ];

  const handleAdd = () => {
    setEditingRoute(null);
    setFormData({
      contract_description: "",
      description: "",
      from_location: "",
      to_location: "",
      kilometers: "",
      status: "pending"
    });
    setIsModalOpen(true);
  };

  const handleEdit = (route: Route) => {
    setEditingRoute(route);
    setFormData({
      contract_description: route.contract_id, // Using contract_id from route for now
      description: route.description,
      from_location: route.from_location,
      to_location: route.to_location,
      kilometers: route.kilometers?.toString() || "",
      status: route.status || "pending"
    });
    setIsModalOpen(true);
  };

  const handleDelete = (route: Route) => {
    authenticatedFetch(`${API_URL}/api/v1/routes/${route.id}`, {
      method: "DELETE",
    }).then(() => {
      setRoutes(routes.filter(r => r.id !== route.id));
    }).catch(error => {
      console.error('Error deleting route:', error);
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      contract_description: formData.contract_description,
      description: formData.description,
      from_location: formData.from_location,
      to_location: formData.to_location,
      kilometers: formData.kilometers ? parseFloat(formData.kilometers) : undefined,
      status: formData.status
    };

    if (editingRoute) {
      // PUT
      authenticatedFetch(`${API_URL}/api/v1/routes/${editingRoute.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      })
        .then(res => res.json())
        .then(updatedRoute => {
          setRoutes(routes.map(r => r.id === editingRoute.id ? updatedRoute : r));
        })
        .catch(error => {
          console.error('Error updating route:', error);
        });
    } else {
      // POST
      authenticatedFetch(`${API_URL}/api/v1/routes/`, {
        method: "POST",
        body: JSON.stringify(payload),
      })
        .then(res => res.json())
        .then(newRoute => {
          setRoutes([...routes, newRoute]);
        })
        .catch(error => {
          console.error('Error creating route:', error);
        });
    }

    setIsModalOpen(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-primary-900">Gestión de Rutas</h2>
        <Button 
          onClick={handleAdd} 
          className="bg-primary hover:bg-primary-600 text-white font-medium px-4 py-2 rounded-lg shadow-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Agregar Ruta
        </Button>
      </div>
      <DataTable
        data={routes}
        columns={columns}
        onEdit={handleEdit}
        onDelete={handleDelete}
        title=""
        addButtonText=""
        searchField="description"
        searchPlaceholder="Buscar ruta..."
        hideAddButton={true}
      />

      <FormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRoute ? "Editar Ruta" : "Agregar Ruta"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="contract_description">Descripción del Contrato</Label>
            <Input
              id="contract_description"
              value={formData.contract_description}
              onChange={(e) => setFormData({...formData, contract_description: e.target.value})}
              placeholder="Ingrese la descripción del contrato"
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