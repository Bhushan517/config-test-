export interface VendorDistributionSchedule {
    id: string;
    name: string;
    description: string;
    is_enabled: boolean;
    is_deleted:boolean;
    created_by: string;
    updated_by: string;
    created_on?: bigint;
    updated_on?: bigint;
    schedules: {
        condition: any;
        duration: number;
        measure_unit: string;
        vendors: string[];
        vendor_group_ids: string[];
    }[];
}
export interface UpdateVendorDistributionScheduleDetail {
    name?: string;
            description?: string;
            is_enabled?: boolean;
            schedules?: {
                condition: any;
                vendor_group_ids: any;
                id: any;
                duration?: number;
                measure_unit?: string;
                vendors?: any;
            }[];
}