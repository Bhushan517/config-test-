import { FastifyRequest, FastifyReply } from 'fastify';
import { ReasonCode } from '../interfaces/reason-code.interface';
import generateCustomUUID from '../utility/genrateTraceId';
import { Module } from '../models/module.model';
import { Op } from 'sequelize';
import Event from '../models/event.model';
import ReasonCodeActionModel from '../models/reason-code-action.model';
import ReasonCodeModel from '../models/reason-code.model';

export async function createReasoncode(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    try {
        const reasoncode = request.body as {
            id: any;
            reasons_count: number;
            created_by: object;
            updated_by: object;
            is_deleted: boolean;
            program_id: string;
            event_id?: string;
            module_id?: string;
            slug: string;
            reason_codes: Array<{
                name: string;
                category: string;
                is_enabled: boolean
            }>;
        };

        const reason_code_action = await ReasonCodeActionModel.create({
            reasons_count: reasoncode.reasons_count,
            created_by: reasoncode.created_by,
            updated_by: reasoncode.updated_by,
            is_deleted: reasoncode.is_deleted,
            event_id: reasoncode.event_id,
            module_id: reasoncode.module_id,
            slug: reasoncode.slug,
        });

        await ReasonCodeModel.bulkCreate(
            reasoncode.reason_codes.map((reason) => ({
                name: reason.name,
                category: reason.category,
                reason_code_id: reason_code_action.id,
                is_enabled: reason.is_enabled
            }))
        );

        reply.status(201).send({
            status_code: 201,
            message: "Reasoncode created successfully",
            reason_code_id: reason_code_action.id,
            trace_id: traceId,
        });
    } catch (error: any) {
        reply.status(500).send({
            status_code: 500,
            message: "Internal Server Error",
            trace_id: traceId,
            error: error.message,
        });
    }
}


export async function getAllReasoncode(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    try {
        const { page = 1, limit = 10, module_name, reasons_count, event_name } = request.query as {
            page?: number,
            limit?: number,
            module_name?: string,
            reasons_count?: number,
            event_name?: string
        };

        const offset = (page - 1) * limit;

        const reasoncodes = await ReasonCodeActionModel.findAll({
            where: {
                is_deleted: false,
                ...(module_name && {
                    '$module.name$': { [Op.like]: `%${module_name}%` }
                }),
                ...(event_name && {
                    '$supporting_text_event.name$': { [Op.like]: `%${event_name}%` }
                })
            },
            attributes: {
                exclude: ['ref_id', 'updated_by', 'created_by', 'event_id', 'module_id', 'created_on', 'is_deleted', 'reason_code_limit', 'slug']
            },
            include: [
                {
                    model: Event,
                    as: 'supporting_text_event',
                    attributes: ['id', 'name'],
                    where: { is_enabled: true },
                    required: false,
                },
                {
                    model: Module,
                    as: 'module',
                    attributes: ['id', 'name'],
                    where: { is_enabled: true },
                    required: false,
                },
            ],
            order: [['created_on', 'DESC']],
            limit: Number(limit),
            offset: Number(offset),
        });

        const reasoncodesWithDetails = reasoncodes.map((reasoncode: any) => {
            const { supporting_text_event, module, ...reasoncodeWithoutReason } = reasoncode.toJSON();
            const enabledReasonsCount = reasoncode.reasons_count || 0;

            return {
                ...reasoncodeWithoutReason,
                reasons_count: enabledReasonsCount,
                module_name: module?.name || 'Unknown Module',
                module_id: module?.id || 'Unknown id',
                event_name: supporting_text_event?.name || 'Unknown Event',
                event_id: supporting_text_event?.id || 'Unknown id',
            };
        });

        const filteredReasoncodes = reasons_count !== undefined
            ? reasoncodesWithDetails.filter((rc) => rc.reasons_count === reasons_count)
            : reasoncodesWithDetails;

        const totalRecords = await ReasonCodeActionModel.count({
            where: {
                is_deleted: false,
            }
        });

        if (!filteredReasoncodes || filteredReasoncodes.length === 0) {
            return reply.status(200).send({
                status_code: 200,
                message: "Reasoncode not found",
                reason_code_action: [],
                totalRecords,
                trace_id: traceId
            });
        }

        reply.status(200).send({
            status_code: 200,
            message: 'Reasoncode retrive successfully ',
            trace_id: traceId,
            reason_code_action: filteredReasoncodes,
            total_records: totalRecords,
        });
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: 'Internal server error',
            trace_id: traceId,
            error: error,
        });
    }
}


