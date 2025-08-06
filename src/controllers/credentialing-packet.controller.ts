import { FastifyReply, FastifyRequest } from "fastify";
import CredentialingPacket from "../models/credentialing-packet.model";
import { decodeToken } from "../middlewares/verifyToken";
import generateCustomUUID from "../utility/genrateTraceId";
import { sequelize } from "../config/instance";
import CredentialingPacketInterface from "../interfaces/credentialing-packet.interface";
import CredentialingPacketMapping from "../models/credentialing-packet-mapping.model";
import { col, fn, Op, Sequelize } from "sequelize";
import CredentialingPacketMappingInterface from "../interfaces/credentialing-packet-mapping.interface";

export async function createCredentialingPacket(
    request: FastifyRequest<{ Params: { program_id: string } }>,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    const program_id = request.params.program_id;

    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
        return reply.status(401).send({ status_code: 401, message: "Unauthorized - Token not found" });
    }

    const token = authHeader.split(" ")[1];
    const user = await decodeToken(token);
    if (!user) {
        return reply.status(401).send({ status_code: 401, message: "Unauthorized - Invalid token" });
    }

    const userId = user.sub;

    try {
        const {
            credentialing_packet,
            credentialing_packet_task_mappings = [],
        } = request.body as {
            credentialing_packet: CredentialingPacketInterface;
            credentialing_packet_task_mappings?: CredentialingPacketMappingInterface[];
        };

        const transaction = await sequelize.transaction();
        try {
            const createdCredentialingPacket = await CredentialingPacket.create(
                {
                    ...credentialing_packet,
                    program_id,
                    created_by: userId,
                    updated_by: userId,
                },
                { transaction }
            );


            if (Array.isArray(credentialing_packet_task_mappings) && credentialing_packet_task_mappings.length > 0) {
                const mappings = credentialing_packet_task_mappings.map((config) => ({
                    credentialing_packet_version_id: createdCredentialingPacket.version_id,
                    credentialing_packet_entity_id: createdCredentialingPacket.entity_id,
                    category_id: config.category_id,
                    category_name: config.category_name,
                    task_entity_id: config.task_entity_id,
                    task_version_id: config.task_version_id,
                    task_name: config.task_name,
                    seq_no: config.seq_no,
                    is_mandatory: config.is_mandatory ?? true,
                    is_enabled: config.is_enabled ?? true,
                    is_deleted: config.is_deleted ?? false,
                    created_by: userId,
                    updated_by: userId,
                }));

                await CredentialingPacketMapping.bulkCreate(mappings, { transaction });
            }

            await transaction.commit();

            reply.status(201).send({
                status_code: 201,
                message: "Credentialing packet created successfully",
                data: {
                    credentialing_packet: createdCredentialingPacket.get({ plain: true }),
                },
                traceId,
            });
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    } catch (error: any) {
        console.error(error);
        reply.status(500).send({
            status_code: 500,
            message: "An error occurred while creating the credentialing packet",
            error: error.message,
            traceId,
        });
    }
}

export async function getCredentialingPacketById(
    request: FastifyRequest<{ Params: { entity_id: string; version?: string } }>,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    const { entity_id, version } = request.params;

    try {
        const credentialingPacketOptions: any = {
            where: {
                entity_id,
                is_deleted: false,
                ...(version ? { version } : { latest: true }),
            },
        };

        const credentialingPacketData: any = await CredentialingPacket.findOne(credentialingPacketOptions);

        if (!credentialingPacketData) {
            return reply.status(404).send({
                status_code: 404,
                message: "Credentialing packet not found",
                traceId,
            });
        }

        const mappingOptions: any = {
            where: {
                credentialing_packet_version_id: credentialingPacketData.version_id,
            },
        };

        const credentialingPacketMappings = await CredentialingPacketMapping.findAll(mappingOptions);

        return reply.status(200).send({
            status_code: 200,
            message: "Successfully fetch credentialing packet",
            data: {
                credentialing_packet: {
                    ...credentialingPacketData.dataValues,
                },
                credentialing_packet_task_mappings: credentialingPacketMappings.map((mapping: any) => ({
                    ...mapping.dataValues,
                })),
            },
            traceId,
        });
    } catch (error) {
        console.error(error);
        return reply.status(500).send({
            status_code: 500,
            message: "An error occurred while fetching the credentialing packet",
            traceId,
        });
    }
}

