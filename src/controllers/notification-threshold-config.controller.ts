import { FastifyRequest, FastifyReply } from 'fastify';
import thresholdConfig from '../models/notification-threshold-config.model';
import { decodeToken } from '../middlewares/verifyToken';
import generateCustomUUID from '../utility/genrateTraceId';
import { ProgramThresholdInput } from '../interfaces/notification-threshold.interface';
import { sequelize } from '../config/instance';
import NotificationThresholdConfigModel from '../models/notification-threshold-config.model';
import { createThresholdRecords, validateThresholdInput } from '../service/notification-threshold.service';

export const createThreshold = async (
    request: FastifyRequest<{ Params: { program_id: string } }>,
    reply: FastifyReply
) => {
    const traceId = generateCustomUUID();
    const transaction = await sequelize.transaction();

    try {
        const { program_id } = request.params;
        const authHeader = request.headers.authorization;

        if (!authHeader?.startsWith('Bearer ')) {
            return reply.status(401).send({
                status_code: 401,
                message: 'Unauthorized - Token not found',
            });
        }

        const token = authHeader.split(' ')[1];
        const user: any = await decodeToken(token);

        if (!user) {
            return reply.status(401).send({
                status_code: 401,
                message: 'Unauthorized - Invalid token',
            });
        }

        const body = request.body as ProgramThresholdInput[];

        const existingThreshold = await thresholdConfig.findOne({ where: { program_id } });
        if (existingThreshold) {
            return reply.status(400).send({
                status_code: 400,
                trace_id: traceId,
                message: `A record with program_id ${program_id} already exists.`,
            });
        }

        const validationResult = validateThresholdInput(body, traceId);
        if (!validationResult.valid) {
            await transaction.rollback();
            return reply.status(400).send({
                status_code: 400,
                trace_id: traceId,
                message: validationResult.message,
            });
        }

        // Create threshold records
        const createdIds = await createThresholdRecords(
            body,
            program_id,
            user?.sub,
            Date.now(),
            transaction
        );

        await transaction.commit();

        return reply.status(201).send({
            status_code: 201,
            trace_id: traceId,
            created_ids: createdIds,
            message: 'Threshold configurations created successfully',
        });
    } catch (error: any) {
        console.error('Threshold creation failed:', error);
        await transaction.rollback();
        return reply.status(500).send({
            status_code: 500,
            trace_id: traceId,
            message: 'Internal server error',
        });
    }
};

export const getAllThresholds = async (
    request: FastifyRequest<{ Params: { program_id: string } }>,
    reply: FastifyReply
) => {
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

    try {
        const { program_id } = request.params;
        const data = await thresholdConfig.findAll({
            where: {
                is_deleted: false,
                program_id,
            },
        });

        if (data.length === 0) {
            return reply.status(200).send({
                status_code: 200,
                trace_id: traceId,
                data: [],
            });
        }

        reply.send({
            status_code: 200,
            message: 'Fetched successfully',
            trace_id: traceId,
            data,
        });
    } catch (error: any) {
        reply.status(500).send({
            status_code: 500,
            message: 'Error fetching data',
            trace_id: traceId
        });
    }
};


export const getThresholdById = async (
    request: FastifyRequest<{ Params: { id: string, program_id: string } }>,
    reply: FastifyReply
) => {
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

    try {

        const { id, program_id } = request.params;
        const record = await thresholdConfig.findOne({
            where: {
                id: id,
                program_id: program_id,
                is_deleted: false,
            }
        });

        if (!record) {
            return reply.status(404).send({
                status_code: 404,
                message: 'Threshold not found or it may be deleted',
                trace_id: traceId,
            });
        }

        reply.send({
            status_code: 200,
            message: 'Fetched successfully',
            trace_id: traceId,
            data: record,
        });
    } catch (error: any) {
        console.error('Error fetching threshold:', error);
        reply.status(500).send({
            status_code: 500,
            message: 'Error fetching threshold',
            trace_id: traceId
        });
    }
};

export const updateThreshold = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();
    const transaction = await sequelize.transaction();

    try {
        const authHeader = request.headers.authorization;

        if (!authHeader?.startsWith('Bearer ')) {
            return reply.status(401).send({
                status_code: 401,
                message: 'Unauthorized - Token not found',
            });
        }

        const token = authHeader.split(' ')[1];
        const user: any = await decodeToken(token);

        if (!user) {
            return reply.status(401).send({
                status_code: 401,
                message: 'Unauthorized - Invalid token',
            });
        }

        const body = request.body as Array<{ module: string; config: any }>;
        const { program_id } = request.params as { program_id: string };

        if (!Array.isArray(body)) {
            return reply.status(400).send({ message: 'Invalid request body format. Expected an array.', trace_id: traceId, });
        }

        const existingConfig = await NotificationThresholdConfigModel.findOne({
            where: { program_id },
        });

        if (!existingConfig) {
            return reply.status(404).send({
                status_code: 404,
                message: 'Program ID not found in threshold configurations.',
                trace_id: traceId,
            });
        }

        await Promise.all(
            body.map((data) =>
                thresholdConfig.update(
                    { config: data.config },
                    {
                        where: {
                            program_id,
                            module: data.module,
                        },
                        transaction,
                    }
                )
            )
        );

        await transaction.commit();

        return reply.status(200).send({
            message: 'Thresholds updated successfully.',
            trace_id: traceId,
        });
    } catch (error) {
        await transaction.rollback();
        return reply.status(500).send({
            message: 'Internal Server Error',
            trace_id: traceId,
        });
    }
};


export const deleteThreshold = async (
    request: FastifyRequest<{ Params: { program_id: string, id: string } }>,
    reply: FastifyReply
) => {
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

    try {
        const { program_id, id } = request.params;

        const [updated] = await thresholdConfig.update(
            {
                is_deleted: true,
                updated_on: Date.now(),
                updated_by: user?.sub
            },
            {
                where: {
                    id: id,
                    program_id,
                    is_deleted: false,
                },
            }
        );

        if (!updated) {
            return reply.status(200).send({
                status_code: 200,
                message: 'Threshold not found or already deleted',
                trace_id: traceId,
            });
        }

        reply.send({
            status_code: 200,
            message: 'Threshold deleted successfully',
            trace_id: traceId,
        });
    } catch (error: any) {
        console.error('Error during delete operation:', error);
        reply.status(500).send({
            status_code: 500,
            message: 'Delete failed',
            trace_id: traceId
        });
    }
};

