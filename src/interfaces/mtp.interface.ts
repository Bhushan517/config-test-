import { UUID } from "crypto";

export interface MtpInterface{
    id:UUID,
    program_id:UUID,
    mtp_id:string,
    linked_profiles:JSON,
    talent_name:string,
    mtp_candidate_id:UUID,
    is_deleted:boolean
}