export async function getReasoncodeById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    try {
        const { id } = request.params;
        const reason_code = await ReasonCodeActionModel.findOne({
            where: { id },
            attributes: { exclude: ['ref_id', 'entity_ref', 'code', 'program_id', 'event_id', 'module_id', 'is_deleted', 'created_on', 'reasons_count', 'created_by', 'updated_by', 'reason_code_limit', 'updated_on'] },
            include: [
                {
                    model: Event,
                    as: 'supporting_text_event',
                    attributes: ['id', 'name'],
                    where: { is_enabled: true },
                },
                {
                    model: Module,
                    as: 'module',
                    attributes: ['id', 'name'],
                    where: { is_enabled: true },
                },
            ],
        });

        if (reason_code) {
            const reasoncodes = await ReasonCodeModel.findAll({
                where: {
                    reason_code_id: id
                },
                attributes: ['id', 'name', 'created_on', 'category', 'is_enabled'],
            });

            const reasoncode = reason_code.toJSON();
            const { supporting_text_event, module, ...reasoncodeWithoutExtras } = reasoncode;

            const reasoncodeWithDetails = {
                ...reasoncodeWithoutExtras,
                module_name: module?.name || 'Unknown Module',
                module_id: module?.id || 'Unknown id',
                event_name: supporting_text_event?.name || 'Unknown Event',
                event_id: supporting_text_event?.id || 'Unknown id',
                reason_codes: reasoncodes || [],
            };

            reply.status(200).send({
                status_code: 200,
                meassage: 'Reason code retrieved successfully',
                reason_code_action: reasoncodeWithDetails,
                trace_id: traceId,
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                message: 'Reason code not found',
                reason_code_action: {
                    reasoncodes: []
                },
                trace_id: traceId,
            });
        }
    } catch (error: any) {
        reply.status(500).send({
            status_code: 500,
            message: 'An error occurred while fetching',
            trace_id: traceId,
            error: error.message || error,
        });
    }
}

export async function getReasoncodeByEventName(
    request: FastifyRequest<{ Params: { event_slug: string } }>,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    try {
        const { event_slug } = request.query as {
            event_slug?: string
        };
        const event = await Event.findOne({ where: { slug: event_slug } });
        const eventId = event?.dataValues?.id;
        const reason_code = await ReasonCodeActionModel.findOne({
            where: {
                event_id: eventId
            },
            include: [
                {
                    model: Event,
                    as: 'supporting_text_event',
                    attributes: ['id', 'name']
                },
                {
                    model: Module,
                    as: 'module',
                    attributes: ['id', 'name']
                },
            ],
        });
        if (reason_code) {
            reply.status(200).send({
                status_code: 200,
                message: 'Reason code retrieved successfully',
                reason_code_action: reason_code,
                trace_id: traceId
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                message: 'Reason code not found',
                reason_code_action: [],
                trace_id: traceId
            });
        }
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: 'An error occurred while fetching',
            trace_id: traceId,
            error: error
        });
    }
}


