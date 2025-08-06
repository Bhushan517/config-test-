export interface ExpenseConfigurationAttributes {
  id: string;
  entity_id?: string;
  slug?: string;
  name?: string;
  program_id: string;
  hierarchy_ids?: any;
  labor_category_ids?: any;
  expense_type_ids?: any;
  week_ending_day?: 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';
  is_mdt_enabled?: boolean;
  master_data_types?: any;
  is_projects_enabled?: boolean;
  projects?: any;
  is_thresholds_enabled?: boolean;
  gnrl_duration_rule?: any;
  misc_duration_rule?: any;
  gnrl_grace_period_rule?: any;
  misc_grace_period_rule?: any;
  gnrl_revoke_access_rule?: any;
  misc_revoke_access_rule?: any;
  revision?: number;
  expense_types?: string[];
  latest?: boolean;
  is_enabled: boolean;
  is_deleted: boolean;
  created_on?: number;
  updated_on?: number;
  created_by?: string;
  updated_by?: string;
}

export const paramsSchema = {
  type: 'object',
  properties: {
    program_id: { type: 'string' },
    id: { type: 'string' }
  },
  required: ['program_id']
};

export const querySchema = {
  type: 'object',
  properties: {
    search: { type: 'string' },
    limit: { type: 'integer' },
    offset: { type: 'integer' }
  }
};

export const createExpenseConfigurationSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    entity_id: { type: "string", format: "uuid" },
    slug: { type: "string" },
    name: { type: "string" },
    program_id: { type: "string", format: "uuid" },
    hierarchy_ids: {
      type: "array",
      items: { type: "string" }
    },
    labor_category_ids: {
      type: "array",
      items: { type: "string" }
    },
    expense_type_ids: {
      type: "array",
      items: { type: "string" }
    },
    week_ending_day: {
      type: "string",
      enum: ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
    },
    is_mdt_enabled: { type: "boolean" },
    master_data_types: { type: "array" },
    is_projects_enabled: { type: "boolean" },
    projects: { type: "object" },
    is_thresholds_enabled: { type: "boolean" },
    gnrl_duration_rule: { type: "object" },
    misc_duration_rule: { type: "object" },
    gnrl_grace_period_rule: { type: "object" },
    misc_grace_period_rule: { type: "object" },
    gnrl_revoke_access_rule: { type: "object" },
    misc_revoke_access_rule: { type: "object" },
    revision: { type: "integer" },
    latest: { type: "boolean" },
    is_enabled: { type: "boolean" },
    expense_types: {
      type: "array",
      items: {
        type: "string"
      }
    }
  }
};

export const createExpenseConfigurationAdvancedFilter = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    status: { type: 'string' },
    updated_on: {
      type: 'array',
    },
    is_enabled: { type: 'boolean' },
    hierarchy: {
      type: 'array',
    }
  }
};


// Define an interface for the ID type
export interface HierarchyId {
  [key: string]: any;  // This allows for any additional properties in the ID
}