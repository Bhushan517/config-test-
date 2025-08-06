export interface QualificationData {
    title: string;
    qualification_type_id: string;
    id: string,
    name: string,
    code: string,
    type: string,
    is_enabled: boolean,
    created_on?: bigint;
    updated_on?: bigint;
    created_by: string,
    updated_by: string,
    program_id: string,
    is_deleted: boolean,
}
