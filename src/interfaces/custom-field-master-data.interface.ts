export interface CustomFieldmasterDataInterface {
  id?: string;
  program_id?: string;
  customField_id?: string;
  master_data_id?: string;
  is_deleted: boolean;
  is_enabled: boolean;
  created_on?: bigint;
  updated_on?: bigint;
  created_by:string;
  updated_by:string;
}

export const paramsSchema = {
  type: 'object',
  properties: {
    program_id: { type: 'string' },
    id: { type: 'string' }
  },
    required: ['program_id']
};


export const createCustomFieldmasterData = {
  type: 'object',
  properties: {
      id: { type: "string" },
      program_id:{type:'string'},
      customField_id: { type: "string" },
      master_data_id: { type: "string" },
      is_deleted: { type: "boolean" },
      is_enabled: { type: "boolean" },
      created_on: { type: "string", format: "date-time" }
    },
  }
