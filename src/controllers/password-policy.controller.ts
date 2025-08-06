import passwordPolicyModel from "../models/password-policy.model";
import { FastifyRequest, FastifyReply } from "fastify";
import { passwordPolicyData } from "../interfaces/password-policy.interface";
import { baseSearch } from "../utility/baseService";
import generateCustomUUID from "../utility/genrateTraceId";
import { decodeToken } from "../middlewares/verifyToken";

export async function getPasswordPolicy(request: FastifyRequest, reply: FastifyReply) {
    const searchFields = ['program_id'];
    const responseFields = ['id', 'program_id', 'expire_in', 'retained', 'must_contain', 'min_length', 'max_log_attempt', 'is_enabled'];
    return baseSearch(request, reply, passwordPolicyModel, searchFields, responseFields);
}

export async function getPasswordPolicyById(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    try {
        const { program_id, id } = request.params as { program_id: string, id: string };
        const password_policy = await passwordPolicyModel.findOne({ where: { program_id, id } });
        if (password_policy) {
            reply.status(200).send({
                status_code: 200,
                message: 'PasswordPolicy fetch Successfully.',
                trace_id: traceId,
                password_policy: password_policy
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                message: 'PasswordPolicy not found.',
                password_policy: []
            });
        }
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: 'An error occurred while fetching PasswordPolicy.',
            trace_id: traceId,
            error: error,
        });
    }
}

export const createPasswordPolicy = async (request: FastifyRequest, reply: FastifyReply) => {
    const password_policy = request.body as passwordPolicyData;
    const traceId = generateCustomUUID();
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer')) {
        return reply.status(401).send({ status_code: 401, message: 'Unauthorized-Token not found' });
    }
    const token = authHeader.split(' ')[1];
    let user: any = await decodeToken(token);
    if (!user) {
        return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Invalid token' });
    }
    const userId = user?.sub


    try {
        await passwordPolicyModel.create({
            ...password_policy,
            created_by: userId,
            updated_by: userId,
        });
        reply.status(201).send({
            status_code: 201,
            trace_id: traceId,
            message: 'PasswordPolicy Created Successfully.',
        });

    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: 'An error occurred while creating PasswordPolicy.',
            trace_id: traceId,
            error: (error as Error).message,
        });
    }
}

export async function updatePasswordPolicy(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    const { id } = request.params as{ id: string };
    const data = request.body as passwordPolicyData
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer')) {
        return reply.status(401).send({ status_code: 401, message: 'Unauthorized-Token not found' });
    }
    const token = authHeader.split(' ')[1];
    let user: any = await decodeToken(token);
    if (!user) {
        return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Invalid token' });
    }
    const userId = user?.sub
    try {
        const [updatedCount] = await passwordPolicyModel.update({ ...data, updated_by: userId, }, { where: { id } });
        if (updatedCount > 0) {
            reply.status(201).send({
                status_code: 201,
                message: 'PasswordPolicy updated successfully.',
                trace_id: traceId,
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                message: 'PasswordPolicy not found.',
            });
        }
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: 'Internal Server error',
            trace_id: traceId,
            error
        });
    }
}

export async function deletePasswordPolicy(
    request: FastifyRequest<{ Params: { program_id: string, id: string } }>,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer')) {
        return reply.status(401).send({ status_code: 401, message: 'Unauthorized-Token not found' });
    }
    const token = authHeader.split(' ')[1];
    let user: any = await decodeToken(token);
    if (!user) {
        return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Invalid token' });
    }
    const userId = user?.sub
    try {
        const { program_id, id } = request.params;
        const passwordPolicyData = await passwordPolicyModel.findOne({ where: { program_id, id } });
        if (passwordPolicyData) {
            await passwordPolicyModel.update({ is_deleted: true, is_enabled: false, updated_by: userId, }, { where: { program_id, id } });
            reply.status(204).send({
                status_code: 204,
                message: 'PasswordPolicy deleted successfully.',
                trace_id: traceId,
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                message: 'PasswordPolicy not found.',
            });
        }
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: 'Internal Server error',
            trace_id: traceId,
            error
        });
    }
}
