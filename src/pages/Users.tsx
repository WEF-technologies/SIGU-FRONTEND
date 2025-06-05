import { useState } from "react";
import { DataTable } from "@/components/shared/DataTable";
import { FormModal } from "@/components/shared/FormModal";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User } from "@/types";

const mockUsers: User[] = [
  {
    id: "1",
    document_type: "CC",
    name: "Juan Carlos",
    last_name: "Pérez García",
    status: "active",
    telephone: "3001234567",
    document_number: "12345678",
    created_at: "2024-01-15",
    updated_at: "2024-01-15"
  },
  {
    id: "2",
    document_type: "CE",
    name: "María Elena",
    last_name: "González López",
    status: "inactive",
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
    status: "active" as 'active' | 'inactive',
    telephone: "",
    document_number: ""
  });

  const columns = [
    { key: 'document_number' as keyof User, header: 'Documento' },
    { key: 'document_type' as keyof User, header: 'Tipo Doc.' },
    { key: 'name' as keyof User, header: 'Nombre' },
    { key: 'last_name' as keyof User, header: 'Apellido' },
    { key: 'telephone' as keyof User, header: 'Teléfono' },
    {
      key: 'status' as keyof User,
      header: 'Estado',
      render: (value: any) => <StatusBadge status={value} />
    },
    { key: 'actions' as keyof User, header: 'Acciones' }
  ];

  const handleAdd = () => {
    setEditingUser(null);
    setFormData({
      document_type: "",
      name: "",
      last_name: "",
      status: "active" as 'active' | 'inactive',
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
      status: user.status,
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
                  <SelectItem value="CC">Cédula de Ciudadanía</SelectItem>
                  <SelectItem value="CE">Cédula de Extranjería</SelectItem>
                  <SelectItem value="PA">Pasaporte</SelectItem>
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
              <Label htmlFor="status">Estado</Label>
              <Select
                value={formData.status}
                onValueChange={(value: 'active' | 'inactive') => setFormData({...formData, status: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="inactive">Inactivo</SelectItem>
                </SelectContent>
              </Select>
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
            <Button type="submit">
              {editingUser ? "Actualizar Usuario" : "Crear Usuario"}
            </Button>
          </div>
        </form>
      </FormModal>
    </div>
  );
}
