
export interface WorkflowFieldData {
  id?: string;
  name: string;
  slug: string;
  api_url?: string;
  field_type?: string;
  field_meta?: object;
  data_source_id?: string;
  is_enabled?: boolean;
  created_on?: bigint;
  updated_on?: bigint;
  created_by?: string;
  updated_by?: string;
  is_deleted?: boolean;
}
