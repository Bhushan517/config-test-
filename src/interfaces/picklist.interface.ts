export interface PicklistItem {
  id(id: any): unknown;
  picklist_id:string | null;
  label: string;
  defined_by: string;
  is_enabled: boolean;
  is_deleted: boolean;
  created_on?: bigint;
  updated_on?: bigint;
  created_by: string ;
  updated_by: string ;
  program_id: string;
  value?: string | null;
  disabled_program?: object | null;
  label_program?: object | null;
  meta_data?: object | null;
}

export interface picklist {
  id: string;
  picklist_id: string | null;
  name: string;
  description: string | null;
  is_enabled: boolean;
  program_id: string;
  is_deleted: boolean;
  created_on?: bigint;
  updated_on?: bigint;
  created_by: string | null;
  updated_by: string | null;
  defined_by: string;
  multiselect: boolean;
  slug?: string | null;
  disabled_program?: object | null;
  is_visible: boolean;
  picklist_items?: PicklistItem[];
}

export interface picklistAttributes {
  id: string;
  picklist_id: string | null;
  name: string;
  program_id: string;
  description: string | null;
  is_enabled: boolean;
  is_deleted: boolean;
  created_on: number;
  updated_on: number;
  created_by: string | null;
  updated_by: string | null;
  defined_by: string;
  multiselect: boolean;
  slug?: string | null;
  disabled_program?: object | null;
  is_visible: boolean;
}


export interface PicklistRow {
  name: string;
  description: string;
  slug: string;
  disabled_program: string | null;
  is_visible: boolean;
  program_id: string;
  picklist_item_id: string | null;
  label: string | null;
  defined_by: string | null;
  value: string | null;
  item_program_id: string | null;
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

export const createPicklistSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    description: { type: 'string' },
    is_enabled: { type: 'boolean' },
    defined_by: { type: 'string' },
    program_id: { type: 'string' },
    multiselect: { type: 'boolean' },
    picklist_items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          value: { type: 'string' },
          label: { type: 'string' },
          defined_by: { type: 'string' },
          is_enabled: { type: 'boolean' },
          program_id: { type: 'string' }
        },
      }
    }
  }}

export default picklist;
