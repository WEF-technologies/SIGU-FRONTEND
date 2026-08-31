import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Valida URLs que vienen de datos (API/usuarios) antes de usarlas en un href.
 * Solo se permiten esquemas http/https; cualquier otro (javascript:, data:, etc.)
 * se descarta para evitar XSS por inyección de enlaces.
 */
export function getSafeExternalUrl(value?: string | null): string | null {
  if (!value) return null;
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.href : null;
  } catch {
    return null;
  }
}
