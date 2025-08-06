interface EventInterface {
  name: string;
  slug: string;
  module_id: string;
  is_enabled: boolean | string;
  is_deleted: boolean;
  created_on?: bigint;
  updated_on?: bigint;
  created_by:string;
  updated_by:string;
  type: string;
}
export default EventInterface;

export const paramsSchema = {
  type: 'object',
  properties: {
    module_id: { type: 'string' },
      id: { type: 'string' }
  },
  required: ['module_id']
};

export const querySchema = {
  type: 'object',
  properties: {
      search: { type: 'string' },
      limit: { type: 'integer' },
      offset: { type: 'integer' }
  }
};

export const createEventSchema ={
  type: 'object',
  required: ['module_id'],
  properties: {
    name: { type: 'string' },
    slug: { type: 'string' },
    module_id: { type: 'string' },
    is_deleted: { type: 'boolean' },
    is_enabled: { type: 'boolean' },
    created_on: { type: 'string' },
    type: { type: 'string' }
}}