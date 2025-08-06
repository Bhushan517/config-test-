export interface ExpenseTypeInterface {
    program_id: string;
    id: string;
    name: string;
    code: string;
    category: 'general' | 'miscellaneous';
    is_attachments_mandatory: boolean;
    is_notes_mandatory: boolean;
    is_msp_fees_applied: boolean;
    is_tax_applied: boolean;
    is_negative_expense_allowed: boolean;
    is_unit_based: boolean;
    unit_label: string | null;
    rate_per_unit: number | null;
    max_unit_limit: number | null;
    is_enabled: boolean;
    is_deleted: boolean;
    created_on: number;
    modified_on: number;
    created_by: string;
    modified_by: string;
  }
  
  export const paramsSchema = {
    type: 'object',
    properties: {
      program_id: { type: 'string', format: 'uuid' },
      id: { type: 'string', format: 'uuid' }
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
  
  export const createExpenseTypeSchema = {
    type: 'object',
    properties: {
      name: { type: 'string' },
      category: { type: 'string', enum: ['general', 'miscellaneous'] },
      code: { type: 'string' },
      is_enabled: { type: 'boolean' },
      is_attachments_mandatory: { type: 'boolean' },
      is_notes_mandatory: { type: 'boolean' },
      is_msp_fees_applied: { type: 'boolean' },
      is_tax_applied: { type: 'boolean' },
      is_negative_expense_allowed: { type: 'boolean' },
      is_unit_based: { type: 'boolean' },
      unit_label: { type: 'string' },
      rate_per_unit: { type: 'number' },
      max_unit_limit: { type: 'number' }
    },
    
  };
  