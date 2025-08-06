export interface ShiftConfigurationJobTemplate {
    id: string;
    shift_config_id: string;
    job_template_id: string;
    program_id: string;
    is_enabled: boolean;
    is_deleted: boolean;
    created_on?: bigint;
    updated_on?: bigint;
    created_by?: string;
    updated_by?: string;
  
  }