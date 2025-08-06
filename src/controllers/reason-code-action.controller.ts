import { FastifyRequest, FastifyReply } from 'fastify';
import ReasonCodeActionModel from '../models/reason-code-action.model';
import { ReasonCode } from '../interfaces/reason-code.interface';
import generateCustomUUID from '../utility/genrateTraceId';
import { Module } from '../models/module.model';
import { Op, Sequelize, where } from 'sequelize';
import Event from '../models/event.model';
import ReasonCodeModel from '../models/reason-code.model';
import { sequelize } from '../config/instance';
import { decodeToken } from '../middlewares/verifyToken';
import { Programs } from '../models/programs.model';

export async function createReasoncode(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    const user = request?.user;
    const userId = user?.sub
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
                is_enabled: boolean;
                sq_number: number
            }>;
        };
        if (reasoncode.event_id) {
            const existingEvent = await ReasonCodeActionModel.findOne({
                where: { event_id: reasoncode.event_id, is_deleted: false }
            });
            if (existingEvent) {
                return reply.status(400).send({
                    status_code: 400,
                    message: "Event already exists",
                    trace_id: traceId
                });
            }
        }
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
                sq_number: reason.sq_number,
                is_enabled: reason.is_enabled,
                program_id: reasoncode.program_id,
                created_by: userId,
                updated_by: userId,
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
            message: "Internal Server Error",
            trace_id: traceId,
            error: error.message,
        });
    }
}

export async function createReasonCodes(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    const user = request?.user;
    const userId = user.sub;

    const transaction = await sequelize.transaction();

    try {
        const reasoncodes = request.body as {
            reason_code_action_id: string;
            reason_codes: Array<{
                name: string;
                category: string;
                is_enabled: boolean;
                sq_number: number
            }>;
        };

        const { reason_code_action_id, reason_codes } = reasoncodes;
        const program_id = null;

        if (!reason_code_action_id) {
            await transaction.rollback();
            return reply.status(400).send({
                status_code: 400,
                message: 'reason_code_action_id is required',
                trace_id: traceId,
            });
        }

        if (!reason_codes || reason_codes.length === 0) {
            await transaction.rollback();
            return reply.status(400).send({
                status_code: 400,
                message: 'reason_codes array cannot be empty',
                trace_id: traceId,
            });
        }

        const existingAction = await ReasonCodeActionModel.findByPk(reason_code_action_id, { transaction });
        if (!existingAction) {
            await transaction.rollback();
            return reply.status(404).send({
                status_code: 404,
                message: 'Reason code action not found',
                trace_id: traceId,
            });
        }

        const createdCodes = await ReasonCodeModel.bulkCreate(
            reason_codes.map((reason) => ({
                name: reason.name,
                category: reason.category,
                is_enabled: reason.is_enabled,
                sq_number: reason.sq_number,
                program_id: null,
                reason_code_id: reason_code_action_id,
                created_by: userId,
                updated_by: userId,
                created_on: Date.now(),
                updated_on: Date.now(),
                is_deleted: false,
            })),
            { transaction }
        );

        await ReasonCodeActionModel.update(
            {
                reasons_count: sequelize.literal(`reasons_count + ${reason_codes.length}`),
                updated_by: userId,
                updated_on: Date.now(),
            },
            {
                where: { id: reason_code_action_id },
                transaction,
            }
        );

        await transaction.commit();

        return reply.status(201).send({
            status_code: 201,
            message: 'Reason codes created successfully',
            reason_code_action_id,
            trace_id: traceId,
        });
    } catch (error: any) {
        await transaction.rollback();
        console.error('Error creating reason codes:', error);

        return reply.status(500).send({
            status_code: 500,
            message: 'Internal Server Error',
            trace_id: traceId,
            error: error.message,
        });
    }
}



