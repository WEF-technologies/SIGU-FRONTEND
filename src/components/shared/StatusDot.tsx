export type StatusDotTone = "green" | "blue" | "violet" | "amber" | "red" | "gray";

const DOT_CLASS: Record<StatusDotTone, string> = {
  green: "bg-emerald-500",
  blue: "bg-blue-500",
  violet: "bg-violet-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
  gray: "bg-gray-400",
};

/**
 * Estado como punto de color y texto. Mas liviano que una pastilla con borde y
 * fondo, y el texto sigue diciendo el estado para quien no distingue colores.
 */
export function StatusDot({ label, tone }: { label: string; tone: StatusDotTone }) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap text-sm text-gray-700">
      <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${DOT_CLASS[tone]}`} />
      {label}
    </span>
  );
}
