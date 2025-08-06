import { FastifyRequest, FastifyReply } from "fastify";
import generateCustomUUID from '../utility/genrateTraceId';
import { baseSearch } from "../utility/baseService";
import ShiftTypeModel from "../models/shift-type.model";
import { ShiftTypeAttributes } from "../interfaces/shift-type.interface";
import { sequelize } from '../config/instance';
import { Op, QueryTypes } from 'sequelize';
import { getShiftTypesByHierarchiesQuery, shiftTypesQuery } from "../utility/queries";
import { decodeToken } from "../middlewares/verifyToken";
import logger from "../plugins/logger-plugin";
import RateConfigurationsRepository from '../repositories/rate-configurations.repository';

export async function getALLShiftType(request: FastifyRequest, reply: FastifyReply) {
    try {
        const query = request.query as Record<string, string>;
        const { program_id } = request.params as { program_id: string };
        const page = parseInt(query.page) || 1;
        const limit = parseInt(query.limit) || 10;
        const offset = (page - 1) * limit;
        const sortField = query.sortField || 'updated_on';
        const finalSortDirection = 'DESC';

        const whereClause: any = { is_deleted: false,program_id};


        if (query.shift_type_name) {
            whereClause.shift_type_name = {
                [Op.like]: `%${query.shift_type_name.trim()}%`
            };
        }

        if (query.is_enabled !== undefined) {
            whereClause.is_enabled = query.is_enabled === 'true' ? 1 : 0;
        }

        if (query.updated_on) {
            const dateRange = query.updated_on.split(',');
            if (dateRange.length === 2) {
                const startDate = parseFloat(dateRange[0].trim());
                const endDate = parseFloat(dateRange[1].trim());
                whereClause.updated_on = { [Op.between]: [startDate, endDate] };
            } else if (dateRange.length === 1) {
                const date = new Date(parseFloat(dateRange[0].trim()));
                const startOfDay = new Date(date);
                startOfDay.setHours(0, 0, 0, 0);
                const endOfDay = new Date(date);
                endOfDay.setHours(23, 59, 59, 999);
                whereClause.updated_on = {
                    [Op.between]: [startOfDay.getTime(), endOfDay.getTime()],
                };
            }
        }

        const responseFields = [
            'program_id',
            'id',
            'shift_type_name',
            'is_enabled',
            'shift_type_category',
            'updated_on',
            'shift_type_time',
            'time_duration',
            'shift_format'
        ];

        const { rows: results, count } = await ShiftTypeModel.findAndCountAll({
            where: whereClause,
            limit,
            offset,
            attributes: responseFields,
            order: [[sortField, finalSortDirection]]
        });

        return reply.status(200).send({
            status_code: 200,
            total_records: count,
            items: results
        });

    } catch (error) {
        console.error('Error in getALLShiftType:', error);
        return reply.status(500).send({
            status_code: 500,
            message: 'Internal Server Error'
        });
    }
}


export async function getShiftTypeById(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    try {
        const { id, program_id } = request.params as { id: string, program_id: string };
        const item = await ShiftTypeModel.findOne({
            where: {
                id,
                program_id,
                is_deleted: false,
            },
        });
        if (item) {
            reply.status(200).send({
                status_code: 200,
                message: 'Shift Type found successfully',
                trace_id: traceId,
                shiftType: item
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                trace_id: traceId,
                event: [],
                message: 'shiftType not found.',
            });
        }
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            trace_id: traceId,
            message: "Internal Server Error",
            error
        });
    }
}



export async function createShiftType(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    const traceId = generateCustomUUID();
    const shiftType = request.body as ShiftTypeAttributes;
    const user=request?.user;
    const userId = user?.sub
    try {
        logger.info({ traceId, shiftTypeName: shiftType.shift_type_name, programId: shiftType.program_id }, 'Checking for existing shift type');

        const existingShiftType = await ShiftTypeModel.findOne({
            where: { shift_type_name: shiftType.shift_type_name, program_id: shiftType.program_id },
        });

        if (existingShiftType) {
            logger.warn({ traceId, shiftTypeName: shiftType.shift_type_name }, 'Shift type already exists');
            return reply.status(400).send({
                status_code: 400,
                message: 'Shift type with the name already exists.',
                trace_id: traceId,
            });
        }

        logger.info({ traceId, createdBy: userId }, 'Creating new shift type');
        const state_data: any = await ShiftTypeModel.create({
            ...shiftType,
            created_by: userId,
            updated_by: userId,
        });

        logger.info({ traceId, shiftTypeId: state_data.id }, 'Shift type created successfully');

        return reply.status(201).send({
            status_code: 201,
            message: "Shift type created successfully",
            id: state_data.id,
            trace_id: traceId,
        });

    } catch (error: any) {
        logger.error({ traceId, error: error.message, stack: error.stack }, 'Error creating shift type');

        return reply.status(500).send({
            status_code: 500,
            message: 'Internal server error',
            trace_id: traceId,
            error: error.message
        });
    }
}