export async function updateCredentialingPacket(
    request: FastifyRequest<{
        Params: { program_id: string; entity_id: string };
        Body: {
            credentialing_packet: CredentialingPacketInterface;
            credentialing_packet_task_mappings?: CredentialingPacketMappingInterface[];
        };
    }>,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    const { program_id, entity_id } = request.params;

    const {
        credentialing_packet: {
            name,
            description,
            is_enabled,
            sourcing_model,
        },
        credentialing_packet_task_mappings
    } = request.body;

    if (
        credentialing_packet_task_mappings &&
        !Array.isArray(credentialing_packet_task_mappings)
    ) {
        return reply.status(400).send({
            status_code: 400,
            message: '`credentialing_packet_task_mappings` must be an array.',
            traceId,
        });
    }

    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({
            status_code: 401,
            message: 'Unauthorized - Token not found',
            traceId,
        });
    }

    const token = authHeader.split(' ')[1];
    const user: any = await decodeToken(token);
    if (!user) {
        return reply.status(401).send({
            status_code: 401,
            message: 'Unauthorized - Invalid token',
            traceId,
        });
    }

    const userId = user.sub;
    const transaction = await sequelize.transaction();

    try {
        const existingCredentialingPacket = await CredentialingPacket.findOne({
            where: { entity_id, is_deleted: false, latest: true },
            attributes: ['version', 'version_id', 'pre_credentialing_packet_entity_id', 'pre_credentialing_packet_version'],
            order: [['version', 'DESC']],
        });

        if (!existingCredentialingPacket) {
            await transaction.rollback();
            return reply.status(404).send({
                status_code: 404,
                message: 'Credentialing packet not found',
                traceId,
            });
        }

        const newVersion = existingCredentialingPacket.version + 1;

        await CredentialingPacket.update(
            { latest: false, updated_on: BigInt(Date.now()), updated_by: userId },
            {
                where: { version_id: existingCredentialingPacket.version_id },
                transaction,
            }
        );

        await CredentialingPacketMapping.update(
            {
                is_deleted: true,
                updated_on: BigInt(Date.now()),
                updated_by: userId,
            },
            {
                where: {
                    credentialing_packet_version_id: existingCredentialingPacket.version_id,
                    credentialing_packet_entity_id: entity_id,
                },
                transaction,
            }
        );

        const newCredentialingPacket = await CredentialingPacket.create(
            {
                entity_id,
                program_id,
                version: newVersion,
                name,
                description,
                is_enabled,
                sourcing_model,
                pre_credentialing_packet_entity_id: existingCredentialingPacket.pre_credentialing_packet_entity_id,
                pre_credentialing_packet_version: existingCredentialingPacket.pre_credentialing_packet_version,
                previous_version_id: existingCredentialingPacket.version_id,
                latest: true,
                created_by: userId,
                updated_by: userId,
            },
            { transaction }
        );

        if (credentialing_packet_task_mappings && credentialing_packet_task_mappings.length > 0) {
            const credentialingPacketMappings = credentialing_packet_task_mappings.map((config: any) => ({
                credentialing_packet_version_id: newCredentialingPacket.version_id,
                credentialing_packet_entity_id: newCredentialingPacket.entity_id,
                category_id: config.category_id,
                category_name: config.category_name,
                task_entity_id: config.task_entity_id,
                task_version_id: config.task_version_id,
                task_name: config.task_name,
                seq_no: config.seq_no,
                is_mandatory: config.is_mandatory ?? true,
                is_enabled: config.is_enabled ?? true,
                is_deleted: false,
                created_by: userId,
                updated_by: userId,
            }));

            await CredentialingPacketMapping.bulkCreate(credentialingPacketMappings, { transaction });
        }

        await transaction.commit();

        return reply.status(200).send({
            status_code: 200,
            message: 'Credentialing packet updated and new version created successfully',
            data: {
                credentialing_packet: newCredentialingPacket.get({ plain: true }),
            },
            traceId,
        });
    } catch (error: any) {
        await transaction.rollback();
        console.error('Update error:', error);
        return reply.status(500).send({
            status_code: 500,
            message: 'An error occurred while updating the credentialing packet',
            error: error.message,
            traceId,
        });
    }
}

