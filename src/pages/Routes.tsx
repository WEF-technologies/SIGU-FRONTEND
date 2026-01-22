import { useState, useEffect } from "react";
import { DataTable } from "@/components/shared/DataTable";
import { FormModal } from "@/components/shared/FormModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Route, Contract } from "@/types";
import { Plus, Search } from "lucide-react";
import { useAuthenticatedFetch } from "@/hooks/useAuthenticatedFetch";

const API_URL = import.meta.env.VITE_API_URL || "https://sigu-back.vercel.app";

export default function Routes() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [contractsLoading, setContractsLoading] = useState(false);
  const [contractsError, setContractsError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    contract_id: "",
    description: "",
    from_location: "",
    to_location: "",
    kilometers: ""
  });
  const authenticatedFetch = useAuthenticatedFetch();

  // Cargar rutas desde el backend
  const fetchRoutes = async (contractDescription?: string) => {
    try {
      const url = contractDescription 
        ? `${API_URL}/api/v1/routes/?contract_description=${encodeURIComponent(contractDescription)}`
        : `${API_URL}/api/v1/routes/`;
      
      const response = await authenticatedFetch(url);
      const data = response.ok ? await response.json() : [];
      setRoutes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading routes:', error);
      setRoutes([]);
    }
  };

  useEffect(() => {
    fetchRoutes();
    // Fetch contracts for select
    (async () => {
      setContractsLoading(true);
      setContractsError(null);
      try {
        const resp = await authenticatedFetch(`${API_URL}/api/v1/contracts/`);
        if (resp.ok) {
          const data = await resp.json();
          setContracts(Array.isArray(data) ? data : []);
        } else {
          const text = await resp.text();
          setContractsError(`Error fetching contracts: ${resp.status} ${resp.statusText} ${text}`);
          setContracts([]);
        }
      } catch (err: any) {
        console.error('Error loading contracts:', err);
        setContractsError(err?.message || 'Error loading contracts');
        setContracts([]);
      } finally {
        setContractsLoading(false);
      }
    })();
  }, [authenticatedFetch]);

  // Buscar rutas por descripción de contrato
  useEffect(() => {
    if (searchTerm.trim()) {
      fetchRoutes(searchTerm);
    } else {
      fetchRoutes();
    }
  }, [searchTerm]);

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
      contract_id: "",
      description: "",
      from_location: "",
      to_location: "",
      kilometers: ""
    });
    setIsModalOpen(true);
  };

  const handleEdit = (route: Route) => {
    setEditingRoute(route);
    setFormData({
      contract_id: route.contract?.id || "",
      description: route.description,
      from_location: route.from_location,
      to_location: route.to_location,
      kilometers: route.kilometers?.toString() || ""
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

    const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  try {
    const contractId = formData.contract_id?.trim();
    if (!contractId) {
      console.error('Seleccione un contrato válido');
      return;
    }

    // Buscar el contrato seleccionado para obtener su descripción
    const selectedContract = contracts.find(c => c.id === contractId);
    if (!selectedContract) {
      console.error('Contrato no encontrado');
      return;
    }

    const payload: any = {
      contract_id: contractId,
      contract_description: selectedContract.description, // ← Agregar esta línea
      description: formData.description,
      from_location: formData.from_location,
      to_location: formData.to_location,
      kilometers: formData.kilometers ? parseFloat(formData.kilometers) : undefined
    };

    if (editingRoute) {
      const res = await authenticatedFetch(`${API_URL}/api/v1/routes/${editingRoute.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const updatedRoute = await res.json();
        setRoutes(routes.map(r => r.id === editingRoute.id ? updatedRoute : r));
      } else {
        const errorData = await res.json();
        console.error('Error updating route:', errorData);
      }
    } else {
      const res = await authenticatedFetch(`${API_URL}/api/v1/routes/`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const newRoute = await res.json();
        setRoutes([...routes, newRoute]);
      } else {
        const errorData = await res.json();
        console.error('Error creating route:', errorData);
      }
    }

    setIsModalOpen(false);
  } catch (error) {
    console.error('Error submitting route:', error);
  }
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
      
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Buscar por descripción del contrato..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <DataTable
        data={routes}
        columns={columns}
        onEdit={handleEdit}
        onDelete={handleDelete}
        title=""
        addButtonText=""
        searchField="description"
        searchPlaceholder=""
        hideAddButton={true}
      />

      <FormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRoute ? "Editar Ruta" : "Agregar Ruta"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="contract_id">Contrato</Label>
            <select
              id="contract_id"
              value={formData.contract_id}
              onChange={(e) => setFormData({...formData, contract_id: e.target.value})}
              className="w-full rounded-md border px-3 py-2"
              required
            >
              {contractsLoading && <option value="">Cargando contratos...</option>}
              {contractsError && <option value="">Error cargando contratos</option>}
              {!contractsLoading && !contractsError && (
                <>
                  <option value="">Seleccione un contrato</option>
                  {contracts.length === 0 && <option value="">No hay contratos disponibles</option>}
                  {contracts.map((c) => (
                    <option key={c.id} value={c.id}>{c.description}</option>
                  ))}
                </>
              )}
            </select>
            {contractsError && <p className="text-sm text-red-600 mt-1">{contractsError}</p>}
            {!contractsLoading && contracts.length === 0 && !contractsError && (
              <p className="text-sm text-yellow-700 mt-1">No hay contratos disponibles. Crea un contrato primero.</p>
            )}
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


          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={contractsLoading || contracts.length === 0}>
              {editingRoute ? "Actualizar Ruta" : "Crear Ruta"}
            </Button>
          </div>
        </form>
      </FormModal>
    </div>
  );
}