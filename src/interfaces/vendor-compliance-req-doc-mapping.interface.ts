export interface VendorComplianceReqDocMappingInterface {
    id: string;
    user_id?: string;
    file_name?: string;
    required_document_id?: any;
    url?: string;
    is_enabled?: boolean;
    is_deleted?: boolean;
    is_compliant?: boolean;
    status?: string;
    complied_by?: string;
    next_expiry_on?: number;
    expiry_on?: number;
    compliance_note?: string;
    uploaded_on?: number;
    complied_on?: number;
    created_on?: bigint;
    updated_on?: bigint;
    created_by?: string;
    updated_by?: string;
    program_id?: string;
}