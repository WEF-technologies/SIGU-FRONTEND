import type { ReactNode } from "react";
import { toast as sonnerToast } from "sonner";
import { SESSION_EXPIRED_MESSAGE } from "@/lib/apiClient";

/**
 * Punto unico de notificaciones de la app.
 *
 * Conserva la API `toast({ title, description, variant })` que usan los modulos,
 * pero la resuelve sobre Sonner para que las notificaciones no se pisen ni se
 * encadenen:
 *
 * - Los errores que llegan en rafaga (varias cargas fallando a la vez) se agrupan
 *   en una sola notificacion con el resumen, en lugar de una cascada.
 * - Un mensaje identico a uno visible no se repite: refresca el existente.
 * - La sesion expirada se avisa una sola vez, sin importar cuantas peticiones
 *   fallen por ese motivo.
 */

type ToastVariant = "default" | "destructive";

interface ToastOptions {
  title?: ReactNode;
  description?: ReactNode;
  variant?: ToastVariant;
}

const SUCCESS_DURATION_MS = 4000;
const ERROR_DURATION_MS = 7000;

/** Errores separados por menos de este intervalo se consideran la misma rafaga. */
const ERROR_BURST_WINDOW_MS = 2000;
const MAX_LISTED_ERRORS = 3;

const SESSION_EXPIRED_ID = "sigu-session-expired";

interface GroupedError {
  key: string;
  title: ReactNode;
  description: ReactNode;
}

let groupedErrors: GroupedError[] = [];
let lastErrorAt = 0;
// Cada grupo usa un id propio: reutilizar el de un toast que esta cerrandose
// haria que la actualizacion se pierda con la animacion de salida.
let errorGroupId = 0;

const resetErrorGroup = () => {
  groupedErrors = [];
};

const dismissErrorGroup = () => {
  if (groupedErrors.length > 0) sonnerToast.dismiss(`sigu-error-${errorGroupId}`);
  resetErrorGroup();
};

const textOf = (node: ReactNode) =>
  typeof node === "string" || typeof node === "number" ? String(node) : "";

const isSessionExpired = ({ title, description }: ToastOptions) =>
  textOf(title) === SESSION_EXPIRED_MESSAGE || textOf(description) === SESSION_EXPIRED_MESSAGE;

const showError = ({ title, description }: ToastOptions) => {
  const now = Date.now();
  // Fuera de la rafaga, el error nuevo reemplaza al anterior en vez de apilarse.
  if (now - lastErrorAt > ERROR_BURST_WINDOW_MS) dismissErrorGroup();
  lastErrorAt = now;

  if (groupedErrors.length === 0) errorGroupId += 1;

  const key = `${textOf(title)}\u0000${textOf(description)}`;
  if (!groupedErrors.some((error) => error.key === key)) {
    groupedErrors = [...groupedErrors, { key, title, description }];
  }

  const groupId = errorGroupId;
  const closeGroup = () => {
    if (groupId === errorGroupId) resetErrorGroup();
  };

  const options = {
    id: `sigu-error-${groupId}`,
    duration: ERROR_DURATION_MS,
    onDismiss: closeGroup,
    onAutoClose: closeGroup,
  };

  if (groupedErrors.length === 1) {
    sonnerToast.error(title || "Error", { ...options, description });
    return;
  }

  // El detalle mas util es la descripcion; los titulos suelen ser un "Error" generico.
  const listed = groupedErrors
    .slice(0, MAX_LISTED_ERRORS)
    .map((error) => `• ${textOf(error.description) || textOf(error.title) || "Error inesperado"}`);
  const hidden = groupedErrors.length - listed.length;
  if (hidden > 0) listed.push(`y ${hidden} más`);

  sonnerToast.error(`Ocurrieron ${groupedErrors.length} errores`, {
    ...options,
    description: listed.join("\n"),
    descriptionClassName: "whitespace-pre-line",
  });
};

function toast(options: ToastOptions) {
  if (isSessionExpired(options)) {
    sonnerToast.warning("Tu sesión expiró", {
      id: SESSION_EXPIRED_ID,
      description: "Inicia sesión nuevamente para continuar.",
      duration: ERROR_DURATION_MS,
    });
    return;
  }

  if (options.variant === "destructive") {
    showError(options);
    return;
  }

  // Una accion exitosa deja obsoletos los errores que seguian en pantalla.
  dismissErrorGroup();

  sonnerToast.success(options.title, {
    id: `success:${textOf(options.title)}\u0000${textOf(options.description)}`,
    description: options.description,
    duration: SUCCESS_DURATION_MS,
  });
}

function useToast() {
  return { toast };
}

export { useToast, toast };
