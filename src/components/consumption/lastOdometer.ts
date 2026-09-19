import { Vehicle } from "@/types";

/**
 * Último kilometraje conocido de cada unidad.
 *
 * El dato vive repartido: la ficha del vehículo guarda su kilometraje, y cada
 * carga de combustible o servicio de fluido pudo registrar un odómetro más
 * reciente. Se toma el mayor de todos, que es el único que no hace retroceder
 * la cuenta.
 */

/** Kilometraje que trae la propia ficha de la unidad. */
export const getVehicleBaseKm = (vehicle: Vehicle) =>
  Math.max(
    vehicle.current_kilometers ?? 0,
    vehicle.kilometers ?? 0,
    vehicle.last_m3_kilometers ?? 0
  );

export interface OdometerRecord {
  /** Alguno de los dos basta: los registros unas veces traen id y otras placa. */
  vehicleId?: string | null;
  vehiclePlate?: string | null;
  odometerKm?: number | null;
}

export const buildLastOdometerMap = (
  vehicles: Vehicle[],
  records: OdometerRecord[] = []
): Map<string, number> => {
  const idByPlate = new Map(
    vehicles.map((vehicle) => [vehicle.plate_number.trim().toUpperCase(), vehicle.id])
  );

  const lastOdometer = new Map<string, number>(
    vehicles.map((vehicle) => [vehicle.id, getVehicleBaseKm(vehicle)])
  );

  records.forEach((record) => {
    const km = record.odometerKm;
    if (typeof km !== "number" || !Number.isFinite(km) || km <= 0) return;

    const vehicleId =
      record.vehicleId ||
      (record.vehiclePlate ? idByPlate.get(record.vehiclePlate.trim().toUpperCase()) : undefined);
    if (!vehicleId) return;

    const current = lastOdometer.get(vehicleId) ?? 0;
    if (km > current) lastOdometer.set(vehicleId, km);
  });

  return lastOdometer;
};
