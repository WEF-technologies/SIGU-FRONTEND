
export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface Vehicle extends BaseEntity {
  brand: string;
  model: string;
  year: number;
  plate_number: string;
  /** Texto libre en el backend: available | maintenance | out_of_service o el nombre de una sede. */
  status: string;
  current_kilometers?: number;
  kilometers?: number; // Backend uses 'kilometers' field
  /**
   * El backend los recalcula al crear, editar o borrar un M3 (toma el de mayor
   * km). Si la unidad ya no tiene ningún M3, ambos llegan en null.
   */
  last_m3_date?: string | null;
  /** No lo envía el backend: se deriva del historial en `useMaintenance`. */
  last_m3_kilometers?: number | null;
  next_m3_kilometers?: number | null;
}

export interface NextM3Item {
  vehicle_plate: string;
  last_m3_date?: string | null;
  next_m3_kilometers?: number | null;
  current_kilometers: number;
  remaining_km?: number | null;
  status: 'ok' | 'near' | 'due' | 'missing';
}

export interface User extends BaseEntity {
  document_type: string;
  name: string;
  last_name: string;
  lastname?: string; // For backend compatibility
  cargo: string;
  sucursal: string;
  telephone: string;
  document_number: string;
}

/**
 * Estados de contrato del backend. Un contrato nuevo solo puede nacer como
 * borrador o activo; el resto se alcanza por transiciones.
 */
export const CONTRACT_STATUS_OPTIONS = [
  { value: "borrador", label: "Borrador" },
  { value: "activo", label: "Activo" },
  { value: "paralizado", label: "Paralizado" },
  { value: "terminado", label: "Terminado" },
  { value: "cerrado", label: "Cerrado" },
] as const;

export type ContractStatus = (typeof CONTRACT_STATUS_OPTIONS)[number]["value"];

export const CONTRACT_INITIAL_STATUSES: ContractStatus[] = ["borrador", "activo"];

export const CONTRACT_CURRENCIES = ["USD", "VES"] as const;

export interface Contract extends BaseEntity {
  description: string;
  start_date: string;
  end_date: string;
  location: string;
  /** Uno de CONTRACT_STATUS_OPTIONS; los datos viejos (`active`) los migró el backend. */
  status: string;
  contract_number?: string | null;
  sap_order_number?: string | null;
  client?: string | null;
  user_management?: string | null;
  administrator_name?: string | null;
  currency?: (typeof CONTRACT_CURRENCIES)[number] | null;
  /** El backend lo serializa como decimal: puede llegar como texto. */
  contract_amount?: number | string | null;
  valuation_frequency_days?: number;
  approval_lead_days?: number;
  warning_pct?: number | string;
  critical_pct?: number | string;
}

export interface ContractPayload {
  description: string;
  start_date: string;
  end_date: string;
  location: string;
  status: ContractStatus;
  contract_number: string | null;
  sap_order_number: string | null;
  client: string | null;
  user_management: string | null;
  administrator_name: string | null;
  currency: (typeof CONTRACT_CURRENCIES)[number] | null;
  contract_amount: number | null;
  valuation_frequency_days: number;
  approval_lead_days: number;
  warning_pct: number;
  critical_pct: number;
}

export interface Route extends BaseEntity {
  contract_id: string;
  description: string;
  from_location: string;
  to_location: string;
  kilometers?: number;
  contract?: Contract;
}

export interface Trip extends BaseEntity {
  route_id: string;
  vehicle_id: string;
  driver_id: string;
  start_date: string;
  end_date?: string;
  start_kilometers?: number;
  end_kilometers?: number;
  total_kilometers?: number;
  applied_kilometers?: boolean;
  status: 'in_progress' | 'completed' | 'cancelled';
  observations?: string;
  route?: Route;
  vehicle?: Vehicle;
  driver?: Driver;
}

export interface Shift extends BaseEntity {
  contract_id: string;
  description: string;
  start_time: string; // Format: "HH:MM"
  end_time: string;   // Format: "HH:MM"
  contract?: Contract;
}

