import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { useAuthenticatedFetch } from "@/hooks/useAuthenticatedFetch";
import { vehiclesApi } from "@/services/vehiclesApi";
import { VehicleSpecification } from "@/types";

/**
 * El backend solo expone la ficha técnica unidad por unidad, así que esto se
 * pide en lote y con tope: es para afinar una regla sobre las unidades que ya
 * cubre, no para recorrer la flota entera.
 */
export const MAX_SPECIFICATION_LOOKUPS = 25;

export const useVehicleSpecifications = (plates: string[], enabled: boolean) => {
  // Ordenadas y sin repetidos: la llave de cache no debe cambiar por el orden.
  const normalizedPlates = useMemo(
    () =>
      Array.from(new Set(plates.map((plate) => plate.trim()).filter(Boolean)))
        .sort((a, b) => a.localeCompare(b))
        .slice(0, MAX_SPECIFICATION_LOOKUPS),
    [plates]
  );

  const authenticatedFetch = useAuthenticatedFetch();

  const results = useQueries({
    queries: normalizedPlates.map((plate) => ({
      queryKey: ["vehicle-specification", plate] as const,
      // Una unidad sin ficha responde 404 y el servicio lo traduce a null.
      queryFn: () => vehiclesApi.getSpecification(authenticatedFetch, plate),
      enabled,
      staleTime: 5 * 60_000,
      retry: false,
    })),
  });

  const specifications = useMemo(() => {
    const map = new Map<string, VehicleSpecification | null>();

    normalizedPlates.forEach((plate, index) => {
      const result = results[index];
      if (result?.isSuccess) map.set(plate, result.data ?? null);
    });

    return map;
  }, [normalizedPlates, results]);

  return {
    specifications,
    isLoading: enabled && results.some((result) => result.isLoading),
    /** Placas que quedaron fuera del tope y no se consultaron. */
    isTruncated: plates.length > MAX_SPECIFICATION_LOOKUPS,
  };
};
