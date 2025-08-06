export interface CreateProgramData {
  msps: any;
  msp_ids: any;
  id: string;
  name: string;
  display_name: string;
  unique_id: string;
  description?: string;
  type: string;
  industries?: string[];
  config: any;
  client_id: string;
  msp_id: string;
  start_date: string;
  industry?: string;
  is_enabled?: boolean;
  ref_id?: string;
  decoration?: any;
  module_groups?: any;
  themes?: any;
  updated_by?:string;
  created_by?:string;
  created_on?: bigint;
  updated_on?: bigint;
  custom_fields?:any[]
}

export interface ProgramQuery {
    search?: string;
    page_number?: string;
    page_size?: string;
    program_name?: string;
    status?: string;
    effective_date?: string;
    sort?: number;
    name?: string;
    is_activated?: string;
    start_date: string;
    sort_order?: string;
    page?: string;
    limit?: string;
    sort_field?: string;
    client_id?:string;
    msp_id:string;
    tenant_id:string
}