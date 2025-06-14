
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
  location?: string;
  last_m3_date?: string;
  last_m3_km?: number;
  next_m3_km?: number;
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
  status: 'active' | 'inactive' | 'terminated';
  contract_code?: string;
  vehicles: Vehicle[];
  drivers: Driver[];
  routes?: Route[];
  shifts?: Shift[];
  document_url?: string;
}

export interface Route extends BaseEntity {
  contract_id: string;
  description: string;
  from_location: string;
  to_location: string;
  status: 'pending' | 'in_progress' | 'completed';
  kilometers?: number;
  contract?: Contract;
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
  document_url?: string;
  contract?: Contract;
}

export interface Maintenance extends BaseEntity {
  vehicle_id: string;
  description: string;
  type: 'M1' | 'M2' | 'M3' | 'M4';
  date: string;
  kilometers?: number;
  next_maintenance_km?: number;
  location?: string;
  performed_by?: string;
  vehicle?: Vehicle;
  vehicle_plate?: string;
}

export interface SparePart extends BaseEntity {
  code: string;
  description: string;
  quantity: number;
  company_location: string;
  store_location: string;
  compatible_vehicles: string[]; // Array of vehicle IDs or plate numbers
  vehicle_plates?: string; // Comma-separated string for display
  min_stock?: number;
  unit_price?: number;
}

export type MaintenanceType = 'M1' | 'M2' | 'M3' | 'M4';
export type EntityStatus = 'active' | 'inactive' | 'maintenance' | 'completed' | 'pending' | 'in_progress' | 'terminated';
