export interface vendorLabourCategoriesInterface {
    id: string;
    tenant_id: string;
    program_id: string;
    vendor_id: string;
    labour_category: string;
    status: string;
    is_deleted: boolean;
    is_enabled: boolean;
    created_on?: bigint;
    updated_on?: bigint;
    created_by: string;
    updated_by: string;
}