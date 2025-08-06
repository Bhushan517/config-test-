export interface DistScheduleDetailInterface {
    id: string;
    duration: number;
    distrubution_id:any;
    measure_unit: string;
    vendors: any;
    is_enabled: boolean;
    is_deleted: boolean;
    created_on?: bigint;
    updated_on?: bigint;
    created_by: string;
    updated_by: string;
}
