import { FastifyRequest, FastifyReply } from 'fastify';
import supportingTextModel from '../models/supporting-text.model';
import generateCustomUUID from '../utility/genrateTraceId';
import { supportingTextAttributes } from '../interfaces/supporting-text.interface';
import Event from '../models/event.model';
import { Module } from '../models/module.model';
import { Op } from 'sequelize';
import { logger } from '../utility/loggerService';
import { decodeToken } from '../middlewares/verifyToken';

export const getAllSupportingTexts = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();
    try {
        const { program_id, page = 1, limit = 10 } = request.params as { program_id: string; page: number; limit: number };
        const { performed_by, event_slug, date_range, event_name, module_name } = request.query as { performed_by: string; event_slug: string; date_range: string; event_name: string; module_name: string };

        const whereConditions: any = { program_id, is_deleted: false };

        if (performed_by) {
            whereConditions.performed_by = performed_by;
        }

        if (date_range) {
            const [startDate, endDate] = date_range.split(',').map(ts => parseInt(ts, 10));
            whereConditions[Op.or] = [
                {
                    created_on: {
                        [Op.between]: [new Date(startDate), new Date(endDate)],
                    },
                },
                {
                    updated_on: {
                        [Op.between]: [new Date(startDate), new Date(endDate)],
                    },
                },
            ];
        }

        const includeConditions: any[] = [
            {
                model: Event,
                as: 'event',
                attributes: ['id', 'name', 'slug'],
                where: {
                    ...(event_name ? { name: event_name } : {}),
                    ...(event_slug ? { slug: event_slug } : {})
                }
            },
            {
                model: Module,
                as: 'module',
                attributes: ['id', 'name'],
                where: module_name ? { name: module_name } : undefined,
            }
        ];

        const offset = (page - 1) * limit;

        const { rows: supportingText, count } = await supportingTextModel.findAndCountAll({
            where: whereConditions,
            include: includeConditions,
            limit,
            offset,
        });

        if (!supportingText || supportingText.length === 0) {
            return reply.status(200).send({
                status_code: 200,
                message: 'Supporting Text not found.',
                supportingText: [],
                trace_id: traceId
            });
        }

        const responseData = supportingText.map(text => ({
            id: text.id,
            performed_by: text.performed_by,
            is_enabled: text.is_enabled,
            is_deleted: text.is_deleted,
            created_on: text.created_on,
            event_id: {
                id: text.event?.id,
                name: text.event?.name,
                slug: text.event?.slug
            },
            module_id: {
                id: text.module?.id,
                name: text.module?.name
            },
            support_text_action: text.support_text_action
        }));

        reply.status(200).send({
            status_code: 200,
            message: 'Supporting Texts retrieved successfully.',
            total_records: count,
            total_pages: Math.ceil(count / limit),
            current_page: page,
            trace_id: traceId,
            support_text_data: responseData,
        });
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: 'Internal Server Error',
            trace_id: traceId
        });
    }
};


export const getSupportingText = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();
    try {
        const { id, program_id } = request.params as { id: string; program_id: string };
        const supportingText = await supportingTextModel.findOne({
            where: { id, program_id, is_deleted: false },
            include: [
                {
                    model: Event,
                    as: 'event',
                    attributes: ['id', 'name', 'slug'],
                },
                {
                    model: Module,
                    as: 'module',
                    attributes: ['id', 'name'],
                }
            ],
        });

        if (!supportingText) {
            return reply.status(200).send({
                status_code: 200,
                message: 'Supporting Text not found.',
                supportingText: [],
                trace_id: traceId
            });
        }

        const responseData = {
            id: supportingText.id,
            performed_by: supportingText.performed_by,
            is_enabled: supportingText.is_enabled,
            is_deleted: supportingText.is_deleted,
            created_on: supportingText.created_on,
            event_id: supportingText.event ? {
                id: supportingText.event.id,
                name: supportingText.event.name,
                slug: supportingText.event.slug
            } : null,
            module_id: supportingText.module ? {
                id: supportingText.module.id,
                name: supportingText.module.name
            } : null,
            support_text_action: supportingText.support_text_action
        };

        reply.status(200).send({
            status_code: 200,
            message: 'Supporting Text retrieved successfully.',
            support_text_data: responseData,
            trace_id: traceId,
        });
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: 'Internal Server Error',
            trace_id: traceId
        });
    }
};

