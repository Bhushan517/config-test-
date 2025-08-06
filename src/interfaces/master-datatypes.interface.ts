export interface FoundationalDataTypesInterface {
    id: string,
    name: string,
    description: string,
    is_enabled: boolean,
    created_on?: bigint;
    updated_on?: bigint;
    created_by: string,
    updated_by: string,
    program_id: string,
    is_deleted: boolean,
    configuration: any
    associations: any,
    timesheet__master_data:boolean,
    custom_fields:any[],
    hierarchy:any,
    seq_number:number
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
export const createFoundationalDataTypeSchema = {
    type: 'object',
    required: ['name'],
    properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        is_enabled: { type: 'boolean' },
        associations: { type: 'array' },
        program_id: { type: 'string' },
        configuration: {
            type: 'object',
            properties: {
                user_association_exclude: { type: 'boolean' },
                allow_multiple_default_values: { type: 'boolean' },
                view_only: { type: 'boolean' },
                financial_master_data_type: { type: 'boolean' },
                require_owner: { type: 'boolean' },
                track_owner: { type: 'boolean' },
                timesheet_master_data: { type: 'boolean' },
                allow_multiple_jobs: { type: 'boolean' },
                allow_multiple_sows: { type: 'boolean' },
                contigent_option: { type: 'string' },
                service_option: { type: 'string' },
            },
        }
    }
}