interface VendorMarkupInterface {
    rate_model: string;
    sliding_scale?: boolean;
    markups?: object;
    sourced_markup?: number | null;
    payrolled_markup?: number | null;
    labor_category?: string | null;
    hierarchy?: string;
    work_locations?: string;
    all_work_locations?: boolean;
    all_hierarchy?: boolean;
    all_job_type?: boolean;
}

export interface Address {
    country: string;
    addresses_line_1: string;
    addresses_line_2?: string;
    state: string;
    county: string;
    city: string;
    zipcode: string;
}

export interface Contact {
    first_name: string;
    last_name: string;
    job_title: string;
    contact_email: string;
    phone_number?: string;
    extension: string;
}
export interface Diversity_Details {
    country: string;
    diversity_certificate: string;
    diversity_category:string;
}
 
export interface programVendorInterface {
    sliding_scale: any;
    id: string;
    user_id: string;
    tenant_id: string;
    vendor_name: string;
    vendor_type: any;
    supl_ref_id: string;
    program_industry: any;
    work_locations: any;
    status: string;
    hierarchies: any;
    all_work_locations: boolean;
    all_hierarchy: boolean;
    vendor_group_id: any;
    vendor_code:string;
    com_doc_group: any;
    bussiness_structure: string;
    job_type: string;
    program_id: string;
    is_deleted: boolean;
    is_enabled: boolean;
    created_on?: bigint;
    updated_on?: bigint;
    created_by: string;
    updated_by: string;
    markup_config?: VendorMarkupInterface;
    description: string;
    company_website: string;
    establish_year: string;
    social_media: any;
    addresses?: Address;
    contact?: Contact;
    diversity_details?:Diversity_Details;
    compliance_status: any;
    job: string;
    candidate: string;
    is_job_auto_opt_in: boolean;
    display_name:string;
    custom_fields: any[];
    is_labour_category: boolean;
    all_job_type: boolean;
    
}

export interface programVendorQueryInterface {
    vendor_name?: string,
    user_id?: string,
    is_enabled?: boolean,
    status?: string,
    updated_on?: string,
    page?: number,
    limit?: number
}