import { FastifyRequest, FastifyReply } from 'fastify';
import RateGuidanceMaster from '../models/rate-guidance-master.model';
import { RateGuidanceData } from '../interfaces/rate-guidance-master.interface';
import generateCustomUUID from '../utility/genrateTraceId';
import { decodeToken } from '../middlewares/verifyToken';
import { Op } from 'sequelize';
import { sequelize } from '../config/instance';
import { logger } from '../utility/loggerService';

export const createRateGuidance = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();

    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Token not found' });
    }

    const token = authHeader.split(' ')[1];
    let user: any = await decodeToken(token);
    if (!user) {
        return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Invalid token' });
    }

    const userId = user?.sub;

    const transaction = await sequelize.transaction();

    try {
        const rateGuidanceData = {
            ...request.body as RateGuidanceData,
            created_by: userId,
            updated_by: userId,
        };

        const newRateGuidance = await (RateGuidanceMaster as any).create(rateGuidanceData, { transaction });

        await transaction.commit();

        logger({
            trace_id: traceId,
            actor: { user_name: user?.preferred_username, user_id: userId },
            data: { rate_guidance_id: newRateGuidance.id },
            eventname: "create rate guidance",
            status: "success",
            description: 'Successfully created rate guidance',
            level: 'info',
            action: request.method,
            url: request.url,
            entity_id: newRateGuidance.id,
            is_deleted: false
        }, RateGuidanceMaster as any);

        reply.status(201).send({
            status_code: 201,
            message: 'Rate guidance created successfully',
            rate_guidance_id: newRateGuidance.id,
            trace_id: traceId
        });
    } catch (error: any) {
        await transaction.rollback();

        logger({
            trace_id: traceId,
            actor: { user_name: user?.preferred_username, user_id: userId },
            data: { error: error.message },
            eventname: "create rate guidance",
            status: "error",
            description: 'Error creating rate guidance',
            level: 'error',
            action: request.method,
            url: request.url,
            entity_id: 'error',
            is_deleted: false
        }, RateGuidanceMaster as any);

        reply.status(500).send({
            status_code: 500,
            message: 'Error creating rate guidance',
            error: error.message,
            trace_id: traceId
        });
    }
};

export const updateRateGuidance = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();
    const { id } = request.params as { id: string };

    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Token not found' });
    }

    const token = authHeader.split(' ')[1];
    let user: any = await decodeToken(token);
    if (!user) {
        return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Invalid token' });
    }

    const userId = user?.sub;

    const transaction = await sequelize.transaction();

    try {
        const rateGuidance = await (RateGuidanceMaster as any).findOne({
            where: { id, is_deleted: false },
            transaction
        });

        if (!rateGuidance) {
            await transaction.rollback();
            return reply.status(404).send({
                status_code: 404,
                message: 'Rate guidance not found',
                trace_id: traceId
            });
        }

        const updateData = {
            ...request.body as RateGuidanceData,
            updated_by: userId,
            updated_on: new Date()
        };

        await rateGuidance.update(updateData, { transaction });

        await transaction.commit();

        logger({
            trace_id: traceId,
            actor: { user_name: user?.preferred_username, user_id: userId },
            data: { id, ...updateData },
            eventname: "update rate guidance",
            status: "success",
            description: `Successfully updated rate guidance ${id}`,
            level: 'info',
            action: request.method,
            url: request.url,
            entity_id: id,
            is_deleted: false
        }, RateGuidanceMaster as any);

        reply.status(200).send({
            status_code: 200,
            message: 'Rate guidance updated successfully',
            rate_guidance_id: id,
            trace_id: traceId
        });
    } catch (error: any) {
        await transaction.rollback();

        logger({
            trace_id: traceId,
            actor: { user_name: user?.preferred_username, user_id: userId },
            data: { id, error: error.message },
            eventname: "update rate guidance",
            status: "error",
            description: `Error updating rate guidance ${id}`,
            level: 'error',
            action: request.method,
            url: request.url,
            entity_id: id,
            is_deleted: false
        }, RateGuidanceMaster as any);

        reply.status(500).send({
            status_code: 500,
            message: 'Error updating rate guidance',
            error: error.message,
            trace_id: traceId
        });
    }
};

