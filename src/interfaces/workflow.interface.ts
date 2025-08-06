export interface WorkflowData {
    id: string,
    name: string,
    event_id: string,
    method_id: string,
    hierarchies: any[],
    placement_order: number,
    module: string,
    config: any,
    is_enabled: boolean,
    levels: any[],
    initialTrigger: any[],
    created_on?: bigint;
    updated_on?: bigint;
    created_by: string,
    updated_by: string,
    program_id: string,
    is_deleted: boolean,
    workflow_id: string,
    flow_count: number,
    flow_type: string,
    is_associated: boolean,
}

export interface WorkflowRecepientTypeData {
    id: string,
    is_enabled: boolean,
    is_deleted: boolean,
    created_on: number,
    updated_on: number,
    created_by: string,
    updated_by: string,
    meta_data: string,
    level_id: string,
    program_id: string,
    recipient_type_id: string,
    behaviour: string,
    workflow_id: string,
    workflow_trigger_id: string,
    job_id: string
}

export interface WorkflowLevelData {
    id: string,
    is_enabled: boolean,
    is_deleted: boolean,
    created_on: number,
    updated_on: number,
    created_by: string,
    updated_by: string,
    placement_order: number,
    program_id: string,
    workflow_id: string,
    workflow_trigger_id: string,
    job_id: string
}