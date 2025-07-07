
import { useState } from "react";
import { DataTable } from "@/components/shared/DataTable";
import { FormModal } from "@/components/shared/FormModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useUsers, useCreateUser, useDeleteUser, User, CreateUserData } from "@/services/usersApi";

export default function Users() {
  const { toast } = useToast();
  const { data: users = [], isLoading, error } = useUsers();
  const createUserMutation = useCreateUser();
  const deleteUserMutation = useDeleteUser();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    document_type: "",
    name: "",
    lastname: "",
    cargo: "",
    sucursal: "",
    telephone: "",
    document_number: "",
    email: "",
    password: "",
    status: "active"
  });

  const columns = [
    { key: 'document_number' as keyof User, header: 'Documento' },
    { key: 'document_type' as keyof User, header: 'Tipo Doc.' },
    { key: 'name' as keyof User, header: 'Nombre' },
    { key: 'lastname' as keyof User, header: 'Apellido' },
    { key: 'telephone' as keyof User, header: 'Teléfono' },
    { key: 'email' as keyof User, header: 'Email' },
    { key: 'status' as keyof User, header: 'Estado' },
    { key: 'actions' as keyof User, header: 'Acciones' }
  ];

  const handleAdd = () => {
    setEditingUser(null);
    setFormData({
      document_type: "",
      name: "",
      lastname: "",
      cargo: "",
      sucursal: "",
      telephone: "",
      document_number: "",
      email: "",
      password: "",
      status: "active"
    });
    setIsModalOpen(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      document_type: user.document_type,
      name: user.name,
      lastname: user.lastname,
      cargo: user.cargo || "",
      sucursal: user.sucursal || "",
      telephone: user.telephone,
      document_number: user.document_number || "",
      email: user.email,
      password: "",
      status: user.status
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (user: User) => {
    try {
      await deleteUserMutation.mutateAsync(user.id);
      toast({
        title: "Usuario eliminado",
        description: "El usuario ha sido eliminado exitosamente.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el usuario.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingUser) {
      try {
        const userData: CreateUserData = {
          document_type: formData.document_type,
          name: formData.name,
          lastname: formData.lastname,
          cargo: formData.cargo,
          sucursal: formData.sucursal,
          telephone: formData.telephone,
          document_number: formData.document_number,
          email: formData.email,
          password: formData.password,
          status: formData.status
        };
        
        await createUserMutation.mutateAsync(userData);
        toast({
          title: "Usuario creado",
          description: "El usuario ha sido creado exitosamente.",
        });
        setIsModalOpen(false);
      } catch (error) {
        toast({
          title: "Error",
          description: "No se pudo crear el usuario.",
          variant: "destructive",
        });
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-gray-600">Cargando usuarios...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-red-600">Error al cargar usuarios</p>
          <p className="text-gray-600 text-sm mt-1">
            {error instanceof Error ? error.message : 'Error desconocido'}
          </p>
        </div>
      </div>
    );
  }

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
        searchField="email"
        searchPlaceholder="Buscar por email..."
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
              <Label htmlFor="lastname">Apellido</Label>
              <Input
                id="lastname"
                value={formData.lastname}
                onChange={(e) => setFormData({...formData, lastname: e.target.value})}
                placeholder="Ingrese el apellido"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="Ingrese el email"
                required
              />
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

          {!editingUser && (
            <div>
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                placeholder="Ingrese la contraseña"
                required
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cargo">Cargo</Label>
              <Input
                id="cargo"
                value={formData.cargo}
                onChange={(e) => setFormData({...formData, cargo: e.target.value})}
                placeholder="Ingrese el cargo"
              />
            </div>
            
            <div>
              <Label htmlFor="sucursal">Sucursal</Label>
              <Input
                id="sucursal"
                value={formData.sucursal}
                onChange={(e) => setFormData({...formData, sucursal: e.target.value})}
                placeholder="Ingrese la sucursal"
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
            <Button 
              type="submit"
              disabled={createUserMutation.isPending}
            >
              {createUserMutation.isPending 
                ? "Creando..." 
                : editingUser ? "Actualizar Usuario" : "Crear Usuario"
              }
            </Button>
          </div>
        </form>
      </FormModal>
    </div>
  );
}
