/**
 * El backend guarda los kilometrajes como decimales (p. ej. 15234.5), así que
 * se leen y se muestran sin truncar.
 */

/** Convierte lo que llegue del backend a número, o null si no hay dato. */
export const toNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;

  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

/** Número con separador de miles y hasta dos decimales, sin la unidad. */
export const formatKmNumber = (value: number) =>
  value.toLocaleString(undefined, { maximumFractionDigits: 2 });

/** "15.234,5 km", o `emptyLabel` cuando no hay kilometraje. */
export const formatKilometers = (
  value: number | null | undefined,
  emptyLabel = "No registrado"
) => (typeof value === "number" && Number.isFinite(value) ? `${formatKmNumber(value)} km` : emptyLabel);
