import { Json } from "sequelize/types/utils";

export interface FeesConfigurationInterface {
  title: string;
  program_id: string
  hierarchy_levels: Json;
  source_model: Json;
  labor_category: Json;
  vendors: Json;
  effective_date?: string;
  funding_model: string;
  ref_id?: string;
  categorical_fees: Json;
  is_enabled: boolean;
  is_all_labor_category: boolean;
  created_on?: bigint;
  updated_on?: bigint;
  is_deleted: boolean;
  is_all_hierarchy_associated: boolean;
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
export const feesConfigurationSchema = {
  type: 'object',
  properties: {
    program_id: { type: 'string' },
    title: { type: 'string' },
    hierarchy_levels: { type: 'array' },
    source_model: { type: 'array' },
    labor_category: { type: 'array' },
    vendors: { type: 'array' },
    effective_date: { type: 'string' },
    funding_model: { type: 'string' },
    feeApplicableModules1: { type: 'array' },
    feeApplicableModules2: { type: 'array' },
    is_enabled: { type: 'boolean' },
    is_all_labor_category: { type: 'boolean' },
    categorical_fees: {
      type: 'array',
      "items": {
        type: "object",
        properties: {
          fee_type: { "type": "string" },
          funded_by: { "type": "string" },
          fee_category: { "type": "string" },
          applicable_config: {
            type: "array",
            items: {
              type: "object",
              properties: {
                entity_ref: { "type": "string" },
                fee: { "type": ["number", "null"] }
              },
            }
          }
        }
      }
    }
  }
}

export const advancedSearchFeesSchema = {
  type: 'object',
  required: [''],
  properties: {
    filters: {
      type: 'object',
      items: {
        type: "object",
        properties: {
          title: { type: 'string' },
          is_enabled: { type: 'boolean' },
          is_deleted: { type: 'boolean' },
          source_model: {
            type: 'array'
          }
        }

      }
    }
  }
}