export interface FoundationalDataInterface {
    hierarchy: any;
    id: string;
    name: string;
    code: string;
    description: string;
    is_enabled: boolean;
    foundational_data_type_id: string;
    program_id: string;
    is_deleted: boolean;
    creation_source: string;
    manager_ids: string;
    created_on?: bigint;
    updated_on?: bigint;
    created_by: string;
    updated_by: string;
    depended_fields: any,
    is_billable: boolean,
    additional_mdt_owner:string[]
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
export const createFoundationalDataSchema = {
    type: 'object',
    required: ['name'],
    properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        is_enabled: { type: 'boolean' },
        code: { type: 'string' },
        manager_ids: { type: 'array' },
        is_billable: { type: 'boolean' },
        depended_fields: {
            type: 'array'
        },
        program_id: { type: 'string' },
        foundational_data_type_id: { type: 'string' },
        additional_mdt_owner:{type:'array'}
    }
}
