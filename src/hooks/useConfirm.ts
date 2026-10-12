import { createContext, useContext, type ReactNode } from "react";

export interface ConfirmOptions {
  title: ReactNode;
  description?: ReactNode;
  /** Texto del boton que confirma. Por defecto "Eliminar". */
  confirmLabel?: string;
}

export type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

export const ConfirmContext = createContext<ConfirmFn | null>(null);

/**
 * Pide confirmacion antes de una accion que no se puede deshacer:
 *
 *   const confirm = useConfirm();
 *   if (!(await confirm({ title: "Eliminar ruta", description: "..." }))) return;
 *
 * Resuelve `true` solo si el usuario pulsa el boton de confirmar; cerrar el
 * dialogo de cualquier otra forma (Cancelar, Escape, clic afuera) es un no.
 */
export const useConfirm = (): ConfirmFn => {
  const confirm = useContext(ConfirmContext);
  if (!confirm) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return confirm;
};
