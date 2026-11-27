import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { getVehicleStatusAppearance } from "@/constants/vehicleLocations";

interface VehicleStatusBadgeProps {
  status: string;
  size?: "sm" | "md";
  className?: string;
}

/**
 * Etiqueta de estado o sede de un vehículo. Las sedes llevan un pin y su color
 * propio (Puerto Ordaz azul, Barcelona magenta, Ciudad Piar tierra); los
 * estados llevan un punto.
 */
export function VehicleStatusBadge({ status, size = "sm", className }: VehicleStatusBadgeProps) {
  const appearance = getVehicleStatusAppearance(status);
  const isSede = appearance.kind === "sede";

  return (
    <span
      title={appearance.description}
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border font-semibold leading-none",
        size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm",
        appearance.badgeClassName,
        className
      )}
    >
      {isSede ? (
        <MapPin className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} aria-hidden="true" />
      ) : (
        <span className={cn("h-2 w-2 rounded-full", appearance.accentClassName)} aria-hidden="true" />
      )}
      {appearance.label}
      {isSede && <span className="sr-only"> (operativa)</span>}
    </span>
  );
}
