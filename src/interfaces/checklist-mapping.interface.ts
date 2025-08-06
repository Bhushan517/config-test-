export interface ChecklistInterface {
    description: any;
    version_id: string;
    entity_id: string;
    created_by: string;
    updated_by: string;
    created_on?: bigint;
    updated_on?: bigint;
    is_enabled: boolean;
    is_deleted: boolean;

}

export interface ChecklistMappingInterface {
    id: string;
    checklist_version_id: string;
    checklist_entity_id: string;
    category_id: string;
    category_name: string;
    task_entity_id: string;
    task_version_id: string;
    task_name: string;
    sequence_number: number;
    is_mandatory: boolean;
    has_dependency: boolean;
    dependency_task_name?: string;
    dependency_category_name?: string; 
    dependency_task_entity_id?: string;
    dependency_category_id?: string;
    trigger: string;
    actor_org_type?: string;
    actor_role_id?: string;
    actor_role_name?: string;
    reviewer_org_type?: string;
    reviewer_role_id?: string;
    reviewer_role_name?: string;
    start_date?: Record<string, any>;
    due_date?: Record<string, any>;
    is_enabled: boolean;
    is_deleted: boolean;
    created_on?: bigint;
    updated_on?: bigint;
    created_by: string;
    updated_by: string;
}


export default interface TaskChecklistMappingInterface {
    checklist: ChecklistInterface
    checklist_mapping: ChecklistMappingInterface
}