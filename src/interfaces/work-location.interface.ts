import { Json } from "sequelize/types/utils";

export interface WorkLocationInterface {
    currencies: any;
    id: string;
    name: string;
    code: string;
    address: string;
    address_line_1: string;
    address_line_2?: string;
    street_name?: string;
    city_name?: string;
    state_name?: string;
    state_code?: string;
    country_name?: string;
    description?: Text;
    city_id?: string;
    zipcode?: string;
    country_id?: string;
    state_id?: string;
    real_estate_code?: string;
    tax_code?: string;
    creation_source?: string;
    is_enabled: boolean;
    timezone?: string;
    currency?: string[];
    custom_fields?: any;
    ref_id?: string;
    program_id: string;
    created_on?: bigint;
    updated_on?: bigint;
    created_by :string ;
    updated_by :string ;
}