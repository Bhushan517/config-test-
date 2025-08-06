export interface CustomFieldLocationInterface {
    id?: string;
    program_id?: string
    custom_field_id: string;
    location_id: string;
    is_enabled: boolean;
    is_deleted?: boolean;
    created_on?: bigint;
    updated_on?: bigint;
}