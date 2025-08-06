export interface ReasonCode {
    program_id: string;
    id: string;
    name: string;
    source: string;
    entity_ref: string;
    category: 'NEUTRAL' | 'NEGATIVE' | 'POSITIVE';
    created_on?: bigint;
    updated_on?: bigint;
    updated_by: JSON;
    created_by: JSON;
    is_deleted: boolean;
    is_enabled: boolean;
    module_id: string;
    event_id: string;
    is_editable: boolean;
    reason_code_limit: number;
    reason: JSON;
}

export interface ReasonCodeResponse {
    module_id: any;
    event_id: any;
    reason: any;
    program_id: any;
    total_records: number;
    items_per_page: number;
    reason_codes: ReasonCode[];
    updated_on: number;
    trace_id: string;
    sq_number:number
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
        offset: { type: 'integer' },
        module_name: { type: "string" },
        reasons_count: { type: 'integer' },
        event_name: { type: 'string' }
    }
};

export const createReasoncodeSchema = {
    type: 'object',
    required: ['reason_codes'],
    properties: {
        reasons_count: { type: 'number' },
        is_deleted: { type: 'boolean' },
        event_id: { type: 'string' },
        module_id: { type: 'string' },
        reason_codes: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    category: { type: 'string' },
                    name: { type: 'string' },
                    is_enabled: { type: 'boolean' },
                    is_deleted: { type: ['boolean', 'null'] }
                },
            }
        }
    }
}