export async function deleteCredentialingPacket(
    request: FastifyRequest<{ Params: { entity_id: string } }>,
    reply: FastifyReply
) {
    const { entity_id } = request.params;
    const traceId = generateCustomUUID();

    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({
            status_code: 401,
            message: 'Unauthorized - Token not found',
            traceId,
        });
    }

    const token = authHeader.split(' ')[1];
    const user: any = await decodeToken(token);
    if (!user) {
        return reply.status(401).send({
            status_code: 401,
            message: 'Unauthorized - Invalid token',
            traceId,
        });
    }

    const userId = user?.sub;

    try {
        const credentialingPackets = await CredentialingPacket.findAll({
            where: { entity_id, is_deleted: false },
        });

        if (credentialingPackets.length === 0) {
            return reply.status(404).send({
                status_code: 404,
                message: 'Credentialing packet not found',
                traceId,
            });
        }

        const transaction = await sequelize.transaction();

        try {
            await CredentialingPacket.update(
                {
                    is_deleted: true,
                    updated_by: userId,
                    updated_on: BigInt(Date.now()),
                },
                {
                    where: { entity_id },
                    transaction,
                }
            );

            await CredentialingPacketMapping.update(
                {
                    is_deleted: true,
                    updated_by: userId,
                    updated_on: BigInt(Date.now()),
                },
                {
                    where: {
                        credentialing_packet_entity_id: entity_id,
                    },
                    transaction,
                }
            );

            await transaction.commit();

            return reply.status(200).send({
                status_code: 200,
                message: 'Credentialing packet deleted successfully',
                traceId,
            });
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    } catch (error) {
        return reply.status(500).send({
            status_code: 500,
            message: 'An error occurred while deleting the credentialing packet',
            traceId,
            error,
        });
    }
}

export async function filterCredentialingPacket(
    request: FastifyRequest<{
        Querystring: {
            is_enabled?: boolean | string;
            entity_id?: string;
            name?: string;
            limit?: number | string;
            page?: number | string;
            task_count?: number | string;
        };
        Params: {
            program_id: string;
        };
    }>,
    reply: FastifyReply
) {
    const {
        is_enabled,
        name,
        limit: rawLimit = '10',
        page: rawPage = '1',
        task_count,
    } = request.query;

    const program_id = request.params.program_id;
    const traceId = generateCustomUUID();

    const limit = Number(rawLimit);
    const page = Number(rawPage);
    const offset = (page - 1) * limit;

    try {
        const whereConditions: any = {
            latest: true,
            is_deleted: false,
            program_id,
        };

        if (is_enabled !== undefined) {
            if (typeof is_enabled === 'string') {
                const lower = is_enabled.toLowerCase();
                if (lower === 'true') whereConditions.is_enabled = true;
                else if (lower === 'false') whereConditions.is_enabled = false;
            } else {
                whereConditions.is_enabled = is_enabled;
            }
        }

        if (name !== undefined) {
            whereConditions.name = {
                [Op.like]: `%${name}%`,
            };
        }

        let havingCondition: any = undefined;
        if (task_count !== undefined) {
            const count = Number(task_count);
            if (!isNaN(count)) {
                havingCondition = Sequelize.literal(`COUNT(credentialingPacketTasks.id) = ${count}`);
            }
        }

        const credentialingPacket = await CredentialingPacket.findAndCountAll({
            attributes: [
                'version_id',
                'entity_id',
                'name',
                'description',
                'version',
                'program_id',
                'is_enabled',
                [fn('COUNT', col('credentialingPacketTasks.id')), 'task_count'],
            ],
            include: [
                {
                    model: CredentialingPacketMapping,
                    as: 'credentialingPacketTasks',
                    attributes: [],
                    where: {
                        is_deleted: false,
                        is_enabled: true,
                    },
                    required: false,
                },
            ],
            where: whereConditions,
            group: ['CredentialingPacket.version_id'],
            having: havingCondition,
            order: [['updated_on', 'DESC']],
            limit,
            offset,
            subQuery: false,
        });

        if (!credentialingPacket.rows.length) {
            return reply.status(200).send({
                status_code: 200,
                message: 'No credentialing packet found for the given filters.',
                data: [],
                total_count: 0,
                current_page: page,
                limit,
                traceId,
            });
        }

        return reply.status(200).send({
            status_code: 200,
            message: 'Credentialing Packet found successfully',
            data: credentialingPacket.rows.map((credentialingPacket: any) => ({
                ...credentialingPacket.get(),
            })),
            total_count: credentialingPacket.count.length,
            current_page: page,
            limit,
            traceId,
        });
    } catch (error) {
        console.error('Error while filtering credentialing packet:', error);

        return reply.status(500).send({
            status_code: 500,
            message: 'An error occurred while filtering the credentialing packet',
            traceId,
            error: {
                message: (error as Error).message || 'An unexpected error occurred.',
                stack: (error as Error).stack || null,
            },
        });
    }
}

