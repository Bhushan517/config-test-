export interface TimesheetTypeConfigInterface {
  id?: string;
  title?: string;
  display_title?: string;
  program_id?: string;
  hierarchies?: string[];
  labor_category?: string[];
  master_data_types?: any[];
  is_all_labor_category_associate?: boolean;
  work_period?: string;
  work_start_day?: string;
  timesheet_format?: string;
  time_format?: string;
  project?: {
    config: {
      source: string;
      options: string[];
    };
    is_enable: boolean;
  };
  allocations?: any;
  allow_non_billable_hours?: boolean;
  break?: any;
  timesheet_rounding?: any;
  notes?: any;
  st_per_week?: number;
  st_per_day?: number;
  st_days_per_week?: number;
  daily_limit?: any;
  weekly_limit?: any;
  weekend?: any;
  modification_rules?: any;
  is_modification_rule?: boolean;
  thresholds?: any;
  copy_timesheet?: any;
  is_overnight_allowed?: boolean;
  soft_delete?: any;
  allow_timesheet_to_be_submitted?: string;
  is_enabled?: boolean;
  created_on?: bigint;
  updated_on?: bigint;
  created_by?: string;
  updated_by?: string;
  is_deleted?: boolean;
  slug?: string;
  timesheet_rule_group?: string;
  break_rule_group?: string;
  input_format?:string;
  is_all_hierarchy_associated?: boolean;
  day_format?: any;
}

export const querySchema = {
  type: 'object',
  properties: {
    limit: { type: 'integer' },
    offset: { type: 'integer' }
  }
};

export const paramsSchema = {
  type: 'object',
  properties: {
    program_id: { type: 'string' },
    id: { type: 'string' }
  },
  required: ['program_id']
};

export const timesheetTypeConfigFilterSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    title: { type: 'string' },
    hierarchy_ids: { type: 'array', items: { type: 'string' } },
    labor_category: { type: 'string' },
    is_enabled: { type: 'boolean' },
    timesheet_rule_group: { type: 'string' },
    timesheet_format: { type: 'string' },
    allocation_method: { type: 'string' },
    page: { type: 'string' },
    limit: { type: 'string' }
  }
};
export const createTimesheetTypeConfigSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    title: { type: 'string' },
    display_title: { type: 'string' },
    program_id: { type: 'string' },
    hierarchies: { type: 'array', items: { type: 'string' } },
    labor_category: { type: 'array', items: { type: 'string' } },
    master_data_types: { type: 'object', items: { type: 'array' } },
    is_all_labor_category_associate: { type: 'boolean' },
    work_period: { type: 'string' },
    work_start_day: { type: 'string' },
    timesheet_format: { type: 'string', enum: ['tito', 'hourly', 'daily'] },
    time_format: { type: 'string' },
    project: {
      type: 'object',
      properties: {
        config: {
          type: 'object',
          properties: {
            source: { type: 'string' },
            options: { type: 'array' }
          }
        },
        is_enable: { type: 'boolean' }
      }
    },
    allocations: { type: 'object' },
    allow_non_billable_hours: { type: 'boolean' },
    break: { type: 'object' },
    timesheet_rounding: { type: 'object' },
    notes: { type: 'object' },
    st_per_week: { type: ['number', 'null'] },
    st_per_day: { type: ['number', 'null'] },
    st_days_per_week: { type: ['number', 'null'] },
    daily_limit: { type: 'object' },
    weekly_limit: { type: 'object' },
    weekend: { type: 'object' },
    modification_rules: { type: 'array' },
    is_modification_rule: { type: 'boolean' },
    thresholds: { type: 'object' },
    copy_timesheet: { type: 'object' },
    is_overnight_allowed: { type: 'boolean' },
    soft_delete: { type: 'object' },
    allow_timesheet_to_be_submitted: { type: 'string' },
    is_enabled: { type: 'boolean' },
    created_on: { type: 'number' },
    updated_on: { type: 'number' },
    created_by: { type: 'string' },
    updated_by: { type: 'string' },
    is_deleted: { type: 'boolean' },
    slug: { type: 'string' },
    timesheet_rule_group: { type: 'string' },
    break_rule_group: { type: 'string' }
  }
};