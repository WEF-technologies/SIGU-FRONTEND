interface AlertCountBadgeProps {
  criticalCount: number;
  warningCount: number;
}

/** Contador para la pestaña de alertas: rojo si hay criticas, ambar si solo advertencias. */
export function AlertCountBadge({ criticalCount, warningCount }: AlertCountBadgeProps) {
  const total = criticalCount + warningCount;
  if (total <= 0) return null;

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
        criticalCount > 0 ? "bg-red-600 text-white" : "bg-amber-400 text-amber-950"
      }`}
    >
      {total}
    </span>
  );
}
