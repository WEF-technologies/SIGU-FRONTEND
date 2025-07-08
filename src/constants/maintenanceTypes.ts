
export const maintenanceTypeConfig = {
  M1: { label: "M1 - Preventivo Básico", color: "bg-blue-100 text-blue-800", priority: "low" },
  M2: { label: "M2 - Correctivo", color: "bg-yellow-100 text-yellow-800", priority: "medium" },
  M3: { label: "M3 - Mayor (Crítico)", color: "bg-red-100 text-red-800", priority: "high" },
  M4: { label: "M4 - Especializado", color: "bg-purple-100 text-purple-800", priority: "medium" }
} as const;

export type MaintenanceTypeKey = keyof typeof maintenanceTypeConfig;
