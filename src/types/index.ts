
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
  status: 'active' | 'inactive' | 'maintenance';
}

export interface User extends BaseEntity {
  document_type: string;
  name: string;
  last_name: string;
  status: 'active' | 'inactive';
  telephone: string;
  document_number: string;
}

export interface Contract extends BaseEntity {
  description: string;
  start_date: string;
  end_date: string;
  location: string;
  status: 'active' | 'inactive' | 'completed';
  contract_code?: string;
  vehicles?: Vehicle[];
  users?: User[];
  routes?: Route[];
  shifts?: Shift[];
}

export interface Route extends BaseEntity {
  contract_id: string;
  description: string;
  from_location: string;
  to_location: string;
  status: 'pending' | 'in_progress' | 'completed';
  contract?: Contract;
}

export interface Shift extends BaseEntity {
  contract_id: string;
  description: string;
  contract?: Contract;
}

export interface Driver extends BaseEntity {
  name: string;
  last_name: string;
  document_number: string;
  license_type: string;
  telephone: string;
  status: 'active' | 'inactive';
}

export interface Maintenance extends BaseEntity {
  vehicle_id: string;
  description: string;
  type: 'M1' | 'M2' | 'M3';
  date: string;
  kilometers?: number;
  next_maintenance_km?: number;
  vehicle?: Vehicle;
  vehicle_plate?: string;
}

export interface SparePart extends BaseEntity {
  vehicle_id: string;
  description: string;
  quantity: number;
  company_location: string;
  store_location: string;
  vehicle?: Vehicle;
  vehicle_plate?: string;
}

export type MaintenanceType = 'M1' | 'M2' | 'M3';
export type EntityStatus = 'active' | 'inactive' | 'maintenance' | 'completed' | 'pending' | 'in_progress';
