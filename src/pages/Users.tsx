
import { useState } from "react";
import { DataTable } from "@/components/shared/DataTable";
import { FormModal } from "@/components/shared/FormModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User } from "@/types";

const mockUsers: User[] = [
  {
    id: "1",
    document_type: "V",
    name: "Juan Carlos",
    last_name: "Pérez García",
    cargo: "Conductor",
    sucursal: "Caracas Centro",
    telephone: "3001234567",
    document_number: "12345678",
    created_at: "2024-01-15",
    updated_at: "2024-01-15"
  },
  {
    id: "2",
    document_type: "E",
    name: "María Elena",
    last_name: "González López",
    cargo: "Supervisora",
    sucursal: "Maracaibo",
    telephone: "3109876543",
    document_number: "87654321",
    created_at: "2024-01-10",
    updated_at: "2024-01-20"
  }
];

export default function Users() {
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    document_type: "",
    name: "",
    last_name: "",
    cargo: "",
    sucursal: "",
    telephone: "",
    document_number: ""
  });

  const columns = [
    { key: 'document_number' as keyof User, header: 'Documento' },
    { key: 'document_type' as keyof User, header: 'Tipo Doc.' },
    { key: 'name' as keyof User, header: 'Nombre' },
    { key: 'last_name' as keyof User, header: 'Apellido' },
    { key: 'telephone' as keyof User, header: 'Teléfono' },
    { key: 'cargo' as keyof User, header: 'Cargo' },
    { key: 'sucursal' as keyof User, header: 'Sucursal' },
    { key: 'actions' as keyof User, header: 'Acciones' }
  ];

  const handleAdd = () => {
    setEditingUser(null);
    setFormData({
      document_type: "",
      name: "",
      last_name: "",
      cargo: "",
      sucursal: "",
      telephone: "",
      document_number: ""
    });
    setIsModalOpen(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      document_type: user.document_type,
      name: user.name,
      last_name: user.last_name,
      cargo: user.cargo,
      sucursal: user.sucursal,
      telephone: user.telephone,
      document_number: user.document_number
    });
    setIsModalOpen(true);
  };

  const handleDelete = (user: User) => {
    setUsers(users.filter(u => u.id !== user.id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingUser) {
      setUsers(users.map(u => 
        u.id === editingUser.id 
          ? { ...u, ...formData, updated_at: new Date().toISOString() }
          : u
      ));
    } else {
      const newUser: User = {
        id: Date.now().toString(),
        ...formData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setUsers([...users, newUser]);
    }
    
    setIsModalOpen(false);
  };

  return (
    <div>
      <DataTable
        data={users}
        columns={columns}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        title="Gestión de Usuarios"
        addButtonText="Agregar Usuario"
        searchField="document_number"
        searchPlaceholder="Buscar por número de documento..."
      />

      <FormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? "Editar Usuario" : "Agregar Usuario"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="document_type">Tipo de Documento</Label>
              <Select
                value={formData.document_type}
                onValueChange={(value) => setFormData({...formData, document_type: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="V">V - Cédula de Identidad Venezolana</SelectItem>
                  <SelectItem value="E">E - Cédula de Extranjero</SelectItem>
                  <SelectItem value="P">P - Pasaporte</SelectItem>
                  <SelectItem value="J">J - RIF Jurídico</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="document_number">Número de Documento</Label>
              <Input
                id="document_number"
                value={formData.document_number}
                onChange={(e) => setFormData({...formData, document_number: e.target.value})}
                placeholder="Ingrese el número de documento"
                required
              />
            </div>
          </div>

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
              <Label htmlFor="cargo">Cargo</Label>
              <Input
                id="cargo"
                value={formData.cargo}
                onChange={(e) => setFormData({...formData, cargo: e.target.value})}
                placeholder="Ingrese el cargo"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="sucursal">Sucursal</Label>
            <Input
              id="sucursal"
              value={formData.sucursal}
              onChange={(e) => setFormData({...formData, sucursal: e.target.value})}
              placeholder="Ingrese la sucursal"
              required
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
            <Button type="submit">
              {editingUser ? "Actualizar Usuario" : "Crear Usuario"}
            </Button>
          </div>
        </form>
      </FormModal>
    </div>
  );
}