export interface Driver extends BaseEntity {
  name: string;
  last_name: string;
  document_number: string;
  telephone: string;
  status: 'active' | 'inactive';
  blood_type?: string;
  address?: string;
  contract_id?: string;
  license_expiry_date?: string;
  defensive_driving_expiry_date?: string;
  contract?: Contract;
}

export interface DriverAlert {
  document_number: string;
  name: string;
  last_name: string;
  license_expiry_date?: string;
  defensive_driving_expiry_date?: string;
  status_license: 'ok' | 'near' | 'due' | 'missing';
  status_defensive: 'ok' | 'near' | 'due' | 'missing';
}

export interface Maintenance extends BaseEntity {
  vehicle_id: string;
  description: string;
  /** Siempre en minúsculas: `useMaintenance` lo normaliza al leerlo. */
  type: 'm2+' | 'm3' | 'm3+' | 'm4' | 'm5';
  date: string;
  /** Puede traer decimales (p. ej. 15234.5). */
  kilometers?: number | null;
  location?: string | null;
  performed_by?: string | null;
  /**
   * UUID del repuesto del inventario. Queda en null si se cargó solo una
   * descripción o si el repuesto se eliminó después (el backend copia su
   * descripción en `spare_part_description`).
   */
  spare_part_id?: string | null;
  spare_part_description?: string | null;
  vehicle?: Vehicle;
  vehicle_plate?: string;
}

/** Lo que envía el formulario de mantenimiento al crear o editar. */
export interface MaintenanceFormData {
  plate_number: string;
  description: string;
  type: string;
  date: string;
  /**
   * null hace que el backend use el km actual de la unidad. Al editar se
   * reenvía el valor original si no cambió: con null el backend volvería a
   * validar y sobrescribiría el km del mantenimiento.
   */
  kilometers: number | null;
  location: string;
  performed_by: string;
  /** UUID del repuesto, o null. Nunca el código ni otro texto (422). */
  spare_part_id: string | null;
  spare_part_description: string;
}

/**
 * Por qué falló un alta o edición de mantenimiento:
 * - `not_found`: el mantenimiento ya no existe (404).
 * - `spare_part_missing`: el repuesto se eliminó mientras se llenaba el formulario (400).
 * - `invalid`: el backend rechazó los datos (400/404/422).
 * - `error`: red, 5xx u otro fallo.
 */
export type MaintenanceFailureReason = 'not_found' | 'spare_part_missing' | 'invalid' | 'error';

/** `reason` solo viene cuando `ok` es false. */
export interface MaintenanceMutationResult {
  ok: boolean;
  reason?: MaintenanceFailureReason;
}

export interface MaintenanceAlert {
  vehicle_plate: string;
  /** El backend lo devuelve en minúsculas; compárese siempre con `toLowerCase()`. */
  type: string;
  last_km: number | null;
  current_km: number;
  interval: number;
  remaining_km: number;
  status: 'ok' | 'near' | 'due' | 'missing';
  severity: number;
}

export type FuelType = 'gasoil' | 'gasolina';
export type FuelReadingUnit = 'liters' | 'percent';
export type FuelStatusSource = 'fuel_log' | 'fuel_reading';
export type FuelAnomalySeverity = 'warning' | 'critical';
export type FuelReportBucket = 'day' | 'week' | 'month';