export const deleteRateGuidance = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();
    const { id } = request.params as { id: string };


    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Token not found' });
    }

    const token = authHeader.split(' ')[1];
    let user: any = await decodeToken(token);
    if (!user) {
        return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Invalid token' });
    }

    const userId = user?.sub;

    try {
        const rateGuidance = await RateGuidanceMaster.findOne({
            where: { id, is_deleted: false }
        });

        if (!rateGuidance) {
            return reply.status(404).send({
                status_code: 404,
                message: 'Rate guidance not found',
                trace_id: traceId
            });
        }

        await rateGuidance.update({
            is_deleted: true,
            is_enabled: false
        });

        reply.status(200).send({
            status_code: 200,
            message: 'Rate guidance deleted successfully',
            rate_guidance_id: id,
            trace_id: traceId
        });
    } catch (error: any) {
        logger({
            trace_id: traceId,
            actor: { user_name: user?.preferred_username, user_id: userId },
            data: { id, error: error.message },
            eventname: "delete rate guidance",
            status: "error",
            description: `Error deleting rate guidance ${id}`,
            level: 'error',
            action: request.method,
            url: request.url,
            entity_id: id,
            is_deleted: false
        }, RateGuidanceMaster);
        reply.status(500).send({
            status_code: 500,
            message: 'Error deleting rate guidance',
            error: error.message,
            trace_id: traceId
        });
    }
};

export const getRateGuidanceById = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();
    const { id } = request.params as { id: string };

    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Token not found' });
    }

    const token = authHeader.split(' ')[1];
    let user: any = await decodeToken(token);
    if (!user) {
        return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Invalid token' });
    }

    const userId = user?.sub;

    try {
        const rateGuidance = await (RateGuidanceMaster as any).findOne({
            where: { id, is_deleted: false }
        });

        if (!rateGuidance) {
            return reply.status(404).send({
                status_code: 404,
                message: 'Rate guidance not found',
                trace_id: traceId
            });
        }

        reply.status(200).send({
            status_code: 200,
            rate_guidance: rateGuidance,
            trace_id: traceId
        });
    } catch (error: any) {
        logger({
            trace_id: traceId,
            actor: { user_name: user?.preferred_username, user_id: userId },
            data: { id, error: error.message },
            eventname: "get rate guidance by id",
            status: "error",
            description: `Error retrieving rate guidance ${id}`,
            level: 'error',
            action: request.method,
            url: request.url,
            entity_id: id,
            is_deleted: false
        }, RateGuidanceMaster as any);
        reply.status(500).send({
            status_code: 500,
            message: 'Error retrieving rate guidance',
            error: error.message,
            trace_id: traceId
        });
    }
};

export const getAllRateGuidance = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();
    const { page = 1, limit = 10, search, is_enabled } = request.query as { page: number; limit: number; search?: string; is_enabled?: boolean };

    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Token not found' });
    }

    const token = authHeader.split(' ')[1];
    let user: any = await decodeToken(token);
    if (!user) {
        return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Invalid token' });
    }

    const userId = user?.sub;

    try {
        const offset = (page - 1) * limit;
        const whereClause: any = {
            is_deleted: false,
        };

        if (is_enabled !== undefined) {
            whereClause.is_enabled = is_enabled;
        }

        if (search) {
            whereClause[Op.or] = [
                { industry: { [Op.like]: `%${search}%` } },
                { profession: { [Op.like]: `%${search}%` } },
                { specialty: { [Op.like]: `%${search}%` } },
                { state: { [Op.like]: `%${search}%` } }
            ];
        }

        const { count, rows } = await (RateGuidanceMaster as any).findAndCountAll({
            where: whereClause,
            limit,
            offset,
            order: [['created_on', 'DESC']]
        });

        reply.status(200).send({
            status_code: 200,
            total: count,
            page,
            limit,
            rate_guidance: rows,
            trace_id: traceId
        });
    } catch (error: any) {
        logger({
            trace_id: traceId,
            actor: { user_name: user?.preferred_username, user_id: userId },
            data: { error: error.message },
            eventname: "get all rate guidance",
            status: "error",
            description: `Error retrieving rate guidance data`,
            level: 'error',
            action: request.method,
            url: request.url,
            entity_id: 'all',
            is_deleted: false
        }, RateGuidanceMaster as any);
        reply.status(500).send({
            status_code: 500,
            message: 'Error retrieving rate guidance data',
            error: error.message,
            trace_id: traceId
        });
    }
};