export async function updateReasoncode(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const { reason_codes, reasons_count }: { reason_codes: ReasonCode[], reasons_count: number } = request.body as { reason_codes: ReasonCode[], reasons_count: number };
    const traceId = generateCustomUUID();

    try {
        const reasonCodeAction = await ReasonCodeActionModel.findByPk(id);

        if (reasonCodeAction) {
            for (const reasonCodeData of reason_codes) {
                if (
                    (reasonCodeData.module_id && reasonCodeData.module_id !== reasonCodeAction.module_id) ||
                    (reasonCodeData.event_id && reasonCodeData.event_id !== reasonCodeAction.event_id)
                ) {
                    return reply.status(400).send({
                        status_code: 400,
                        trace_id: traceId,
                        message: 'program_id, module_id, and event_id fields cannot be updated',
                    });
                }

                const reasonCode = await ReasonCodeModel.findOne({
                    where: { reason_code_id: id },
                });

                if (reasonCode) {
                    await reasonCode.update(reasonCodeData);
                } else {
                    return reply.status(404).send({
                        status_code: 404,
                        trace_id: traceId,
                        message: `Reason code with ID ${reasonCodeData.id} not found`,
                    });
                }
            }

            await reasonCodeAction.update({
                reasons_count,
            });

            return reply.status(200).send({
                status_code: 200,
                message: 'Reason codes and reason code action updated successfully',
                reason_code_action: id,
                trace_id: traceId,
            });
        } else {
            return reply.status(404).send({
                status_code: 404,
                trace_id: traceId,
                message: 'Reason code action not found',
            });
        }
    } catch (error) {
        return reply.status(500).send({
            status_code: 500,
            message: 'Internal Server Error',
            trace_id: traceId,
        });
    }
}

export async function deleteReasoncode(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    try {
        const { id } = request.params;
        const [numRowsDeleted] = await ReasonCodeActionModel.update({
            is_enabled: false,
            updated_on: Date.now(),
        },
            { where: { id } }
        );

        if (numRowsDeleted > 0) {
            reply.status(200).send({
                status_code: 200,
                message: "Reasoncode deleted successfully",
                reason_code_action_id: id,
                trace_id: traceId,
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                message: 'Reasoncode not found',
                reason_code_action: [],
                trace_id: traceId,
            });
        }
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: 'An error occurred while deleting',
            trace_id: traceId,
            error
        });
    }
}

export const getReasonCodeBySlug = async (
    request: FastifyRequest<{
        Params: { program_id: string },
        Querystring: { event_slug?: string, module_slug?: string }
    }>,
    reply: FastifyReply
) => {

    const { program_id } = request.params;
    const { event_slug, module_slug } = request.query;
    const traceId = generateCustomUUID();
    try {
        const event = await Event.findOne({
            where: { slug: event_slug },
            attributes: ['id'],
        });

        if (!event) {
            return reply.status(404).send({
                status_code: 404,
                message: `Event with slug '${event_slug}' not found`,
                trace_id: traceId,
            });
        }

        const module = await Module.findOne({
            where: { slug: module_slug },
            attributes: ['id'],
        });

        if (!module) {
            return reply.status(404).send({
                status_code: 404,
                message: `Module with slug '${module_slug}' not found`,
                trace_id: traceId,
            });
        }

        const event_id = event.id;
        const module_id = module.id;

        const data = await ReasonCodeActionModel.findAll({
            where: { event_id, module_id },
        });

        if (!data.length) {
            return reply.status(404).send({
                status_code: 404,
                message: "Reason codes action not found for the given event and module",
                trace_id: traceId,
            });
        }

        const reason_codes = await ReasonCodeModel.findAll({
            where: {
                reason_code_id: data.map((d) => d.id),
                program_id: program_id
            },
            attributes: ['id', 'name', 'category', 'created_on', 'updated_on', 'reason_code_id', 'program_id']
        });

        if (!reason_codes.length) {
            return reply.status(404).send({
                status_code: 404,
                message: "No reason codes found for the given event and module",
                trace_id: traceId,
            });
        }

        reply.status(200).send({
            status_code: 200,
            message: "Reason codes retrieved successfully",
            trace_id: traceId,
            reason_code_action: reason_codes,
        });
    } catch (error: any) {
        reply.status(500).send({
            status_code: 500,
            trace_id: traceId,
            message: "Internal Server Error",
            error: error.message,
        });
    }
};