export async function getAllReasoncode(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();

    try {
        const { page = 1, limit = 10, module_name, reasons_count, event_name } = request.query as {
            page?: string | number;
            limit?: string | number;
            module_name?: string;
            reasons_count?: number;
            event_name?: string;
        };

        const pageNumber = parseInt(page as unknown as string, 10);
        const limitNumber = parseInt(limit as unknown as string, 10);
        const offset = (pageNumber - 1) * limitNumber;

        const whereClause: any = {
            is_deleted: false,
            ...(module_name && {
                '$module.name$': { [Op.like]: `%${module_name}%` }
            }),
            ...(event_name && {
                '$supporting_text_event.name$': { [Op.like]: `%${event_name}%` }
            }),
            ...(reasons_count !== undefined && {
                reasons_count: reasons_count
            })
        };

        const { rows: reasoncodes, count: totalRecords } = await ReasonCodeActionModel.findAndCountAll({
            where: whereClause,
            attributes: {
                exclude: ['ref_id', 'updated_by', 'created_by', 'event_id', 'module_id', 'created_on', 'is_deleted', 'reason_code_limit', 'slug']
            },
            include: [
                {
                    model: Event,
                    as: 'supporting_text_event',
                    attributes: ['id', 'name'],
                    required: false,
                },
                {
                    model: Module,
                    as: 'module',
                    attributes: ['id', 'name'],
                    required: false,
                },
            ],
            order: [
                [Sequelize.literal("CASE WHEN `module`.`name` IS NULL THEN 1 ELSE 0 END"), 'ASC'], // Place NULL modules last
                [{ model: Module, as: 'module' }, 'name', 'ASC'],
                ['updated_on', 'DESC'],
            ],
            limit: limitNumber,
            offset,
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

        reply.status(200).send({
            status_code: 200,
            message: reasoncodesWithDetails.length
                ? 'Reasoncode retrieved successfully'
                : 'Reasoncode not found',
            items_per_page: limitNumber,
            total_records: totalRecords,
            reason_code_action: reasoncodesWithDetails,
            trace_id: traceId,
        });
    } catch (error: any) {
        reply.status(500).send({
            status_code: 500,
            message: 'Internal server error',
            trace_id: traceId,
            error: error.message,
        });
    }
}

export async function getReasoncodeById(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    let transaction = await sequelize.transaction();

    try {
        const { program_id, id } = request.params as { program_id?: string; id: string };

        let reasonCodeResponse = null;

        if (program_id) {
            const reasonCodes = await ReasonCodeModel.findAll({
                where: { reason_code_id: id, program_id, is_deleted: false },
                attributes: ['id', 'name', 'created_on', 'category', 'is_enabled'],
                order: [['sq_number', 'ASC']],
                transaction,
            });

            if (reasonCodes.length === 0) {
                const reasonCodesWithoutProgram = await ReasonCodeModel.findAll({
                    where: { reason_code_id: id, program_id: null, is_deleted: false },
                    attributes: ['id', 'name', 'created_on', 'category', 'is_enabled', 'sq_number'],
                    order: [['sq_number', 'ASC']],
                    transaction,
                });
                if (reasonCodesWithoutProgram.length > 0) {
                    const reasonCodeAction = await ReasonCodeActionModel.findOne({
                        where: {
                            id
                        },
                        include: [
                            {
                                model: Event,
                                as: 'supporting_text_event',
                                attributes: ['id', 'name'],
                                where: { is_enabled: true },
                                required: false
                            },
                            {
                                model: Module,
                                as: 'module',
                                attributes: ['id', 'name'],
                                required: false
                            },
                        ],
                        transaction
                    });

                    reasonCodeResponse = {
                        id: reasonCodesWithoutProgram[0]?.id,
                        module_name: reasonCodeAction?.module?.name,
                        module_id: reasonCodeAction?.module?.id,
                        event_name: reasonCodeAction?.supporting_text_event?.name,
                        event_id: reasonCodeAction?.supporting_text_event?.id,
                        program_id,
                        reason_codes: reasonCodesWithoutProgram.map((reasonCode) => ({
                            id: reasonCode.id,
                            name: reasonCode.name,
                            created_on: reasonCode.created_on,
                            category: reasonCode.category,
                            is_enabled: reasonCode.is_enabled,
                            sq_number: reasonCode.sq_number,

                        })),
                    };

                    await transaction.commit();

                    return reply.status(200).send({
                        status_code: 200,
                        message: 'Reason code retrieved successfully',
                        reason_code_action: reasonCodeResponse,
                        trace_id: traceId,
                    });
                }
            } else {
                const reasonCodeAction = await ReasonCodeActionModel.findOne({
                    where: { id },
                    include: [
                        {
                            model: Event,
                            as: 'supporting_text_event',
                            attributes: ['id', 'name'],
                            where: { is_enabled: true },
                            required: false
                        },
                        {
                            model: Module,
                            as: 'module',
                            attributes: ['id', 'name'],
                            required: false
                        },
                    ],
                    transaction
                });

                reasonCodeResponse = {
                    id: reasonCodes[0]?.id,
                    module_name: reasonCodeAction?.module?.name,
                    module_id: reasonCodeAction?.module?.id,
                    event_name: reasonCodeAction?.supporting_text_event?.name,
                    event_id: reasonCodeAction?.supporting_text_event?.id,
                    program_id,
                    reason_codes: reasonCodes.map((reasonCode) => ({
                        id: reasonCode.id,
                        name: reasonCode.name,
                        created_on: reasonCode.created_on,
                        category: reasonCode.category,
                        is_enabled: reasonCode.is_enabled,
                        sq_number: reasonCode.sq_number
                    })),
                };

                await transaction.commit();

                return reply.status(200).send({
                    status_code: 200,
                    message: 'Reason code retrieved successfully',
                    reason_code_action: reasonCodeResponse,
                    trace_id: traceId,
                });
            }
        }

        const reasonCodeAction = await ReasonCodeActionModel.findOne({
            where: { id },
            include: [
                {
                    model: Event,
                    as: 'supporting_text_event',
                    attributes: ['id', 'name'],
                    where: { is_enabled: true },
                    required: false
                },
                {
                    model: Module,
                    as: 'module',
                    attributes: ['id', 'name'],
                    required: false
                },
            ],
            transaction
        });

        if (reasonCodeAction) {
            const reasonCodes = await ReasonCodeModel.findAll({
                where: { reason_code_id: id, is_deleted: false },
                attributes: ['id', 'name', 'created_on', 'category', 'is_enabled', 'sq_number'],
                order: [['sq_number', 'ASC']],
                transaction,
            });
            const { supporting_text_event, module, } = reasonCodeAction.toJSON();

            reasonCodeResponse = {
                id: reasonCodeAction.id,
                module_name: module?.name,
                module_id: module?.id,
                event_name: supporting_text_event?.name,
                event_id: supporting_text_event?.id,
                reason_codes: reasonCodes || [],
            };

            await transaction.commit();

            return reply.status(200).send({
                status_code: 200,
                message: 'Reason code retrieved successfully',
                reason_code_action: reasonCodeResponse,
                trace_id: traceId,
            });
        }

        await transaction.rollback();

        return reply.status(200).send({
            status_code: 200,
            message: 'Reason code not found',
            trace_id: traceId,
        });
    } catch (error: any) {
        if (transaction) {
            await transaction.rollback();
        }
        return reply.status(500).send({
            status_code: 500,
            message: 'An error occurred while fetching reason code',
            trace_id: traceId,
            error: error.message || error,
        });
    }
};

export async function getReasoncodeByEventName(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    try {
        const { event_slug } = request.query as { event_slug?: string };
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
            message: 'An error occurred while fetching',
            trace_id: traceId,
            error: error
        });
    }
}


