/**
 * Fecha local en formato YYYY-MM-DD, el que usa un `<input type="date">`.
 *
 * No usar `toISOString().slice(0, 10)` para esto: da la fecha en UTC, y en
 * Venezuela (UTC-4) desde las 8 p. m. devuelve el dia siguiente.
 */
export const toDateOnlyLocalValue = (date: Date = new Date()) => {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Muestra una fecha del backend (YYYY-MM-DD o fecha y hora) como dd/mm/aaaa.
 *
 * Una fecha sin hora se lee como fecha local: `new Date("2026-11-06")` la toma
 * como medianoche UTC y en Venezuela se mostraria el dia anterior.
 */
export const formatDateOnly = (value?: string | null) => {
  if (!value) return "-";

  const match = DATE_ONLY_PATTERN.exec(value.trim());
  const parsedDate = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(value);

  if (Number.isNaN(parsedDate.getTime())) return value;
  return parsedDate.toLocaleDateString("es-VE");
};
