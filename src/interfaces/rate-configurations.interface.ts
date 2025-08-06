export interface RateConfigurationsInterface {
    id: string;
    name: string;
    is_shift_rate: boolean;
    program_id?: string;
    is_enabled?: boolean;
    is_deleted?: boolean;
    page?: string;
    limit?: string;
    created_by: string;
    updated_by: string;
    created_on?: bigint;
    updated_on?: bigint;
    hierarchies: any;
    job_templates: any;
    rate_configuration: any;
    job_type?: any;
    expenses:any;
}
export interface RateConfigurationsBudget {
    program_id: string;
    name: string;
    is_shift_rate: boolean;
    hierarchies: Array<{
        id: string;
        name: string;
    }>;
    job_templates: Array<{
        id: string;
        name: string;
    }>;
    rate_configuration: Array<{
        base_rate: {
            rate_type: {
                id: string;
                name: string;
                abbreviation: string;
                rate_type_category: {
                    id: string;
                    value: string;
                    label: string;
                };
                is_base_rate: boolean;
                min_rate: number;
                max_rate: number;
            };
            rates: Array<{
                rate_type: {
                    id: string;
                    name: string;
                    abbreviation: string;
                    rate_type_category: {
                        id: string;
                        value: string;
                        label: string;
                    };
                    is_base_rate: boolean;
                };
                bill_rate: Array<{
                    differential_on: string;
                    differential_type: string;
                    differential_value: number;
                    min_rate: number;
                    max_rate: number;
                }>;
                pay_rate: Array<{
                    differential_on: string;
                    differential_type: string;
                    differential_value: number;
                    min_rate: number;
                    max_rate: number;
                }>;
            }>;
        };
        rate: Array<{
            rate_type: {
                id: string;
                name: string;
                abbreviation: string;
                rate_type_category: {
                    id: string;
                    value: string;
                    label: string;
                };
                is_base_rate: boolean;
            };
            bill_rate: Array<{
                differential_on: string;
                differential_type: string;
                differential_value: number;
                min_rate: number;
                max_rate: number;
            }>;
            pay_rate: Array<{
                differential_on: string;
                differential_type: string;
                differential_value: number;
                min_rate: number;
                max_rate: number;
            }>;
            rates: any[];
        }>;
    }>;
}

export enum accuracyType {
    CONFIG_MODEL = "Accuracy Configuration",
    RATE = "Rate",
    AMOUNT = "Amount",
    HOUR = "hour",
    MARKUP = "Markup",
    FEE = "Fee",
    TAX = "Tax",
    ADJUSTMENT = "Adjustment",
    UNIT_OF_MEASURE = "Unit of Measure"
}

export interface RateConfiguration {
    id: string;
    program_id: string;
    name: string;
    is_shift_rate: boolean;
}

export interface RateCardDecisionRecord {
    id: string;
    rate_card_id: string;
    rate_type_id: string;
    hierarchy_id: string | null;
    min_rate: {
        amount: number;
        is_changeable: boolean;
        is_reduceable: boolean;
    };
    max_rate: {
        amount: number;
        is_changeable: boolean;
        is_reduceable: boolean;
    };
    job_template_id: string;
    unit_of_measure: string;
    currency: string;
}

export interface RateConfigurationHierarchyRelation {
    rate_configuration_id: string;
    hierarchy_id: string;
    hierarchy?: {
        id: string;
        name: string;
    };
}

export interface Expense {
    id: string;
    rate_configuration_id: string;
    unit_of_measure: string;
    unit_lable: string;
    rate: number;
    max_limit: number;
    expense_type?: {
        id: string;
        name: string;
    };
}

export interface BaseRate {
    seq_number: any;
    id: string;
    rate_configuration_id: string;
    rate_type?: {
        id: string;
        name: string;
        abbreviation: string;
        rate_type_category: string;
        is_base_rate: boolean;
        shift_type: string;
        get: () => any;
    };
}

export interface RateType {
    id: string;
    base_rate_type_id: string;
    rate_type?: {
        id: string;
        name: string;
        abbreviation: string;
        rate_type_category: string;
        is_base_rate: boolean;
        shift_type: string;
        get: () => any;
    };
    seq_number: number;
}

export interface RateDifferential {
    rate_id: string;
    differential_on: string;
    differential_type: string;
    differential_value: number;
    currency: any;
    unit_of_measure: any;
    get: () => any;
}

export interface Category {
    id: string;
    value: string;
    label: string;
}

export interface ShiftTypeObj {
    shift_type_configuration: any;
    id: string;
    shift_type_name: string;
    shift_format: string;
    time_duration: string;
    shift_type_time: string;
}

export interface MinMaxRate {
    min_rate: {
        amount: number;
        is_changeable: boolean;
        is_reduceable: boolean;
    };
    max_rate: {
        amount: number;
        is_changeable: boolean;
        is_reduceable: boolean;
    };
}