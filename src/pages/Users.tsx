import { useState } from "react";
import { Column, DataTable } from "@/components/shared/DataTable";
import { FormModal } from "@/components/shared/FormModal";
import { UserForm } from "@/components/users/UserForm";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { isSessionExpiredError } from "@/lib/apiClient";
import { getRoleLabel, toUserRole, UserRole } from "@/lib/permissions";
import {
  useUsers,
  useCreateUser,
  User,
  CreateUserData,
  USER_STATUS_LABELS,
} from "@/services/usersApi";

const ROLE_BADGE_CLASSES: Record<UserRole, string> = {
  manager: "bg-primary/10 text-primary border-primary/30",
  administrator: "bg-blue-50 text-blue-700 border-blue-200",
  maintenance: "bg-amber-50 text-amber-700 border-amber-200",
};

const getStatusLabel = (status: string) => USER_STATUS_LABELS[status?.toLowerCase()] ?? status;

const columns: Column<User>[] = [
  { key: "document_type", header: "Documento" },
  { key: "name", header: "Nombre" },
  { key: "lastname", header: "Apellido" },
  { key: "telephone", header: "Teléfono" },
  { key: "email", header: "Email" },
  {
    key: "role",
    header: "Rol",
    sortValue: (user) => getRoleLabel(user.role),
    render: (value) => {
      const role = toUserRole(value);
      return (
        <Badge variant="outline" className={role ? ROLE_BADGE_CLASSES[role] : ""}>
          {getRoleLabel(value)}
        </Badge>
      );
    },
  },
  {
    key: "status",
    header: "Estado",
    sortValue: (user) => getStatusLabel(user.status),
    render: (value) => getStatusLabel(String(value ?? "")),
  },
];

/** Se busca también por la etiqueta en español del rol y del estado. */
const getUserSearchText = (user: User) =>
  [
    user.email,
    user.name,
    user.lastname,
    user.telephone,
    user.document_type,
    getStatusLabel(user.status),
    getRoleLabel(user.role),
  ].join(" ");

export default function Users() {
  const { toast } = useToast();
  const { data: users = [], isLoading, error } = useUsers();
  const createUser = useCreateUser();
  const [isModalOpen, setIsModalOpen] = useState(false);

  /** Devuelve true si se creó; si falla, el modal queda abierto con lo escrito. */
  const handleCreateUser = async (payload: CreateUserData): Promise<boolean> => {
    try {
      const created = await createUser.mutateAsync(payload);
      toast({
        title: "Usuario creado",
        description: `${created.name} ${created.lastname} ya puede iniciar sesión como ${getRoleLabel(created.role)}.`,
      });
      setIsModalOpen(false);
      return true;
    } catch (createError) {
      // La sesión vencida ya la avisa useAuthenticatedFetch.
      if (!isSessionExpiredError(createError)) {
        toast({
          title: "No se pudo crear el usuario",
          description:
            createError instanceof Error && createError.message
              ? createError.message
              : "Intenta nuevamente.",
          variant: "destructive",
        });
      }
      return false;
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
        title="Gestión de Usuarios"
        searchAccessor={getUserSearchText}
        searchPlaceholder="Buscar por nombre, email, documento, teléfono o rol..."
        defaultSort={{ key: "name", direction: "asc" }}
        initialPageSize={20}
        onAdd={() => setIsModalOpen(true)}
        addButtonText="Nuevo usuario"
      />

      <FormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nuevo usuario">
        <UserForm onSubmit={handleCreateUser} onCancel={() => setIsModalOpen(false)} />
      </FormModal>
    </div>
  );
}