export const advancedSearchRateGuidance = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();
    const {
        industry = '',
        profession = '',
        specialty = '', // can be string or array
        state = '',
        regular_bill_rate_min,
        regular_bill_rate_max,
        is_enabled,
        page = 1,
        limit = 10
    } = request.body as any;

    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Token not found' });
    }

    const token = authHeader.split(' ')[1];
    let user: any = await decodeToken(token);
    if (!user) {
        return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Invalid token' });
    }

    const userId = user?.sub;

    try {
        const offset = (page - 1) * limit;
        const whereClause: any = {
            is_deleted: false,
        };

        if (industry) whereClause.industry = { [Op.like]: `%${industry}%` };
        if (profession) whereClause.profession = { [Op.like]: `%${profession}%` };
        // Updated specialty filter to support array or string
        if (specialty && Array.isArray(specialty) && specialty.length > 0) {
            whereClause.specialty = { [Op.in]: specialty };
        } else if (typeof specialty === 'string' && specialty) {
            whereClause.specialty = { [Op.in]: [specialty] };
        }
        if (state) whereClause.state = { [Op.like]: `%${state}%` };
        if (is_enabled !== undefined) whereClause.is_enabled = is_enabled;
        if (regular_bill_rate_min !== undefined || regular_bill_rate_max !== undefined) {
            whereClause.regular_bill_rate = {};
            if (regular_bill_rate_min !== undefined) whereClause.regular_bill_rate[Op.gte] = regular_bill_rate_min;
            if (regular_bill_rate_max !== undefined) whereClause.regular_bill_rate[Op.lte] = regular_bill_rate_max;
        }

        const { rows } = await RateGuidanceMaster.findAndCountAll({
            where: whereClause,
            // limit,
            // offset,
            order: [['created_on', 'DESC']]
        });

        if (rows.length === 0) {
            return reply.status(200).send({
                status_code: 200,
                message: 'No rate guidance data found',
                rate_analysis: {
                    min_rate: 0,
                    max_rate: 0,
                    average_rate: 0
                },
                trace_id: traceId
            });
        }
        const rates: number[] = rows.map((row) => Number(row.regular_bill_rate));
        const minRate = Math.min(...rates);
        const maxRate = Math.max(...rates);
        const averageRate = Number((rates.reduce((a: number, b: number) => Number(a) + Number(b), 0) / rates.length).toFixed(2));

        reply.status(200).send({
            status_code: 200,
            message: 'Rate guidance analysis completed successfully',
            rate_analysis: {
                min_rate: minRate || 0,
                max_rate: maxRate || 0,
                average_rate: averageRate || 0
            },
            trace_id: traceId
        });
    } catch (error: any) {
        logger({
            trace_id: traceId,
            actor: { user_name: user?.preferred_username, user_id: userId },
            data: { error: error.message },
            eventname: "advanced search rate guidance",
            status: "error",
            description: `Error in advanced search for rate guidance`,
            level: 'error',
            action: request.method,
            url: request.url,
            entity_id: 'all',
            is_deleted: false
        }, RateGuidanceMaster as any);
        reply.status(500).send({
            status_code: 500,
            message: 'Error in advanced search',
            error: error.message,
            trace_id: traceId
        });
    }
};

export const bulkUploadRateGuidance = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();
    const records = request.body as Array<{
        industry: string;
        profession: string;
        specialty: string;
        state: string;
        regular_bill_rate: number;
    }>;

    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Token not found' });
    }

    const token = authHeader.split(' ')[1];
    let user: any = await decodeToken(token);
    if (!user) {
        return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Invalid token' });
    }

    const userId = user?.sub;

    logger({
        trace_id: traceId,
        actor: { user_name: user?.preferred_username, user_id: userId },
        data: { count: records.length },
        eventname: "bulk upload rate guidance",
        status: "in_progress",
        description: `Starting bulk upload of ${records.length} rate guidance records`,
        level: 'info',
        action: request.method,
        url: request.url,
        entity_id: 'all',
        is_deleted: false
    }, RateGuidanceMaster as any);

    const transaction = await sequelize.transaction();

    try {
        // Validate and transform records
        const rateGuidanceRecords = records.map(record => ({
            industry: record.industry,
            profession: record.profession,
            specialty: record.specialty,
            state: record.state,
            regular_bill_rate: parseFloat(`${record.regular_bill_rate}`),
            created_by: userId,
            updated_by: userId
        }));

        // Bulk create records with transaction
        await (RateGuidanceMaster as any).bulkCreate(rateGuidanceRecords, { transaction });

        await transaction.commit();

        logger({
            trace_id: traceId,
            actor: { user_name: user?.preferred_username, user_id: userId },
            data: { count: rateGuidanceRecords.length },
            eventname: "bulk upload rate guidance",
            status: "success",
            description: `Successfully uploaded ${rateGuidanceRecords.length} rate guidance records`,
            level: 'info',
            action: request.method,
            url: request.url,
            entity_id: 'all',
            is_deleted: false
        }, RateGuidanceMaster as any);

        reply.status(201).send({
            status_code: 201,
            message: `Successfully uploaded ${rateGuidanceRecords.length} rate guidance records`,
            trace_id: traceId
        });
    } catch (error: any) {
        await transaction.rollback();

        logger({
            trace_id: traceId,
            actor: { user_name: user?.preferred_username, user_id: userId },
            data: { error: error.message },
            eventname: "bulk upload rate guidance",
            status: "error",
            description: `Error processing bulk upload`,
            level: 'error',
            action: request.method,
            url: request.url,
            entity_id: 'all',
            is_deleted: false
        }, RateGuidanceMaster as any);

        reply.status(500).send({
            status_code: 500,
            message: 'Error processing bulk upload',
            error: error.message,
            trace_id: traceId
        });
    }
};

