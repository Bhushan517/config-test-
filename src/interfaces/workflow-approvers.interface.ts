export interface WorkflowApproversData {
    id: string,
    is_enabled: boolean,
    created_on?: bigint;
    updated_on?: bigint;
    created_by: string,
    updated_by: string,
    is_deleted: boolean,
    program_id: string,
    workflow_id: string,
    module_id: string,
    event_id: string,
    method_id: string,
}
