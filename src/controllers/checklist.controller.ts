import ChecklistInterface from "../interfaces/checklist.interface";
import { FastifyReply, FastifyRequest } from "fastify";
import generateCustomUUID from "../utility/genrateTraceId";
import { sequelize } from "../config/instance";
import { col, fn, Op } from "sequelize";
import Checklist from "../models/checklist.model";
import ChecklistMapping from "../models/checklist-mapping.model";
import ChecklistTaskMapping from "../models/checklist-mapping.model";
import { ChecklistService } from "../service/checklist.service";

const checklistService = new ChecklistService();

export async function createCheckList(
    request: FastifyRequest<{ Params: { program_id: string } }>,
    reply: FastifyReply
) {
    console.log("inside function")
    const traceId = generateCustomUUID();
    const program_id = request.params.program_id;
    const user = request?.user;
    const userId = user?.sub
    try {
        const checkListData = request.body as ChecklistInterface;
       
        
        const createdCheckList = await checklistService.createCheckList(checkListData, program_id, userId);
        
        reply.status(201).send({
            status_code: 201,
            message: 'Checklist created successfully',
            checklist: createdCheckList,
            traceId,
        });

    } catch (error: any) {
        console.log(error)
        if (error.message.includes('already exists')) {
            reply.status(409).send({
                status_code: 409,
                message: error.message,
                traceId,
            });
        } else {
            reply.status(500).send({
                status_code: 500,
                message: 'An error occurred while creating the checklist',
                error: error.message,
                traceId,
            });
        }
    }
}

export async function getChecklistById(
    request: FastifyRequest<{ Params: { entity_id: string; version?: string; } }>,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    const { entity_id, version } = request.params;
    try {
        const checklistResponse = await checklistService.getChecklistById(entity_id, version);
        
        return reply.status(200).send({
            status_code: 200,
            message: 'Successfully found checklist',
            data: checklistResponse,
            traceId: traceId,
        });
    } catch (error: any) {
        console.error(error);
        if (error.message === 'Checklist not found') {
            return reply.status(404).send({
                status_code: 404,
                message: 'Checklist not found',
                traceId: traceId,
            });
        } else {
            return reply.status(500).send({
                status_code: 500,
                message: 'Internal Server Error',
                traceId: traceId,
            });
        }
    }
}

export async function updateCheckList(
    request: FastifyRequest<{ Params: { entity_id: string, program_id: string }; Body: ChecklistInterface }>,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    const { entity_id, program_id } = request.params;
    const checkListData = request.body;
    const user = request?.user;
    const userId = user?.sub;

    try {
        await checklistService.updateCheckList(entity_id, program_id, checkListData, userId);
        
        return reply.status(200).send({
            status_code: 200,
            message: 'Checklist updated and new version created successfully.',
            traceId: traceId
        });
    } catch (error: any) {
        console.error('Error details:', error);
        
        if (error.message === '`task_category_configs` must be an array.') {
            return reply.status(400).send({
                status_code: 400,
                message: error.message,
                traceId: traceId,
            });
        } else if (error.message === 'A checklist with the same name is already enabled for this program.') {
            return reply.status(400).send({
                status_code: 400,
                message: error.message,
                traceId,
            });
        } else {
            return reply.status(500).send({
                status_code: 500,
                message: 'An error occurred while updating the checklist.',
                traceId: traceId
            });
        }
    }
}

export async function deleteCheckList(
    request: FastifyRequest<{ Params: { entity_id: string } }>,
    reply: FastifyReply
) {
    const { entity_id } = request.params;
    const traceId = generateCustomUUID();
    const user = request?.user;
    const userId = user?.sub

    try {
        const checklist = await Checklist.findOne({
            where: { entity_id, is_deleted: false },
        });

        if (!checklist) {
            return reply.status(404).send({
                status_code: 404,
                message: 'Checklist not found',
                traceId: traceId,
            });
        }

        await Checklist.update(
            { is_deleted: true, updated_by: userId, updated_on: BigInt(Date.now()) },
            { where: { entity_id } }
        );

        return reply.status(200).send({
            status_code: 200,
            message: 'Checklist deleted successfully',
            traceId: traceId,
        });
    } catch (error) {
        return reply.status(500).send({
            status_code: 500,
            message: 'Internal Server Error',
            trace_id: traceId,
            error,
        });
    }
}

export async function listChecklists(
    request: FastifyRequest<{
        Querystring: {
            name?: string;
        };
        Params: {
            program_id: string
        };
    }>,
    reply: FastifyReply
) {
    const { name } = request.query;
    const program_id = request.params.program_id;
    const traceId = generateCustomUUID();

    try {
        const checklists = await checklistService.listChecklists(program_id, name);

        return reply.status(200).send({
            status_code: 200,
            message: checklists.length
                ? "Successfully fetched checklists for the program"
                : "No checklists found for the given filters.",
            data: checklists,
            traceId: traceId,
        });
    } catch (error) {
        console.error('Error while filtering checklists:', error);

        return reply.status(500).send({
            status_code: 500,
            message: 'Internal Server Error',
            traceId: traceId,
            error: {
                message: (error as Error).message || 'An unexpected error occurred.',
                stack: (error as Error).stack || null,
            },
        });
    }
}

export async function filterChecklists(
    request: FastifyRequest<{
        Querystring: {
            task_ids?: string;
            is_enabled?: boolean | string;
            entity_id?: string;
            name?: string;
            sourcing_model?: 'contingent' | 'headcount_track' | 'sow'; 
            limit?: number | string;
            page?: number | string;
        };
        Params: {
            program_id: string;
        };
    }>,
    reply: FastifyReply
) {
    const program_id = request.params.program_id;
    const traceId = generateCustomUUID();

    try {
        const result = await checklistService.filterChecklists(program_id, request.query);

        if (!result.checklists.length) {
            return reply.status(200).send({
                status_code: 200,
                message: 'No checklists found for the given filters.',
                data: [],
                total_count: 0,
                current_page: result.current_page,
                traceId,
            });
        }

        return reply.status(200).send({
            status_code: 200,
            message: 'Checklists fetched successfully',
            data: result.checklists,
            total_count: result.total_count,
            current_page: result.current_page,
            traceId,
        });
    } catch (error) {
        console.error('Error while filtering checklists:', error);

        return reply.status(500).send({
            status_code: 500,
            message: 'Internal Server Error',
            traceId,
            error: {
                message: (error as Error).message || 'An unexpected error occurred.',
                stack: (error as Error).stack || null,
            },
        });
    }
}


export async function enableDisableChecklist(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    try {
        const { program_id, entity_id } = request.params as { program_id: string; entity_id: string };
        const { is_enabled } = request.body as { is_enabled: boolean };

        await checklistService.enableDisableChecklist(program_id, entity_id, is_enabled);

        return reply.status(200).send({
            status_code: 200,
            message: "Checklist is_enabled status updated successfully",
            trace_id: traceId,
        });
    } catch (error: any) {
        console.error("Error in enableDisableChecklist:", error);
        
        if (error.message === "Program ID and Entity ID are required" || 
            error.message === "'is_enabled' is required in the payload") {
            return reply.status(400).send({
                status_code: 400,
                message: error.message,
                trace_id: traceId
            });
        } else if (error.message === "Checklist not found") {
            return reply.status(404).send({
                status_code: 404,
                message: error.message,
                trace_id: traceId,
            });
        } else {
            return reply.status(500).send({
                status_code: 500,
                message: "Internal Server Error",
                trace_id: traceId,
                error,
            });
        }
    }
}
