import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreateUserData, DEFAULT_USER_STATUS } from "@/services/usersApi";
import {
  DEFAULT_USER_ROLE,
  USER_ROLE_DESCRIPTIONS,
  USER_ROLE_OPTIONS,
  UserRole,
  toUserRole,
} from "@/lib/permissions";

/** Largos maximos de la tabla `users` del backend. */
const MAX_LENGTH = {
  document_type: 50,
  name: 255,
  lastname: 255,
  telephone: 50,
  email: 255,
} as const;

const MIN_PASSWORD_LENGTH = 8;

interface UserFormState {
  document_type: string;
  name: string;
  lastname: string;
  telephone: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
}

const createEmptyState = (): UserFormState => ({
  document_type: "",
  name: "",
  lastname: "",
  telephone: "",
  email: "",
  password: "",
  confirmPassword: "",
  role: DEFAULT_USER_ROLE,
});

interface UserFormProps {
  /** Devuelve true si el backend creo el usuario; si no, el formulario conserva lo escrito. */
  onSubmit: (payload: CreateUserData) => Promise<boolean>;
  onCancel: () => void;
}

export function UserForm({ onSubmit, onCancel }: UserFormProps) {
  const [formData, setFormData] = useState<UserFormState>(createEmptyState());
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setField = <K extends keyof UserFormState>(key: K, value: UserFormState[K]) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (formData.password.length < MIN_PASSWORD_LENGTH) {
      setPasswordError(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setPasswordError("Las contraseñas no coinciden.");
      return;
    }

    setPasswordError(null);
    setIsSubmitting(true);

    try {
      const ok = await onSubmit({
        document_type: formData.document_type.trim(),
        name: formData.name.trim(),
        lastname: formData.lastname.trim(),
        telephone: formData.telephone.trim(),
        // Sin cambiar mayusculas: el login compara el correo tal cual se guardo.
        email: formData.email.trim(),
        password: formData.password,
        status: DEFAULT_USER_STATUS,
        role: formData.role,
      });

      if (ok) setFormData(createEmptyState());
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="user-name">Nombre</Label>
          <Input
            id="user-name"
            value={formData.name}
            onChange={(event) => setField("name", event.target.value)}
            maxLength={MAX_LENGTH.name}
            required
          />
        </div>
        <div>
          <Label htmlFor="user-lastname">Apellido</Label>
          <Input
            id="user-lastname"
            value={formData.lastname}
            onChange={(event) => setField("lastname", event.target.value)}
            maxLength={MAX_LENGTH.lastname}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="user-document">Documento de identidad</Label>
          <Input
            id="user-document"
            value={formData.document_type}
            onChange={(event) => setField("document_type", event.target.value)}
            maxLength={MAX_LENGTH.document_type}
            placeholder="V-12345678"
            required
          />
        </div>
        <div>
          <Label htmlFor="user-telephone">Teléfono</Label>
          <Input
            id="user-telephone"
            type="tel"
            value={formData.telephone}
            onChange={(event) => setField("telephone", event.target.value)}
            maxLength={MAX_LENGTH.telephone}
            placeholder="0414-1234567"
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="user-email">Correo electrónico</Label>
        <Input
          id="user-email"
          type="email"
          value={formData.email}
          onChange={(event) => setField("email", event.target.value)}
          maxLength={MAX_LENGTH.email}
          autoComplete="off"
          required
        />
        <p className="mt-1 text-xs text-gray-500">Con este correo iniciará sesión.</p>
      </div>

      <div>
        <Label htmlFor="user-role">Rol</Label>
        <Select
          value={formData.role}
          onValueChange={(value) => setField("role", toUserRole(value) ?? DEFAULT_USER_ROLE)}
        >
          <SelectTrigger id="user-role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {USER_ROLE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="mt-1 text-xs text-gray-500">{USER_ROLE_DESCRIPTIONS[formData.role]}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="user-password">Contraseña</Label>
          <Input
            id="user-password"
            type="password"
            value={formData.password}
            onChange={(event) => {
              setField("password", event.target.value);
              setPasswordError(null);
            }}
            autoComplete="new-password"
            required
          />
        </div>
        <div>
          <Label htmlFor="user-confirm-password">Confirmar contraseña</Label>
          <Input
            id="user-confirm-password"
            type="password"
            value={formData.confirmPassword}
            onChange={(event) => {
              setField("confirmPassword", event.target.value);
              setPasswordError(null);
            }}
            autoComplete="new-password"
            required
          />
        </div>
      </div>
      {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" className="bg-primary hover:bg-primary-600" disabled={isSubmitting}>
          {isSubmitting ? "Creando..." : "Crear usuario"}
        </Button>
      </div>
    </form>
  );
}