export async function listCredentialingPacket(
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
        const whereConditions: any = {
            latest: true,
            is_enabled: true,
            program_id,
            ...(!name ? {} : { name: { [Op.like]: `%${name}%` } })
        };

        const credentialingPacket = await CredentialingPacket.findAll({
            where: whereConditions,
            order: [['name', 'ASC']],
            attributes: ['name', 'entity_id', 'version', 'version_id'],
        });

        return reply.status(200).send({
            status_code: 200,
            message: credentialingPacket.length
                ? "Successfully fetched credentialing packet for the program"
                : "No credentialing packet found for the given filters.",
            data: credentialingPacket,
            traceId: traceId,
        });
    } catch (error) {
        console.error('Error while listing credentialing packet:', error);

        return reply.status(500).send({
            status_code: 500,
            message: 'An error occurred while listing the credentialing packet',
            traceId: traceId,
            error: {
                message: (error as Error).message || 'An unexpected error occurred.',
                stack: (error as Error).stack || null,
            },
        });
    }
}

export async function enableDisableCredentialingPacket(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    try {

        const { program_id, entity_id } = request.params as { program_id: string; entity_id: string };
        const { is_enabled } = request.body as { is_enabled: boolean };

        if (!entity_id || !program_id) {
            return reply.status(400).send({
                status_code: 400,
                message: "Program ID and Entity ID are required",
                trace_id: traceId
            });
        }

        if (is_enabled === undefined) {
            return reply.status(400).send({
                status_code: 400,
                message: "'is_enabled' is required in the payload",
                trace_id: traceId
            });
        }

        const credentialingPacket = await CredentialingPacket.findOne({
            where: { program_id, entity_id, latest: true, is_deleted: false },
        });

        if (!credentialingPacket) {
            return reply.status(404).send({
                status_code: 404,
                message: "Credentialing Packet not found",
                trace_id: traceId,
            });
        }

        await CredentialingPacket.update(
            { is_enabled, updated_on: BigInt(Date.now()) },
            { where: { program_id, entity_id, latest: true, is_deleted: false } }
        );

        return reply.status(200).send({
            status_code: 200,
            message: "Credentialing Packet is_enabled status updated successfully",
            trace_id: traceId,
        });
    } catch (error: any) {
        console.error("Error in enableDisableCredentialingPacket:", error);
        return reply.status(500).send({
            status_code: 500,
            message: "An error occurred while updating is_enabled status of the credentialing packet",
            trace_id: traceId,
            error,
        });
    }
}