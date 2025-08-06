export interface vendorWorkLocationMappingInterface {
    id: string;
    program_id: string;
    program_vendor_id: string;
    labour_category_id: string;
    vendor_work_location_name: string;
    is_enabled: boolean;
    is_deleted: boolean;
    created_on?: bigint;
    updated_on?: bigint;
    created_by: string;
    updated_by: string;
}