export const getUniqueProfessions = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();
    const { professions: professionsParam, specialties: specialtiesParam } = request.query as { professions?: string, specialties?: string };

    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Token not found' });
    }

    const token = authHeader.split(' ')[1];
    let user: any = await decodeToken(token);
    if (!user) {
        return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Invalid token' });
    }

    const userId = user?.sub;

    try {
        // If no professions param, return all unique professions as before
        if (!professionsParam) {
            const uniqueProfessions = await RateGuidanceMaster.findAll({
                attributes: [
                    [sequelize.fn('DISTINCT', sequelize.col('profession')), 'profession']
                ],
                where: {
                    is_deleted: false
                },
                raw: true
            });

            const professions = uniqueProfessions.map((item: { profession: string }) => item.profession);

            logger({
                trace_id: traceId,
                actor: { user_name: user?.preferred_username, user_id: userId },
                data: { count: professions.length },
                eventname: "get unique professions",
                status: "success",
                description: `Successfully retrieved ${professions.length} unique professions`,
                level: 'info',
                action: request.method,
                url: request.url,
                entity_id: 'all',
                is_deleted: false
            }, RateGuidanceMaster as any);

            return reply.status(200).send({
                status_code: 200,
                message: 'Unique professions retrieved successfully',
                professions,
                trace_id: traceId
            });
        }

        // Split the professions parameter into an array
        const requestedProfessions = professionsParam.split(',').map(p => p.trim());

        if (specialtiesParam) {
            const requestedSpecialties = specialtiesParam.split(',').map(s => s.trim());
            const rows = await RateGuidanceMaster.findAll({
                attributes: ['profession', 'specialty', 'state'],
                where: {
                    profession: { [Op.in]: requestedProfessions },
                    specialty: { [Op.in]: requestedSpecialties },
                    is_deleted: false
                },
                raw: true
            });
            const result: { [profession: string]: { [specialty: string]: string[] } } = {};
            for (const { profession, specialty, state } of rows) {
                if (!result[profession]) result[profession] = {};
                if (!result[profession][specialty]) result[profession][specialty] = [];
                if (!result[profession][specialty].includes(state)) result[profession][specialty].push(state);
            }
            return reply.status(200).send({
                status_code: 200,
                message: 'Unique states by profession and specialty retrieved successfully',
                professions: result,
                trace_id: traceId
            });
        }

        const rows = await RateGuidanceMaster.findAll({
            attributes: ['profession', 'specialty'],
            where: {
                profession: { [Op.in]: requestedProfessions },
                is_deleted: false
            },
            raw: true
        });

        const result: { [key: string]: string[] } = {};
        const specialtySets: { [key: string]: Set<string> } = {};
        for (const { profession, specialty } of rows) {
            if (!specialtySets[profession]) specialtySets[profession] = new Set();
            specialtySets[profession].add(specialty);
        }
        for (const profession in specialtySets) {
            result[profession] = Array.from(specialtySets[profession]);
        }

        logger({
            trace_id: traceId,
            actor: { user_name: user?.preferred_username, user_id: userId },
            data: { professions: requestedProfessions, specialties_count: Object.keys(result).length },
            eventname: "get unique specialties by professions",
            status: "success",
            description: `Successfully retrieved unique specialties for ${requestedProfessions.length} professions`,
            level: 'info',
            action: request.method,
            url: request.url,
            entity_id: 'all',
            is_deleted: false
        }, RateGuidanceMaster as any);

        reply.status(200).send({
            status_code: 200,
            message: 'Unique specialties by profession retrieved successfully',
            professions: result,
            trace_id: traceId
        });
    } catch (error: any) {
        logger({
            trace_id: traceId,
            actor: { user_name: user?.preferred_username, user_id: userId },
            data: { error: error.message },
            eventname: "get unique professions",
            status: "error",
            description: 'Error retrieving unique professions/specialties/states',
            level: 'error',
            action: request.method,
            url: request.url,
            entity_id: 'error',
            is_deleted: false
        }, RateGuidanceMaster as any);

        reply.status(500).send({
            status_code: 500,
            message: 'Error retrieving unique professions/specialties/states',
            error: error.message,
            trace_id: traceId
        });
    }
};
