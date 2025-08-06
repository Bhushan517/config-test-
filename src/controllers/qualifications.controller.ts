import { FastifyRequest, FastifyReply } from 'fastify';
import Qualifications from '../models/qualifications.model';
import { QualificationData } from '../interfaces/qualifications.interface';
import generateCustomUUID from '../utility/genrateTraceId';
import { Op } from 'sequelize';
import qualificationTypeModel from '../models/qualification-type-model';
import { generateQualificationCode } from '../plugins/qualificationCodeGenerate';
import { decodeToken } from '../middlewares/verifyToken';
import { logger } from '../utility/loggerService';


export const createQualification = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();
    const user=request?.user;
    const userId = user?.sub;

    try {
        const { program_id } = request.params as { program_id: string };
        const { name, qualification_type_id } = request.body as QualificationData;


        logger({
            trace_id: traceId,
            actor: {
                user_name: user?.preferred_username,
                user_id: userId,
            },
            data: request.body,
            eventname: "Creating Qualification",
            status: "info",
            description: `Attempting to create qualification for program_id: ${program_id}`,
            level: 'info',
            action: request.method,
            url: request.url,
            entity_id: program_id,
        });


        const existingQualification = await Qualifications.findOne({
            where: { name, qualification_type_id, program_id },
        });

        if (existingQualification) {
            logger({
                trace_id: traceId,
                actor: {
                    user_name: user?.preferred_username,
                    user_id: userId,
                },
                data: request.body,
                eventname: "Qualification Exists",
                status: "warn",
                description: `Qualification with name "${name}" already exists in program_id: ${program_id}`,
                level: 'warn',
                action: request.method,
                url: request.url,
                entity_id: program_id,
            });

            return reply.status(409).send({
                status_code: 409,
                message: 'Qualification With The Same Name Already Exists.',
                trace_id: traceId,
            });
        }


        const QualificationsDataPayload = request.body as Omit<QualificationData, '_id'>;
        const QualificationsData: any = await Qualifications.create({
            ...QualificationsDataPayload,
            program_id,
            created_by: userId,
            updated_by: userId
        });

        logger({
            trace_id: traceId,
            actor: {
                user_name: user?.preferred_username,
                user_id: userId,
            },
            data: request.body,
            eventname: "Qualification Created",
            status: "success",
            description: `Successfully created qualification "${name}" for program_id: ${program_id}`,
            level: 'success',
            action: request.method,
            url: request.url,
            entity_id: program_id,
        });

        return reply.status(201).send({
            status_code: 201,
            message: 'Qualification Created Successfully.',
            Qualifications: {
                id: QualificationsData?.id,
                name: QualificationsData?.name,
            },
            trace_id: traceId,
        });

    } catch (error) {
        logger({
            trace_id: traceId,
            actor: {
                user_name: user?.preferred_username,
                user_id: userId,
            },
            data: request.body,
            eventname: "Qualification Creation Failed",
            status: "error",
            description: `Error while creating qualification for program_id: `,
            level: 'error',
            action: request.method,
            url: request.url,
            // entity_id: request.params?.program_id,
            error: error instanceof Error ? error.message : String(error),
        });

        return reply.status(500).send({
            status_code: 500,
            message: 'Error While Creating Qualification',
            error: error instanceof Error ? error.message : String(error),
            trace_id: traceId
        });
    }
};

export async function bulkCreateQualifications(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    try {
        const qualificationsDataPayload: QualificationData[] = request.body as QualificationData[];
        const { program_id } = request.params as { program_id: string };

        if (!Array.isArray(qualificationsDataPayload)) {
            return reply.status(400).send({
                status_code: 400,
                message: 'Invalid Payload Data',
                trace_id: traceId
            });
        }

        const createdQualifications = [];
        for (const item of qualificationsDataPayload) {
            const { qualification_type_id, title } = item;
            const code = await generateQualificationCode(qualification_type_id, title);
            const newQualification = await Qualifications.create({
                ...item,
                program_id,
                code
            });
            createdQualifications.push(newQualification);
        }

        reply.status(201).send({
            status_code: 201,
            message: "Successfully Created Qualifications",
            qualifications: createdQualifications,
            trace_id: traceId,
        });
    } catch (error) {
        reply.status(500).send({
            status_code: 200,
            message: 'Error While Creating Qualifications',
            error: error,
            trace_id: traceId
        });
    }
}

export async function getQualificationCode(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    try {
        const { qualification_type_id, title } = request.query as { qualification_type_id: string, title: string };
        const code = await generateQualificationCode(qualification_type_id, title);
        if (code) {
            reply.status(200).send({
                status_code: 200,
                message: "Qualification Code Generated Successfully",
                qualification_code: code,
                trace_id: traceId,
            });
        } else {
            reply.status(200).send({ status_code: 200, message: 'Qualification Type Not Found', Qualification: [], trace_id: traceId });
        }
    } catch (error) {
        reply.status(500).send({ status_code: 500, message: 'An Error Occurred While Generating Code', error, trace_id: traceId });
    }
}

