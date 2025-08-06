export interface SupportText {
    description: string;
    url: string;
    label: string;
    is_enabled: boolean;
}

export interface SupportTextAction {
    id: string;
    name: string;
    slug: string;
    is_enabled: boolean;
    support_text: SupportText;
}

export interface supportingTextAttributes {
    id: string;
    performed_by: string;
    is_enabled: boolean;
    is_deleted: boolean;
    created_on?: bigint;
    updated_on?: bigint;
    program_id: string;
    event_id: string;
    module_id: string;
    support_text_action: SupportTextAction[];
    created_by: string;
    updated_by: string;
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
  export const createsupportingTextSchema = {
    type: 'object',
    required: ['module_id','event_id'],
    properties: {
        module_id:{type:'string'},
        event_id:{type:'string'},
        performed_by:{type:'string'},
        is_enabled:{type:'boolean'},
        program_id:{type:'string'},
        support_text_action:{type:'array',
            items: {
                type: "object",
                properties: {
                    description: { "type": "string" },
                    url: { "type": 'string'},
                    placement:{type:'string'},
                    label:{type:'string'}
                },
        }
    }
  }
  
}