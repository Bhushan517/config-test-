export interface RecipientTypesData {
    id: string,
    name: string,
    module_id: string,
    event_id: string,
    slug: string,
    meta_data: any,
    is_chain: boolean,
    parameter_schema: any,
    method_id: string,
    created_on?: bigint;
    updated_on?: bigint;
    created_by: string,
    updated_by: string,
    is_deleted: boolean,
    is_enabled: boolean
}
