/**
 * Utilidades comunes de filtrado. Todas las pantallas comparan texto igual:
 * sin distinguir mayusculas ni tildes ("camion" encuentra "Camión") y por
 * palabras, de modo que "hiace toyota" encuentra "Toyota Hiace".
 */

export interface FilterOption {
  value: string;
  label: string;
}

/** Valor reservado para "sin filtro" en los desplegables. */
export const ALL_FILTER_VALUE = "all";

export const normalizeSearchText = (value: unknown): string => {
  if (value === null || value === undefined) return "";

  return String(value)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
};

/** True si cada palabra de la busqueda aparece en alguno de los campos. */
export const matchesSearch = (query: string, fields: unknown[]): boolean => {
  const tokens = normalizeSearchText(query).split(" ").filter(Boolean);
  if (tokens.length === 0) return true;

  const haystack = fields.map(normalizeSearchText).join(" ");
  return tokens.every((token) => haystack.includes(token));
};

/** Un valor de filtro esta activo si no esta vacio ni es "Todos". */
export const isFilterActive = (value: unknown): boolean => {
  if (value === null || value === undefined || value === false) return false;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed !== "" && trimmed !== ALL_FILTER_VALUE;
  }
  return true;
};

/** Compara un valor de la fila con el elegido en un desplegable. */
export const matchesOption = (selected: string | undefined, value: unknown): boolean => {
  if (!isFilterActive(selected)) return true;
  return normalizeSearchText(value) === normalizeSearchText(selected);
};

const sortOptions = (options: FilterOption[]) =>
  options.sort((a, b) => a.label.localeCompare(b.label, "es", { sensitivity: "base", numeric: true }));

/**
 * Opciones a partir de los valores que existen en los datos: sin vacios ni
 * duplicados y ordenadas, para que el usuario elija en vez de adivinar el
 * texto exacto.
 */
export const buildOptionsFromValues = (
  values: Array<string | null | undefined>,
  formatLabel: (value: string) => string = (value) => value
): FilterOption[] => {
  const unique = new Map<string, string>();

  values.forEach((raw) => {
    const value = typeof raw === "string" ? raw.trim() : "";
    if (!value) return;
    const key = normalizeSearchText(value);
    if (!unique.has(key)) unique.set(key, value);
  });

  return sortOptions(
    Array.from(unique.values()).map((value) => ({ value, label: formatLabel(value) }))
  );
};

/**
 * Opciones conocidas (con su etiqueta) mas cualquier otro valor que aparezca
 * en los datos, para no dejar registros imposibles de filtrar.
 */
export const mergeKnownOptions = (
  known: readonly FilterOption[],
  values: Array<string | null | undefined>,
  formatLabel?: (value: string) => string
): FilterOption[] => {
  const knownKeys = new Set(known.map((option) => normalizeSearchText(option.value)));
  const extra = buildOptionsFromValues(values, formatLabel).filter(
    (option) => !knownKeys.has(normalizeSearchText(option.value))
  );

  return [...known, ...extra];
};

export const getOptionLabel = (options: readonly FilterOption[], value?: string | null): string => {
  if (!value) return "";
  const key = normalizeSearchText(value);
  return options.find((option) => normalizeSearchText(option.value) === key)?.label ?? value;
};

export const countActiveFilters = (values: unknown[]): number =>
  values.filter((value) => isFilterActive(value)).length;
