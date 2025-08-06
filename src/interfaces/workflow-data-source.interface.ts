

export interface WorkflowDataSourceData {
  id?: string;
  name: string;
  slug: string;
  api_url?: string;
  db_model?: string;
  is_enabled?: boolean;
  created_on?: bigint;
  updated_on?: bigint;
  created_by?: string;
  updated_by?: string;
  is_deleted?: boolean;
}
