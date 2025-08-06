export interface WorkflowMethodData {
    id: string,
    name: string,
    description: string,
    is_enabled: boolean,
    created_on?: bigint;
    updated_on?: bigint;
    created_by: string,
    updatedd_by: string,
    is_deleted: boolean,
    module_id: string,
    event_id: string,
}
