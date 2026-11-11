interface TwoLineCellProps {
  primary: string;
  secondary?: string | null;
}

/** Celda con el dato principal en negrita y un detalle debajo (codigo, documento...). */
export function TwoLineCell({ primary, secondary }: TwoLineCellProps) {
  return (
    <div>
      <p className="font-medium text-gray-900">{primary}</p>
      {secondary ? <p className="text-xs text-gray-500">{secondary}</p> : null}
    </div>
  );
}
