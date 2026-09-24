import { useQuery } from "@tanstack/react-query";
import { useAuthenticatedFetch } from "@/hooks/useAuthenticatedFetch";
import { fluidsApi } from "@/services/fluidsApi";
import { FluidProduct } from "@/types";

/**
 * Catálogo de fluidos bajo demanda.
 *
 * Lo usa el módulo de combustible para poder registrar también un fluido sin
 * cargar ese catálogo en cada visita: solo se pide cuando se abre el
 * formulario, y queda en caché para las siguientes.
 */
export const useFluidProducts = (enabled: boolean) => {
  const authenticatedFetch = useAuthenticatedFetch();

  const query = useQuery({
    queryKey: ["fluid-products"],
    queryFn: (): Promise<FluidProduct[]> => fluidsApi.listProducts(authenticatedFetch),
    enabled,
    staleTime: 5 * 60_000,
    // Si el módulo de fluidos no responde, el formulario sigue sirviendo para
    // combustible: no tiene sentido reintentar ni interrumpir con un error.
    retry: false,
  });

  return {
    products: query.data ?? [],
    isLoading: enabled && query.isLoading,
  };
};
