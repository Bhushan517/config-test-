import { FastifyRequest, FastifyReply } from "fastify";
import DistScheduleDetail from "../models/dist-schedule-detail.model";
import { DistScheduleDetailInterface } from "../interfaces/dist-schedule-detail.interface";
import generateCustomUUID from "../utility/genrateTraceId";
import { baseSearch } from "../utility/baseService";
import { logger } from '../utility/loggerService';
import { decodeToken } from '../middlewares/verifyToken';

export const createDistScheduleDetails = async (request: FastifyRequest<{ Params: { program_id: string } }>,
    reply: FastifyReply) => {
    const { program_id } = request.params;
    const distScheduleDetailsData = request.body as DistScheduleDetailInterface[];
    const traceId = generateCustomUUID();
        const user=request?.user
    logger(
        {
            trace_id:traceId,
            actor: {
                user_name: user?.preferred_username,
                user_id: user?.sub,
            },
            data: request.body,
            eventname: "creating distribution schedule details",
            status: "success",
            description: `creating distribution schedule details for ${program_id}`,
            level: 'info',
            action: request.method,
            url: request.url,
            entity_id: program_id,
            is_deleted: false
        },
        DistScheduleDetail
    );

    try {
        const newDistScheduleDetails = await DistScheduleDetail.bulkCreate(distScheduleDetailsData.map(detail => ({
            ...detail,
            program_id: program_id
        })));

        logger(
            {
                trace_id:traceId,
                actor: {
                    user_name: user?.preferred_username,
                    user_id: user?.sub,
                },
                data: request.body,
                eventname: "create distribution schedule details",
                status: "success",
                description: `create distribution schedule details for ${program_id}`,
                level: 'success',
                action: request.method,
                url: request.url,
                entity_id: program_id,
                is_deleted: false
            },
            DistScheduleDetail
        );

        reply.status(201).send({
            status_code: 201,
            message: "Distribution Schedule Details created successfully.",
            data: newDistScheduleDetails.map((detail: DistScheduleDetail) => ({
                id: detail.id,
                program_id: detail.program_id,
            })),
            trace_id:traceId,
        });

    } catch (error) {
        logger(
            {
                trace_id:traceId,
                actor: {
                    user_name: user?.preferred_username,
                    user_id: user?.sub,
                },
                data: request.body,
                eventname: "creating distribution schedule details",
                status: "error",
                description: `Error creating distribution schedule details for ${program_id}`,
                level: 'error',
                action: request.method,
                url: request.url,
                entity_id: program_id,
                is_deleted: false
            },
            DistScheduleDetail
        );

        reply.status(500).send({
            status_code: 500,
            message: "Internal Server Error.",
            trace_id:traceId,
            error,
        });
    }
};

export const getAllDistScheduleDetails = async (request: FastifyRequest, reply: FastifyReply) => {
    const searchFields = ["program_id", "measure_unit", "vendor_data", "is_enabled"];
    const responseFields = ["id", "duration", "measure_unit", "vendor_data", "is_enabled", "updated_on"];
    return baseSearch(request, reply, DistScheduleDetail, searchFields, responseFields);
};

export const getDistScheduleDetailById = async (request: FastifyRequest, reply: FastifyReply) => {
    const { program_id, id } = request.params as { id: string, program_id: string };
    const traceId = generateCustomUUID();

    try {
        const detail = await DistScheduleDetail.findOne({
            where: { program_id, id, is_deleted: false },
        });

        if (detail) {
            reply.status(200).send({
                status_code: 200,
                message:"Dist schedule detail get successfully",
                data: detail,
                trace_id: traceId,
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                message:"Dist schedule detail not found",
                dist_schedule_detail: [],
            });
        }
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: "Internal Server Error.",
            trace_id: traceId,
            error,
        });
    }
};

export const deleteDistScheduleDetail = async (
    request: FastifyRequest<{ Params: { id: string; program_id: string } }>,
    reply: FastifyReply
) => {
    const traceId = generateCustomUUID();
    const { id, program_id } = request.params;

    try {
        const [DistSchedule] = await DistScheduleDetail.update(
            { is_deleted: true, is_enabled: false },
            {
                where: { id, program_id, is_deleted: false },
            }
        );

        if (DistSchedule === 0) {
            return reply.status(200).send({
                status_code: 200,
                message: "Distribution Schedule Detail not found.",
                dist_schedule_detail: [],
                trace_id: traceId,
            });
        }
        reply.status(204).send({
            status_code: 204,
            message: "Distribution Schedule Detail deleted successfully.",
            trace_id: traceId,
        });
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: "Internal Server Error.",
            trace_id: traceId,
            error,
        });
    }
};


export const updateDistScheduleDetail = async (
    request: FastifyRequest<{ Params: { id: string, program_id: string } }>,
    reply: FastifyReply
) => {
    const traceId = generateCustomUUID();
    const { program_id, id } = request.params;

    try {
        const [updatedCount] = await DistScheduleDetail.update(request.body as DistScheduleDetailInterface, {
            where: { program_id, id },
        });

        if (updatedCount > 0) {
            reply.send({
                status_code: 200,
                message: "Distribution Schedule Detail updated successfully.",
                trace_id: traceId,
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                dist_schedule_detail: [],
                massage: "Distribution Schedule Detail not found."
            });
        }
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: "Internal Server Error",
            trace_id: traceId,
            error,
        });
    }
};
