/**
 * Montos decimales del backend.
 *
 * El backend guarda los montos como Numeric(18, 2) y los devuelve como texto
 * ("150000.00"). Se trabajan en centimos con BigInt: un `number` pierde
 * centimos por encima de 2^53 y sumar decimales en coma flotante acumula
 * errores (0.1 + 0.2 !== 0.3), justo lo que no puede pasar en un total.
 */

const DECIMAL_PATTERN = /^(\d+)(?:\.(\d+))?$/;

/** "150000.00" -> 15000000n. Redondea a centimos (mitad hacia arriba) como el backend. */
export const parseDecimalToCents = (value: unknown): bigint | null => {
  let text = "";
  if (typeof value === "string") text = value.trim();
  else if (typeof value === "number" && Number.isFinite(value) && value >= 0) text = value.toFixed(2);

  const match = DECIMAL_PATTERN.exec(text);
  if (!match) return null;

  const [, whole, fraction = ""] = match;
  let cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0").slice(0, 2));
  if (fraction.length > 2 && Number(fraction[2]) >= 5) cents += 1n;

  return cents;
};

/** 15000000n -> "150000.00" (formato que acepta el backend). */
export const centsToDecimalString = (cents: bigint) => {
  const sign = cents < 0n ? "-" : "";
  const absolute = cents < 0n ? -cents : cents;
  return `${sign}${absolute / 100n}.${String(absolute % 100n).padStart(2, "0")}`;
};

/** Normaliza cualquier decimal del backend a "N.NN"; null si no es valido. */
export const normalizeDecimalString = (value: unknown) => {
  const cents = parseDecimalToCents(value);
  return cents === null ? null : centsToDecimalString(cents);
};

const amountFormatter = new Intl.NumberFormat("es-VE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * "150000.00" -> "150.000,00". Se le pasa el texto, no un `number`: los
 * navegadores actuales formatean un decimal en texto sin perder precision.
 */
export const formatAmount = (value: string | bigint | null | undefined) => {
  if (value === null || value === undefined) return "-";

  const decimal = typeof value === "bigint" ? centsToDecimalString(value) : normalizeDecimalString(value);
  if (decimal === null) return typeof value === "string" && value ? value : "-";

  return amountFormatter.format(decimal as unknown as number);
};

/**
 * Sin union discriminada: el proyecto compila sin `strictNullChecks` y ahi
 * TypeScript no estrecha por `ok`. Con `ok` true vienen `value` y `cents`;
 * con `ok` false viene `error`.
 */
export interface AmountInputResult {
  ok: boolean;
  value?: string;
  cents?: bigint;
  error?: string;
}

/**
 * Lee el monto que escribe el usuario. Acepta coma o punto como separador
 * decimal ("1500,50" o "1500.50") pero no separadores de miles: "1.500" es
 * ambiguo (mil quinientos en es-VE, uno con cinco en el backend) y se rechaza
 * por tener tres decimales en lugar de adivinar.
 */
export const parseAmountInput = (
  raw: string,
  { maxIntegerDigits }: { maxIntegerDigits: number }
): AmountInputResult => {
  const text = raw.trim().replace(/\s+/g, "");
  if (!text) return { ok: false, error: "Ingresa el monto." };

  const match = /^(\d+)(?:[.,](\d*))?$/.exec(text);
  if (!match) {
    return {
      ok: false,
      error: "Escribe solo numeros, sin separadores de miles (ej. 1500,50).",
    };
  }

  const [, whole, fraction = ""] = match;
  if (fraction.length > 2) {
    return {
      ok: false,
      error: "Usa como maximo 2 decimales y no separes los miles (ej. 1500,50).",
    };
  }

  const integerPart = whole.replace(/^0+(?=\d)/, "");
  if (integerPart.length > maxIntegerDigits) {
    return { ok: false, error: "El monto es demasiado grande." };
  }

  const cents = parseDecimalToCents(`${integerPart}.${fraction || "0"}`);
  if (cents === null) return { ok: false, error: "Ingresa un monto valido." };
  if (cents <= 0n) return { ok: false, error: "El monto debe ser mayor a 0." };

  return { ok: true, value: centsToDecimalString(cents), cents };
};

/** Monto del backend ("150000.00") como texto editable en es-VE ("150000,00"). */
export const toAmountInputValue = (value: string | null | undefined) => {
  const decimal = normalizeDecimalString(value);
  return decimal ? decimal.replace(".", ",") : "";
};
