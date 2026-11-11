import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Botones a la derecha: "Actualizar" y la accion principal del modulo. */
  actions?: ReactNode;
}

/** Encabezado comun de los modulos: titulo, una linea de contexto y acciones. */
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-3xl font-bold text-primary-900">{title}</h1>
        {description ? <p className="text-sm text-gray-500">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
