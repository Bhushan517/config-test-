export interface UserInterface {
  resume_url: any;
  id: unknown;
  vendor_id: any;
  program_id?: string;
  user_type?: string| any;
  name_prefix?: string;
  first_name?: string;
  addresses?: any;
  contacts?: any;
  middle_name?: string;
  last_name?: string;
  username?: string;
  name_suffix?: string;
  email?: string;
  secondary_email?: string;
  sso_id?: string;
  title?: string;
  avatar?: any;
  theme?: string;
  country_id?: string;
  applications?: any;
  supervisor?: string;
  time_zone_id?: string;
  language_id?: string;
  is_all_hierarchy_associate?: boolean;
  default_hierarchy_id?: string;
  is_all_work_location_associate?: boolean;
  default_work_location_id?: string;
  is_all_cost_center_associate?: boolean;
  default_cost_center_id?: string;
  is_all_spend_category_associate?: boolean;
  default_spend_category_id?: string;
  is_allow_unlimited_authority?: boolean;
  credentials: any;
  role_id: string;
  tenant_id: string;
  status: string;
  associate_hierarchy_ids: any;
  associate_cost_ids: any;
  work_location_ids: any;
  spend_category_ids: any;
  min_limit?: number;
  max_limit?: number;
  is_enabled?: boolean;
  is_active?: boolean;
  is_deleted?: boolean;
  created_on?: bigint;
  updated_on?: bigint;
  created_by?: any;
  updated_by?: any;
  foundational_data?:any[];
  user:any,
  background_logo_color?:string;
  user_id?:string| undefined;
  custom_fields?:any[];
  is_all_labour_category_associate?:boolean;
  associate_labour_category?:any;
  is_all_job_type_associate?:boolean;
  associate_job_type?:any;
  date_format?:string
}

export interface CandidateMatch {
  similarity_score: any;
  vendor_id: any;
  candidate_id: string;
}

export interface CandidateMatchScore {
  candidate_id: string;
  vendor_id: string;
  score: number;
}

