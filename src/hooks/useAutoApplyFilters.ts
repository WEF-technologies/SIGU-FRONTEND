import { useEffect, useRef } from "react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

/**
 * Para filtros que se resuelven en el servidor: vuelve a consultar cuando el
 * usuario deja de cambiarlos, sin boton "Aplicar". No dispara con el valor
 * inicial porque esa primera carga ya la hace el hook de datos.
 */
export const useAutoApplyFilters = <T,>(filters: T, apply: (filters: T) => unknown, delayMs = 400) => {
  const applyRef = useRef(apply);
  const lastAppliedRef = useRef(filters);
  const debouncedFilters = useDebouncedValue(filters, delayMs);

  useEffect(() => {
    applyRef.current = apply;
  });

  useEffect(() => {
    if (debouncedFilters === lastAppliedRef.current) return;
    lastAppliedRef.current = debouncedFilters;
    void applyRef.current(debouncedFilters);
  }, [debouncedFilters]);
};