export const updateQualification = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id, program_id } = request.params as { id: string, program_id: string };
    const QualificationsData = request.body as QualificationData;
    const traceId = generateCustomUUID();
    const user=request?.user;
    const userId = user?.sub;

    try {
        const data = await Qualifications.findOne({
            where: {
                id,
                program_id,
                is_deleted: false
            }
        });

        if (data) {
            await data.update({
                ...QualificationsData,
                updated_by: userId,
                updated_on: Date.now()
            });

            logger({
                trace_id: traceId,
                actor: {
                    user_name: user?.preferred_username,
                    user_id: user?.sub,
                },
                data: QualificationsData,
                eventname: "update qualification",
                status: "success",
                description: `Qualification data updated successfully for ID: ${id}`,
                level: 'info',
                action: request.method,
                url: request.url,
                entity_id: id,
                is_deleted: false
            }, Qualifications);

            return reply.status(201).send({
                status_code: 201,
                Qualification_id: id,
                trace_id: traceId,
                message: 'Qualification Data Updated Successfully.',
            });

        } else {
            logger({
                trace_id: traceId,
                actor: {
                    user_name: user?.preferred_username,
                    user_id: user?.sub,
                },
                eventname: "update qualification",
                status: "warning",
                description: `Qualification not found for ID: ${id}`,
                level: 'warning',
                action: request.method,
                url: request.url,
                entity_id: id,
                is_deleted: false
            }, Qualifications);

            return reply.status(200).send({
                status_code: 200,
                message: 'Qualification Not Found.',
                trace_id: traceId
            });
        }
    } catch (error: any) {
        logger({
            trace_id: traceId,
            actor: {
                user_name: user?.preferred_username,
                user_id: user?.sub,
            },
            eventname: "update qualification",
            status: "error",
            description: `Error while updating qualification for ID: ${id}`,
            level: 'error',
            action: request.method,
            url: request.url,
            entity_id: id,
            is_deleted: false
        }, Qualifications);

        return reply.status(500).send({
            status_code: 500,
            message: 'An Error Occurred While Updating The Qualification',
            error: error.message,
            trace_id: traceId
        });
    }
};

export const deleteQualification = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();
    const user=request?.user;
    const userId = user?.sub;
    try {
        const { id, program_id } = request.params as { id: string, program_id: string };
        const data = await Qualifications.findOne({
            where: { id, program_id, is_deleted: false },
        });

        if (!data) {
            return reply.status(200).send({ status_code: 200, message: 'Qualification Not Found', trace_id: traceId });
        }

        await data.update({ is_enabled: false, is_deleted: true, updated_by: userId, });
        reply.status(200).send({
            status_code: 200,
            Qualifications_id: id,
            trace_id: traceId,
            message: 'Qualification Data Deleted Successfully'
        });
    } catch (error) {
        reply.status(500).send({ status_code: 500, message: 'Error Deleting Qualification', error, trace_id: traceId });
    }
}

export async function getAllQualifications(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    try {
        const params = request.params as Partial<QualificationData>;
        const query = request.query as any;

        const page = parseInt(query.page ?? "1");
        const limit = parseInt(query.limit ?? "10");
        const offset = (page - 1) * limit;
        query.page && delete query.page;
        query.limit && delete query.limit;

        const searchConditions: any = {};

        if (query.type) {
            searchConditions.type = query.type;
            searchConditions.program_id = params.program_id;
        } else {
            if (query.name) {
                searchConditions.name = { [Op.like]: `%${query.name}%` };
            }
            if (query.is_enabled !== undefined) {
                searchConditions.is_enabled = query.is_enabled !== "false";
            }
            if (query.code) {
                searchConditions.code = query.code;
            }
            if (query.qualification_type_id) {
                searchConditions.qualification_type_id = query.qualification_type_id;
            }
            if (query.updated_on) {
             const startDate = new Date(query.updated_on).getTime();
            const endDate = startDate + 24 * 60 * 60 * 1000;

                searchConditions.updated_on = {
                    [Op.gte]: startDate,
                    [Op.lt]: endDate,
                };
            }

            searchConditions.program_id = params.program_id;
        }

        const { rows: qualification, count } = await Qualifications.findAndCountAll({
            where: { ...searchConditions, is_deleted: false },
            attributes: { exclude: ["program_id"] },
            limit: limit,
            order: [["created_on", "DESC"]],
            offset: offset,
        });

        if (qualification.length === 0) {
            return reply.status(200).send({
                status_code: 200,
                message: "Qualification Not Found",
                qualification: [],
                trace_id: traceId
            });
        }

        let qualificationTypeName = null;
        if (query.qualification_type_id) {
            const qualificationType = await qualificationTypeModel.findOne({
                where: { id: query.qualification_type_id },
                attributes: ['name'],
            });

            if (qualificationType) {
                qualificationTypeName = qualificationType.name;
            }
        }

        reply.status(200).send({
            status_code: 200,
            message: "Qualification Found",
            qualification_type_name: qualificationTypeName,
            items_per_page: limit,
            total_records: count,
            qualifications: qualification,
            trace_id: traceId,
        });
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: "Internal Server Error",
            error: error,
            trace_id: traceId,
        });
    }
}

export async function getQualificationById(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    try {
        const { id, program_id } = request.params as { id: string, program_id: string };
        const item = await Qualifications.findOne({
            where: { id, program_id }
        });
        if (item) {
            reply.status(200).send({
                status_code: 200,
                message: "Qualification Found",
                qualification: item,
                trace_id: traceId
            });
        } else {
            reply.status(200).send({ status_code: 200, message: 'Qualification Not Found', Qualifications: [], trace_id: traceId });
        }
    } catch (error) {
        reply.status(500).send({ status_code: 500, message: 'An Error Occurred While Fetching Qualification', error, trace_id: traceId });
    }
}
