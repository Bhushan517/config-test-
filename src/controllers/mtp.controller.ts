import { FastifyReply, FastifyRequest } from "fastify";
import generateCustomUUID from "../utility/genrateTraceId";
import MtpService from "../service/mtp.service";
import { sanitizeError } from "../utility/errorHandler";

const mtpService = new MtpService();


export async function createMtp(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();

    try {
        const { program_id: programId } = request.params as { program_id: string };
        const user = request.user;
        const token = request.headers.authorization as any;
        const userId = user?.sub;
       const  mtp= request.body as any

        const result = await mtpService.createMtp({
            programId,
            mtp,
            userId,
            token,
            request,
            traceId,
            user
        });

        return reply.code(result.statusCode).send({
            status_code: result.statusCode,
            message: result.message,
            data: result.data,
            trace_id: traceId
        });
    } catch (error: any) {
        return reply.status(500).send({
            status_code: 500,
            message: "An error occurred while creating MTP",
            trace_id: traceId,
            error: sanitizeError(error)
        });
    }
}

export async function getAllMtp(request: FastifyRequest, reply: FastifyReply) {
    const { program_id: programId } = request.params as { program_id: string };
    const traceId = generateCustomUUID();

    const {
        page = 1,
        limit = 10,
        talent_name: talentName,
        mtp_id: mtpId,
        do_not_rehire: doNotRehire,
        updated_on: updatedOn,
        linked_profiles: linkedProfiles
    } = request.query as {
        page?: number;
        limit?: number;
        talent_name?: string;
        mtp_id?: string;
        do_not_rehire?: string;
        updated_on?: any;
        linked_profiles?: number;
    };

    try {
        const result = await mtpService.getAllMtp({
            programId,
            page: Number(page),
            limit: Number(limit),
            talentName,
            mtpId,
            doNotRehire,
            updatedOn,
            linkedProfiles
        });

        return reply.code(200).send({
            status_code: 200,
            message: result.message,
            mtp_data: result.data,
            pagination: result.pagination,
            trace_id: traceId,
        });
    } catch (error: any) {
        return reply.code(500).send({
            status_code: 500,
            message: 'Internal Server Error',
            trace_id: traceId,
            error: sanitizeError(error)
        });
    }
}


export async function getMtpById(request: FastifyRequest, reply: FastifyReply) {
    const { program_id: programId, id } = request.params as { program_id: string, id: string };
    const traceId = generateCustomUUID();
    const { page = 1, limit = 10 } = request.query as { page?: string | number, limit?: string | number };

    try {
        const result = await mtpService.getMtpById(programId, id,Number(page), Number(limit));

        return reply.code(200).send({
            status_code: 200,
            message: result.message,
            mtp_data: result.data,
            page: Number(page),
            limit: Number(limit),
            trace_id: traceId
        });
    } catch (error: any) {
        return reply.code(500).send({
            status_code: 500,
            message: "Internal Server Error",
            trace_id: traceId,
            error: sanitizeError(error)
        });
    }
}


export async function linkMtp(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    const { program_id: programId, id } = request.params as { program_id: string, id: string };
    const { mtp_candidate_id: mtpCandidateId,unlink_mtp_id:unlinkMtpId } = request.body as { mtp_candidate_id: string[],unlink_mtp_id:string };
    
    try {
        const result = await mtpService.linkMtp({
            programId,
            id,
            mtpCandidateId,
            unlinkMtpId
        });
        
        return reply.code(result.statusCode).send({
            status_code: result.statusCode,
            message: result.message,
            trace_id: traceId
        });
    } catch (error: any) {
        return reply.status(500).send({
            status_code: 500,
            message: "An error occurred while linking MTP",
            trace_id: traceId,
            error: sanitizeError(error)
        });
    }
}


export async function unlinkMtp(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    const { program_id: programId, id } = request.params as { program_id: string, id: string };
    const { mtp_candidate_id } = request.body as { mtp_candidate_id: string[] }; 
    
    try {
        const result = await mtpService.unlinkMtp({
            programId,
            id,
            mtpCandidateIds: mtp_candidate_id,
            user: request.user,
            traceId
        });

        return reply.code(result.statusCode).send({
            status_code: result.statusCode,
            message: result.message,
            trace_id: traceId
        });
    } catch (error: any) {
        return reply.status(500).send({
            status_code: 500,
            message: "An error occurred while unlinking MTP",
            trace_id: traceId,
            error: sanitizeError(error)
        });
    }
}


export async function getMtp(request: FastifyRequest, reply: FastifyReply) {
    const { program_id: programId, mtp_candidate_id: mtpCandidateId } = request.params as { program_id: string, mtp_candidate_id: string };
    const traceId = generateCustomUUID();
    try {
      const result = await mtpService.getLinkedProfiles(programId, mtpCandidateId);  
      return reply.code(200).send({
        status_code: 200,
        message: result.message,
        data: result.data,
        trace_id: traceId
      });
    } catch (error: any) {
      return reply.code(500).send({
        status_code: 500,
        message: "Internal Server Error",
        trace_id: traceId,
        error: sanitizeError(error)
      });
    }
  }
  
export async function disableMtp(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();

    try {
        const { program_id: programId,candidate_id:candidateId} = request.params as {
            program_id: string;
            candidate_id:string
        };
        const { mtp_id: mtpId } = request.body as { mtp_id: string[] };
        const result = await mtpService.disableMtp({
            programId,
            mtpId,
            candidateId,
            traceId
        });
        return reply.code(result.statusCode).send({
            status_code: result.statusCode,
            message: result.message,
            data: result.data,
            trace_id: traceId
        });

    } catch (error: any) {
        return reply.status(500).send({
            status_code: 500,
            message: "An error occurred while disabling MTP",
            trace_id: traceId,
            error: sanitizeError(error)
        });
    }
}

export async function masterProfile(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();

    try {
        const { program_id: programId, id } = request.params as { program_id: string, id: string };
        const { mtp_candidate_id: mtpCandidateId } = request.body as { mtp_candidate_id: string };

        const result = await mtpService.masterProfile({
            programId,
            id,
            mtpCandidateId,
            traceId
        });

        return reply.code(result.statusCode).send({
            status_code: result.statusCode,
            message: result.message,
            trace_id: traceId
        });
    } catch (error: any) {
        return reply.status(500).send({
            status_code: 500,
            message: "An error occurred while making MTP a master profile",
            trace_id: traceId,
            error: sanitizeError(error)
        });
    }
}

export async function updateMtp(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    const user = request.user;
    const token = request.headers.authorization as any;

    try {
        const { program_id: programId, id } = request.params as { program_id: string, id: string };
        const { do_not_rehire } = request.body as { do_not_rehire: boolean };

        const result = await mtpService.updateLinkedCandidatesDoNotRehire({
            programId,
            mtpId: id,
            doNotRehire: do_not_rehire,
            traceId,
            token
        });

        return reply.code(result.statusCode).send({
            status_code: result.statusCode,
            message: result.message,
            trace_id: traceId
        });
    } catch (error: any) {
        return reply.status(500).send({
            status_code: 500,
            message: "An error occurred while updating candidate flag",
            trace_id: traceId,
            error: sanitizeError(error)
        });
    }
}

