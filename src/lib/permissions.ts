/**
 * Roles y permisos por modulo.
 *
 * Es un espejo de lo que el backend exige en `src/main.py` (dependencias
 * `require_roles` / `require_role_access` de cada router). El backend es quien
 * decide: esta tabla solo sirve para no mostrar menus, pantallas ni botones
 * que terminarian en un 403. Si el backend cambia un permiso, hay que
 * cambiarlo aqui tambien.
 *
 * Reglas del backend:
 * - El gerente (`manager`) entra a todo.
 * - En un modulo, leer (GET) lo pueden los roles de lectura y los de
 *   escritura; crear, editar o borrar solo los de escritura.
 */

export const USER_ROLES = ["manager", "administrator", "maintenance"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  manager: "Gerente",
  administrator: "Administrador",
  maintenance: "Mantenimiento",
};

export const USER_ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  manager: "Acceso total, incluida la gestión de usuarios y contratos.",
  administrator:
    "Vehículos, choferes, rutas, viajes, combustible, fluidos, herramientas, dotación, proveedores y solicitudes de repuestos. Consulta contratos y repuestos.",
  maintenance:
    "Vehículos, mantenimientos, repuestos, solicitudes de repuestos y manual de fallas.",
};

export const USER_ROLE_OPTIONS = USER_ROLES.map((role) => ({
  value: role,
  label: USER_ROLE_LABELS[role],
  description: USER_ROLE_DESCRIPTIONS[role],
}));

/** El backend crea los usuarios con este rol si no se indica otro. */
export const DEFAULT_USER_ROLE: UserRole = "maintenance";

export const isUserRole = (value: unknown): value is UserRole =>
  typeof value === "string" && (USER_ROLES as readonly string[]).includes(value);

/** Normaliza lo que llegue del backend o de localStorage; `null` si no es un rol conocido. */
export const toUserRole = (value: unknown): UserRole | null => {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return isUserRole(normalized) ? normalized : null;
};

export const getRoleLabel = (role: unknown): string => {
  const normalized = toUserRole(role);
  return normalized ? USER_ROLE_LABELS[normalized] : "Sin rol";
};

export type AppModule =
  | "users"
  | "contracts"
  | "vehicles"
  | "maintenances"
  | "spare_parts"
  | "spare_part_requests"
  | "drivers"
  | "routes"
  | "trips"
  | "tools"
  | "fluids"
  | "fuel"
  | "dotation"
  | "suppliers"
  | "troubleshooting";

export type AccessLevel = "read" | "write";

interface ModuleAccess {
  /** Roles que solo pueden consultar. */
  read: readonly UserRole[];
  /** Roles que pueden consultar y modificar. */
  write: readonly UserRole[];
}

const fullAccess = (...roles: UserRole[]): ModuleAccess => ({ read: [], write: roles });

/** El gerente no aparece: tiene acceso a todo. */
const MODULE_ACCESS: Record<AppModule, ModuleAccess> = {
  users: fullAccess(),
  contracts: { read: ["administrator"], write: [] },
  vehicles: fullAccess("maintenance", "administrator"),
  maintenances: fullAccess("maintenance"),
  spare_parts: { read: ["administrator"], write: ["maintenance"] },
  spare_part_requests: fullAccess("administrator", "maintenance"),
  drivers: fullAccess("administrator"),
  routes: fullAccess("administrator"),
  trips: fullAccess("administrator"),
  tools: fullAccess("administrator"),
  fluids: fullAccess("administrator"),
  fuel: fullAccess("administrator"),
  dotation: fullAccess("administrator"),
  suppliers: fullAccess("administrator"),
  troubleshooting: fullAccess("maintenance"),
};

export const MODULE_LABELS: Record<AppModule, string> = {
  users: "Usuarios",
  contracts: "Contratos",
  vehicles: "Vehículos",
  maintenances: "Mantenimiento",
  spare_parts: "Repuestos",
  spare_part_requests: "Solicitudes de repuestos",
  drivers: "Choferes",
  routes: "Rutas",
  trips: "Viajes",
  tools: "Herramientas",
  fluids: "Fluidos",
  fuel: "Combustible",
  dotation: "Dotación",
  suppliers: "Proveedores",
  troubleshooting: "Manual de fallas",
};

export const hasModuleAccess = (
  role: UserRole | null | undefined,
  module: AppModule,
  level: AccessLevel = "read"
): boolean => {
  if (!role) return false;
  if (role === "manager") return true;

  const access = MODULE_ACCESS[module];
  if (access.write.includes(role)) return true;
  return level === "read" && access.read.includes(role);
};