export async function updateShiftType(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    const { id, program_id } = request.params as { id: string, program_id: string };
    const shiftTypeData = request.body as ShiftTypeAttributes;

    logger.info({ traceId, id, program_id, shiftTypeData }, 'Received request to update shift type');
    const user=request?.user;
    const userId = user?.sub;

    try {
        logger.info({ traceId, id, program_id }, 'Checking if shift type exists');
        const shiftType = await ShiftTypeModel.findOne({
            where: {
                id,
                program_id,
                is_deleted: false,
            },
        });

        if (!shiftType) {
            logger.warn({ traceId, id, program_id }, 'Shift type not found');
            return reply.status(404).send({
                status_code: 404,
                trace_id: traceId,
                message: 'ShiftType not found.',
            });
        }

        logger.info({ traceId, shiftTypeName: shiftTypeData.shift_type_name }, 'Checking if shift type name already exists');
        const existingShiftTypeWithSameName = await ShiftTypeModel.findOne({
            where: {
                shift_type_name: sequelize.where(sequelize.fn('lower', sequelize.col('shift_type_name')), sequelize.fn('lower', shiftTypeData.shift_type_name)),
                id: { [Op.ne]: id },
                program_id,
                is_deleted: false,
            },
        });

        if (existingShiftTypeWithSameName) {
            logger.warn({ traceId, shiftTypeName: shiftTypeData.shift_type_name }, 'Shift type with same name already exists');
            return reply.status(400).send({
                status_code: 400,
                message: "Shift Type with the same name already exists.",
                trace_id: traceId,
            });
        }

        logger.info({ traceId, updatedBy: userId }, 'Updating shift type');
        await shiftType.update({ ...shiftTypeData, updated_by: userId });

        logger.info({ traceId, id }, 'Shift type updated successfully');
        return reply.status(200).send({
            status_code: 200,
            trace_id: traceId,
            message: 'ShiftType updated successfully.',
        });

    } catch (error: any) {
        logger.error({ traceId, error: error.message, stack: error.stack }, 'Error updating shift type');
        return reply.status(500).send({
            status_code: 500,
            trace_id: traceId,
            message: "Internal Server Error",
            error: error.message
        });
    }
}
export async function deleteShiftType(request: FastifyRequest, reply: FastifyReply) {
    const { id, program_id } = request.params as { id: string, program_id: string };
    const traceId = generateCustomUUID();
    const user = request.user;
    if (!user) {
        return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Invalid token' });
    }
    const userId = user?.user_id;
    try {
        const shiftType = await ShiftTypeModel.findOne({
            where: {
                id,
                program_id,
                is_deleted: false,
            },
        });
        if (shiftType) {
            await shiftType.update({ is_deleted: true, updated_by: userId });
            reply.status(200).send({
                status_code: 200,
                trace_id: traceId,
                message: 'ShiftType deleted successfully.',
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                trace_id: traceId,
                message: 'ShiftType not found.',
            });
        }
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            trace_id: traceId,
            message: "Internal Server Error",
            error
        });
    }
}

export async function getShiftTypesByHierarchies(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    try {
        const { hierarchy_ids, job_template_ids } = request.query as { hierarchy_ids: string; job_template_ids?: string; };
        const { program_id } = request.params as { program_id: string };

        if (!hierarchy_ids) {
            return reply.status(400).send({
                status_code: 400,
                message: "hierarchy_ids is required",
                trace_id: traceId
            });
        }

        const hierarchyIds = hierarchy_ids.split(',');
        const jobTemplateIds = job_template_ids?.split(',') || [];
        const is_shift_rate = true;

        let result: any[] = [];

        if (jobTemplateIds.length > 0) {
            result = await getShiftTypesByJobTemplates(program_id, is_shift_rate, hierarchyIds, jobTemplateIds);
        } else {
            result = await getShiftTypesByHierarchiesOnly(program_id, hierarchyIds);
        }

        return reply.status(200).send({
            status_code: 200,
            message: result.length > 0 ? "Shift types found" : "Shift types not found",
            trace_id: traceId,
            total_records: result.length,
            shift_types: result,
        });
    } catch (error: any) {
        return reply.status(500).send({
            status_code: 500,
            trace_id: traceId,
            message: "Internal Server Error",
            error: error.message
        });
    }
}

