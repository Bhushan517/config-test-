export interface SchemaData {
    id: string,
    name: string,
    is_enabled: boolean,
    created_on?: bigint;
    updated_on?: bigint;
    created_by: string,
    updated_by: string,
    program_id: string,
    is_deleted: boolean,
    module_id: string,
    event_id: string,
}
