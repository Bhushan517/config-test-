export interface JobTemplateInterface {
  id: string;
  template_name: string;
  category: string;
  program_id: string;
  ref_title?: string | null;
  template_code: string;
  level?: string | null;
  program_industry: string[];
  description: string;
  is_submission_exceed_max_bill_rate?: boolean | null;
  allow_express_offer?: boolean | null;
  is_qualification_enabled?: boolean | null;
  is_description_editable: boolean;
  user_roles?: string[] | null;
  is_onboarding_checklist: boolean;
  available_start_date_limit: any;
  submission_limit_vendor: number;
  is_automatic_distribution: boolean;
  is_tiered_distribute_schedule: boolean;
  is_manual_distribution_job_submit: boolean;
  is_automatic_distribute_submit: boolean;
  is_automatic_distribute_final_approval: boolean;
  is_background_check: boolean;
  immediate_distribution?: string | null;
  submit_type: string;
  is_template: boolean;
  is_expense_allowed_editable?: boolean | null;
  is_expense_allowed?: boolean | null;
  jd_parsing_file?: any;
  resume_mandatory?: boolean | null;
  checklist?: string | null;
  is_deleted?: boolean | null;
  is_enabled?: boolean | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_on?: bigint;
  updated_on?: bigint;
  job_submitted_count?:number,
  hierarchy:string[];
  custom_fields:string[];
  job_id:string;
  is_checklist_enable:boolean;
  ot_exempt:boolean;
  distribution_schedule:string;
  is_all_hierarchy_associated: boolean;
}

export interface JobMasterDataInterface {
  foundational_data: any;
}

export interface JobTemplateDistSchedule {
  distribute_schedule_data: any;
}
export interface JobTemplateQualificationInterface {
  qualification_types: any;
}

export interface JobTempRateTypeInterface {
  rates: any;
}

export interface  GetJobTemplatesQuery {
  program_id?: string;
  id?: string;
  job_id?: string;
  is_enabled?: boolean;
  template_name?: string;
  labour_category?: string;
  primary_hierarchy:String;
  category?: string;
  page?: number;
  limit?: number;
  is_shift_rate?:boolean;
}


export interface JobTemplate {
  id: number;
  template_name: string;
}