export const createSupportingText = async (request: FastifyRequest, reply: FastifyReply) => {
    const data = request.body as supportingTextAttributes;
    const traceId = generateCustomUUID();
    const user=request?.user;
    const userId = user?.sub
    logger(
        {
            trace_id: traceId,
            actor: {
                user_name: user?.preferred_username,
                user_id: userId,
            },
            data: request.body,
            eventname: "creating supportingText",
            status: "success",
            description: `Creating supportingText for ${data.program_id}`,
            level: 'info',
            action: request.method,
            url: request.url,
            entity_id: data.program_id,
            is_deleted: false
        },
        supportingTextModel
    );
    try {

        if (!data.program_id) {
            return reply.status(400).send({
                status_code: 400,
                message: 'Program ID is required.',
                trace_id: traceId
            });
        }

        const newSupportingText = await supportingTextModel.create({
            ...data,
            created_by: userId,
            updated_by: userId
        });

        reply.status(201).send({
            status_code: 201,
            message: `Supporting text created successfully.`,
            support_text_data: newSupportingText.id,
            trace_id: traceId,
        });
        logger(
            {
                trace_id: traceId,
                actor: {
                    user_name: user?.preferred_username,
                    user_id: user?.sub,
                },
                data: request.body,
                eventname: "create supportingText",
                status: "success",
                description: `create supportingText for ${data.program_id} successfully.`,
                level: 'success',
                action: request.method,
                url: request.url,
                entity_id: data.program_id,
                is_deleted: false
            },
            supportingTextModel
        );
    } catch (error: any) {
        logger(
            {
                trace_id: traceId,
                actor: {
                    user_name: user?.preferred_username,
                    user_id: user?.sub,
                },
                data: request.body,
                eventname: "create supportingText",
                status: "failed",
                description: `Failed to create supportingText for ${data.program_id}`,
                level: 'error',
                action: request.method,
                url: request.url,
                entity_id: data.program_id,
                is_deleted: false
            },
            supportingTextModel
        )
        reply.status(500).send({
            status_code: 500,
            message: 'Internal Server Error',
            error: error.message || 'Unknown error',
            trace_id: traceId,
        });
    }
};

export const updateSupportingText = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();
    const { id } = request.params as { id: string };
    const {
        performed_by,
        is_enabled,
        is_deleted,
        created_on,
        updated_on,
        program_id,
        event_id,
        module_id,
        support_text_action,
    } = request.body as supportingTextModel;
   const user=request?.user;
    const userId = user?.sub;

    logger(
        {
            trace_id: traceId,
            actor: {
                user_name: user?.preferred_username,
                user_id: userId,
            },
            data: request.body,
            eventname: "updating supportingText",
            status: "info",
            description: `Updating supportingText for ID: ${id}`,
            level: 'info',
            action: request.method,
            url: request.url,
            entity_id: id,
            is_deleted: false,
        },
        supportingTextModel
    );

    try {
        const supportingText = await supportingTextModel.findByPk(id);

        if (!supportingText) {
            logger(
                {
                    trace_id: traceId,
                    actor: {
                        user_name: user?.preferred_username,
                        user_id: userId,
                    },
                    data: request.body,
                    eventname: "update supportingText",
                    status: "failed",
                    description: `SupportingText with ID: ${id} not found.`,
                    level: 'warning',
                    action: request.method,
                    url: request.url,
                    entity_id: id,
                    is_deleted: false,
                },
                supportingTextModel
            );
            return reply.status(200).send({ status_code: 200, message: 'Supporting Text not found.', trace_id: traceId });
        }

        await supportingText.update({
            updated_by: userId,
            performed_by: performed_by ?? supportingText.performed_by,
            is_enabled: typeof is_enabled === 'boolean' ? is_enabled : supportingText.is_enabled,
            is_deleted: typeof is_deleted === 'boolean' ? is_deleted : supportingText.is_deleted,
            created_on: created_on ?? supportingText.created_on,
            updated_on: updated_on ?? supportingText.updated_on,
            program_id: program_id ?? supportingText.program_id,
            event_id: event_id ?? supportingText.event_id,
            module_id: module_id ?? supportingText.module_id,
            support_text_action: support_text_action ?? supportingText.support_text_action,
        });

        logger(
            {
                trace_id: traceId,
                actor: {
                    user_name: user?.preferred_username,
                    user_id: userId,
                },
                data: request.body,
                eventname: "update supportingText",
                status: "success",
                description: `Updated supportingText with ID: ${id} successfully.`,
                level: 'success',
                action: request.method,
                url: request.url,
                entity_id: id,
                is_deleted: false,
            },
            supportingTextModel
        );

        reply.send({
            status_code: 200,
            message: 'Supporting Text updated successfully.',
            support_text_data: supportingText,
            trace_id: traceId,
        });
    } catch (error: any) {
        logger(
            {
                trace_id: traceId,
                actor: {
                    user_name: user?.preferred_username,
                    user_id: userId,
                },
                data: request.body,
                eventname: "update supportingText",
                status: "failed",
                description: `Failed to update supportingText with ID: ${id}. Error: ${error.message}`,
                level: 'error',
                action: request.method,
                url: request.url,
                entity_id: id,
                is_deleted: false,
            },
            supportingTextModel
        );

        reply.status(500).send({
            status_code: 500,
            message: 'Internal Server Error',
            error: error.message || 'Unknown error',
            trace_id: traceId,
        });
    }
};


