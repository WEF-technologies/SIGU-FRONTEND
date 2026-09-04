import { useEffect, useState } from "react";

/**
 * Retrasa la propagacion de un valor que cambia con cada tecla, para no lanzar
 * una peticion por pulsacion. Devuelve el ultimo valor estable.
 */
export const useDebouncedValue = <T,>(value: T, delayMs = 350): T => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedValue(value), delayMs);
    return () => window.clearTimeout(timeout);
  }, [value, delayMs]);

  return debouncedValue;
};
