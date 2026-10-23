import { FilterOption } from "@/lib/filtering";

/** Valores de estado que maneja el backend, con la etiqueta que ve el usuario. */
export const VEHICLE_STATUS_OPTIONS: FilterOption[] = [
  { value: "available", label: "Operativa" },
  { value: "maintenance", label: "En mantenimiento" },
  { value: "out_of_service", label: "Inactiva" },
];

/** Estados de personal, items de dotacion y proveedores (backend: active | inactive). */
export const ACTIVE_STATUS_OPTIONS: FilterOption[] = [
  { value: "active", label: "Activo" },
  { value: "inactive", label: "Inactivo" },
];

/** alert_status que calcula el backend de dotacion segun la fecha de vencimiento. */
export const DOTATION_ALERT_STATUS_OPTIONS: FilterOption[] = [
  { value: "vigente", label: "Vigente" },
  { value: "por_vencer", label: "Por vencer" },
  { value: "vencida", label: "Vencida" },
];
