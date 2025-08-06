import { Json } from "sequelize/types/utils";

export interface Address {
  type: string;
  street_1: string;
  street_2?: string;
  city: string;
  state: string;
  zipcode: string;
  country: string;
}

export interface Contact {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  designation?: string;
}

export interface PasswordPolicy {
  min_length: number;
  max_log_attempt: number;
  expire_in: number;
  retained: number;
  must_contain: string[];
  cannot_contain: string[];
  mfa: {
    is_enabled: boolean;
    skip_duration_in_days?: number;
  };
}

export interface TenantData {
  id?: string;
  tenant_parent_id?: string; 
  name?: string;
  type?: string;
  display_name?: string;
  vendor_code?:string;
  logo?: string;
  addresses?: Address[]; 
  contacts?: any; 
  password_policy?: PasswordPolicy;
  primary_contact?: Contact;
  secondary_contact?: Contact;
  is_enabled?: boolean;
  created_on?: bigint;
  updated_on?: bigint;
  created_by?: string; 
  updated_by?: string; 
  is_deleted?: boolean;
  ref_id?: string; 
  vendor_industry?: any;
}




