export interface SowTemplate {
    master_date_type: any;
    id: string;
    code:string;
    program_id: string;
    type: string;
    template_title: string;
    description:  Text;
    is_sow_assignment: boolean; 
    is_sow_expense: boolean;
    is_sow_milestones: boolean;
    is_sow_payment_req: boolean;
    is_sow_schedule_payments: boolean;
    is_sow_desc_mandatory: boolean;
    upload_description: {
        is_enable: boolean;
        is_upload_desc_mandatory: boolean;
    };
    is_update_sow_desc: boolean;
    is_req_doc_mandatory: boolean;
    is_deleted: boolean;
    created_on?: bigint;
    updated_on?: bigint;
    created_by: string;
    updated_by: string;
    hierarchy:any;
    custom_fields:any;
    master_data:any;
    seq_no?: number;
}
