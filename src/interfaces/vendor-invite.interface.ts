export interface vendorInviteInterface {
    id: string,
    vendor_name: string,
    first_name: string,
    last_name: string,
    email: string,
    program_id: string,
    is_enabled: boolean,
    is_deleted: boolean,
    updated_by: string,
    created_by: string,
    created_on?: bigint;
    updated_on?: bigint;
    invited_on: number,
    code: string,
}



