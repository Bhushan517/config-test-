export interface CustomFieldLocationInterface {
    id?: string;
    program_id?: string
    custom_field_id: string;
    location_id: string;
    is_enabled: boolean;
    is_deleted?: boolean;
    created_on?: bigint;
    updated_on?: bigint;
    created_by:string;
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

export const createCustomFieldLocations = {
    type: 'object',
    properties: {
        id: { type: 'string' },
        program_id: { type: 'string' },
        custom_field_id: { type: 'string' },
        location_id: { type: 'string' },
        is_enabled: { type: 'boolean' },
        is_deleted: { type: 'boolean' }
    },
   
};
