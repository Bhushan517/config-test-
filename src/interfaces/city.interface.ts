export interface CityData {
  id?: string;
  resources_state_id?: string;
  name?: string;
  is_enabled?: boolean;
  created_on?: bigint;
  updated_on?: bigint;
  created_by?: string;
  updated_by?: string;
  is_deleted?: boolean;
  state_id?: string,
  county_id?: string;
  ref_id?: string;
}
