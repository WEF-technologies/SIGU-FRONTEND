
import { useState } from "react";
import { Column, DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { FormModal } from "@/components/shared/FormModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useUsers, useCreateUser, User, CreateUserData } from "@/services/usersApi";

export default function Users() {
  const { toast } = useToast();
  const { data: users = [], isLoading, error } = useUsers();
  
  const columns: Column<User>[] = [
    {
      key: 'document_type',
      header: 'Documento',
      // El backend hoy solo guarda el tipo (V, E...); si llega el número se muestra junto.
      render: (_, user) =>
        user.document_number ? `${user.document_type}-${user.document_number}` : user.document_type || '-',
    },
    { key: 'name', header: 'Nombre', hideOnMobile: true },
    { key: 'lastname', header: 'Apellido', hideOnMobile: true },
    { key: 'telephone', header: 'Teléfono' },
    { key: 'email', header: 'Email' },
    { key: 'status', header: 'Estado', render: (_, user) => <StatusBadge status={user.status} /> },
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
        searchFields={["email", "name", "lastname", "telephone", "document_type", "status"]}
        searchPlaceholder="Buscar por nombre, email, documento o teléfono..."
        defaultSort={{ key: "name", direction: "asc" }}
        initialPageSize={20}
        hideAddButton={true}
        mobileTitle={(user) => `${user.name ?? ""} ${user.lastname ?? ""}`.trim() || user.email}
      />
    </div>
  );
}
