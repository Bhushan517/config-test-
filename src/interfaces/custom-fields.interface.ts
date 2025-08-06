import { Json } from "sequelize/types/utils";

export interface CustomFields {
  hierarchy_ids: never[];
  id: string;
  program_id: string;
  type: string;
  name: string;
  label: string;
  slug: string;
  placeholder: string;
  meta_data: object;
  is_all_work_location: boolean;
  is_all_hierarchy: boolean;
  supporting_text: string;
  range_applicable: Json;
  description: Text | null;
  is_required: boolean;
  is_readonly: boolean;
  is_enabled: boolean;
  created_on?: bigint;
  updated_on?: bigint;
  created_by: string;
  updated_by: string;
  can_view: JSON;
  can_edit: JSON;
  job_type: JSON;
  is_linked: boolean;
  work_location_ids?: string[];
  linked_module: JSON;
  decimal_place: string;
  is_sensitive_data: boolean;
  organization_category: string;
}

export interface GetQueryInterface {
  limit: number;
  page?: number;
  is_enabled?: string;
  name?: string;
  module_name?: string;
  label?: string;
  field_type?: string;
  is_required?: string;
  updated_on?: string;
  slug?: string;
  program_id?: string;
  hierarchy_ids?:any;
  user_type?: string;
  is_dependant_field?: string;
  seq_number?: number;
}

export const paramsSchema = {
  type: 'object',
  properties: {
    program_id: { type: 'string' },
    id: { type: 'string' }
  },
  required: ['program_id']
};

const getQuerySchema = {
  type: "object",
  properties: {
    limit: { type: "string" },
    page: { type: "string" },
    is_enabled: { type: "string" },
    name: { type: "string" },
    module_name: { type: "string" },
    label: { type: "string" },
    field_type: { type: "string" },
    is_required: { type: "string" },
    updated_on: { type: "string" },
    slug: { type: "string" },
    program_id: { type: "string" },
  },
};

export const createCustomFieldsSchema = {
  type: 'object',
  properties: {
    can_view_vendor: { type: 'array', items: { type: 'string' } },
    can_edit_vendor: { type: 'array', items: { type: 'string' } },
    program_id: { type: 'string' },
    module_name: { type: 'string' },
    organization_category:{ type: 'string'},
    module_id: { type: 'string' },
    name: { type: 'string' },
    is_enabled: { type: 'boolean' },
    description: { type: ['string', 'null'] },
    field_type: { type: 'string' },
    label: { type: 'string' },
    is_all_hierarchy: { type: 'boolean' },
    work_location_ids: { type: 'array', items: { type: 'string' } },
    hierarchy_ids: { type: 'array', items: { type: 'string' } },
    master_data_ids: { type: ['array', 'null'], items: { type: 'string' } },
    is_all_work_location: { type: 'boolean' },
    can_view: { type: 'array', items: { type: 'string' } },
    can_edit: { type: 'array', items: { type: 'string' } },
    org_category_ids: { type: ['array', 'null'], items: { type: 'string' } },
    supporting_text: { type: 'string' },
    placeholder: { type: ['string', 'null'] },
    is_required: { type: 'boolean' },
    is_readonly: { type: 'boolean' },
    is_linked: { type: 'boolean' },
    job_type: { type: 'array', items: { type: 'string' } },
    decimal_place: { type: 'string', pattern: '^[0-9]+$' },
    is_range_required: { type: 'boolean' },
    is_sensitive_data: { type: 'boolean' },
    meta_data: {
      type: 'object',
      properties: {
        default_email: { type: 'string' },
        datasource: {
          type: 'object',
          properties: {
            is_multi_select: { type: 'boolean' },
            options: { type: 'array' }
          },
        },
        depends_on: {
          type: 'object',
          properties: {
            action: { type: 'string' },
            conditions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  condition: {
                    type: "object",
                    properties: {
                      value: { type: "string" },
                    },
                  },
                  slug: { type: "string" },
                  label: { type: "string" }
                },
              }
            }

          },
        }
      },
    },
    linked_modules: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          linked: { type: 'boolean' },
          module_name: { type: 'string' },
          is_readonly: { type: 'boolean' },
          can_view: { type: ['array', 'null'] },
          can_edit: { type: ['array', 'null'] }
        },
      }
    },
    range_applicable:{
      type:'object',
      properties:{
        is_range_required: {
          type: "boolean",
          default: false
        },
        min_range: { "type": ["number", "null"] },
        max_range: { "type": ["number", "null"] }
      }
    }
  },
};
