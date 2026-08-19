
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
  status: 'available' | 'maintenance' | 'out_of_service';
  current_maintenance_type?: 'M1' | 'M2' | 'M3' | 'M4';
  current_kilometers?: number;
  kilometers?: number; // Backend uses 'kilometers' field
  location?: string;
  last_m3_date?: string;
  last_m3_kilometers?: number;
  next_m3_kilometers?: number;
}

export interface NextM3Item {
  vehicle_plate: string;
  last_m3_date?: string;
  next_m3_kilometers?: number;
  current_kilometers: number;
  remaining_km?: number;
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

export interface Contract extends BaseEntity {
  description: string;
  start_date: string;
  end_date: string;
  location: string;
  status: string;
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
  type: 'm2+' | 'm3' | 'm3+' | 'm4' | 'm5';
  date: string;
  kilometers?: number;
  location?: string;
  performed_by?: string;
  spare_part_id?: string;
  spare_part_description?: string;
  vehicle?: Vehicle;
  vehicle_plate?: string;
}

export interface MaintenanceAlert {
  vehicle_plate: string;
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
  title: string;
  message: string;
  fluid_type?: FluidType;
  vehicle_plate?: string;
  product_code?: string;
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
  vin?: string | null;
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

export interface VehiclePart extends BaseEntity {
  vehicle_id: string;
  vehicle_plate: string;
  type: string;
  code: string;
  serial_number?: string;
  position?: string;
  installed_date: string;
  installed_kilometers?: number;
  life_kilometers?: number;
  expiry_date?: string;
  status: 'active' | 'removed' | 'maintenance';
  removed_date?: string;
  removed_kilometers?: number;
  notes?: string;
}

export interface PartAlert {
  vehicle_plate: string;
  part_type: string;
  code: string;
  serial_number?: string;
  position?: string;
  installed_date: string;
  installed_kilometers?: number;
  life_kilometers?: number;
  expiry_date?: string;
  current_kilometers: number;
  remaining_km?: number;
  days_to_expiry?: number;
  status_km: 'ok' | 'near' | 'due' | 'missing';
  status_date: 'ok' | 'near' | 'due' | 'missing';
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

export type MaintenanceType = 'm2+' | 'm3' | 'm3+' | 'm4' | 'm5';
export type EntityStatus = 'active' | 'inactive' | 'maintenance' | 'completed' | 'pending' | 'in_progress' | 'terminated';
