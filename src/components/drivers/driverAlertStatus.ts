import { DriverAlert } from "@/types";

export type DriverAlertStatus = DriverAlert["status_license"];

export const getDriverAlertStatusColor = (status: string) => {
  switch (status) {
    case "due":
      return "bg-red-100 text-red-800 border-red-200";
    case "near":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "missing":
      return "bg-gray-100 text-gray-800 border-gray-200";
    default:
      return "bg-green-100 text-green-800 border-green-200";
  }
};

export const getDriverAlertStatusText = (status: string) => {
  switch (status) {
    case "due":
      return "Vencido";
    case "near":
      return "Próximo";
    case "missing":
      return "Falta";
    default:
      return "OK";
  }
};

export const hasActiveAlert = (alert: DriverAlert) =>
  alert.status_license !== "ok" || alert.status_defensive !== "ok";

export const getWorstStatus = (alert: DriverAlert): DriverAlertStatus => {
  if (alert.status_license === "due" || alert.status_defensive === "due") return "due";
  if (alert.status_license === "near" || alert.status_defensive === "near") return "near";
  if (alert.status_license === "missing" || alert.status_defensive === "missing") return "missing";
  return "ok";
};

/**
 * Formatea fechas de vencimiento sin pasar por `new Date("YYYY-MM-DD")`,
 * que interpreta la fecha como UTC y en husos negativos (ej. Venezuela)
 * muestra el día anterior.
 */
export const formatAlertDate = (value?: string | null): string | null => {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (match) {
    const [, year, month, day] = match;
    return `${day}/${month}/${year}`;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toLocaleDateString();
};
