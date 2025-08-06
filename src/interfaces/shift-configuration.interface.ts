export interface ShiftConfigurationAttributes {
  shift_configuration_name: string;
  id: string;
  name: string;
  hierarchy_ids: any;
  job_template_ids: any;
  shift_type: any;
  is_enabled: boolean;
  is_deleted: boolean;
  created_on?: bigint;
  updated_on?: bigint;
  created_by?: string;
  updated_by?: string;
  program_id: string;
}
