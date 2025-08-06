export default interface CandidateInterface {
    candidate_id: any;
    id: string;
    program_id: string;
    avatar: JSON;
    name_prefix: string;
    user_name: string;
    first_name: string;
    middle_name: string;
    last_name: string;
    name_suffix: string;
    country_id: string;
    vendor_id: string;
    unique_id: string;
    resume_url: string;
    contacts: JSON;
    email: string;
    addresses: JSON;
    websites: JSON;
    qualifications: JSON;
    job_level: string;
    npi: number;
    job_category: string;
    worker_type_id: string;
    job_title: string;
    custom_fields?: JSON;
    preferences: JSON;
    is_active: boolean;
    is_all_required_qulification?:boolean;
    state_national_id?:number;
    is_deleted: boolean;
    birth_date?: number;
    candidate_source?: string;
    tenant?:any;
    created_on?: bigint;
    updated_on?: bigint;
    created_by?:string;
    updated_by?:string;
    is_pre_identified?: boolean;
}

export interface TenantInterface{
    tenantId:string
}