export async function updateReasoncode(request: FastifyRequest, reply: FastifyReply) {
    const { id, program_id } = request.params as { id: string; program_id: string };
    const { reason_codes }: { reason_codes: ReasonCode[] } = request.body as { reason_codes: ReasonCode[] };
    const traceId = generateCustomUUID();

    const transaction = await ReasonCodeModel.sequelize?.transaction();
    const user = request?.user;
    const userId = user?.sub

    try {
        await ReasonCodeModel.destroy({
            where: { reason_code_id: id, program_id },
            transaction,
        });

        if (!reason_codes || reason_codes.length === 0) {
            await transaction?.rollback();
            return reply.status(400).send({
                status_code: 400,
                trace_id: traceId,
                message: 'No reason codes provided in the payload',
            });
        }

        for (const reasonCodeData of reason_codes) {
            await ReasonCodeModel.create(
                {
                    ...reasonCodeData,
                    reason_code_id: id,
                    program_id,
                    updated_by: userId,
                },
                { transaction }
            );
        }

        const reasons_count = reason_codes.length;

        const reasonCodeAction = await ReasonCodeActionModel.findOne({
            where: { id },
            transaction,
        });

        if (!reasonCodeAction) {
            await transaction?.rollback();
            return reply.status(200).send({
                status_code: 200,
                trace_id: traceId,
                message: 'Reason code action not found',
            });
        }

        await reasonCodeAction.update({ reasons_count }, { transaction });

        await transaction?.commit();

        return reply.status(200).send({
            status_code: 200,
            message: 'Reason codes updated successfully',
            reason_code_action: reasonCodeAction.id,
            trace_id: traceId,
        });
    } catch (error) {
        await transaction?.rollback();
        return reply.status(500).send({
            status_code: 500,
            message: 'Internal Server Error',
            trace_id: traceId,
        });
    }
}

