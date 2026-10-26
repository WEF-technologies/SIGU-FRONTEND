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
