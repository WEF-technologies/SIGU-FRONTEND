
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
  
  const columns = [
    { key: 'document_number' as keyof User, header: 'Documento' },
    { key: 'name' as keyof User, header: 'Nombre' },
    { key: 'lastname' as keyof User, header: 'Apellido' },
    { key: 'telephone' as keyof User, header: 'Teléfono' },
    { key: 'email' as keyof User, header: 'Email' },
    { key: 'status' as keyof User, header: 'Estado' }
  ];

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
        title="Gestión de Usuarios"
        searchField="email"
        searchPlaceholder="Buscar por email..."
        hideAddButton={true}
      />
    </div>
  );
}
