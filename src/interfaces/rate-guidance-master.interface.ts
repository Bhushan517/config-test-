export interface Params {
    id?: string;
}

export interface QueryParams {
    page?: number;
    limit?: number;
    search?: string;
    is_enabled?: boolean;
}

export interface RateGuidance {
    industry: string;
    profession: string;
    specialty: string;
    state: string;
    regular_bill_rate: number;
    is_enabled?: boolean;
}

export interface BulkUpload {
    file_url: string;
}

export interface AdvancedSearch {
    industry?: string;
    profession?: string;
    specialty?: string;
    state?: string;
    regular_bill_rate_min?: number;
    regular_bill_rate_max?: number;
    is_enabled?: boolean;
    page?: number;
    limit?: number;
}

export interface RateGuidanceData {
    id?: string;
    industry: string;
    profession: string;
    specialty: string;
    state: string;
    regular_bill_rate: number;
    created_by?: string;
    updated_by?: string;
    is_enabled?: boolean;
    is_deleted?: boolean;
    created_on?: Date;
    updated_on?: Date;
}
