import { useEffect, useRef, useState } from "react";
import { TROUBLESHOOTING_CATEGORY_SUGGESTIONS, TroubleshootingGuide } from "@/types";

const sortCategories = (categories: Iterable<string>) =>
  Array.from(categories).sort((a, b) => a.localeCompare(b, "es"));

/**
 * Catalogo de categorias para el filtro. El backend las guarda como texto libre
 * y no expone un endpoint de categorias, asi que se acumulan las vistas en
 * cualquier respuesta sobre las sugerencias base.
 *
 * Es monotono a proposito: al filtrar por una categoria el listado se reduce a
 * esa, pero el desplegable debe seguir ofreciendo las demas para poder cambiar.
 */
export const useCategoryCatalog = (guides: TroubleshootingGuide[]) => {
  const seenCategories = useRef(new Set<string>(TROUBLESHOOTING_CATEGORY_SUGGESTIONS));
  const [catalog, setCatalog] = useState<string[]>(() => sortCategories(seenCategories.current));

  useEffect(() => {
    let hasNewCategory = false;

    guides.forEach((guide) => {
      const category = guide.category.trim();
      if (category && !seenCategories.current.has(category)) {
        seenCategories.current.add(category);
        hasNewCategory = true;
      }
    });

    if (hasNewCategory) {
      setCatalog(sortCategories(seenCategories.current));
    }
  }, [guides]);

  return catalog;
};
