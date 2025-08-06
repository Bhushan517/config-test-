export interface SowTemplateCustomField {
  id?: string;
  sow_custom_field_id?: string;
  value?: JSON;
  program_id?: string;
  sow_temp_id?: string;
  is_deleted?: boolean;
  is_enabled?: boolean;
  created_on?: number;
  updated_on?: number;
  created_by?: string;
  updated_by?: string;
}
export interface SowTemplateCustomFieldInput {
  id: string;
  value: string | {
    fileName: string;
    url: string;
  };
}

