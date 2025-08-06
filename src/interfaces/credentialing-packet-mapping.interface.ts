export default interface CredentialingPacketMappingInterface {
    id?: string;
    credentialing_packet_version_id: string;
    credentialing_packet_entity_id: string;
    category_id: string;
    category_name: string;
    task_entity_id: string;
    task_version_id: string;
    task_name: string;
    seq_no: number;
    is_mandatory?: boolean;
    is_enabled?: boolean;
    is_deleted?: boolean;
    created_on?: number;
    updated_on?: number;
    created_by: string;
    updated_by: string;
}
