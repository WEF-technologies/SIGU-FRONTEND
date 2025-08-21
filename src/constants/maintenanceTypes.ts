
export const maintenanceTypeConfig = {
  "m2+": {
    label: "Mantenimiento M2+ (3,500 km)",
    color: "text-green-600 border-green-600",
    description: "Revisión básica de fluidos, filtros y componentes menores",
    interval: 3500
  },
  "m3": {
    label: "Mantenimiento M3 (7,000 km)", 
    color: "text-blue-600 border-blue-600",
    description: "Revisión de frenos, suspensión y sistemas eléctricos",
    interval: 7000
  },
  "m3+": {
    label: "Mantenimiento M3+ (15,000 km)",
    color: "text-orange-600 border-orange-600", 
    description: "Revisión completa del motor y transmisión",
    interval: 15000
  },
  "m4": {
    label: "Mantenimiento M4 (30,000 km)",
    color: "text-red-600 border-red-600",
    description: "Mantenimiento mayor con reemplazo de componentes críticos",
    interval: 30000
  },
  "m5": {
    label: "Mantenimiento M5 (45,000 km)",
    color: "text-purple-600 border-purple-600",
    description: "Revisión completa y overhaul del vehículo",
    interval: 45000
  }
} as const;

export type MaintenanceTypeKey = keyof typeof maintenanceTypeConfig;