export async function deleteReasoncodeAction(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    try {
        const { id } = request.params;
        const [numRowsDeleted] = await ReasonCodeActionModel.update({
            is_enabled: false,
            is_deleted: true,
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

export async function deleteReasoncode(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    try {
        const { id } = request.params;
        const numRowsDeleted = await ReasonCodeModel.update({
            is_enabled: false,
            is_deleted: true,
            updated_on: Date.now(),
        },
            { where: { id, is_deleted: false } }
        );

        if (numRowsDeleted[0] > 0) {
            reply.status(200).send({
                status_code: 200,
                message: "Reasoncode deleted successfully",
                reason_code_id: id,
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
    request: FastifyRequest,
    reply: FastifyReply
) => {
    const { program_id } = request.params as { program_id: string };
    const { event_slug, module_slug } = request.query as { event_slug: string; module_slug: string };
    const trace_id = generateCustomUUID();

    try {
        const [event, module] = await Promise.all([
            Event.findOne({ where: { slug: event_slug }, attributes: ['id'] }),
            Module.findOne({ where: { slug: module_slug }, attributes: ['id'] }),
        ]);

        if (!event || !module) {
            return reply.status(200).send({
                status_code: 200,
                message: "Event or Module not found",
                trace_id,
            });
        }
        const actions = await ReasonCodeActionModel.findAll({
            where: { event_id: event.id, module_id: module.id, is_deleted: false, },
        });

        if (!actions.length) {
            return reply.status(200).send({
                status_code: 200,
                message: "Reason code actions not found",
                trace_id,
            });
        }

        const reason_code_ids = actions.map(a => a.id);
        const baseWhere = {
            reason_code_id: reason_code_ids,
            is_deleted: false,
        };
        const programSpecificCodes = await ReasonCodeModel.findAll({
            where: { ...baseWhere, program_id },
            order: [['sq_number', 'ASC']],
            attributes: [
                'id', 'name', 'category', 'created_on', 'updated_on',
                'reason_code_id', 'program_id', 'sq_number', 'is_enabled'
            ],
        });

        if (programSpecificCodes.length > 0) {
            const enabledProgramCodes = programSpecificCodes.filter(rc => rc.is_enabled);

            return reply.status(200).send({
                status_code: 200,
                message: enabledProgramCodes.length
                    ? "Reason codes retrieved successfully"
                    : "No enabled reason codes for this program",
                reason_code_action: enabledProgramCodes,
                trace_id,
            });
        }

        const predefinedCodes = await ReasonCodeModel.findAll({
            where: {
                ...baseWhere,
                program_id: null,
                is_enabled: true,
            },
            order: [['sq_number', 'ASC']],
            attributes: [
                'id', 'name', 'category', 'created_on', 'updated_on',
                'reason_code_id', 'program_id', 'sq_number', 'is_enabled'
            ],
        });

        return reply.status(200).send({
            status_code: 200,
            message: predefinedCodes.length
                ? "Predefined reason codes retrieved successfully"
                : "No reason codes available",
            reason_code_action: predefinedCodes,
            trace_id,
        });

    } catch (error: any) {
        return reply.status(500).send({
            status_code: 500,
            message: "Internal Server Error",
            trace_id,
            error: error.message,
        });
    }
};


export const getReasonCodeByProgramIdAndSlug = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();
    const { slug } = request.params as { slug: string };
    try {

        const reasonCodeAction = await ReasonCodeActionModel.findOne({
            where: { slug },
        });

        if (!reasonCodeAction) {
            return reply.status(200).send({
                status_code: 200,
                message: "Reason code action not found.",
                trace_id: traceId
            });
        }

        const reasonCodes = await ReasonCodeModel.findAll({
            where: {
                reason_code_id: reasonCodeAction.id,
            },
            order: [['sq_number', 'ASC']],
            attributes: ['id', 'name', 'category', 'reason_code_id', 'sq_number'],
        });

        if (!reasonCodes.length) {
            return reply.status(200).send({
                status_code: 200,
                message: "Reason code is not found.",
                trace_id: traceId,
                reason_code: []
            });
        }

        reply.status(200).send({
            status_code: 200,
            message: "Reason codes retrieved successfully.",
            trace_id: traceId,
            reason_code: reasonCodes
        });

    } catch (error: any) {
        reply.status(500).send({
            status_code: 500,
            message: "Internal Server Error.",
            trace_id: traceId,
            error: error.message
        });
    }
};

export async function advancedFilterReasoncode(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    const { program_id } = request.params as { program_id: string };

    try {
        const {
            page = 1,
            limit = 10,
            module_name,
            reasons_count,
            event_name,
            updated_on,
        } = request.body as {
            page?: number;
            limit?: number;
            module_name?: string[];
            reasons_count?: number;
            event_name?: string;
            updated_on?: string[];
        };

        const pageNumber = Math.max(parseInt(String(page), 10) || 1, 1);
        const limitNumber = Math.max(parseInt(String(limit), 10) || 10, 1);
        const offset = (pageNumber - 1) * limitNumber;

        const whereClause: any = {
            is_deleted: false,
        };
        if (module_name) {
            if (Array.isArray(module_name)) {
                whereClause[Op.or] = module_name.map((name: string) => ({
                    '$module.name$': { [Op.like]: `%${name}%` },
                }));
            } else {
                whereClause['$module.name$'] = { [Op.like]: `%${module_name}%` };
            }
        }
        if (event_name) {
            whereClause['$supporting_text_event.name$'] = { [Op.like]: `%${event_name}%` };
        }

        if (reasons_count !== undefined) {
            whereClause.reasons_count = reasons_count;
        }
        if (Array.isArray(updated_on) && updated_on.length === 2) {
            const [startTimestamp, endTimestamp] = updated_on.map(ts => parseInt(ts, 10));
            whereClause.updated_on = { [Op.between]: [startTimestamp, endTimestamp] };
        }

        const { count: totalRecords, rows: reasoncodes } = await ReasonCodeActionModel.findAndCountAll({
            where: whereClause,
            attributes: {
                exclude: [
                    'ref_id',
                    'updated_by',
                    'created_by',
                    'event_id',
                    'module_id',
                    'created_on',
                    'is_deleted',
                    'reason_code_limit',
                    'slug',
                ],
            },
            include: [
                {
                    model: Event,
                    as: 'supporting_text_event',
                    attributes: ['id', 'name'],
                    required: false,
                },
                {
                    model: Module,
                    as: 'module',
                    attributes: ['id', 'name'],
                    required: false,
                },
            ],
            order: [
                [Sequelize.literal("CASE WHEN `module`.`name` IS NULL THEN 1 ELSE 0 END"), 'ASC'],
                [{ model: Module, as: 'module' }, 'name', 'ASC'],
                ['updated_on', 'DESC'],
            ],
            offset,
            limit: limitNumber,
            distinct: true,
        });

        const reasonCodeIds = reasoncodes.map(rc => rc.id);

        const usageCountMap = await updateReasonCounts(program_id, reasonCodeIds);

        const reasonCodesRecords = await ReasonCodeModel.findAll({
            where: {
                program_id: program_id,
                reason_code_id: { [Op.in]: reasonCodeIds }
            },
            attributes: ['reason_code_id', 'updated_on']
        });

        const reasonCodesUpdatedOnMap = reasonCodesRecords.reduce((acc, record) => {
            acc[record.reason_code_id] = record.updated_on;
            return acc;
        }, {} as Record<string, any>);

        const program = await Programs.findByPk(program_id, {
            attributes: ['created_on']
        });
        const programUpdatedOn = program?.created_on;

        const reasoncodesWithDetails = reasoncodes.map((reasoncode: any) => {
            const { supporting_text_event, module, ...reasoncodeData } = reasoncode.toJSON();
            
            const finalUpdatedOn = reasonCodesUpdatedOnMap[reasoncodeData.id] || programUpdatedOn;
            
            return {
                ...reasoncodeData,
                updated_on: finalUpdatedOn,
                reasons_count: usageCountMap[reasoncodeData.id] || 0,
                module_name: module?.name,
                module_id: module?.id,
                event_name: supporting_text_event?.name,
                event_id: supporting_text_event?.id,
                reason_codes: null,
            };
        });

        reply.status(200).send({
            status_code: 200,
            message: reasoncodesWithDetails.length
                ? 'Reasoncode retrieved successfully'
                : 'Reasoncode not found',
            items_per_page: limitNumber,
            total_records: totalRecords,
            reason_code_action: reasoncodesWithDetails,
            trace_id: traceId,
        });
    } catch (error: any) {
        reply.status(500).send({
            status_code: 500,
            message: 'Internal server error',
            trace_id: traceId,
            error: error.message,
        });
    }
}

async function updateReasonCounts(program_id: string, reasonCodeActionIds: string[]) {
    const usageCounts = await ReasonCodeModel.findAll({
        where: {
            reason_code_id: {
                [Op.in]: reasonCodeActionIds,
            },
            program_id: {
                [Op.or]: [program_id, null],
            },
        },
        attributes: [
            'reason_code_id',
            'program_id',
            [Sequelize.fn('COUNT', Sequelize.col('reason_code_id')), 'usage_count'],
        ],
        group: ['reason_code_id', 'program_id'],
        raw: true,
    });
    const groupedCounts: Record<string, { program?: number; predefined?: number }> = {};
    reasonCodeActionIds.forEach(id => {
        groupedCounts[id] = {};
    });
    usageCounts.forEach(({ reason_code_id, program_id: recordProgramId, usage_count }) => {
        const count = parseInt(usage_count || '0', 10);
        if (recordProgramId === program_id) {
            groupedCounts[reason_code_id].program = count;
        } else if (recordProgramId === null) {
            groupedCounts[reason_code_id].predefined = count;
        }
    });
    const usageMap: Record<string, number> = {};
    for (const reason_code_id in groupedCounts) {
        const { program, predefined } = groupedCounts[reason_code_id];
        if (program !== undefined) {
            usageMap[reason_code_id] = program;
        } else if (predefined !== undefined) {
            usageMap[reason_code_id] = predefined;
        } else {
            usageMap[reason_code_id] = 0;
        }
    }
    await Promise.all(
        Object.entries(usageMap).map(([reason_code_id, totalCount]) =>
            ReasonCodeActionModel.update(
                { reasons_count: totalCount },
                { where: { id: reason_code_id } }
            )
        )
    );
    return usageMap;
}