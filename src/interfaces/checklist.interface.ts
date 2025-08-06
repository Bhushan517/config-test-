export default interface ChecklistInterface {
    version_id: string;
    name: string;
    description: string;
    entity_id: string;
    tenant_id: string;
    is_enabled: boolean;
    program_id: string;
    pre_checklist_entity_id?: string;
    pre_checklist_version?: number;
    associations?: object;
    sourcing_model: 'contingent' | 'headcount_track' | 'sow';
    task_category_configs: {
        seq_no: number;
        is_mandatory: boolean;
        configuration: object;
        dependency?: string;
        trigger: string;
        actor_org_type: string;
        actor_role_id: string;
        actor_role_name: string;
        reviewer_org_type: string;
        reviewer_role_id: string;
        reviewer_role_name: string;
        start_date: string;
        due_date: string;
        created_by: string;
        updated_by: string;
        created_on?: bigint;
        updated_on?: bigint;
        is_enabled: boolean;
        is_deleted: boolean;
        category_id: string;
        category_name: string;
        task_entity_id: string;
        task_version_id: string;
        task_name: string;
        has_dependency: boolean;
        dependency_task_entity_id?: string;
        dependency_category_id?: string;
        dependency_task_name?: string;
        dependency_category_name?: string;
    }[];
    created_by: string;
    updated_by?: string;
    created_on?: bigint;
    updated_on?: bigint;
}

export interface FilterQuery {
    entity_id?: string;
    task_ids?: string;
    is_enabled?: string;
    limit?: number;
    page?: number;
}