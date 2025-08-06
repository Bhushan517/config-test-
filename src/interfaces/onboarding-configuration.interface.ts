export interface OnboardingConfigurationInterface {
    id: string;
    name?: string;
    description?: string;
    is_all_job_type?: boolean;
    job_type?: any;
    is_all_job_template?: boolean;
    job_template_id?: any;
    is_all_hierarchy?: boolean;
    hierarchy_id?: any;
    is_all_checklist?: boolean;
    checklist_id?: string;
    is_enabled?: boolean;
    is_deleted?: boolean;
    created_on?: bigint;
    updated_on?: bigint;
    created_by:string;
    updated_by?: string;
  }
  