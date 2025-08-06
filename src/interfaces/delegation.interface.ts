export interface DelegationInterface {
    id: string;
    program_id: string;
    delegated_to_user_id: string;
    delegated_by_user_id: string;
    delegated_to_user_mapping_id: string;
    delegated_by_user_mapping_id: string;
    start_date: Date;
    end_date: Date;
    created_by: string;
    updated_by: string;
    is_enabled: boolean;
    is_deleted: boolean;
    created_on?: bigint;
    updated_on?: bigint;
    interview_module: boolean;
    job_module: boolean;
    offer_module: boolean;
    assignment_module: boolean;
    submission_module: boolean;
    expense_module: boolean;
    timesheet_module: boolean;
    rfx_module: boolean;
    bid_module: boolean;
    sow_module: boolean;
    progress_update_module: boolean;
    modules:JSON
}
