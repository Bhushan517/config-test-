import { FastifyRequest, FastifyReply } from 'fastify';
import RecipientType from '../models/recipient-types.model';
import { RecipientTypesData } from '../interfaces/recipient-types.interface';
import generateCustomUUID from '../utility/genrateTraceId';
import { Op } from 'sequelize';

export const createRecipientType = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId=generateCustomUUID();
    try {
        const { program_id } = request.params as { program_id: string };
        const RecipientTypesDataPayload = request.body as Omit<RecipientTypesData, '_id'>;
        const RecipientTypesData: any = await RecipientType.create({ ...RecipientTypesDataPayload, program_id });
        reply.status(201).send({
            status_code: 201,
            message:" Recipient Type created successfully",
            Recipient_type: {
                id: RecipientTypesData?.id,
                name: RecipientTypesData?.name,
            },
            trace_id: traceId,
        });
    } catch (error) {
        reply.status(500).send({status_code:500, message: 'Error While Creating RecipientType', error, trace_id: traceId });
    }
};

export const updateRecipientType = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const RecipientTypesData = request.body as RecipientTypesData;
    const traceId=generateCustomUUID();
    try {
        const data = await RecipientType.findOne({
            where: { id }
        });
        if (data) {
            await data.update(RecipientTypesData);
            reply.status(201).send({
                status_code: 201,
                RecipientType_id: id,
                trace_id: traceId,
                message: 'RecipientType Updated Successfully.',
            });
        } else {
            reply.status(200).send({status_code:200, message: 'RecipientType Data Not Found.',trace_id:traceId });
        }
    } catch (error) {
        reply.status(500).send({status_code:500, message: ' An Error Occurred While Updating The RecipientType', error, trace_id: traceId });
    }
}

export const deleteRecipientType = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId=generateCustomUUID();
    try {
        const { id } = request.params as { id: string };
        const data = await RecipientType.findOne({
            where: { id, is_deleted: false },
        });

        if (!data) {
            return reply.status(200).send({status_code:200, message: 'RecipientType Data Not Found',trace_id:traceId });
        }

        await data.update({ is_enabled: false, is_deleted: true });
        reply.status(200).send({
            status_code: 200,
            Recipient_type_id: id,
            trace_id: traceId,
            message: 'RecipientType Deleted Successfully'
        });
    } catch (error) {
        reply.status(500).send({status_code:500, message: 'Error Deleting RecipientType Data', error, trace_id: traceId });
    }
}

export async function getAllRecipientTypes(
    request: FastifyRequest<{ Params: RecipientTypesData, Querystring: RecipientTypesData }>,
    reply: FastifyReply
) {
    const traceId=generateCustomUUID();
    try {
        const query: any = request.query;

        const page = parseInt(query.page ?? "1");
        const limit = parseInt(query.limit ?? "10");
        const offset = (page - 1) * limit;
        query.page && delete query.page;
        query.limit && delete query.limit;

        const searchConditions: any = {};
        if (query.name) {
            searchConditions.name = { [Op.like]: `%${query.name}%` };
        }
        if (query.is_enabled) {
            query.is_enabled == "false" ? searchConditions.is_enabled = false : searchConditions.is_enabled = true;
        }
        const { rows: Receipient_type, count } = await RecipientType.findAndCountAll({
            where: { ...query, ...searchConditions, is_deleted: false },
            attributes: { exclude: ["program_id"] },
            limit: limit,
            order: [["name", "ASC"]],
            offset: offset,
        });
        if (Receipient_type.length === 0) {
            return reply.status(200).send({
                message: "RecipientType Not Found",
                Recipient_type: []
            });
        }
        reply.status(200).send({
            status_code: 200,
            message:" RecipientType Retrieved Successfully",
            items_per_page: limit,
            total_records: count,
            Receipient_type: Receipient_type,
            trace_id: traceId,
        });
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: "Internal Server error",
            error: error,
            trace_id: traceId,
        });
    }
}

export async function getRecipientTypes(
    request: FastifyRequest<{ Params: RecipientTypesData, Querystring: RecipientTypesData }>,
    reply: FastifyReply
) {
    const traceId=generateCustomUUID();
    try {
        const query: any = request.query;

        const page = parseInt(query.page ?? "1");
        const limit = parseInt(query.limit ?? "10");
        const offset = (page - 1) * limit;
        query.page && delete query.page;
        query.limit && delete query.limit;

        const searchConditions: any = {};
        if (query.name) {
            searchConditions.name = { [Op.like]: `%${query.name}%` };
        }
        if (query.is_enabled) {
            query.is_enabled == "false" ? searchConditions.is_enabled = false : searchConditions.is_enabled = true;
        }
        const { rows: Receipient_type, count } = await RecipientType.findAndCountAll({
            where: { ...query, ...searchConditions, is_deleted: false },
            attributes: { exclude: ["program_id"] },
            limit: limit,
            order: [["created_on", "DESC"]],
            offset: offset,
        });
        if (Receipient_type.length === 0) {
            return reply.status(200).send({
                status_code: 200,
                message: "RecipientType Not Found",
                Recipient_type: [],
                trace_id: traceId,
            });
        }
        reply.status(200).send({
            status_code: 200,
            message: "RecipientType Found",
            items_per_page: limit,
            total_records: count,
            Receipient_type: Receipient_type,
            trace_id: traceId,
        });
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: "Internal Server error",
            error: error,
            trace_id: traceId,
        });
    }
}

export async function getRecipientTypeById(request: FastifyRequest, reply: FastifyReply) {
    const traceId=generateCustomUUID();
    try {
        const { id } = request.params as { id: string };
        const item = await RecipientType.findOne({
            where: { id }
        });
        if (item) {
            reply.status(200).send({
                status_code: 200,
                message: "RecipientType Found",
                Receipient_type: item,
                trace_id: traceId,
            });
        } else {
            reply.status(200).send({status_code:200, message: 'RecipientType Data Not Found', workflow: [],trace_id:traceId });
        }
    } catch (error) {
        reply.status(500).send({status_code:500, message: 'An Error Occurred While Fetching RecipientType Data.', error ,trace_id:traceId});
    }
}
