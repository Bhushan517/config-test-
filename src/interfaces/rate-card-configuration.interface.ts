export interface RateCardInterface {
    id: string;
    name: string;
    is_shift_rate: boolean;
    hierarchies?: any;
    job_templates?: any;
    rate_configuration?: any;
    expenses?:any;
    program_id?: string;
    is_enabled?: boolean;
    is_deleted?: boolean;
    page?: string;
    limit?: string;
    rate_definitions?: any
    created_by: string,
    updated_by: string,
    created_on?: bigint;
    updated_on?: bigint;
}

export interface MinMaxRateResult {
    min_rate: number | null; 
    max_rate: number | null;
    rate_model:string |null 
}

export interface MinMaxRateQueryParams {
    hierarchyIdsJSON: string;
    jobTemplateId: string;
    currency: string;
    unit_of_measure: string;
    programId:string;
    is_shift_rate:boolean
}