export interface FuelLog {
  id: string;
  vehicle_id: string;
  fuel_type: FuelType;
  liters: number;
  total_cost: number;
  fueled_at: string;
  odometer_km?: number | null;
  station?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface FuelReading {
  id: string;
  vehicle_id: string;
  fuel_type: FuelType;
  reading_value: number;
  reading_unit: FuelReadingUnit;
  observed_at: string;
  odometer_km?: number | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface FuelVehicleStatus {
  vehicle_id: string;
  vehicle_plate: string;
  as_of: string;
  source: FuelStatusSource;
  fuel_type: FuelType;
  record_id?: string;
  message: string;
  liters?: number;
  total_cost?: number;
  reading_value?: number;
  reading_unit?: FuelReadingUnit;
  odometer_km?: number | null;
  station?: string | null;
  notes?: string | null;
}

export interface FuelConsumptionAnomaly {
  vehicle_id: string;
  vehicle_plate: string;
  fuel_type: FuelType;
  as_of: string;
  observed_liters_per_100km: number;
  baseline_liters_per_100km: number;
  deviation_percent: number;
  distance_km: number;
  liters: number;
  severity: FuelAnomalySeverity;
}

export interface FuelReportSummary {
  fuel_types?: FuelType[];
  total_logs: number;
  total_readings: number;
  total_liters: number;
  total_cost: number;
  average_cost_per_liter?: number | null;
  first_event_at?: string | null;
  last_event_at?: string | null;
  odometer_start_km?: number | null;
  odometer_end_km?: number | null;
  distance_km?: number | null;
  average_consumption_l_per_100km?: number | null;
}

export interface FuelReportTimelinePoint {
  bucket: FuelReportBucket;
  period_start: string;
  total_liters: number;
  total_cost: number;
  average_cost_per_liter?: number | null;
  distance_km?: number | null;
  average_consumption_l_per_100km?: number | null;
  logs_count: number;
  readings_count: number;
  average_reading_value?: number | null;
  reading_unit?: FuelReadingUnit | null;
}

export interface FuelReportMovement {
  event_type: FuelStatusSource;
  record_id: string;
  occurred_at: string;
  fuel_type: FuelType;
  odometer_km?: number | null;
  liters?: number | null;
  total_cost?: number | null;
  unit_cost?: number | null;
  station?: string | null;
  reading_value?: number | null;
  reading_unit?: FuelReadingUnit | null;
  notes?: string | null;
}

export interface FuelVehicleReport {
  vehicle_id: string;
  vehicle_plate: string;
  fuel_type_filter?: FuelType | null;
  date_from?: string | null;
  date_to?: string | null;
  bucket: FuelReportBucket;
  summary: FuelReportSummary;
  latest_status?: FuelVehicleStatus | null;
  anomalies?: FuelConsumptionAnomaly[];
  timeline?: FuelReportTimelinePoint[];
  movements?: FuelReportMovement[];
}

export interface FuelListFilters {
  vehicle_id?: string;
  fuel_type?: FuelType;
  date_from?: string;
  date_to?: string;
}

export interface FuelVehicleReportFilters {
  fuel_type?: FuelType;
  date_from?: string;
  date_to?: string;
  bucket?: FuelReportBucket;
  movement_limit?: number;
  anomaly_limit?: number;
}

export interface FuelAnomalyFilters {
  vehicle_id?: string;
  fuel_type?: FuelType;
  lookback?: number;
  min_history?: number;
  threshold_percent?: number;
  min_distance_km?: number;
}

export interface CreateFuelLogPayload {
  vehicle_id: string;
  fuel_type: FuelType;
  liters: number;
  total_cost: number;
  fueled_at: string;
  odometer_km?: number;
  station?: string;
  notes?: string;
}

export interface CreateFuelReadingPayload {
  vehicle_id: string;
  fuel_type: FuelType;
  reading_value: number;
  reading_unit: FuelReadingUnit;
  observed_at: string;
  odometer_km?: number;
  notes?: string;
}

export type FluidType =
  | 'engine_oil'
  | 'transmission_oil'
  | 'brake_fluid'
  | 'hydraulic_oil'
  | 'coolant'
  | 'other';

export type FluidMovementType =
  | 'opening_balance'
  | 'purchase'
  | 'adjustment_in'
  | 'adjustment_out'
  | 'service_use';

export type FluidAlertKind = 'stock' | 'service';
export type FluidAlertSeverity = 'info' | 'warning' | 'critical';

export interface FluidProduct {
  id: string;
  code: string;
  name?: string;
  description?: string;
  fluid_type: FluidType;
  stock_quantity: number;
  min_stock_quantity: number;
  unit?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface FluidRule {
  id: string;
  vehicle_id?: string;
  vehicle_plate?: string;
  fluid_type: FluidType;
  product_id?: string;
  product_code?: string;
  capacity_liters: number;
  interval_km?: number | null;
  interval_days?: number | null;
  last_service_km?: number | null;
  last_service_at?: string | null;
  next_due_km?: number | null;
  next_due_date?: string | null;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface FluidService {
  id: string;
  vehicle_id?: string;
  vehicle_plate?: string;
  product_id: string;
  product_code?: string;
  fluid_type: FluidType;
  quantity: number;
  odometer_km?: number | null;
  performed_by?: string;
  location?: string;
  serviced_at?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface FluidMovement {
  id: string;
  product_id: string;
  product_code?: string;
  fluid_type?: FluidType;
  movement_type: FluidMovementType;
  quantity: number;
  stock_after?: number | null;
  reference?: string;
  notes?: string;
  moved_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface FluidAlert {
  id: string;
  kind: FluidAlertKind;
  severity: FluidAlertSeverity;
  /** missing | due | near | ok (servicio) o low_stock | out_of_stock (stock). */
  status?: string;
  title: string;
  message: string;
  fluid_type?: FluidType;
  vehicle_plate?: string;
  product_id?: string;
  product_code?: string;
  product_name?: string;
  last_serviced_at?: string;
  current_stock?: number;
  min_stock?: number;
  due_km?: number;
  due_days?: number;
  due_date?: string;
  source?: string;
}

export interface CreateFluidProductPayload {
  code: string;
  fluid_type: FluidType;
  specification?: string | Record<string, unknown>;
  name?: string;
  description?: string;
  stock_quantity?: number;
  min_stock_quantity?: number;
  unit?: string;
  notes?: string;
}

export interface UpdateFluidProductPayload {
  code?: string;
  fluid_type?: FluidType;
  specification?: string | Record<string, unknown>;
  name?: string;
  description?: string;
  stock_quantity?: number;
  min_stock_quantity?: number;
  unit?: string;
  notes?: string;
}

export interface CreateFluidRulePayload {
  vehicle_id?: string;
  unit_id?: string;
  vehicle_plate?: string;
  plate_number?: string;
  fluid_type: FluidType;
  product_id?: string;
  fluid_product_id?: string;
  capacity_liters: number;
  interval_km?: number;
  interval_days?: number;
  notes?: string;
}

export interface UpdateFluidRulePayload {
  fluid_type?: FluidType;
  product_id?: string;
  fluid_product_id?: string;
  capacity_liters?: number;
  interval_km?: number;
  interval_days?: number;
  notes?: string;
}

export interface CreateFluidServicePayload {
  vehicle_plate: string;
  fluid_product_id: string;
  quantity_used: number;
  odometer_km?: number;
  serviced_at: string;
  performed_by?: string;
  location?: string;
  notes?: string;
}

export interface CreateFluidMovementPayload {
  product_id: string;
  fluid_product_id?: string;
  movement_type: Extract<FluidMovementType, 'purchase' | 'adjustment_in' | 'adjustment_out'>;
  quantity: number;
  occurred_at?: string;
  reference?: string;
  notes?: string;
}

export interface VehicleSpecificationFields {
  engine_type?: string | null;
  engine_code?: string | null;
  fuel_type?: string | null;
  transmission_type?: string | null;
  drive_type?: string | null;
  serial?: string | null;
  chassis_number?: string | null;
  notes?: string | null;
}

export interface VehicleSpecification extends BaseEntity, VehicleSpecificationFields {
  vehicle_id: string;
}

export interface VehicleSpecificationPayload extends VehicleSpecificationFields {}

export interface SparePartFitmentFields {
  brand?: string | null;
  model?: string | null;
  year_from?: number | null;
  year_to?: number | null;
  engine_type?: string | null;
  engine_code?: string | null;
  fuel_type?: string | null;
  transmission_type?: string | null;
}

export interface SparePartFitment extends BaseEntity, SparePartFitmentFields {}

export interface SparePartFitmentPayload extends SparePartFitmentFields {}

export interface SparePart extends BaseEntity {
  code: string;
  description: string;
  quantity: number;
  company_location?: string | null;
  store_location?: string | null;
  compatible_vehicles: string[];
  vehicle_plates?: string;
  min_stock?: number | null;
  unit_price?: number | null;
  fitments?: SparePartFitment[];
}

export interface SparePartPayload {
  code: string;
  description: string;
  quantity: number;
  company_location?: string | null;
  compatible_vehicles?: string[];
  unit_price?: number | null;
  fitments?: SparePartFitmentPayload[];
}

export type ToolStatus = 'disponible' | 'en_uso' | 'en_mantenimiento' | 'retirada';
export type ToolAlertStatus = 'expired' | 'near' | 'ok';
export type ToolAlertSeverity = 'critical' | 'warning' | 'normal';

export interface Tool extends BaseEntity {
  code: string;
  name: string;
  category: string;
  location: string;
  status: ToolStatus;
  assigned_to?: string;
  purchase_date?: string;
  expiry_date?: string;
  notes?: string;
}

export interface ToolPayload {
  code: string;
  name: string;
  category: string;
  location: string;
  status: ToolStatus;
  assigned_to?: string;
  purchase_date?: string;
  expiry_date?: string;
  notes?: string;
}

export interface ToolFilters {
  category?: string;
  location?: string;
  status?: ToolStatus | 'all';
  assigned_to?: string;
}

export interface ToolAlertFilters {
  near_days?: number;
  include_ok?: boolean;
  category?: string;
  location?: string;
  status?: ToolStatus | 'all';
}

export interface ToolAlert {
  tool_id: string;
  code: string;
  name: string;
  category: string;
  location: string;
  status: ToolStatus;
  assigned_to?: string;
  expiry_date?: string;
  days_to_expiry?: number;
  alert_status: ToolAlertStatus;
  severity: ToolAlertSeverity;
}

export interface DotationStaffMember {
  id: string;
  name: string;
  last_name: string;
  document_number: string;
  department?: string | null;
  position?: string | null;
  status?: string | null;
  hire_date?: string | null;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface DotationStaffMemberPayload {
  name: string;
  last_name: string;
  document_number: string;
  department?: string | null;
  position?: string | null;
  status?: string | null;
  hire_date?: string | null;
  notes?: string | null;
}

export interface DotationStaffFilters {
  status?: string;
  department?: string;
  position?: string;
}

export interface DotationItem {
  id: string;
  code: string;
  name: string;
  category: string;
  renewal_months: number;
  status?: string | null;
  description?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface DotationItemPayload {
  code: string;
  name: string;
  category: string;
  renewal_months: number;
  status?: string | null;
  description?: string | null;
}

export interface DotationItemFilters {
  status?: string;
  category?: string;
}

export interface DotationDelivery {
  id: string;
  staff_member_id: string;
  staff_document_number: string;
  staff_name: string;
  staff_last_name: string;
  staff_full_name: string;
  dotation_item_id: string;
  item_code: string;
  item_name: string;
  item_category: string;
  quantity: number;
  delivered_at: string;
  expires_at: string;
  renewal_months_applied: number;
  delivered_by?: string | null;
  notes?: string | null;
  alert_status: string;
  days_to_expiry: number;
  created_at: string;
  updated_at: string;
}

export interface DotationDeliveryPayload {
  staff_member_id: string;
  dotation_item_id: string;
  delivered_at: string;
  quantity: number;
  delivered_by?: string | null;
  notes?: string | null;
}

export interface DotationDeliveryFilters {
  staff_document_number?: string;
  item_code?: string;
  alert_status?: string;
  delivered_from?: string;
  delivered_to?: string;
  near_days?: number;
}

export interface DotationAlert {
  id: string;
  staff_member_id: string;
  staff_document_number: string;
  staff_name: string;
  staff_last_name: string;
  staff_full_name: string;
  dotation_item_id: string;
  item_code: string;
  item_name: string;
  item_category: string;
  quantity: number;
  delivered_at: string;
  expires_at: string;
  renewal_months_applied: number;
  delivered_by?: string | null;
  notes?: string | null;
  alert_status: string;
  days_to_expiry: number;
  created_at: string;
  updated_at: string;
}

export interface DotationAlertFilters {
  near_days?: number;
  include_vigente?: boolean;
  staff_document_number?: string;
  item_code?: string;
  alert_status?: string;
}

export const SUPPLIER_CATEGORY_OPTIONS = [
  { value: "repuestos", label: "Repuestos" },
  { value: "fluidos", label: "Fluidos" },
  { value: "combustible", label: "Combustible" },
  { value: "herramientas", label: "Herramientas" },
  { value: "dotacion", label: "Dotacion" },
  { value: "servicios_mecanicos", label: "Servicios mecanicos" },
  { value: "servicios_electricos", label: "Servicios electricos" },
  { value: "llantas", label: "Llantas" },
  { value: "productos_limpieza", label: "Productos de limpieza" },
] as const;

export type SupplierCategory = (typeof SUPPLIER_CATEGORY_OPTIONS)[number]["value"];

export interface Supplier {
  id: string;
  name: string;
  address: string;
  contact_phone: string;
  email?: string | null;
  location: string;
  status: string;
  categories: string[];
  destacado: boolean;
  description?: string | null;
  delivery_time_notes?: string | null;
  chat_url: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupplierPayload {
  name: string;
  address: string;
  location: string;
  contact_phone: string;
  email?: string | null;
  status: string;
  categories: string[];
  destacado: boolean;
  description?: string | null;
  delivery_time_notes?: string | null;
  notes?: string | null;
}

export interface SupplierFilters {
  search?: string;
  status?: string;
  location?: string;
  category?: string;
  destacado?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Manual de fallas (troubleshooting).
 * Refleja el contrato de /api/v1/troubleshooting: el backend normaliza el
 * código a mayúsculas y categoría/severidad/estado a minúsculas, así que la UI
 * guarda los valores ya normalizados y solo formatea al mostrarlos.
 */
export const GUIDE_SEVERITY_OPTIONS = [
  { value: "baja", label: "Baja" },
  { value: "media", label: "Media" },
  { value: "alta", label: "Alta" },
  { value: "critica", label: "Critica" },
] as const;

export type GuideSeverity = (typeof GUIDE_SEVERITY_OPTIONS)[number]["value"];

export const GUIDE_STATUS_OPTIONS = [
  { value: "activa", label: "Activa" },
  { value: "inactiva", label: "Inactiva" },
] as const;

export type GuideStatus = (typeof GUIDE_STATUS_OPTIONS)[number]["value"];

/** Sugerencias de categoría: el backend acepta texto libre, no un enum. */
export const TROUBLESHOOTING_CATEGORY_SUGGESTIONS = [
  "motor",
  "frenos",
  "sistema electrico",
  "transmision",
  "suspension",
  "direccion",
  "neumaticos",
  "refrigeracion",
  "combustible",
  "aire acondicionado",
  "luces",
  "carroceria",
  "hidraulico",
  "otros",
] as const;

/** Límites del contrato del backend, replicados para validar antes de enviar. */
export const TROUBLESHOOTING_LIMITS = {
  code: 50,
  title: 160,
  category: 80,
  longText: 5000,
  maxSteps: 20,
} as const;

export interface TroubleshootingGuide {
  id: string;
  code: string;
  title: string;
  category: string;
  symptom: string;
  probable_causes?: string | null;
  resolution_steps: string[];
  severity: GuideSeverity;
  requires_workshop: boolean;
  safety_notes?: string | null;
  prevention_tips?: string | null;
  status: GuideStatus;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TroubleshootingGuidePayload {
  code: string;
  title: string;
  category: string;
  symptom: string;
  probable_causes?: string | null;
  resolution_steps: string[];
  severity: GuideSeverity;
  requires_workshop: boolean;
  safety_notes?: string | null;
  prevention_tips?: string | null;
  status: GuideStatus;
  notes?: string | null;
}

export interface TroubleshootingGuideFilters {
  /** Búsqueda libre; el backend la mapea al parámetro `q`. */
  search?: string;
  category?: string;
  severity?: string;
  status?: string;
  requires_workshop?: boolean;
  limit?: number;
  offset?: number;
}

export type MaintenanceType = 'm2+' | 'm3' | 'm3+' | 'm4' | 'm5';
export type EntityStatus = 'active' | 'inactive' | 'maintenance' | 'completed' | 'pending' | 'in_progress' | 'terminated';
