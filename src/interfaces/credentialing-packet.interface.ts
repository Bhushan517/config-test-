export default interface CredentialingPacketInterface {
    id?: string;
    version_id: string;
    entity_id: string;
    name: string;
    description?: string;
    program_id: string;
    latest: boolean;
    version: number;
    previous_version_id?: string;
    pre_credentialing_packet_entity_id?: string;
    pre_credentialing_packet_version?: number;
    sourcing_model?: string;
    credentialing_packet_task_mappings: {
        seq_no: number;
        is_mandatory: boolean;
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
    }[];
    is_enabled: boolean;
    is_deleted: boolean;
    created_on?: number;
    updated_on?: number;
    created_by?: string;
    updated_by?: string;
}