export const deleteSupportingText = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();
    try {
        const { program_id, id } = request.params as { program_id: string, id: string }
        const supportingText = await supportingTextModel.findAll({
            where: { program_id, id, is_deleted: false }
        });

        if (!supportingText) {
            return reply.status(200).send({ status_code: 200, message: 'Supporting Text not found', trace_id: traceId });
        }

        const [updated] = await supportingTextModel.update(
            { is_deleted: true, is_enabled: false },
            { where: { program_id, id } }
        );

        if (updated) {
            reply.send({
                status_code: 200,
                message: 'Supporting Text deleted successfully.',
                data: updated,
                trace_id: traceId,
            });
        } else {
            reply.status(200).send({ status_code: 200, message: 'Supporting Text not Updated.', trace_id: traceId });
        }
    } catch (error) {
        reply.status(500).send({ status_code: 500, message: 'Internal Server Error', trace_id: traceId });
    }
};

export const getAllSupportingTextsAdvancedFilter = async (
    request: FastifyRequest,
    reply: FastifyReply
) => {
    const traceId = generateCustomUUID();
    try {
        const { program_id } = request.params as { program_id: string };
        const {
            performed_by,
            event_slug,
            updated_on,
            event_id,
            module_id,
            pagination = { page: 1, limit: 10 },
        } = request.body as { performed_by: string; event_slug: string; updated_on: string[]; event_id: string; module_id: string; pagination: { page: number; limit: number } };
        const { page = 1, limit = 10 } = pagination;

        const whereConditions: any = { program_id, is_deleted: false };

        if (performed_by) {
            whereConditions.performed_by = performed_by;
        }
        if (Array.isArray(updated_on) && updated_on.length === 2) {
            const [startTimestamp, endTimestamp] = updated_on.map(ts => parseInt(ts, 10));
            whereConditions.updated_on = { [Op.between]: [startTimestamp, endTimestamp] };
        }

        const includeConditions: any[] = [
            {
                model: Event,
                as: 'event',
                attributes: ['id', 'name', 'slug'],
                where: {
                    ...(event_id ? { id: event_id } : {}),
                    ...(event_slug ? { slug: event_slug } : {}),
                },
            },
            {
                model: Module,
                as: 'module',
                attributes: ['id', 'name'],
                where: module_id ? { id: module_id } : undefined,
            },
        ];

        const offset = (page - 1) * limit;

        const { rows: supportingText, count } = await supportingTextModel.findAndCountAll({
            where: whereConditions,
            include: includeConditions,
            limit,
            offset,
        });

        if (!supportingText || supportingText.length === 0) {
            return reply.status(200).send({
                status_code: 200,
                message: 'Supporting Text not found.',
                supportingText: [],
                trace_id: traceId,
            });
        }

        const responseData = supportingText.map((text) => ({
            id: text.id,
            performed_by: text.performed_by,
            is_enabled: text.is_enabled,
            is_deleted: text.is_deleted,
            created_on: text.created_on,
            updated_on: text.updated_on,
            event_id: {
                id: text.event?.id,
                name: text.event?.name,
                slug: text.event?.slug,
            },
            module_id: {
                id: text.module?.id,
                name: text.module?.name,
            },
            support_text_action: text.support_text_action,
        }));

        reply.status(200).send({
            status_code: 200,
            message: 'Supporting Texts retrieved successfully.',
            total_records: count,
            total_pages: Math.ceil(count / limit),
            current_page: page,
            trace_id: traceId,
            support_text_data: responseData,
        });
    } catch (error: any) {
        console.error(`Error fetching supporting texts: ${error.message}`, { traceId, error });

        reply.status(500).send({
            status_code: 500,
            message: 'Internal Server Error',
            trace_id: traceId,
            error: error.message,
        });
    }
};