async function getShiftTypesByJobTemplates(
    program_id: string,
    is_shift_rate: boolean,
    hierarchyIds: string[],
    jobTemplateIds: string[]
): Promise<any[]> {
    const matchingRateConfigurations = await RateConfigurationsRepository.getRateConfigurationsByProgramId(
        program_id,
        is_shift_rate,
        hierarchyIds,
        jobTemplateIds,
        undefined
    );

    if (!matchingRateConfigurations.length) {
        return [];
    }

    const configIds = matchingRateConfigurations.map((c: { id: any }) => c.id);

    return await sequelize.query(shiftTypesQuery, {
        replacements: {
            program_id,
            configIds
        },
        type: QueryTypes.SELECT,
    });
}

async function getShiftTypesByHierarchiesOnly(
    program_id: string,
    hierarchyIds: string[]
): Promise<any[]> {
    return await sequelize.query(getShiftTypesByHierarchiesQuery, {
        replacements: {
            program_id,
            hierarchy_ids: hierarchyIds,
        },
        type: QueryTypes.SELECT,
    });
}

export async function getShiftCategories(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    try {
        const { program_id } = request.params as { program_id: string };
        const categories = await ShiftTypeModel.findAll({
            where: {
                program_id,
                is_deleted: false,
            },
            attributes: [[sequelize.fn('DISTINCT', sequelize.col('shift_type_category')), 'shift_type_category']]
        });

        if (categories) {
            const categoryValues = categories.map((category: any) => category.shift_type_category);
            reply.status(200).send({
                status_code: 200,
                message: 'Shift categories found successfully!',
                trace_id: traceId,
                shift_categories: categoryValues
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                trace_id: traceId,
                shift_categories: [],
                message: 'Shift categories not found.',
            });
        }
    } catch (error: any) {
        reply.status(500).send({
            status_code: 500,
            trace_id: traceId,
            message: "Internal Server Error",
            error: error.message
        });
    }
}

export const getShiftTypeFilter = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();
    const body = request.body as {
        program_id?: string;
        id?: string;
        shift_type_name?: string;
        is_enabled?: boolean;
        shift_type_category?: string;
        updated_on?: string;
        time_duration: string;
        page?: number;
        limit?: number;
    };

    const page = body.page ?? 1;
    const limit = body.limit ?? 10;

    const whereClause: any = {};

    if (body.program_id) whereClause.program_id = body.program_id;
    if (body.id) whereClause.id = body.id;
    if (body.time_duration) whereClause.time_duration = body.time_duration;
    if (body.shift_type_name) whereClause.shift_type_name = { [Op.like]: `%${body.shift_type_name}%` };
    if (body.is_enabled !== undefined) whereClause.is_enabled = body.is_enabled;
    if (body.shift_type_category) whereClause.shift_type_category = { [Op.like]: `%${body.shift_type_category}%` };
    if (Array.isArray(body.updated_on) && body.updated_on.length === 2) {
        const [startDate, endDate] = body.updated_on.map(date => new Date(date).getTime());

        if (!isNaN(startDate) && !isNaN(endDate)) {
            whereClause.updated_on = { [Op.between]: [startDate, endDate] };
        }
    }
    try {
        const { rows: shiftTypes, count } = await ShiftTypeModel.findAndCountAll({
            where: whereClause,
            attributes: [
                "program_id",
                "id",
                "shift_type_name",
                "is_enabled",
                "shift_type_category",
                "updated_on",
                "shift_type_time",
                "time_duration",
            ],
            order: [["updated_on", "DESC"]],
            offset: (page - 1) * limit,
            limit: limit,
        });

        return reply.status(200).send({
            status_code: 200,
            shift_types: shiftTypes,
            total_records: count,
            page: page,
            limit: limit,
            message: "Shift Types fetched successfully",
            trace_id: traceId,
        });
    } catch (error) {
        return reply.status(500).send({
            status_code: 500,
            message: "An error occurred while fetching shift types",
            error: error,
            trace_id: traceId,
        });
    }
}
