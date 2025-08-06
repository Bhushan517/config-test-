interface vendorMarkupConfigInterface {
    id: string;
    tenant_id?: string;
    program_id: string;
    program_vendor_id?:string,
    rate_model?: string;
    sliding_scale?: boolean;
    markups?: any;  
    sourced_markup?: number;
    payrolled_markup?: number;
    labor_category?: string |null;
    hierarchy?: string;  
    work_locations?: string; 
    is_default?: boolean;
    is_enabled: boolean;
    is_deleted: boolean;
    created_on?: bigint;
    updated_on?: bigint;
  }
  export default vendorMarkupConfigInterface;
  